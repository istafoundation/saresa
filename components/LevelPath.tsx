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
import { useOfflineLevels } from "../hooks/useOfflineLevels"; // Add this line
import { getQuestions as getCachedQuestions } from "../utils/level-cache";
import { useNetwork } from "../utils/network";
import { COLORS, SPACING } from "../constants/theme";
import LevelNode from "./LevelNode";
import type { Id } from "../convex/_generated/dataModel";
import { GroupBanner } from "./GroupBanner";

// Constants for layout calculation
const NODE_SIZE = 76;
const LEVEL_MARGIN_VERTICAL = SPACING.lg + 4; // 28px
const LEVEL_SPACING = LEVEL_MARGIN_VERTICAL * 2 + NODE_SIZE; // ~132px
const GROUP_BANNER_HEIGHT = 80; // Approximate height of the banner + padding

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
  groupId?: Id<"levelGroups">;
  group?: {
      name: string;
      description?: string;
      order: number;
      theme?: {
          primaryColor: string;
          secondaryColor?: string;
          backgroundImage?: string;
          emoji?: string;
      }
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
    <View
      style={[styles.orbContainer, { left: x - 12, top: y - 12 }]}
    >
      <View style={[styles.orbGlowRing, { backgroundColor: color }]} />
      <View style={[styles.orbCore, { backgroundColor: color }]}>
        <View style={styles.orbShine} />
      </View>
      <View style={styles.orbSparkle}>
        <Text style={styles.sparkleText}>✦</Text>
      </View>
    </View>
  );
});

