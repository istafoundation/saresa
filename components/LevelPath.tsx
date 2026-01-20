// Level Path Component - Candy Crush-style scrollable level path
// ✨ Magical fairy dust trail with glowing orb waypoints
import { useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "convex/react";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
} from "react-native-svg";
import { MotiView } from "moti";
import { api } from "../convex/_generated/api";
import { useChildAuth } from "../utils/childAuth";
import { useSafeNavigation } from "../utils/useSafeNavigation";
import { COLORS, SPACING } from "../constants/theme";
import LevelNode from "./LevelNode";
import type { Id } from "../convex/_generated/dataModel";

// Constants for layout calculation - derived from LevelNode styles
const NODE_SIZE = 76;
const LEVEL_MARGIN_VERTICAL = SPACING.lg + 4; // 28px
const LEVEL_SPACING = LEVEL_MARGIN_VERTICAL * 2 + NODE_SIZE; // ~132px
const PATH_START_Y = 60;
const MAX_ANIMATION_DELAY = 800; // Cap delays to prevent slow animations

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

// Floating candy decoration component (removed unused delay prop)
function FloatingCandy({
  x,
  y,
  size,
  color,
  shouldAnimate = false,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  shouldAnimate?: boolean;
}) {
  const candyContent = (
    <View
      style={[
        styles.candyBall,
        { width: size, height: size, backgroundColor: color },
      ]}
    >
      <View
        style={[
          styles.candyShine,
          { width: size * 0.35, height: size * 0.2 },
        ]}
      />
    </View>
  );

  if (shouldAnimate) {
    return (
      <MotiView
        from={{ translateY: 0 }}
        animate={{ translateY: [-6, 6, -6] }}
        transition={{ type: 'timing', duration: 3000, loop: true }}
        style={[styles.candyDecor, { left: x, top: y }]}
      >
        {candyContent}
      </MotiView>
    );
  }

  return (
    <View style={[styles.candyDecor, { left: x, top: y }]}>
      {candyContent}
    </View>
  );
}

// Glowing orb waypoint between nodes
function GlowingOrb({
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
        delay: Math.min(delay * 80, MAX_ANIMATION_DELAY),
      }}
      style={[styles.orbContainer, { left: x - 12, top: y - 12 }]}
    >
      {/* Static glow ring */}
      <View style={[styles.orbGlowRing, { backgroundColor: color }]} />
      {/* Inner orb */}
      <View style={[styles.orbCore, { backgroundColor: color }]}>
        <View style={styles.orbShine} />
      </View>
      {/* Static sparkle */}
      <View style={styles.orbSparkle}>
        <Text style={styles.sparkleText}>✦</Text>
      </View>
    </MotiView>
  );
}

