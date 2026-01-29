// Level Path Component - Candy Crush-style scrollable level path
// ✨ Magical fairy dust trail with glowing orb waypoints
// Optimizations:
// 1. Converted ScrollView -> FlashList for virtualization
// 2. Chunked SVGs per item instead of one massive global SVG
// 3. Optimized animations

import React, { useCallback, useMemo, memo } from "react";
import {
  View,
  StyleSheet,
  Text,
  useWindowDimensions,

} from "react-native";
import { FlashList, ListRenderItem, FlashListProps } from "@shopify/flash-list";
import { useQuery } from "convex/react";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { MotiView } from "moti";
import { api } from "../convex/_generated/api";
import { useChildAuth } from "../utils/childAuth";
import { useSafeNavigation } from "../utils/useSafeNavigation";
import { COLORS, SPACING } from "../constants/theme";
import LevelNode from "./LevelNode";
import type { Id } from "../convex/_generated/dataModel";

// Constants for layout calculation
const NODE_SIZE = 76;
const LEVEL_MARGIN_VERTICAL = SPACING.lg + 4; // 28px
const LEVEL_SPACING = LEVEL_MARGIN_VERTICAL * 2 + NODE_SIZE; // ~132px

// Type for level data from query
type LevelWithProgress = {
  _id: Id<"levels">;
  levelNumber: number;
  name: string;
  description?: string;
  isEnabled: boolean;
  difficulties: Array<{
    name: string;
    displayName: string;
    requiredScore: number;
    order: number;
  }>;
  theme?: {
    emoji: string;
    color: string;
  };
  state: "locked" | "unlocked" | "completed" | "coming_soon";
  progress: {
    difficultyProgress: Array<{
      difficultyName: string;
      highScore: number;
      passed: boolean;
      attempts: number;
    }>;
    isCompleted: boolean;
  } | null;
};

// Seeded random for consistent positions
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Glowing orb waypoint between nodes
const GlowingOrb = memo(function GlowingOrb({
  x,
  y,
  delay,
  color,
}: {
  x: number;
  y: number;
  delay: number;
  color: string;
}) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "timing",
        duration: 400,
        delay: Math.min(delay, 800),
      }}
      style={[styles.orbContainer, { left: x - 12, top: y - 12 }]}
    >
      <View style={[styles.orbGlowRing, { backgroundColor: color }]} />
      <View style={[styles.orbCore, { backgroundColor: color }]}>
        <View style={styles.orbShine} />
      </View>
      <View style={styles.orbSparkle}>
        <Text style={styles.sparkleText}>✦</Text>
      </View>
    </MotiView>
  );
});

// Path Segment rendered within each list item
const PathSegment = memo(function PathSegment({
  isLeft,
  screenWidth,
  state,
  nextState,
}: {
  isLeft: boolean;
  screenWidth: number;
  state: "locked" | "unlocked" | "completed" | "coming_soon";
  nextState?: "locked" | "unlocked" | "completed" | "coming_soon";
}) {
  const startX = isLeft ? screenWidth * 0.25 : screenWidth * 0.75;
  const endX = isLeft ? screenWidth * 0.75 : screenWidth * 0.25;
  const startY = NODE_SIZE / 2; // Start from center of node
  const endY = LEVEL_SPACING + NODE_SIZE / 2; // End at center of next node

  // Bezier curve
  const midY = (startY + endY) / 2;
  const pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
  
  // Decide colors based on transition
  const isLockedTransition = state === 'locked' || nextState === 'locked';
  const magicGradientUrl = "url(#connectorGlow)";
  
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
      <Svg width={screenWidth} height={LEVEL_SPACING + NODE_SIZE}>
        <Defs>
           {/* Re-define gradients here or better yet, make them global/shared if possible. 
               For list items, re-defining in a small reusable component is okay but slightly verbose. 
               To optimize, we could put Defs at the top of FlashList if SVG context was shared, but it's not.
           */}
          <LinearGradient id="connectorGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.9" />
            <Stop offset="0.5" stopColor={COLORS.accent} stopOpacity="0.9" />
            <Stop offset="1" stopColor={COLORS.accentGold} stopOpacity="0.9" />
          </LinearGradient>
        </Defs>

        {!isLockedTransition ? (
          <>
            <Path
              d={pathD}
              stroke={COLORS.primaryLight}
              strokeWidth={24}
              strokeLinecap="round"
              fill="none"
              opacity={0.15}
            />
            <Path
              d={pathD}
              stroke={COLORS.accent}
              strokeWidth={14}
              strokeLinecap="round"
              fill="none"
              opacity={0.25}
            />
            <Path
              d={pathD}
              stroke={magicGradientUrl}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d={pathD}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              opacity={0.7}
            />
          </>
        ) : (
          <>
             <Path
              d={pathD}
              stroke="#D0D0D0"
              strokeWidth={20}
              strokeLinecap="round"
              fill="none"
              opacity={0.1}
            />
            <Path
              d={pathD}
              stroke="#B8B8B8"
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
              opacity={0.6}
            />
             <Path
              d={pathD}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              opacity={0.3}
              strokeDasharray="8,8"
            />
          </>
        )}
      </Svg>
    </View>
  );
});