// Path Segment rendered within each list item
const PathSegment = memo(function PathSegment({
  isLeft,
  screenWidth,
  state,
  nextState,
  endOffsetY = 0,
}: {
  isLeft: boolean;
  screenWidth: number;
  state: "locked" | "unlocked" | "completed" | "coming_soon";
  nextState?: "locked" | "unlocked" | "completed" | "coming_soon";
  endOffsetY?: number; // How much lower the next node is (due to banner)
}) {
  const startX = isLeft ? screenWidth * 0.25 : screenWidth * 0.75;
  const endX = isLeft ? screenWidth * 0.75 : screenWidth * 0.25;
  const startY = NODE_SIZE / 2; // Start from center of node
  const endY = LEVEL_SPACING + NODE_SIZE / 2 + endOffsetY; // End at center of next node

  // Bezier curve
  const midY = (startY + endY) / 2;
  const pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
  
  // Decide colors based on transition
  const isLockedTransition = state === 'locked' || nextState === 'locked';
  
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
      <Svg width={screenWidth} height={LEVEL_SPACING + NODE_SIZE + endOffsetY}>
        {/* Simplified Path - Single stroke instead of multiple layers/gradients */}
        {!isLockedTransition ? (
          <Path
            d={pathD}
            stroke={COLORS.primaryLight}
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
            opacity={0.3}
          />
        ) : (
          <Path
            d={pathD}
            stroke="#D0D0D0"
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
            opacity={0.3}
            strokeDasharray="8,8"
          />
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
  isGroupStart,
  nextIsGroupStart,
}: {
  level: LevelWithProgress;
  index: number;
  totalLevels: number;
  screenWidth: number;
  nextLevel?: LevelWithProgress;
  onPress: (level: LevelWithProgress) => void;
  isGroupStart?: boolean;
  nextIsGroupStart?: boolean;
}) {
  const isLeft = index % 2 === 0;
  
  // Calculate orb position (midway on the path)
  // Approximate midpoint of the Bezier curve is roughly center of screen width, mid-height
  const orbX = screenWidth / 2; 
  const orbY = LEVEL_SPACING * 0.65; // Slightly lower than center looks better visually

  // If next item starts a group, we need to extend the path and push the next node down visually
  // But wait, the banner is part of the NEXT item's rendering usually if we want it "between".
  // Actually, if we render the banner at the TOP of the group start item, 
  // then the path from THIS item needs to connect to the node of the NEXT item, 
  // which is now pushed down by the banner height.
  
  const nextItemHasBanner = nextIsGroupStart; 
  const extraPathHeight = nextItemHasBanner ? GROUP_BANNER_HEIGHT : 0;

  return (
    <View style={{ marginBottom: 0 }}>
      {/* Group Banner (if this level starts a group) */}
      {isGroupStart && level.group && (
          <GroupBanner 
            name={level.group.name}
            description={level.group.description}
            theme={level.group.theme ? {
                emoji: level.group.theme.emoji,
                primaryColor: level.group.theme.primaryColor,
                secondaryColor: level.group.theme.secondaryColor
            } : undefined} 
          />
      )}

      <View style={{ height: LEVEL_SPACING, justifyContent: 'flex-start' }}>

        {/* Path connecting to NEXT level (if exists) */}
        {index < totalLevels - 1 && (
          <PathSegment
              isLeft={isLeft}
              screenWidth={screenWidth}
              state={level.state}
              nextState={nextLevel?.state}
              endOffsetY={extraPathHeight}
          />
        )}
        
        {/* Animated Level Node - Static View for performance */}
        <View
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
          {/* Offline Ready badge */}
          {getCachedQuestions(level._id) && (
            <View style={{
              position: 'absolute',
              bottom: -2,
              alignSelf: 'center',
              backgroundColor: '#2E7D32',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
            }}>
              <Text style={{ fontSize: 8, color: '#fff', fontWeight: '600' }}>📥 Offline</Text>
            </View>
          )}
        </View>
        
        {/* Orb decoration halfway to next node */}
        {index < totalLevels - 1 && (
          <GlowingOrb
              x={orbX}
              y={orbY + (extraPathHeight / 2)} // Adjust orb position slightly if path is longer
              delay={200}
              color={level.state !== 'locked' ? COLORS.accentGold : '#A8A8A8'}
          />
        )}
      </View>
    </View>
  );
});


export default function LevelPath() {
  const { token } = useChildAuth();
  const { safePush } = useSafeNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const listRef = React.useRef<any>(null);

  // Fetch levels with progress (offline-first)
  const levels = useOfflineLevels();

  const hasScrolledRef = React.useRef(false);

  // Auto-scroll to current level
  React.useEffect(() => {
    if (levels && levels.length > 0 && listRef.current && !hasScrolledRef.current) {
        hasScrolledRef.current = true;
        // Find the index of the first unlocked level (or the first level that is NOT completed/locked if we want "current" to be the one they are working on)
        // Logic:
        // 1. Find the first 'unlocked' level. This is the one user is currently playing.
        // 2. If no 'unlocked' level found, maybe they completed everything? Then show the last one.
        // 3. Or maybe they are all locked (shouldn't happen)? Show first.
        
        let targetIndex = levels.findIndex(l => l.state === 'unlocked');
        
        // If everything is completed, targetIndex will be -1. Scroll to the last one.
        if (targetIndex === -1) {
            // Check if any check for completion
             const allCompleted = levels.every(l => l.state === 'completed');
             if (allCompleted) {
                 targetIndex = levels.length - 1;
             } else {
                 // Fallback to 0 if weird state
                 targetIndex = 0;
             }
        }

        // Add a small delay for layout to stabilize if needed, 
        // though usually with estimatedItemSize it should be okay-ish.
        // FlashList recommends using initialScrollIndex if possible for initial mount,
        // but since data is async, we use scrollToIndex.
        setTimeout(() => {
            listRef.current?.scrollToIndex({
                index: targetIndex,
                animated: false, // Instant scroll for initial load
                viewPosition: 0.8, // 0 is top, 1 is bottom. 0.8 puts it near the bottom.
            });
        }, 100);
    }
  }, [levels]);

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
    const nextLevel = levels?.[index + 1];
    const isGroupStart = index === 0 || (levels?.[index - 1]?.groupId !== item.groupId && !!item.groupId);
    const nextIsGroupStart = nextLevel ? (item.groupId !== nextLevel.groupId && !!nextLevel.groupId) : false;

    return (
      <LevelListItem 
        level={item}
        index={index}
        totalLevels={levels?.length || 0}
        screenWidth={screenWidth}
        nextLevel={nextLevel}
        onPress={handleLevelPress}
        isGroupStart={isGroupStart}
        nextIsGroupStart={nextIsGroupStart}
      />
    );
  }, [levels, screenWidth, handleLevelPress]);

  const keyExtractor = useCallback((item: LevelWithProgress) => item._id, []);

  const { isConnected } = useNetwork();

  if (!levels) {
    // First launch while offline
    if (isConnected === false) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📡</Text>
          <Text style={styles.emptyText}>Connect to internet</Text>
          <Text style={styles.emptySubtext}>
            Download content to play offline.
          </Text>
        </View>
      );
    }
    
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
  const SafeFlashList = FlashList as unknown as React.ComponentType<FlashListProps<LevelWithProgress> & { estimatedItemSize: number; ref?: React.Ref<any> }>;

  return (
    <View style={styles.container}>
      <SafeFlashList
        ref={listRef}
        data={levels}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={LEVEL_SPACING} 
        drawDistance={1000}
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
