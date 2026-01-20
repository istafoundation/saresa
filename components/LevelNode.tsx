// Level Node Component - Individual level in the Candy Crush-style path
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
  onPress: () => void;
  isLeft: boolean; // Alternating left/right position
}

export default function LevelNode({
  levelNumber,
  name,
  state,
  theme,
  progress,
  onPress,
  isLeft,
}: LevelNodeProps) {
  const isInteractive = state === 'unlocked' || state === 'completed';
  
  // Calculate how many difficulties are passed
  const passedCount = progress?.difficultyProgress.filter(d => d.passed).length ?? 0;
  const totalDifficulties = progress?.difficultyProgress.length ?? 3;
  
  // Get colors based on state
  const getNodeColors = (): [string, string] => {
    switch (state) {
      case 'completed':
        return [theme?.color ?? COLORS.accentGold, theme?.color ?? '#FFD700'];
      case 'unlocked':
        return [COLORS.primary, COLORS.primaryDark];
      case 'locked':
        return ['#6B7280', '#4B5563'];
      case 'coming_soon':
        return ['#9CA3AF', '#6B7280'];
      default:
        return ['#6B7280', '#4B5563'];
    }
  };
  
  const nodeColors = getNodeColors();
  
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', delay: levelNumber * 100 }}
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
        <LinearGradient
          colors={nodeColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.node,
            state === 'completed' && styles.nodeCompleted,
            state === 'unlocked' && styles.nodeUnlocked,
          ]}
        >
          {/* Level number or state icon */}
          {state === 'completed' ? (
            <Text style={styles.nodeEmoji}>{theme?.emoji ?? '⭐'}</Text>
          ) : state === 'coming_soon' ? (
            <Ionicons name="lock-closed" size={24} color="#FFFFFF80" />
          ) : state === 'locked' ? (
            <Ionicons name="lock-closed" size={24} color="#FFFFFF" />
          ) : (
            <Text style={styles.levelNumber}>{levelNumber}</Text>
          )}
        </LinearGradient>
        
        {/* Glow effect for unlocked */}
        {state === 'unlocked' && (
          <MotiView
            from={{ opacity: 0.3, scale: 1 }}
            animate={{ opacity: 0.6, scale: 1.15 }}
            transition={{
              type: 'timing',
              duration: 1500,
              loop: true,
            }}
            style={styles.glowEffect}
          />
        )}
      </Pressable>
      
      {/* Level info */}
      <View style={[
        styles.infoContainer,
        isLeft ? styles.infoLeft : styles.infoRight,
      ]}>
        <Text style={[
          styles.levelName,
          (state === 'locked' || state === 'coming_soon') && styles.textMuted,
        ]}>
          {name}
        </Text>
        
        {state === 'coming_soon' ? (
          <Text style={styles.comingSoon}>Coming Soon</Text>
        ) : state !== 'locked' && (
          <View style={styles.progressDots}>
            {Array.from({ length: totalDifficulties }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i < passedCount && styles.progressDotFilled,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </MotiView>
  );
}

const NODE_SIZE = 64;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  containerLeft: {
    justifyContent: 'flex-start',
  },
  containerRight: {
    justifyContent: 'flex-end',
  },
  nodeWrapper: {
    position: 'relative',
  },
  nodePressed: {
    transform: [{ scale: 0.95 }],
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  nodeCompleted: {
    borderWidth: 3,
    borderColor: '#FFFFFF40',
  },
  nodeUnlocked: {
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nodeEmoji: {
    fontSize: 28,
  },
  glowEffect: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: COLORS.primary,
    zIndex: -1,
  },
  infoContainer: {
    marginHorizontal: SPACING.md,
  },
  infoLeft: {
    alignItems: 'flex-start',
  },
  infoRight: {
    alignItems: 'flex-end',
  },
  levelName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  textMuted: {
    color: COLORS.textMuted,
  },
  comingSoon: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
  },
  progressDotFilled: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
});
