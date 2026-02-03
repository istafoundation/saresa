// Animated Splash Screen - Custom loading animation
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface SplashAnimationProps {
  onFinish: () => void;
}

// Particle component for background effect
function Particle({ delay, x }: { delay: number; x: number }) {
  const translateY = useSharedValue(height + 50);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(-50, { duration: 4000 + Math.random() * 2000, easing: Easing.linear }),
        -1
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 500 }),
          withTiming(0.6, { duration: 3000 }),
          withTiming(0, { duration: 500 })
        ),
        -1
      )
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.5, { duration: 1000 })
        ),
        -1
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: x },
        animatedStyle,
      ]}
    />
  );
}

// Om Symbol Animation
function OmSymbol() {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withDelay(500, withTiming(1.2, { duration: 800, easing: Easing.out(Easing.back(1.5)) })),
      withTiming(1, { duration: 300 })
    );
    rotation.value = withDelay(
      1000,
      withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1
      )
    );
    glow.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0.3, { duration: 1500 })
        ),
        -1
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: 0.3 + glow.value * 0.4,
  }));

  return (
    <Animated.View style={[styles.omContainer, animatedStyle]}>
      <Text style={styles.omSymbol}>ॐ</Text>
    </Animated.View>
  );
}

export default function SplashAnimation({ onFinish }: SplashAnimationProps) {
  const [showMascot, setShowMascot] = useState(false);
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    delay: Math.random() * 2000,
    x: Math.random() * width,
  }));

  useEffect(() => {
    // Show mascot after initial animation
    const mascotTimer = setTimeout(() => setShowMascot(true), 1500);
    // Finish splash after full animation
    const finishTimer = setTimeout(() => onFinish(), 4000);
    
    return () => {
      clearTimeout(mascotTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight, COLORS.primaryDark]}
        style={StyleSheet.absoluteFill}
      />

      {/* Background particles */}
      {particles.map((p) => (
        <Particle key={p.id} delay={p.delay} x={p.x} />
      ))}

      {/* Om Symbol */}
      <OmSymbol />

      {/* Title */}
      <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 800, delay: 800 }}
        style={styles.titleContainer}
      >
        <Text style={styles.title}>Detective</Text>
        <Text style={styles.titleAccent}>Mythology</Text>
      </MotiView>

      {/* Mascot reveal */}
      {showMascot && (
        <MotiView
          from={{ opacity: 0, translateY: 50, scale: 0.8 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          style={styles.mascotContainer}
        >
          <Text style={styles.mascotEmoji}>🕵️</Text>
        </MotiView>
      )}

      {/* Tagline */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 600, delay: 2500 }}
        style={styles.taglineContainer}
      >
        <Text style={styles.tagline}>Uncover the mysteries...</Text>
      </MotiView>

      {/* Loading indicator */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 400, delay: 3000 }}
        style={styles.loadingContainer}
      >
        <MotiView
          from={{ width: 0 }}
          animate={{ width: 120 }}
          transition={{ type: 'timing', duration: 1000, delay: 3000 }}
          style={styles.loadingBar}
        />
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentGold,
  },
  omContainer: {
    position: 'absolute',
    opacity: 0.3,
  },
  omSymbol: {
    fontSize: 200,
    color: COLORS.primary,
    fontWeight: '300',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 42,
    fontWeight: '300',
    color: COLORS.text,
    letterSpacing: 4,
  },
  titleAccent: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.accentGold,
    letterSpacing: 2,
  },
  mascotContainer: {
    marginVertical: SPACING.xl,
  },
  mascotEmoji: {
    fontSize: 80,
  },
  taglineContainer: {
    marginTop: SPACING.lg,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    width: 120,
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
});
