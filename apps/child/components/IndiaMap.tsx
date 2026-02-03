// India Map Component - Interactive SVG map with precise Ray Casting and Zoom/Pan
import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions, Pressable, type GestureResponderEvent } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedProps, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { INDIA_REGIONS, validateRegionsWithPaths } from '../data/india-states';
import { INDIA_SVG_PATHS } from '../data/india-svg-paths';
import { REGION_CENTROIDS } from '../data/region-centroids';
import { REGION_BOUNDS, isPointInBounds } from '../data/svg-region-bounds';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { isPointInSvgPath, getDistanceToSvgPath } from '../utils/svg-hit-test';

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
const SVG_VIEWBOX_WIDTH = 800;
const SVG_VIEWBOX_HEIGHT = 820;
const SVG_MIN_X = -20;
const SVG_MIN_Y = -20;

const AnimatedPath = Animated.createAnimatedComponent(Path);

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

  // Dynamic Stroke Width: Keeps lines thin relative to screen even when zoomed
  // Base width 1.5 -> at 4x zoom effectively scaled down to 1.5/4 units to look like 1.5px
  const animatedStrokeProps = useAnimatedProps(() => {
    return {
      strokeWidth: 1.5 / scale.value,
    };
  });
  
  const animatedSelectedStrokeProps = useAnimatedProps(() => {
    return {
      strokeWidth: 3 / scale.value,
    };
  });

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
  // TRANSFORMS ORDER: Scale then Translate
  // This ensures 1:1 panning feel (translation happens in screen space AFTER scaling)
  // And ensures touch coordinate math (Local = (Screen - T - C) / S + C) is consistent
  const animatedStyle = useAnimatedStyle(() => {
    // Current bounds calculation logic remains checking "how much extra space do we have"
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
  const pan = Gesture.Pan()
    .onChange((event) => {
      const maxTranslateX = Math.max(0, (MAP_WIDTH * scale.value - MAP_WIDTH) / 2);
      const maxTranslateY = Math.max(0, (MAP_HEIGHT * scale.value - MAP_HEIGHT) / 2);

      const nextTx = savedTranslateX.value + event.translationX;
      const nextTy = savedTranslateY.value + event.translationY;

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
      const nextScale = savedScale.value * event.scale;
      // Increased max zoom to 8x for better inspection
      scale.value = Math.min(Math.max(nextScale, 0.8), 8);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      
      const maxTranslateX = Math.max(0, (MAP_WIDTH * scale.value - MAP_WIDTH) / 2);
      const maxTranslateY = Math.max(0, (MAP_HEIGHT * scale.value - MAP_HEIGHT) / 2);
      
      const clampedTx = Math.min(Math.max(translateX.value, -maxTranslateX), maxTranslateX);
      const clampedTy = Math.min(Math.max(translateY.value, -maxTranslateY), maxTranslateY);
      
      translateX.value = clampedTx;
      translateY.value = clampedTy;
      savedTranslateX.value = clampedTx;
      savedTranslateY.value = clampedTy;
    });

  const sortedRegions = useMemo(() => {
    return [...INDIA_REGIONS].sort((a, b) => {
      const areaA = REGION_BOUNDS[a.id]?.area ?? 999999;
      const areaB = REGION_BOUNDS[b.id]?.area ?? 999999;
      return areaB - areaA; 
    });
  }, []);

  // IMPROVED HIT DETECTION 
  const checkHit = useCallback((svgX: number, svgY: number) => {
    const BOUNDS_PADDING = 30; 
    const HIT_THRESHOLD = 20; 
    
    const candidates: { id: string; area: number; inside: boolean; distance: number }[] = [];
    
    for (const region of INDIA_REGIONS) {
      const bounds = REGION_BOUNDS[region.id];
      const pathData = INDIA_SVG_PATHS[region.id];
      
      if (!pathData) continue;
      
      const skipBoundsCheck = ['IN-AN', 'IN-DL', 'IN-DH', 'IN-PY', 'IN-GA', 'IN-SK', 'IN-TR', 'IN-LD'].includes(region.id);
      
      if (!skipBoundsCheck && bounds && !isPointInBounds(svgX, svgY, bounds, BOUNDS_PADDING)) {
        continue; 
      }
      
      const { inside, distance } = getDistanceToSvgPath(pathData, svgX, svgY);
      
      if (inside || distance < HIT_THRESHOLD) {
        candidates.push({ 
          id: region.id, 
          area: bounds?.area ?? 999999,
          inside,
          distance
        });
      }
    }
    
    // Small/enclave regions that should win over surrounding large regions
    const SMALL_REGION_IDS = ['IN-DL', 'IN-GA', 'IN-DH'];
    
    // PRIORITY 1: Small regions that are very close (distance < threshold)
    // These beat larger regions even if the larger region claims "inside"
    const smallRegionHits = candidates.filter(c => 
      SMALL_REGION_IDS.includes(c.id) && (c.inside || c.distance < HIT_THRESHOLD)
    );
    if (smallRegionHits.length > 0) {
      // Sort by: inside first (distance 0), then by distance
      smallRegionHits.sort((a, b) => {
        if (a.inside && !b.inside) return -1;
        if (!a.inside && b.inside) return 1;
        return a.distance - b.distance;
      });
      const winner = smallRegionHits[0];
      onRegionPress(winner.id);
      return;
    }
    
    // PRIORITY 2: Direct hits on larger regions (smallest area wins)
    const directHits = candidates.filter(c => c.inside);
    if (directHits.length > 0) {
      directHits.sort((a, b) => a.area - b.area);
      const winner = directHits[0];
      onRegionPress(winner.id);
      return;
    }
    
    // PRIORITY 3: Near misses (closest wins)
    const nearMisses = candidates.filter(c => !c.inside && c.distance < HIT_THRESHOLD);
    if (nearMisses.length > 0) {
      nearMisses.sort((a, b) => a.distance - b.distance);
      const winner = nearMisses[0];
      onRegionPress(winner.id);
      return;
    }


  }, [onRegionPress]); 

  // Tap Gesture
  const tap = Gesture.Tap()
    .onEnd((event) => {
      if (disabled) return;
      
      const { x, y } = event;
      
      const cx = MAP_WIDTH / 2;
      const cy = MAP_HEIGHT / 2;
      
      // Inverse Transform Math
      // Screen = (Local - Center) * Scale + Center + Translate
      // Local = (Screen - Translate - Center) / Scale + Center
      
      const localX = (x - translateX.value - cx) / scale.value + cx;
      const localY = (y - translateY.value - cy) / scale.value + cy;
      
      const scaleX = SVG_VIEWBOX_WIDTH / MAP_WIDTH;
      const scaleY = SVG_VIEWBOX_HEIGHT / MAP_HEIGHT;
      
      const svgX = (localX * scaleX) + SVG_MIN_X;
      const svgY = (localY * scaleY) + SVG_MIN_Y;

      runOnJS(checkHit)(svgX, svgY);
    });

  const composed = Gesture.Simultaneous(pan, pinch, tap);
  
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
  
  // OPTIMIZATION: Inline color logic instead of depending on callback references
  // This prevents re-renders when callback references change but values are the same
  const pathElements = useMemo(() => {
    // Pre-compute the set of guessed regions for O(1) lookup
    const guessedSet = new Set(guessedRegions);
    
    return sortedRegions.map((region) => {
      const pathData = INDIA_SVG_PATHS[region.id];
      if (!pathData) return null;
      
      const isHighlighted = 
        selectedRegion === region.id || 
        correctRegion === region.id || 
        wrongRegion === region.id;
      
      // Inline color logic (was getRegionColor)
      let fillColor: string;
      if (correctRegion === region.id) fillColor = COLORS.success;
      else if (wrongRegion === region.id) fillColor = COLORS.error;
      else if (selectedRegion === region.id) fillColor = COLORS.primary;
      else if (guessedSet.has(region.id)) fillColor = COLORS.surface;
      else fillColor = COLORS.backgroundCard;
      
      // Inline stroke logic (was getStrokeColor)
      const strokeColor = isHighlighted ? '#FFFFFF' : COLORS.textMuted;

      return (
        <AnimatedPath
          key={region.id}
          id={region.id}
          d={pathData}
          fill={fillColor}
          stroke={strokeColor}
          // Use dynamic stroke width
          animatedProps={isHighlighted ? animatedSelectedStrokeProps : animatedStrokeProps}
        />
      );
    });
  }, [selectedRegion, correctRegion, wrongRegion, guessedRegions, animatedStrokeProps, animatedSelectedStrokeProps, sortedRegions]);

  const selectedOverlay = useMemo(() => {
    if (!selectedRegion || !INDIA_SVG_PATHS[selectedRegion]) return null;
    return (
      <AnimatedPath
        key={`overlay-${selectedRegion}`}
        d={INDIA_SVG_PATHS[selectedRegion]}
        fill={COLORS.primary} 
        stroke={COLORS.primary}
        animatedProps={animatedSelectedStrokeProps}
        opacity={0.8}
        pointerEvents="none"
      />
    );
  }, [selectedRegion, animatedSelectedStrokeProps]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composed}>
        <View style={styles.viewport}>
          <Animated.View style={[styles.mapContainer, animatedStyle]}>
            <Svg
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              viewBox={`-20 -20 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
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
    position: 'relative', 
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
    top: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    padding: 8,
    borderRadius: 20, 
    ...SHADOWS.md,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
