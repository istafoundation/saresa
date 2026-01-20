// Level Path Component - Candy Crush-style scrollable level path
// ✨ Magical fairy dust trail with glowing orb waypoints
import { useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  Text,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

// Floating candy decoration component
// Selective animation - only some candies bob gently for performance
function FloatingCandy({
  x,
  y,
  size,
  color,
  delay,
  shouldAnimate = false,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
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
// Static orb waypoint - entry animation only for performance
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
        delay: delay * 80,
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
  levelCount,
  levels,
}: {
  height: number;
  levelCount: number;
  levels: Array<{ state: 'locked' | 'unlocked' | 'completed' | 'coming_soon' }>;
}) {
  // Generate path data with connected orbs as waypoints
  // LevelNode has marginVertical: 28px (SPACING.lg + 4), NODE_SIZE: 76px
  // Total spacing per level = 28*2 + some flex spacing ≈ 132px
  const pathData = useMemo(() => {
    const levelSpacing = 132; // Matches LevelNode marginVertical*2 + height
    const startY = 60; // Account for content paddingTop + first node position
    const amplitude = 60;
    const centerX = SCREEN_WIDTH / 2;
    
    const orbPositions: Array<{ x: number; y: number; delay: number; color: string; isLocked: boolean }> = [];
    
    const magicColors = [
      COLORS.primary,      // Pink
      COLORS.accent,       // Blue  
      COLORS.accentGold,   // Gold
      COLORS.rainbow4,     // Lavender
      COLORS.rainbow5,     // Light blue
    ];
    
    const grayColor = '#A8A8A8'; // Gray for locked levels
    
    // Generate orb positions at each level position
    for (let i = 0; i < levelCount; i++) {
      // Calculate Y position to match where level nodes render
      const y = startY + i * levelSpacing;
      
      // Alternate left/right based on isLeft prop (index % 2 === 0 is left)
      const isLeft = i % 2 === 0;
      // Position orbs near the level nodes (offset from center)
      const nodeX = isLeft 
        ? SCREEN_WIDTH * 0.25  // Left side
        : SCREEN_WIDTH * 0.75; // Right side
      
      const levelState = levels[i]?.state;
      const isLocked = levelState === 'locked' || levelState === 'coming_soon';
      
      orbPositions.push({
        x: nodeX,
        y: y,
        delay: i,
        color: isLocked ? grayColor : magicColors[i % magicColors.length],
        isLocked,
      });
    }
    
    // Generate separate paths for unlocked and locked segments
    let unlockedPath = '';
    let lockedPath = '';
    
    if (orbPositions.length > 0) {
      for (let i = 0; i < orbPositions.length; i++) {
        if (i === 0) {
          // First point - start path based on whether it's locked
          if (orbPositions[i].isLocked) {
            lockedPath = `M ${orbPositions[i].x} ${orbPositions[i].y}`;
          } else {
            unlockedPath = `M ${orbPositions[i].x} ${orbPositions[i].y}`;
          }
        } else {
          const prev = orbPositions[i - 1];
          const curr = orbPositions[i];
          const midY = (prev.y + curr.y) / 2;
          const segment = ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
          
          // If current is locked, add to locked path
          if (curr.isLocked) {
            // Start locked path if not started, from previous point
            if (!lockedPath) {
              lockedPath = `M ${prev.x} ${prev.y}`;
            }
            lockedPath += segment;
          } else {
            // Add to unlocked path
            if (!unlockedPath) {
              unlockedPath = `M ${prev.x} ${prev.y}`;
            }
            unlockedPath += segment;
          }
        }
      }
    }
    
    return {
      unlockedPath,
      lockedPath,
      orbPositions,
    };
  }, [levelCount, levels]);

  return (
    <View style={styles.svgPath}>
      {/* SVG path lines */}
      <Svg width={SCREEN_WIDTH} height={height}>
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
        {pathData.orbPositions.map((orb, index) => (
          <Circle
            key={`orb-glow-${index}`}
            cx={orb.x}
            cy={orb.y}
            r={12}
            fill={orb.color}
            opacity={orb.isLocked ? 0.3 : 0.5}
          />
        ))}
      </Svg>
      
      {/* Glowing orb waypoints */}
      {pathData.orbPositions.map((orb, index) => (
        <GlowingOrb
          key={`orb-${index}`}
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
  COLORS.rainbow1, // Coral
  COLORS.rainbow2, // Teal
  COLORS.rainbow3, // Yellow
  COLORS.rainbow4, // Lavender
  COLORS.rainbow5, // Light blue
  COLORS.rainbow6, // Mint
];

function generateCandyDecorations(levelCount: number) {
  const decorations = [];
  const totalHeight = levelCount * 132 + 100;
  const candyCount = levelCount * 2;
  const spacingY = totalHeight / candyCount;

  for (let i = 0; i < candyCount; i++) {
    // Use seeded pseudo-random for consistent positions
    const seed = (i + 1) * 0.618033988749895; // Golden ratio for even distribution
    const randomX = ((seed * 1000) % 40);
    const randomY = ((seed * 500) % (spacingY * 0.4));
    const randomSize = 12 + ((seed * 100) % 10);
    
    decorations.push({
      id: i,
      x: i % 2 === 0
        ? 20 + randomX
        : SCREEN_WIDTH - 60 - randomX,
      y: 60 + i * spacingY + randomY,
      size: randomSize,
      color: CANDY_COLORS[i % CANDY_COLORS.length],
      delay: i,
      animationDuration: 2500 + ((seed * 200) % 1000), // Varied duration for natural feel
    });
  }
  return decorations;
}

export default function LevelPath() {
  const { token } = useChildAuth();
  const { safePush } = useSafeNavigation();

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
    () => generateCandyDecorations(levels?.length || 5),
    [levels?.length],
  );

  const pathHeight = useMemo(
    () => (levels?.length || 5) * 132 + 100,
    [levels?.length],
  );

  if (!levels) {
    return (
      <View style={styles.loadingContainer}>
        {/* Simple loading indicator */}
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
        levelCount={levels.length}
        levels={levels}
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
            delay={candy.delay}
            shouldAnimate={false}
          />
        </MotiView>
      ))}

      {/* Level nodes - top to bottom order with staggered delays synced to path */}
      {levels.map((level, index) => (
        <MotiView
          key={level._id}
          from={{ opacity: 0, translateY: 40, translateX: index % 2 === 0 ? -20 : 20 }}
          animate={{ opacity: 1, translateY: 0, translateX: 0 }}
          transition={{ 
            type: 'timing', 
            duration: 350,
            delay: 100 + (index * 80),
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
  candyOrbitContainer: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  orbitCandy: {
    position: "absolute",
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  orbitCandyBall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  centerPulse: {
    position: "absolute",
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
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  // Fairy dust particle styles
  fairyParticle: {
    position: "absolute",
    zIndex: 1,
  },
  particleCore: {
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  // Glowing orb waypoint styles
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
