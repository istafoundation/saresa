// CoinRewardAnimation - Subway Surfer style flying coins
// Coins arc from reward position to top header with staggered timing
import { View, StyleSheet, Dimensions, StatusBar, Platform } from 'react-native';
import { MotiView } from 'moti';
import { useEffect, useState, useCallback, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/theme';
import { useGameAudio } from '../../utils/sound-manager';

const { width, height } = Dimensions.get('window');

// Target position for coins (top-right header area)
const TARGET_X = width - 80;
const TARGET_Y = Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 24) + 20;

interface CoinRewardAnimationProps {
  coinsEarned: number;
  originX?: number; // Starting X position (default: center)
  originY?: number; // Starting Y position (default: center-ish)
  onComplete?: () => void;
  onCoinLand?: () => void; // Called each time a coin lands (for counter update)
}

interface CoinParticle {
  id: number;
  delay: number;
  arcHeight: number;
  rotation: number;
}

function FlyingCoin({ 
  particle, 
  originX, 
  originY,
  onLand,
}: { 
  particle: CoinParticle; 
  originX: number;
  originY: number;
  onLand: () => void;
}) {
  const translateX = useSharedValue(originX);
  const translateY = useSharedValue(originY);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const hasLandedRef = useRef(false);
  
  useEffect(() => {
    const duration = 600 + Math.random() * 200;
    
    // Move to target with arc
    translateX.value = withDelay(
      particle.delay,
      withTiming(TARGET_X, { 
        duration,
        easing: Easing.out(Easing.quad),
      })
    );
    
    // Y movement with arc (go up first, then down to target)
    translateY.value = withDelay(
      particle.delay,
      withSequence(
        withTiming(originY - particle.arcHeight, { 
          duration: duration * 0.4,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(TARGET_Y, { 
          duration: duration * 0.6,
          easing: Easing.in(Easing.quad),
        })
      )
    );
    
    // Shrink as it approaches target
    scale.value = withDelay(
      particle.delay,
      withTiming(0.5, { duration })
    );
    
    // Rotation
    rotate.value = withDelay(
      particle.delay,
      withTiming(particle.rotation, { 
        duration,
        easing: Easing.linear,
      })
    );
    
    // Fade out at the end
    opacity.value = withDelay(
      particle.delay + duration - 100,
      withTiming(0, { duration: 100 }, () => {
        if (!hasLandedRef.current) {
          hasLandedRef.current = true;
          runOnJS(onLand)();
        }
      })
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View style={[styles.coin, animatedStyle]}>
      <View style={styles.coinInner}>
        <MotiView
          from={{ rotate: '0deg' }}
          animate={{ rotate: '360deg' }}
          transition={{ type: 'timing', duration: 500, loop: true }}
          style={styles.coinContent}
        >
          <View style={styles.coinFace}>
            <View style={styles.coinShine} />
          </View>
        </MotiView>
      </View>
    </Animated.View>
  );
}

export default function CoinRewardAnimation({
  coinsEarned,
  originX = width / 2,
  originY = height / 2,
  onComplete,
  onCoinLand,
}: CoinRewardAnimationProps) {
  const { playCoin } = useGameAudio();
  const [particles, setParticles] = useState<CoinParticle[]>([]);
  const landedCountRef = useRef(0);
  const hasPlayedFinalSoundRef = useRef(false);
  
  // Generate particles based on coins earned (cap at 10 for performance)
  useEffect(() => {
    const particleCount = Math.min(Math.max(5, Math.ceil(coinsEarned / 10)), 10);
    
    const newParticles: CoinParticle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      delay: i * 80, // Staggered start
      arcHeight: 80 + Math.random() * 70, // Random arc height
      rotation: 360 * (2 + Math.random() * 2), // 2-4 full rotations
    }));
    
    setParticles(newParticles);
    
    // Estimate total duration and call onComplete
    const totalDuration = (particleCount - 1) * 80 + 800;
    const timer = setTimeout(() => {
      onComplete?.();
    }, totalDuration + 200);
    
    return () => clearTimeout(timer);
  }, [coinsEarned]);
  
  // Handle coin landing
  const handleCoinLand = useCallback(() => {
    landedCountRef.current += 1;
    
    // Haptic feedback on each landing
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Call onCoinLand for counter animation
    onCoinLand?.();
    
    // Play final cha-ching sound when last coin lands
    if (landedCountRef.current === particles.length && !hasPlayedFinalSoundRef.current) {
      hasPlayedFinalSoundRef.current = true;
      playCoin();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [particles.length, playCoin, onCoinLand]);
  
  if (particles.length === 0) return null;
  
  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <FlyingCoin
          key={particle.id}
          particle={particle}
          originX={originX}
          originY={originY}
          onLand={handleCoinLand}
        />
      ))}
    </View>
  );
}

const COIN_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999, // Increased zIndex
    elevation: 100, // Add high elevation for Android
    pointerEvents: 'none',
  },
  coin: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    zIndex: 100000, 
    elevation: 101, // Ensure individual coins are above container
  },
  coinInner: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    backgroundColor: COLORS.accentGold,
    shadowColor: COLORS.accentGold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  coinContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinFace: {
    width: COIN_SIZE - 6,
    height: COIN_SIZE - 6,
    borderRadius: (COIN_SIZE - 6) / 2,
    backgroundColor: '#FFD93D',
    borderWidth: 2,
    borderColor: '#F4A100',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinShine: {
    position: 'absolute',
    top: 3,
    left: 5,
    width: 8,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    transform: [{ rotate: '-30deg' }],
  },
});