// Single Level Item Component
const LevelListItem = memo(function LevelListItem({
  level,
  index,
  totalLevels,
  screenWidth,
  nextLevel,
  onPress,
}: {
  level: LevelWithProgress;
  index: number;
  totalLevels: number;
  screenWidth: number;
  nextLevel?: LevelWithProgress;
  onPress: (level: LevelWithProgress) => void;
}) {
  const isLeft = index % 2 === 0;
  
  // Calculate orb position (midway on the path)
  // Approximate midpoint of the Bezier curve is roughly center of screen width, mid-height
  const orbX = screenWidth / 2; 
  const orbY = LEVEL_SPACING * 0.65; // Slightly lower than center looks better visually

  return (
    <View style={{ height: LEVEL_SPACING, justifyContent: 'flex-start' }}>
      {/* Path connecting to NEXT level (if exists) */}
      {index < totalLevels - 1 && (
        <PathSegment
            isLeft={isLeft}
            screenWidth={screenWidth}
            state={level.state}
            nextState={nextLevel?.state}
        />
      )}
      
      {/* Animated Level Node */}
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 500, delay: 100 }}
        style={{ zIndex: 10 }}
      >
        <LevelNode
            levelNumber={level.levelNumber}
            name={level.name}
            state={level.state}
            theme={level.theme}
            progress={level.progress ?? undefined}
            totalDifficulties={level.difficulties.length}
            onPress={() => onPress(level)}
            isLeft={isLeft}
        />
      </MotiView>
      
      {/* Orb decoration halfway to next node */}
      {index < totalLevels - 1 && (
        <GlowingOrb
            x={orbX}
            y={orbY}
            delay={200}
            color={level.state !== 'locked' ? COLORS.accentGold : '#A8A8A8'}
        />
      )}
    </View>
  );
});


export default function LevelPath() {
  const { token } = useChildAuth();
  const { safePush } = useSafeNavigation();
  const { width: screenWidth } = useWindowDimensions();

  // Fetch levels with progress
  const levels = useQuery(
    api.levels.getAllLevelsWithProgress,
    token ? { token } : "skip",
  ) as LevelWithProgress[] | undefined;

  const handleLevelPress = useCallback(
    (level: LevelWithProgress) => {
      if (level.state === "unlocked" || level.state === "completed") {
        safePush({
          pathname: "/games/levels/select",
          params: { levelId: level._id },
        });
      }
    },
    [safePush],
  );

  const renderItem: ListRenderItem<LevelWithProgress> = useCallback(({ item, index }) => {
    return (
      <LevelListItem 
        level={item}
        index={index}
        totalLevels={levels?.length || 0}
        screenWidth={screenWidth}
        nextLevel={levels?.[index + 1]}
        onPress={handleLevelPress}
      />
    );
  }, [levels, screenWidth, handleLevelPress]);

  const keyExtractor = useCallback((item: LevelWithProgress) => item._id, []);

  if (!levels) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.centerCircle}>
          <Text style={styles.centerIcon}>🎮</Text>
        </View>
        <Text style={styles.loadingText}>Loading your adventure...</Text>
      </View>
    );
  }

  if (levels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🎮</Text>
        <Text style={styles.emptyText}>No levels available yet!</Text>
        <Text style={styles.emptySubtext}>
          Check back soon for new content.
        </Text>
      </View>
    );
  }

  // Fix for missing estimatedItemSize in definitions
  const SafeFlashList = FlashList as unknown as React.ComponentType<FlashListProps<LevelWithProgress> & { estimatedItemSize: number }>;

  return (
    <View style={styles.container}>
      <SafeFlashList
        data={levels}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={LEVEL_SPACING} 
        ListFooterComponent={<View style={styles.bottomPadding} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    minHeight: 1, // Ensure FlashList has size
  },
  content: {
    paddingTop: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.lg,
  },
  centerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  centerIcon: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  loadingText: {
    fontSize: 17,
    color: COLORS.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  bottomPadding: {
    height: 100,
  },
  orbContainer: {
    position: "absolute",
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  orbGlowRing: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    opacity: 0.3,
  },
  orbCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  orbShine: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    transform: [{ rotate: "-30deg" }],
  },
  orbSparkle: {
    position: "absolute",
    top: -8,
    right: -4,
  },
  sparkleText: {
    fontSize: 10,
    color: COLORS.accentGold,
    textShadowColor: COLORS.accentGold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
});
