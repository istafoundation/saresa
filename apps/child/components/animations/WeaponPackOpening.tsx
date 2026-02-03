// Weapon Pack Opening Animation - Premium Gacha-style reveal
// Improved with better visuals, edge case handling, and proper z-index management
import { View, Text, StyleSheet, Pressable, Dimensions, Modal, Platform } from 'react-native';
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
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { type Weapon, type Rarity, getRandomWeapon } from '../../data/weapons';

const { width, height } = Dimensions.get('window');

const RARITY_COLORS: Record<Rarity, string> = {
  common: COLORS.rarityCommon,
  rare: COLORS.rarityRare,
  epic: COLORS.rarityEpic,
};

const RARITY_GLOW_COLORS: Record<Rarity, [string, string, ...string[]]> = {
  common: [COLORS.rarityCommon, '#E8F4F8'],
  rare: [COLORS.rarityRare, '#A5C8E4'],
  epic: [COLORS.rarityEpic, '#E8D4F8', COLORS.accentGold],
};

const RARITY_LABELS: Record<Rarity, string> = {
  common: 'COMMON',
  rare: 'RARE ★',
  epic: 'EPIC ★★★',
};

interface WeaponPackOpeningProps {
  onComplete: (weapon: Weapon, isDuplicate: boolean) => void;
  onCancel: () => void;
  ownedWeapons?: string[]; // To check for duplicates
  disabled?: boolean; // If user doesn't have enough coins
}

type Phase = 'ready' | 'shaking' | 'opening' | 'reveal' | 'details';

// Enhanced sparkle effect with multiple types
function Sparkle({ delay, x, y, type = 'star' }: { delay: number; x: number; y: number; type?: 'star' | 'orb' | 'ray' }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1.2, { damping: 8 }),
        withTiming(0, { duration: 400 })
      )
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 500 })
      )
    );
    if (type === 'star') {
      rotation.value = withDelay(
        delay,
        withTiming(360, { duration: 600 })
      );
    }
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const emoji = type === 'star' ? '✦' : type === 'orb' ? '●' : '✧';
  const color = type === 'orb' ? COLORS.accentGold : COLORS.sparkle;

  return (
    <Animated.View style={[styles.sparkle, { left: x, top: y }, style]}>
      <Text style={[styles.sparkleText, { color, fontSize: type === 'orb' ? 12 : 20 }]}>{emoji}</Text>
    </Animated.View>
  );
}

// Floating light ray effect for epic reveals
function LightRay({ delay, angle }: { delay: number; angle: number }) {
  const opacity = useSharedValue(0);
  const scaleY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 800 })
      )
    );
    scaleY.value = withDelay(
      delay,
      withSequence(
        withSpring(1, { damping: 12 }),
        withTiming(0.5, { duration: 600 })
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { rotate: `${angle}deg` },
      { scaleY: scaleY.value },
    ],
  }));

  return (
    <Animated.View style={[styles.lightRay, style]}>
      <LinearGradient
        colors={['transparent', COLORS.accentGold + '60', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.lightRayGradient}
      />
    </Animated.View>
  );
}

