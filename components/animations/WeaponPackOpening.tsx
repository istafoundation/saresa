// Weapon Pack Opening Animation - Gacha-style reveal
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { type Weapon, type Rarity, getRandomWeapon } from '../../data/weapons';

const { width, height } = Dimensions.get('window');

const RARITY_COLORS: Record<Rarity, string> = {
  common: COLORS.rarityCommon,
  rare: COLORS.rarityRare,
  epic: COLORS.rarityEpic,
};

const RARITY_LABELS: Record<Rarity, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
};

interface WeaponPackOpeningProps {
  onComplete: (weapon: Weapon) => void;
  onCancel: () => void;
}

type Phase = 'ready' | 'opening' | 'reveal' | 'details';

// Sparkle effect
function Sparkle({ delay, x, y }: { delay: number; x: number; y: number }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 300 })
      )
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 })
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.sparkle, { left: x, top: y }, style]}>
      <Text style={styles.sparkleText}>✦</Text>
    </Animated.View>
  );
}

export default function WeaponPackOpening({ onComplete, onCancel }: WeaponPackOpeningProps) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [weapon, setWeapon] = useState<Weapon | null>(null);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);

  const cardRotateY = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    bgOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  const handleOpen = () => {
    if (phase !== 'ready') return;
    
    setPhase('opening');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Card shake and flip
    cardScale.value = withSequence(
      withTiming(1.1, { duration: 200 }),
      withTiming(0.9, { duration: 100 }),
      withTiming(1.05, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    // Generate weapon and set up reveal
    setTimeout(() => {
      const newWeapon = getRandomWeapon();
      setWeapon(newWeapon);
      
      // Flip card to reveal
      cardRotateY.value = withTiming(180, { 
        duration: 800,
        easing: Easing.inOut(Easing.cubic),
      });
      
      // Haptic based on rarity
      if (newWeapon.rarity === 'epic') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (newWeapon.rarity === 'rare') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Generate sparkles
      const newSparkles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height * 0.6 + height * 0.2,
        delay: Math.random() * 500,
      }));
      setSparkles(newSparkles);

      // Glow effect
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.5, { duration: 300 })
      );

      setTimeout(() => setPhase('reveal'), 800);
    }, 500);
  };

  const handleContinue = () => {
    if (weapon) {
      onComplete(weapon);
    }
  };

  const cardFrontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${cardRotateY.value}deg` },
      { scale: cardScale.value },
    ],
    backfaceVisibility: 'hidden',
  }));

  const cardBackStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${cardRotateY.value + 180}deg` },
      { scale: cardScale.value },
    ],
    backfaceVisibility: 'hidden',
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const rarityColor = weapon ? RARITY_COLORS[weapon.rarity] : COLORS.primary;

  return (
    <Animated.View style={[styles.overlay, bgStyle]}>
      {/* Sparkles */}
      {sparkles.map((s) => (
        <Sparkle key={s.id} delay={s.delay} x={s.x} y={s.y} />
      ))}

      {/* Glow effect */}
      {weapon && (
        <Animated.View style={[styles.glow, { backgroundColor: rarityColor }, glowStyle]} />
      )}

      {/* Card Container */}
      <View style={styles.cardContainer}>
        {/* Front of card (pack) */}
        <Animated.View style={[styles.card, styles.cardFront, cardFrontStyle]}>
          <LinearGradient
            colors={[COLORS.primaryDark, COLORS.primary]}
            style={styles.cardGradient}
          >
            <Text style={styles.packIcon}>🎴</Text>
            <Text style={styles.packTitle}>Weapon Pack</Text>
            <Text style={styles.packSubtitle}>Tap to open</Text>
          </LinearGradient>
        </Animated.View>

        {/* Back of card (weapon) */}
        {weapon && (
          <Animated.View style={[styles.card, styles.cardBack, cardBackStyle]}>
            <LinearGradient
              colors={[rarityColor + '40', COLORS.backgroundCard]}
              style={styles.cardGradient}
            >
              <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                <Text style={styles.rarityText}>{RARITY_LABELS[weapon.rarity]}</Text>
              </View>
              
              <Text style={styles.weaponIcon}>{weapon.icon}</Text>
              <Text style={styles.weaponName}>{weapon.name}</Text>
              <Text style={styles.weaponOwner}>{weapon.owner}</Text>
              <Text style={styles.weaponDesc} numberOfLines={3}>
                {weapon.shortDescription}
              </Text>
            </LinearGradient>
          </Animated.View>
        )}
      </View>

      {/* Action buttons */}
      {phase === 'ready' && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.buttonsContainer}
        >
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.openButton} onPress={handleOpen}>
            <LinearGradient
              colors={[COLORS.accentGold, COLORS.accent]}
              style={styles.openButtonGradient}
            >
              <Text style={styles.openButtonText}>Open Pack!</Text>
            </LinearGradient>
          </Pressable>
        </MotiView>
      )}

      {phase === 'reveal' && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 500 }}
          style={styles.buttonsContainer}
        >
          <Pressable style={styles.collectButton} onPress={handleContinue}>
            <LinearGradient
              colors={[rarityColor, COLORS.backgroundCard]}
              style={styles.collectButtonGradient}
            >
              <Text style={styles.collectButtonText}>Collect Weapon</Text>
            </LinearGradient>
          </Pressable>
        </MotiView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.3,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleText: {
    fontSize: 20,
    color: COLORS.accentGold,
  },
  cardContainer: {
    width: 250,
    height: 350,
    position: 'relative',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  cardFront: {
    zIndex: 2,
  },
  cardBack: {
    zIndex: 1,
  },
  cardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  packIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  packTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  packSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  rarityBadge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  rarityText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 2,
  },
  weaponIcon: {
    fontSize: 72,
    marginBottom: SPACING.md,
  },
  weaponName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  weaponOwner: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  weaponDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  openButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  openButtonGradient: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
  },
  collectButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  collectButtonGradient: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
  },
  collectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
});
