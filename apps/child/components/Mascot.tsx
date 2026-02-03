// Mascot Component - Renders custom wizard mascot images
import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import type { MascotType } from '../stores/user-store';

// Import mascot images
const MASCOT_IMAGES = {
  male: require('../assets/mascot/male_mascot.png'),
  female: require('../assets/mascot/female_mascot.png'),
};

type MascotSize = 'small' | 'medium' | 'large' | 'xlarge';

interface MascotProps {
  mascotType: MascotType;
  size?: MascotSize;
  animated?: boolean;
  style?: ViewStyle;
}

const SIZES: Record<MascotSize, number> = {
  small: 40,
  medium: 64,
  large: 100,
  xlarge: 120,
};

export default function Mascot({ 
  mascotType, 
  size = 'medium', 
  animated = false,
  style 
}: MascotProps) {
  const dimension = SIZES[size];
  
  const imageComponent = (
    <Image
      source={MASCOT_IMAGES[mascotType]}
      style={[
        styles.image,
        { width: dimension, height: dimension },
      ]}
      resizeMode="contain"
    />
  );

  if (animated) {
    return (
      <MotiView
        from={{ scale: 0.95, rotate: '-3deg' }}
        animate={{ scale: 1.05, rotate: '3deg' }}
        transition={{
          type: 'timing',
          duration: 2000,
          loop: true,
        }}
        style={style}
      >
        {imageComponent}
      </MotiView>
    );
  }

  return (
    <View style={style}>
      {imageComponent}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    // No border radius - let the PNG's own shape show
  },
});