// Magical path with fairy dust trail
function MagicalPath({
  height,
  levels,
  screenWidth,
}: {
  height: number;
  levels: LevelWithProgress[];
  screenWidth: number;
}) {
  const levelCount = levels.length;
  
  // Generate path data with connected orbs as waypoints
  const pathData = useMemo(() => {
    const magicColors = [
      COLORS.primary,
      COLORS.accent,
      COLORS.accentGold,
      COLORS.rainbow4,
      COLORS.rainbow5,
    ];
    
    const grayColor = '#A8A8A8';
    
    const orbPositions: Array<{ 
      x: number; 
      y: number; 
      delay: number; 
      color: string; 
      isLocked: boolean;
      levelId: string;
    }> = [];
    
    // Generate orb positions at each level position with bounds checking
    for (let i = 0; i < levelCount; i++) {
      const level = levels[i];
      if (!level) continue; // Bounds safety check
      
      const y = PATH_START_Y + i * LEVEL_SPACING;
      const isLeft = i % 2 === 0;
      const nodeX = isLeft 
        ? screenWidth * 0.25
        : screenWidth * 0.75;
      
      const isLocked = level.state === 'locked' || level.state === 'coming_soon';
      
      orbPositions.push({
        x: nodeX,
        y: y,
        delay: i,
        color: isLocked ? grayColor : magicColors[i % magicColors.length],
        isLocked,
        levelId: level._id,
      });
    }
    
    // Generate paths with smooth transition between unlocked and locked
    let unlockedPath = '';
    let lockedPath = '';
    
    if (orbPositions.length > 0) {
      // Find the transition point (first locked level)
      let transitionIndex = orbPositions.findIndex(orb => orb.isLocked);
      if (transitionIndex === -1) transitionIndex = orbPositions.length;
      
      // Build unlocked path
      for (let i = 0; i < transitionIndex; i++) {
        const curr = orbPositions[i];
        if (i === 0) {
          unlockedPath = `M ${curr.x} ${curr.y}`;
        } else {
          const prev = orbPositions[i - 1];
          const midY = (prev.y + curr.y) / 2;
          unlockedPath += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
        }
      }
      
      // Build locked path - starts from the last unlocked position for smooth connection
      if (transitionIndex < orbPositions.length) {
        const startOrb = transitionIndex > 0 
          ? orbPositions[transitionIndex - 1] 
          : orbPositions[transitionIndex];
        
        lockedPath = `M ${startOrb.x} ${startOrb.y}`;
        
        for (let i = transitionIndex; i < orbPositions.length; i++) {
          const prev = i === transitionIndex && transitionIndex > 0
            ? orbPositions[transitionIndex - 1]
            : orbPositions[i - 1];
          const curr = orbPositions[i];
          const midY = (prev.y + curr.y) / 2;
          lockedPath += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
        }
      }
    }
    
    return {
      unlockedPath,
      lockedPath,
      orbPositions,
    };
  }, [levelCount, levels, screenWidth]);

  return (
    <View style={styles.svgPath}>
      {/* SVG path lines */}
      <Svg width={screenWidth} height={height}>
        <Defs>
          {/* Magical gradient for main path */}
          <LinearGradient id="magicGradient" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.8" />
            <Stop offset="0.5" stopColor={COLORS.accent} stopOpacity="0.9" />
            <Stop offset="1" stopColor={COLORS.accentGold} stopOpacity="0.8" />
          </LinearGradient>
          {/* Fairy dust glow */}
          <LinearGradient id="dustGlow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={COLORS.accentGold} stopOpacity="0.6" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.8" />
            <Stop offset="1" stopColor={COLORS.accentGold} stopOpacity="0.6" />
          </LinearGradient>
          {/* Connector glow gradient */}
          <LinearGradient id="connectorGlow" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.9" />
            <Stop offset="0.3" stopColor={COLORS.rainbow4} stopOpacity="0.8" />
            <Stop offset="0.6" stopColor={COLORS.accent} stopOpacity="0.9" />
            <Stop offset="1" stopColor={COLORS.accentGold} stopOpacity="0.9" />
          </LinearGradient>
        </Defs>
        
        {/* UNLOCKED PATH - Colorful gradient */}
        {pathData.unlockedPath && (
          <>
            {/* Outer glow layer for unlocked */}
            <Path
              d={pathData.unlockedPath}
              stroke={COLORS.primaryLight}
              strokeWidth={24}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.15}
            />
            
            {/* Middle glow layer for unlocked */}
            <Path
              d={pathData.unlockedPath}
              stroke={COLORS.accent}
              strokeWidth={14}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.25}
            />
            
            {/* Main unlocked path - colorful */}
            <Path
              d={pathData.unlockedPath}
              stroke="url(#connectorGlow)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            
            {/* Bright core line for unlocked */}
            <Path
              d={pathData.unlockedPath}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.7}
            />
          </>
        )}
        
        {/* LOCKED PATH - Gray color */}
        {pathData.lockedPath && (
          <>
            {/* Outer glow layer for locked - subtle gray */}
            <Path
              d={pathData.lockedPath}
              stroke="#D0D0D0"
              strokeWidth={20}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.1}
            />
            
            {/* Main locked path - gray */}
            <Path
              d={pathData.lockedPath}
              stroke="#B8B8B8"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.6}
            />
            
            {/* Dashed overlay for locked feeling */}
            <Path
              d={pathData.lockedPath}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.3}
              strokeDasharray="8,8"
            />
          </>
        )}
        
        {/* Orb glow circles in SVG */}
        {pathData.orbPositions.map((orb) => (
          <Circle
            key={`orb-glow-${orb.levelId}`}
            cx={orb.x}
            cy={orb.y}
            r={12}
            fill={orb.color}
            opacity={orb.isLocked ? 0.3 : 0.5}
          />
        ))}
      </Svg>
      
      {/* Glowing orb waypoints */}
      {pathData.orbPositions.map((orb) => (
        <GlowingOrb
          key={`orb-${orb.levelId}`}
          x={orb.x}
          y={orb.y}
          delay={orb.delay}
          color={orb.color}
        />
      ))}
    </View>
  );
}

