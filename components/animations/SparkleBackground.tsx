// SparkleBackground - Floating sparkles/stars for magical atmosphere
import { StyleSheet, View, Dimensions } from 'react-native';
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
});
