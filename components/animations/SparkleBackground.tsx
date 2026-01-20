// SparkleBackground - Floating sparkles/stars for magical atmosphere
// ✨ Various background effects for different screens
import { StyleSheet, View, Dimensions, Text } from 'react-native';
import { MotiView } from 'moti';
import { COLORS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

// Generate random sparkle positions
const generateSparkles = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * height,
    size: 4 + Math.random() * 8,
    delay: Math.random() * 2000,
    duration: 1500 + Math.random() * 1500,
  }));
};

const SPARKLES = generateSparkles(15);

interface SparkleBackgroundProps {
  color?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export default function SparkleBackground({ 
  color = COLORS.sparkle, 
  intensity = 'medium' 
}: SparkleBackgroundProps) {
  const sparkleCount = intensity === 'low' ? 8 : intensity === 'medium' ? 15 : 25;
  const sparkles = SPARKLES.slice(0, sparkleCount);

  return (
    <View style={styles.container} pointerEvents="none">
      {sparkles.map((sparkle) => (
        <MotiView
          key={sparkle.id}
          from={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
          transition={{
            type: 'timing',
            duration: sparkle.duration,
            delay: sparkle.delay,
            loop: true,
          }}
          style={[
            styles.sparkle,
            {
              left: sparkle.x,
              top: sparkle.y,
              width: sparkle.size,
              height: sparkle.size,
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
}

// Floating bubbles variant
export function BubbleBackground({ color = COLORS.primaryLight }: { color?: string }) {
  const bubbles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: 20 + Math.random() * (width - 40),
    size: 20 + Math.random() * 40,
    delay: i * 500,
    duration: 4000 + Math.random() * 2000,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {bubbles.map((bubble) => (
        <MotiView
          key={bubble.id}
          from={{ 
            opacity: 0.3, 
            translateY: height,
            scale: 0.5,
          }}
          animate={{ 
            opacity: [0.3, 0.6, 0.3], 
            translateY: -100,
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            type: 'timing',
            duration: bubble.duration,
            delay: bubble.delay,
            loop: true,
          }}
          style={[
            styles.bubble,
            {
              left: bubble.x,
              width: bubble.size,
              height: bubble.size,
              backgroundColor: color + '30',
              borderColor: color + '60',
            },
          ]}
        />
      ))}
    </View>
  );
}

// 🍬 Candy land background - dreamy floating candies for home screen
const CANDY_COLORS = [
  COLORS.rainbow1, // Coral
  COLORS.rainbow2, // Teal  
  COLORS.rainbow3, // Yellow
  COLORS.rainbow4, // Lavender
  COLORS.rainbow5, // Light blue
  COLORS.rainbow6, // Mint
  COLORS.primary,  // Pink
];

const CANDY_PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: 20 + Math.random() * (width - 40),
  y: Math.random() * height * 0.8,
  size: 8 + Math.random() * 12,
  color: CANDY_COLORS[i % CANDY_COLORS.length],
  delay: i * 300,
  duration: 4000 + Math.random() * 2000,
  isCircle: Math.random() > 0.3, // 70% circles, 30% stars
}));

// 🍬 Static candy background for home screen - optimized for performance
export function CandyBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Soft gradient overlay at top */}
      <View style={styles.gradientOverlay} />
      
      {/* Static candy particles - no animation loops */}
      {CANDY_PARTICLES.map((candy) => (
        <View
          key={candy.id}
          style={[
            styles.candyParticle,
            {
              left: candy.x,
              top: candy.y,
              width: candy.size,
              height: candy.size,
              backgroundColor: candy.color,
              opacity: 0.5,
            },
          ]}
        >
          {/* Glossy shine on candy */}
          <View style={[styles.candyShine, { width: candy.size * 0.4, height: candy.size * 0.25 }]} />
          {/* Show star emoji for non-circle candies */}
          {!candy.isCircle && (
            <Text style={styles.starText}>✦</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  sparkle: {
    position: 'absolute',
    borderRadius: 999,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: COLORS.primaryLight + '20',
  },
  candyParticle: {
    position: 'absolute',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  candyShine: {
    position: 'absolute',
    top: 2,
    left: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 999,
    transform: [{ rotate: '-25deg' }],
  },
  starText: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tinySparkle: {
    position: 'absolute',
  },
  sparkleEmoji: {
    fontSize: 12,
    opacity: 0.6,
  },
});