// Generate random candy positions for decoration
const CANDY_COLORS = [
  COLORS.rainbow1,
  COLORS.rainbow2,
  COLORS.rainbow3,
  COLORS.rainbow4,
  COLORS.rainbow5,
  COLORS.rainbow6,
];

function generateCandyDecorations(levelCount: number, screenWidth: number) {
  const decorations = [];
  const totalHeight = levelCount * LEVEL_SPACING + 100;
  const candyCount = Math.max(levelCount * 2, 1); // Prevent division by zero
  const spacingY = totalHeight / candyCount;

  for (let i = 0; i < candyCount; i++) {
    // Use seeded pseudo-random for consistent positions
    const seed = (i + 1) * 0.618033988749895;
    const randomX = seededRandom(seed * 1000) * 40;
    const randomY = seededRandom(seed * 500) * spacingY * 0.4;
    const randomSize = 12 + seededRandom(seed * 100) * 10;
    
    decorations.push({
      id: `candy-${i}`,
      x: i % 2 === 0
        ? 20 + randomX
        : screenWidth - 60 - randomX,
      y: 60 + i * spacingY + randomY,
      size: randomSize,
      color: CANDY_COLORS[i % CANDY_COLORS.length],
      animationDuration: 2500 + seededRandom(seed * 200) * 1000,
    });
  }
  return decorations;
}

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

  const candyDecorations = useMemo(
    () => generateCandyDecorations(levels?.length || 5, screenWidth),
    [levels?.length, screenWidth],
  );

  const pathHeight = useMemo(
    () => (levels?.length || 5) * LEVEL_SPACING + 100,
    [levels?.length],
  );

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


  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Magical fairy dust path */}
      <MagicalPath 
        height={pathHeight} 
        levels={levels}
        screenWidth={screenWidth}
      />

      {/* Floating candy decorations - continuous looping animation */}
      {candyDecorations.map((candy) => (
        <MotiView
          key={candy.id}
          from={{ translateY: 0 }}
          animate={{ translateY: [-5, 5, -5] }}
          transition={{ 
            type: 'timing', 
            duration: candy.animationDuration || 2500,
            loop: true,
          }}
          style={{ opacity: 0.85 }}
        >
          <FloatingCandy
            x={candy.x}
            y={candy.y}
            size={candy.size}
            color={candy.color}
            shouldAnimate={false}
          />
        </MotiView>
      ))}

      {/* Level nodes - top to bottom order with capped staggered delays */}
      {levels.map((level, index) => (
        <MotiView
          key={level._id}
          from={{ opacity: 0, translateY: 40, translateX: index % 2 === 0 ? -20 : 20 }}
          animate={{ opacity: 1, translateY: 0, translateX: 0 }}
          transition={{ 
            type: 'timing', 
            duration: 350,
            delay: Math.min(100 + (index * 80), MAX_ANIMATION_DELAY),
          }}
        >
          <LevelNode
            levelNumber={level.levelNumber}
            name={level.name}
            state={level.state}
            theme={level.theme}
            progress={level.progress ?? undefined}
            totalDifficulties={level.difficulties.length}
            onPress={() => handleLevelPress(level)}
            isLeft={index % 2 === 0}
          />
        </MotiView>
      ))}

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: SPACING.lg,
    position: "relative",
  },
  svgPath: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  candyDecor: {
    position: "absolute",
    zIndex: 0,
  },
  candyBall: {
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  candyShine: {
    position: "absolute",
    top: 3,
    left: 4,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 999,
    transform: [{ rotate: "-30deg" }],
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
