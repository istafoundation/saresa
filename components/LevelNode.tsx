// Level Node Component - Cute, friendly candy-style level bubbles
// ✨ Glossy candy appearance with playful animations
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

export type LevelState = 'locked' | 'unlocked' | 'completed' | 'coming_soon';

interface LevelNodeProps {
  levelNumber: number;
  name: string;
  state: LevelState;
  theme?: {
    emoji: string;
    color: string;
  };
  progress?: {
    difficultyProgress: Array<{
      difficultyName: string;
      passed: boolean;
    }>;
  };
  totalDifficulties: number; // Actual count of difficulties for this level
  onPress: () => void;
  isLeft: boolean;
}

// Candy-like gradient colors - more vibrant and glossy
const CANDY_GRADIENTS: { colors: [string, string, string]; glow: string }[] = [
  { colors: ['#FF7B8A', '#FF5C6C', '#E84A5F'], glow: '#FF5C6C' }, // Cherry
  { colors: ['#5CE1E6', '#42C9CE', '#2EB8BE'], glow: '#42C9CE' }, // Mint
  { colors: ['#6EC1FF', '#4AAEF7', '#2D9CDB'], glow: '#4AAEF7' }, // Blueberry
  { colors: ['#A8E6A3', '#8CD987', '#6FCF68'], glow: '#8CD987' }, // Apple
  { colors: ['#FFD166', '#FFB830', '#FFA502'], glow: '#FFB830' }, // Lemon
  { colors: ['#E2A4FF', '#D177F3', '#BB6BD9'], glow: '#D177F3' }, // Grape
  { colors: ['#FF9F9F', '#FF7B7B', '#FF5757'], glow: '#FF7B7B' }, // Strawberry
  { colors: ['#7FE5D0', '#5DD9C1', '#3ECFAE'], glow: '#5DD9C1' }, // Lime
  { colors: ['#FFB8E0', '#FF94CC', '#FF70B8'], glow: '#FF94CC' }, // Bubblegum
  { colors: ['#9DBFFF', '#7BA3FF', '#5987FF'], glow: '#7BA3FF' }, // Sapphire
];

// Cute emojis for levels
const LEVEL_EMOJIS = ['🌟', '⭐', '✨', '💫', '🎯', '🎨', '🎪', '🎭', '🎮', '🏆', '👑', '💎'];

