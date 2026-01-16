// India Map Component - Interactive SVG map with precise Ray Casting and Zoom/Pan
import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions, Pressable, type GestureResponderEvent } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { INDIA_REGIONS, validateRegionsWithPaths } from '../data/india-states';
import { INDIA_SVG_PATHS } from '../data/india-svg-paths';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { isPointInSvgPath } from '../utils/svg-hit-test';

interface IndiaMapProps {
  targetRegion?: string;       // The region user should find
  selectedRegion?: string;     // What user tapped
  guessedRegions?: string[];   // Already answered (dimmed)
  correctRegion?: string;      // Show as correct (green)
  wrongRegion?: string;        // Show as wrong (red)
  onRegionPress: (regionId: string) => void;
  disabled?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH; // Full width for larger map
const MAP_HEIGHT = MAP_WIDTH * 1.14; // Aspect ratio from SVG

// SVG viewBox dimensions
const SVG_VIEWBOX_WIDTH = 612;
const SVG_VIEWBOX_HEIGHT = 696;

export default function IndiaMap({
  targetRegion,
  selectedRegion,
  guessedRegions = [],
  correctRegion,
  wrongRegion,
  onRegionPress,
  disabled = false,
}: IndiaMapProps) {
  
  // Reanimated Shared Values for Transformation
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Reset map to default state
  const resetMap = useCallback(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, []);

  // Auto-reset when question or result changes
  useEffect(() => {
    resetMap();
  }, [targetRegion, correctRegion, wrongRegion, resetMap]);

  // Animated style for the map container
  // Animated style for the map container
  // We double-clamp here to ensure visual correctness even during mixed interactions
  const animatedStyle = useAnimatedStyle(() => {
    // Current bounds
    const maxTx = Math.max(0, (MAP_WIDTH * scale.value - MAP_WIDTH) / 2);
    const maxTy = Math.max(0, (MAP_HEIGHT * scale.value - MAP_HEIGHT) / 2);

    return {
      transform: [
        { translateX: Math.min(Math.max(translateX.value, -maxTx), maxTx) },
        { translateY: Math.min(Math.max(translateY.value, -maxTy), maxTy) },
        { scale: scale.value },
      ],
    };
  });

  // Pan Gesture
  // Calculate bounds to keep map in view
  const pan = Gesture.Pan()
    .onChange((event) => {
      // Calculate max translation allowed based on current scale
      // If scale > 1, allow panning to the edge.
      // If scale < 1, clamp to 0 (center) to prevent losing map.
      const maxTranslateX = Math.max(0, (MAP_WIDTH * scale.value - MAP_WIDTH) / 2);
      const maxTranslateY = Math.max(0, (MAP_HEIGHT * scale.value - MAP_HEIGHT) / 2);

      const nextTx = savedTranslateX.value + event.translationX;
      const nextTy = savedTranslateY.value + event.translationY;

      // Determine min/max bounds (symmetric around 0)
      translateX.value = Math.min(Math.max(nextTx, -maxTranslateX), maxTranslateX);
      translateY.value = Math.min(Math.max(nextTy, -maxTranslateY), maxTranslateY);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Pinch Gesture
  const pinch = Gesture.Pinch()
    .onChange((event) => {
      // Limit zoom: 0.8x to 4x
      const nextScale = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(nextScale, 0.8), 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      
      // Re-clamp translation on zoom end just in case
      // (Visual style handles it, but this keeps state clean)
      const maxTranslateX = Math.max(0, (MAP_WIDTH * scale.value - MAP_WIDTH) / 2);
      const maxTranslateY = Math.max(0, (MAP_HEIGHT * scale.value - MAP_HEIGHT) / 2);
      
      const clampedTx = Math.min(Math.max(translateX.value, -maxTranslateX), maxTranslateX);
      const clampedTy = Math.min(Math.max(translateY.value, -maxTranslateY), maxTranslateY);
      
      translateX.value = clampedTx;
      translateY.value = clampedTy;
      savedTranslateX.value = clampedTx;
      savedTranslateY.value = clampedTy;
    });

  // Function to check hit - defined BEFORE usage in gesture to ensure capture
  const checkHit = useCallback((svgX: number, svgY: number) => {
    console.log(`[IndiaMap] Checking hit at SVG: ${Math.round(svgX)}, ${Math.round(svgY)}`);
    
    // Find which region was tapped 
    const regions = [...INDIA_REGIONS].reverse();
    
    for (const region of regions) {
      const pathData = INDIA_SVG_PATHS[region.id];
      if (pathData) {
        if (isPointInSvgPath(pathData, svgX, svgY)) {
          console.log(`[IndiaMap] Hit detected on: ${region.id}`);
          onRegionPress(region.id);
          return;
        }
      }
    }
    console.log('[IndiaMap] No hit detected');
  }, [onRegionPress]); 

  // Tap Gesture
  const tap = Gesture.Tap()
    .onEnd((event) => {
      if (disabled) return;
      
      const { x, y } = event;
      
      const cx = MAP_WIDTH / 2;
      const cy = MAP_HEIGHT / 2;
      
      // Inverse Transform Math
      // We assume transform origin is center (cx, cy)
      // And transform order in style is Translate then Scale (or Scale then Translate, see style below)
      // Let's standardize: Style = [ { translateX }, { translateY }, { scale } ]
      // This means: Move T, then Scale around *new* center.
      // ScreenPoint = (LocalPoint - Center) * Scale + Center + Translate
      // LocalPoint = (ScreenPoint - Translate - Center) / Scale + Center
      
      const localX = (x - translateX.value - cx) / scale.value + cx;
      const localY = (y - translateY.value - cy) / scale.value + cy;
      
      console.log(`[IndiaMap] Tap: ${Math.round(x)},${Math.round(y)} -> Local: ${Math.round(localX)},${Math.round(localY)} (Scale: ${scale.value.toFixed(2)}, Tx: ${Math.round(translateX.value)})`);

      // Convert to SVG coordinates
      const scaleX = SVG_VIEWBOX_WIDTH / MAP_WIDTH;
      const scaleY = SVG_VIEWBOX_HEIGHT / MAP_HEIGHT;
      
      const svgX = localX * scaleX;
      const svgY = localY * scaleY;

      runOnJS(checkHit)(svgX, svgY);
    });

  const composed = Gesture.Simultaneous(pan, pinch, tap);
  
  // ... (Region Color/Stroke logic remains same)
  // Get fill color for a region
  const getRegionColor = useCallback((regionId: string): string => {
    if (correctRegion === regionId) return COLORS.success;
    if (wrongRegion === regionId) return COLORS.error;
    if (selectedRegion === regionId) return COLORS.primary;
    if (guessedRegions.includes(regionId)) return COLORS.surface;
    return COLORS.backgroundCard;
  }, [correctRegion, wrongRegion, selectedRegion, guessedRegions]);
  
  const getStrokeColor = useCallback((regionId: string): string => {
    if (correctRegion === regionId || wrongRegion === regionId || selectedRegion === regionId) {
      return '#FFFFFF';
    }
    return COLORS.textMuted;
  }, [correctRegion, wrongRegion, selectedRegion]);
  
  const getStrokeWidth = useCallback((regionId: string): number => {
    if (correctRegion === regionId || wrongRegion === regionId || selectedRegion === regionId) {
      return 2;
    }
    return 0.5;
  }, [correctRegion, wrongRegion, selectedRegion]);

  // Memoize the paths
  const pathElements = useMemo(() => {
    return INDIA_REGIONS.map((region) => {
      const pathData = INDIA_SVG_PATHS[region.id];
      if (!pathData) return null;
      
      const statusKey = 
        selectedRegion === region.id ? 'selected' : 
        correctRegion === region.id ? 'correct' : 
        wrongRegion === region.id ? 'wrong' : 
        guessedRegions.includes(region.id) ? 'guessed' : 'normal';

      return (
        <Path
          key={`${region.id}-${statusKey}`}
          id={region.id}
          d={pathData}
          fill={getRegionColor(region.id)}
          stroke={getStrokeColor(region.id)}
          strokeWidth={getStrokeWidth(region.id)}
        />
      );
    });
  }, [getRegionColor, getStrokeColor, getStrokeWidth, selectedRegion, correctRegion, wrongRegion, guessedRegions]);

  const selectedOverlay = useMemo(() => {
    if (!selectedRegion || !INDIA_SVG_PATHS[selectedRegion]) return null;
    return (
      <Path
        key={`overlay-${selectedRegion}`}
        d={INDIA_SVG_PATHS[selectedRegion]}
        fill={COLORS.primary} 
        stroke={COLORS.primary}
        strokeWidth={2}
        opacity={0.8}
        pointerEvents="none"
      />
    );
  }, [selectedRegion]);

  return (
    <View style={styles.container}>
      {/* Viewport to clip and capture gestures at fixed size */}
      <GestureDetector gesture={composed}>
        <View style={styles.viewport}>
          <Animated.View style={[styles.mapContainer, animatedStyle]}>
            <Svg
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
              style={styles.svg}
              pointerEvents="none"
            >
              <G>
                {pathElements}
                {selectedOverlay}
              </G>
            </Svg>
          </Animated.View>
        </View>
      </GestureDetector>
      
      
      {/* Reset Button */}
      <Pressable style={styles.resetButton} onPress={resetMap}>
        <Ionicons name="refresh" size={24} color={COLORS.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative', // Context for absolute button
  },
  viewport: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.lg, 
  },
  mapContainer: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  },
  svg: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg, 
    ...SHADOWS.sm,
  },
  resetButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    padding: 8,
    borderRadius: 20, // Circular
    ...SHADOWS.md,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