export default function WeaponPackOpening({ 
  onComplete, 
  onCancel, 
  ownedWeapons = [],
  disabled = false 
}: WeaponPackOpeningProps) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [weapon, setWeapon] = useState<Weapon | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; delay: number; type: 'star' | 'orb' | 'ray' }[]>([]);
  const [lightRays, setLightRays] = useState<{ id: number; angle: number; delay: number }[]>([]);

  const cardRotateY = useSharedValue(0);
  const cardRotateX = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const cardTranslateY = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.5);
  const bgOpacity = useSharedValue(0);
  const packShake = useSharedValue(0);
  const shimmerOffset = useSharedValue(0);

  // Initial fade in
  useEffect(() => {
    bgOpacity.value = withTiming(1, { duration: 400 });
    // Subtle card hover animation
    cardTranslateY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(5, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const generateParticles = useCallback((rarity: Rarity) => {
    const particleCount = rarity === 'epic' ? 40 : rarity === 'rare' ? 25 : 15;
    
    const newSparkles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height * 0.7 + height * 0.15,
      delay: Math.random() * 800,
      type: (Math.random() > 0.6 ? 'star' : 'orb') as 'star' | 'orb',
    }));
    setSparkles(newSparkles);

    // Add light rays for epic weapons
    if (rarity === 'epic') {
      const rays = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        angle: i * 45,
        delay: i * 50,
      }));
      setLightRays(rays);
    }
  }, []);

  const handleOpen = useCallback(() => {
    if (phase !== 'ready' || disabled) return;
    
    setPhase('shaking');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Intense shake animation
    packShake.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(4, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );

    // Card scale pulse
    cardScale.value = withSequence(
      withSpring(1.15, { damping: 8 }),
      withSpring(0.95, { damping: 10 }),
      withSpring(1.05, { damping: 12 }),
      withSpring(1, { damping: 15 })
    );

    // Generate weapon after shake
    setTimeout(() => {
      const newWeapon = getRandomWeapon();
      const duplicate = ownedWeapons.includes(newWeapon.id);
      
      setWeapon(newWeapon);
      setIsDuplicate(duplicate);
      setPhase('opening');
      
      // Flip card with cinematic 3D effect
      cardRotateY.value = withTiming(180, { 
        duration: 900,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });
      
      // Slight tilt for 3D effect
      cardRotateX.value = withSequence(
        withTiming(10, { duration: 300 }),
        withTiming(0, { duration: 600 })
      );
      
      // Haptic feedback based on rarity
      if (newWeapon.rarity === 'epic') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
      } else if (newWeapon.rarity === 'rare') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Generate particles
      generateParticles(newWeapon.rarity);

      // Animated glow effect
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.6, { duration: 400 })
      );
      glowScale.value = withSequence(
        withSpring(1.5, { damping: 8 }),
        withSpring(1, { damping: 12 })
      );

      setTimeout(() => setPhase('reveal'), 900);
    }, 400);
  }, [phase, disabled, ownedWeapons, generateParticles]);

  const handleContinue = useCallback(() => {
    if (weapon) {
      // Fade out animation
      bgOpacity.value = withTiming(0, { duration: 300 });
      cardScale.value = withTiming(0.8, { duration: 300 });
      
      setTimeout(() => {
        onComplete(weapon, isDuplicate);
      }, 300);
    }
  }, [weapon, isDuplicate, onComplete]);

  const handleCancel = useCallback(() => {
    bgOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(onCancel, 200);
  }, [onCancel]);

  const cardFrontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${cardRotateY.value}deg` },
      { rotateX: `${cardRotateX.value}deg` },
      { scale: cardScale.value },
      { translateY: cardTranslateY.value },
      { translateX: packShake.value },
    ],
    backfaceVisibility: 'hidden',
  }));

  const cardBackStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${cardRotateY.value + 180}deg` },
      { rotateX: `${cardRotateX.value}deg` },
      { scale: cardScale.value },
      { translateY: cardTranslateY.value },
    ],
    backfaceVisibility: 'hidden',
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const rarityColor = weapon ? RARITY_COLORS[weapon.rarity] : COLORS.primary;
  const rarityGlowColors = weapon ? RARITY_GLOW_COLORS[weapon.rarity] : [COLORS.primary, COLORS.primaryLight] as [string, string];

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={phase === 'ready' ? handleCancel : undefined}
    >
      <Animated.View style={[styles.overlay, bgStyle]}>
        {/* Blur background for iOS, solid for Android */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.92)' }]} />
        )}

        {/* Light rays for epic weapons */}
        {lightRays.map((ray) => (
          <LightRay key={ray.id} angle={ray.angle} delay={ray.delay} />
        ))}

        {/* Sparkles */}
        {sparkles.map((s) => (
          <Sparkle key={s.id} delay={s.delay} x={s.x} y={s.y} type={s.type} />
        ))}

        {/* Layered glow effect */}
        {weapon && (
          <Animated.View style={[styles.glowContainer, glowStyle]}>
            <View style={[styles.glowOuter, { backgroundColor: rarityColor + '20' }]} />
            <View style={[styles.glowMiddle, { backgroundColor: rarityColor + '40' }]} />
            <View style={[styles.glowInner, { backgroundColor: rarityColor + '60' }]} />
          </Animated.View>
        )}

        {/* Card Container */}
        <View style={styles.cardContainer}>
          {/* Front of card (pack) */}
          <Animated.View style={[styles.card, styles.cardFront, cardFrontStyle]}>
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Decorative border */}
              <View style={styles.cardBorder}>
                <View style={styles.cardInner}>
                  <Text style={styles.packIcon}>🎴</Text>
                  <Text style={styles.packTitle}>Weapon Pack</Text>
                  <Text style={styles.packSubtitle}>Hindu Mythology</Text>
                  
                  {/* Decorative elements */}
                  <View style={styles.packDecoration}>
                    <Text style={styles.packDecoText}>⚔️ ✨ 🔱</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Back of card (weapon) */}
          {weapon && (
            <Animated.View style={[styles.card, styles.cardBack, cardBackStyle]}>
              <LinearGradient
                colors={[rarityColor + '30', COLORS.backgroundCard, COLORS.backgroundCard]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardBorderRevealed}>
                  {/* Duplicate badge */}
                  {isDuplicate && (
                    <View style={styles.duplicateBadge}>
                      <Text style={styles.duplicateText}>DUPLICATE</Text>
                      <Text style={styles.duplicateBonus}>+25 Coins!</Text>
                    </View>
                  )}

                  {/* Rarity badge */}
                  <LinearGradient
                    colors={rarityGlowColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.rarityBadge]}
                  >
                    <Text style={styles.rarityText}>{RARITY_LABELS[weapon.rarity]}</Text>
                  </LinearGradient>
                  
                  {/* Weapon icon with glow */}
                  <View style={[styles.weaponIconContainer, { shadowColor: rarityColor }]}>
                    <Text style={styles.weaponIcon}>{weapon.icon}</Text>
                  </View>
                  
                  <Text style={styles.weaponName}>{weapon.name}</Text>
                  <Text style={styles.weaponOwner}>{weapon.owner}</Text>
                  
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.weaponDesc} numberOfLines={3}>
                      {weapon.shortDescription}
                    </Text>
                  </View>

                  {/* Power indicator */}
                  <View style={[styles.powerBadge, { borderColor: rarityColor + '60' }]}>
                    <Text style={styles.powerLabel}>⚡ POWER</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          )}
        </View>

        {/* Action buttons */}
        {phase === 'ready' && (
          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 200 }}
            style={styles.buttonsContainer}
          >
            <Pressable 
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed
              ]} 
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.openButton,
                pressed && styles.buttonPressed,
                disabled && styles.buttonDisabled
              ]} 
              onPress={handleOpen}
              disabled={disabled}
            >
              <LinearGradient
                colors={disabled ? ['#888', '#666'] : [COLORS.accentGold, COLORS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.openButtonGradient}
              >
                <Text style={styles.openButtonText}>
                  {disabled ? 'Not Enough Coins' : '✨ Open Pack!'}
                </Text>
              </LinearGradient>
            </Pressable>
          </MotiView>
        )}

        {phase === 'reveal' && (
          <MotiView
            from={{ opacity: 0, translateY: 30, scale: 0.9 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'spring', delay: 300 }}
            style={styles.buttonsContainer}
          >
            <Pressable 
              style={({ pressed }) => [
                styles.collectButton,
                pressed && styles.buttonPressed
              ]} 
              onPress={handleContinue}
            >
              <LinearGradient
                colors={[rarityColor, COLORS.backgroundCard]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.collectButtonGradient}
              >
                <Text style={styles.collectButtonText}>
                  {isDuplicate ? '🪙 Collect Coins' : '⚔️ Collect Weapon'}
                </Text>
              </LinearGradient>
            </Pressable>
          </MotiView>
        )}

        {/* Tap hint */}
        {phase === 'ready' && !disabled && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 1000 }}
            style={styles.tapHintContainer}
          >
            <Text style={styles.tapHint}>Tap the pack or button to reveal your weapon!</Text>
          </MotiView>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  // Glow layers
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOuter: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  glowMiddle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowInner: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  // Light rays for epic reveals
  lightRay: {
    position: 'absolute',
    width: 4,
    height: height * 0.5,
    alignItems: 'center',
  },
  lightRayGradient: {
    width: '100%',
    height: '100%',
  },
  // Sparkles
  sparkle: {
    position: 'absolute',
  },
  sparkleText: {
    fontSize: 20,
    color: COLORS.accentGold,
  },
  // Card
  cardContainer: {
    width: 280,
    height: 380,
    position: 'relative',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
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
  // Card front decorative elements
  cardBorder: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: COLORS.accentGold + '50',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark + '40',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accentGold + '30',
  },
  packIcon: {
    fontSize: 72,
    marginBottom: SPACING.md,
  },
  packTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textShadowColor: COLORS.primaryDark,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  packSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    letterSpacing: 1,
  },
  packDecoration: {
    position: 'absolute',
    bottom: SPACING.lg,
  },
  packDecoText: {
    fontSize: 20,
    letterSpacing: 8,
  },
  // Card back (revealed weapon)
  cardBorderRevealed: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.accentGold + '30',
    borderRadius: BORDER_RADIUS.lg,
  },
  // Duplicate badge
  duplicateBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  duplicateText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.background,
    letterSpacing: 1,
  },
  duplicateBonus: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.background,
    marginTop: 2,
  },
  // Rarity badge
  rarityBadge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.sm,
  },
  rarityText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 2,
  },
  // Weapon display
  weaponIconContainer: {
    padding: SPACING.md,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  weaponIcon: {
    fontSize: 64,
  },
  weaponName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  weaponOwner: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  descriptionContainer: {
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.sm,
  },
  weaponDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  powerBadge: {
    position: 'absolute',
    bottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    backgroundColor: COLORS.background + '20',
  },
  powerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1,
  },
  // Buttons
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
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  // Button states
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Tap hint
  tapHintContainer: {
    position: 'absolute',
    bottom: 20,
  },
  tapHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