export default function LevelNode({
  levelNumber,
  name,
  state,
  theme,
  progress,
  totalDifficulties,
  onPress,
  isLeft,
}: LevelNodeProps) {
  const isInteractive = state === 'unlocked' || state === 'completed';
  const passedCount = progress?.difficultyProgress.filter(d => d.passed).length ?? 0;
  
  // Get candy gradient based on level
  const getCandyGradient = () => {
    const gradient = CANDY_GRADIENTS[(levelNumber - 1) % CANDY_GRADIENTS.length];
    switch (state) {
      case 'completed':
        return theme?.color 
          ? { colors: [theme.color, theme.color, theme.color] as [string, string, string], glow: theme.color }
          : gradient;
      case 'unlocked':
        return gradient;
      case 'locked':
        return { colors: ['#C4C4C4', '#A8A8A8', '#8C8C8C'] as [string, string, string], glow: '#A8A8A8' };
      case 'coming_soon':
        return { colors: ['#D8D8D8', '#C0C0C0', '#A8A8A8'] as [string, string, string], glow: '#C0C0C0' };
      default:
        return { colors: ['#C4C4C4', '#A8A8A8', '#8C8C8C'] as [string, string, string], glow: '#A8A8A8' };
    }
  };
  
  const candyGradient = getCandyGradient();
  const levelEmoji = theme?.emoji ?? LEVEL_EMOJIS[(levelNumber - 1) % LEVEL_EMOJIS.length];
  
  return (
    <View
      style={[
        styles.container,
        isLeft ? styles.containerLeft : styles.containerRight,
      ]}
    >
      <Pressable
        onPress={isInteractive ? onPress : undefined}
        style={({ pressed }) => [
          styles.nodeWrapper,
          pressed && isInteractive && styles.nodePressed,
        ]}
      >
        {/* Enhanced glow pulse for unlocked (current) levels - multiple layers */}
        {state === 'unlocked' && (
          <>
            {/* Outer pulsing ring */}
            <MotiView
              from={{ opacity: 0.2, scale: 1 }}
              animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.15, 1] }}
              transition={{ type: 'timing', duration: 2000, loop: true }}
              style={[styles.glowHaloOuter, { backgroundColor: candyGradient.glow }]}
            />
            {/* Inner glow pulse */}
            <MotiView
              from={{ opacity: 0.4 }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ type: 'timing', duration: 1800, loop: true }}
              style={[styles.glowHalo, { backgroundColor: candyGradient.glow }]}
            />
          </>
        )}

        {/* Outer candy shell ring */}
        {isInteractive && (
          <View style={[styles.candyShellRing, { borderColor: candyGradient.glow + '50' }]} />
        )}
        
        {/* Main candy node */}
        <LinearGradient
          colors={candyGradient.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.node,
            state === 'completed' && styles.nodeCompleted,
            state === 'unlocked' && styles.nodeUnlocked,
          ]}
        >
          {/* Top glossy shine - candy highlight effect */}
          <View style={styles.glossyShineTop} />
          <View style={styles.glossyShineDot} />
          
          {/* Content */}
          {state === 'completed' ? (
            <Text style={styles.levelNumber}>{levelNumber}</Text>
          ) : state === 'coming_soon' ? (
            <View style={styles.lockContainer}>
              <Ionicons name="time-outline" size={22} color="#FFFFFF90" />
            </View>
          ) : state === 'locked' ? (
            <View style={styles.lockContainer}>
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
            </View>
          ) : (
            <Text style={styles.levelNumber}>{levelNumber}</Text>
          )}
        </LinearGradient>
        
        {/* Completed checkmark badge - OUTSIDE the node circle */}
        {state === 'completed' && (
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'timing', duration: 300, delay: levelNumber * 80 + 150 }}
            style={styles.completeBadgeOuter}
          >
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </MotiView>
        )}
        
        {/* Sparkle indicator for unlocked - animated */}
        {state === 'unlocked' && (
          <MotiView
            from={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.2, 1] }}
            transition={{ type: 'timing', duration: 1500, loop: true }}
            style={[styles.sparkle, { top: -8, right: 0 }]}
          >
            <Text style={styles.sparkleText}>✨</Text>
          </MotiView>
        )}
      </Pressable>
      
      {/* Level info card - candy wrapper style */}
      <View style={[
        styles.infoCard,
        isLeft ? styles.infoCardLeft : styles.infoCardRight,
        (state === 'locked' || state === 'coming_soon') && styles.infoCardMuted,
      ]}>
        <View style={[styles.infoCardInner, isLeft ? styles.infoCardInnerLeft : styles.infoCardInnerRight]}>
          <Text style={[
            styles.levelName,
            (state === 'locked' || state === 'coming_soon') && styles.textMuted,
          ]} numberOfLines={1}>
            {name}
          </Text>
          
          {state === 'coming_soon' ? (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Soon!</Text>
            </View>
          ) : state !== 'locked' && (
            <View style={styles.starsContainer}>
              {Array.from({ length: totalDifficulties }).map((_, i) => (
                <MotiView
                  key={i}
                  from={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: 'timing', 
                    duration: 250,
                    delay: levelNumber * 80 + i * 60 + 200,
                  }}
                >
                  <Text style={[styles.starEmoji, i < passedCount && styles.starFilled]}>
                    {i < passedCount ? '⭐' : '☆'}
                  </Text>
                </MotiView>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const NODE_SIZE = 76;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg + 4,
    paddingHorizontal: SPACING.xl,
    zIndex: 10,
  },
  containerLeft: {
    justifyContent: 'flex-start',
  },
  containerRight: {
    justifyContent: 'flex-end',
  },
  nodeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodePressed: {
    transform: [{ scale: 0.9 }],
  },
  glowHalo: {
    position: 'absolute',
    width: NODE_SIZE + 24,
    height: NODE_SIZE + 24,
    borderRadius: (NODE_SIZE + 24) / 2,
    opacity: 0.4,
  },
  glowHaloOuter: {
    position: 'absolute',
    width: NODE_SIZE + 40,
    height: NODE_SIZE + 40,
    borderRadius: (NODE_SIZE + 40) / 2,
    opacity: 0.2,
  },
  candyShellRing: {
    position: 'absolute',
    width: NODE_SIZE + 12,
    height: NODE_SIZE + 12,
    borderRadius: (NODE_SIZE + 12) / 2,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  glossyShineTop: {
    position: 'absolute',
    width: NODE_SIZE * 0.55,
    height: NODE_SIZE * 0.25,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: NODE_SIZE,
    top: 8,
    left: 12,
    transform: [{ rotate: '-20deg' }],
  },
  glossyShineDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 4,
    top: 12,
    right: 18,
  },
  nodeCompleted: {
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  nodeUnlocked: {
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  nodeEmoji: {
    fontSize: 34,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  completeBadgeOuter: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 20,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleText: {
    fontSize: 14,
  },
  infoCard: {
    marginHorizontal: SPACING.sm,
    minWidth: 110,
  },
  infoCardLeft: {
    alignItems: 'flex-start',
  },
  infoCardRight: {
    alignItems: 'flex-end',
  },
  infoCardInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 182, 217, 0.3)',
  },
  infoCardInnerLeft: {
    alignItems: 'flex-start',
  },
  infoCardInnerRight: {
    alignItems: 'flex-end',
  },
  infoCardMuted: {
    opacity: 0.7,
  },
  levelName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  textMuted: {
    color: COLORS.textMuted,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  starEmoji: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  starFilled: {
    textShadowColor: COLORS.accentGold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  comingSoonBadge: {
    backgroundColor: COLORS.rainbow4 + '40',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  comingSoonText: {
    fontSize: 11,
    color: COLORS.rainbow4,
    fontWeight: '600',
  },
});
