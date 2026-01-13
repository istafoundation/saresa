// Level Up Animation - Celebration overlay
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { LEVELS } from '../../constants/levels';

const { width, height } = Dimensions.get('window');

interface LevelUpAnimationProps {
  newLevel: number;
  unlockedArtifact?: string;
  onComplete: () => void;
}

// Confetti particle
function ConfettiPiece({ 
  delay, 
  startX, 
  color 
}: { 
  delay: number; 
  startX: number; 
  color: string;
}) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const endX = (Math.random() - 0.5) * 200;
    
    translateY.value = withDelay(
      delay,
      withTiming(height + 100, { 
        duration: 2500 + Math.random() * 1000,
        easing: Easing.out(Easing.quad),
      })
    );
    translateX.value = withDelay(
      delay,
      withSequence(
        withTiming(endX * 0.3, { duration: 500 }),
        withTiming(endX, { duration: 2000 })
      )
    );
    rotate.value = withDelay(
      delay,
      withTiming(360 * (2 + Math.random() * 3), { 
        duration: 3000,
        easing: Easing.linear,
      })
    );
    opacity.value = withDelay(
      delay + 2000,
      withTiming(0, { duration: 500 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const size = 8 + Math.random() * 8;
  const isSquare = Math.random() > 0.5;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: 0,
          width: size,
          height: isSquare ? size : size * 2,
          backgroundColor: color,
          borderRadius: isSquare ? 2 : size,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function LevelUpAnimation({
  newLevel,
  unlockedArtifact,
  onComplete,
}: LevelUpAnimationProps) {
  const levelInfo = LEVELS[newLevel - 1];
  const scale = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  // Generate confetti pieces
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    delay: Math.random() * 500,
    startX: Math.random() * width,
    color: [
      COLORS.accentGold,
      COLORS.primary,
      COLORS.primaryLight,
      COLORS.accent,
      '#FF6B6B',
      '#4ECDC4',
    ][Math.floor(Math.random() * 6)],
  }));

  useEffect(() => {
    // Trigger haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    bgOpacity.value = withTiming(1, { duration: 300 });
    scale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );

    // Auto-close after animation
    const timer = setTimeout(() => {
      bgOpacity.value = withTiming(0, { duration: 300 });
      setTimeout(() => onComplete(), 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, bgStyle]}>
      {/* Confetti */}
      {confettiPieces.map((piece) => (
        <ConfettiPiece
          key={piece.id}
          delay={piece.delay}
          startX={piece.startX}
          color={piece.color}
        />
      ))}

      {/* Level Up Card */}
      <Animated.View style={cardStyle}>
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary]}
          style={styles.card}
        >
          {/* Stars */}
          <MotiView
            from={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 300 }}
            style={styles.starsContainer}
          >
            <Text style={styles.stars}>⭐ ⭐ ⭐</Text>
          </MotiView>

          {/* Level Up Text */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 200 }}
          >
            <Text style={styles.levelUpText}>LEVEL UP!</Text>
          </MotiView>

          {/* Level Number */}
          <MotiView
            from={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 400 }}
            style={styles.levelContainer}
          >
            <Text style={styles.levelNumber}>{newLevel}</Text>
          </MotiView>

          {/* Title */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 500, delay: 600 }}
          >
            <Text style={styles.titleText}>{levelInfo?.title}</Text>
          </MotiView>

          {/* Artifact Unlock */}
          {unlockedArtifact && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 1000 }}
              style={styles.artifactUnlock}
            >
              <Text style={styles.artifactUnlockText}>✨ New Artifact Unlocked!</Text>
            </MotiView>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Tap to continue */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 500, delay: 2500 }}
        style={styles.tapContainer}
      >
        <Text style={styles.tapText}>Tap anywhere to continue</Text>
      </MotiView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  card: {
    width: width * 0.85,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  starsContainer: {
    marginBottom: SPACING.md,
  },
  stars: {
    fontSize: 32,
  },
  levelUpText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accentGold,
    letterSpacing: 4,
    marginBottom: SPACING.md,
  },
  levelContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.lg,
    shadowColor: COLORS.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.background,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  artifactUnlock: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.accentGold + '30',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  artifactUnlockText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accentGold,
  },
  tapContainer: {
    position: 'absolute',
    bottom: 60,
  },
  tapText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
