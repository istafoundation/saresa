import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, LayoutChangeEvent, Dimensions, useWindowDimensions } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, G, Circle } from 'react-native-svg';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedProps, 
  withSpring, 
  runOnJS,
  SharedValue
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const TOUCH_SLOP = 20; 

interface MatchRendererProps {
  question: string;
  data: {
    pairs: Array<{
      imageUrl: string;
      text: string;
    }>;
  };
  onAnswer: (isCorrect: boolean) => void;
  disabled?: boolean;
}

interface LayoutItem {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  type: 'image' | 'text';
  index: number;
}

// Create Animated Components
const AnimatedLine = Animated.createAnimatedComponent(Line);

// Helper for shuffling
function shuffleArray<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentIndex = result.length;
  let randomValue = seed;
  
  while (currentIndex > 0) {
    randomValue = (randomValue * 9301 + 49297) % 233280;
    const randomIndex = Math.floor((randomValue / 233280) * currentIndex);
    currentIndex--;
    [result[currentIndex], result[randomIndex]] = [result[randomIndex], result[currentIndex]];
  }
  
  return result;
}

export default function MatchRenderer({
  question,
  data,
  onAnswer,
  disabled = false,
}: MatchRendererProps) {
  // --- Dynamic Sizing ---
  const { width, height } = useWindowDimensions();
  
  // Calculate optimal image size to fit screen
  // Available height roughly: Screen - Header (~100) - Footer (~60) - Padding (~40)
  const availableHeight = height - 220; 
  const itemGap = SPACING.md;
  const numItems = data.pairs.length;
  
  // Height per item logic
  const maxItemHeight = (availableHeight - ((numItems - 1) * itemGap)) / numItems;
  const maxItemWidth = width * 0.35; // 35% width max
  
  // Final size is minimum of constraints, capped at 100 for sanity
  const IMAGE_SIZE = Math.min(maxItemHeight, maxItemWidth, 100); 

  // --- State & Setup ---
  const [containerLayout, setContainerLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [connections, setConnections] = useState<Map<number, number>>(new Map());
  const [showResult, setShowResult] = useState(false);
  
  // Shuffled Indices
  const { shuffledImageIndices, shuffledTextIndices } = useMemo(() => {
    const seed1 = data.pairs.length * 1234;
    const seed2 = data.pairs.length * 5678;
    return {
      shuffledImageIndices: shuffleArray(data.pairs.map((_, i) => i), seed1),
      shuffledTextIndices: shuffleArray(data.pairs.map((_, i) => i), seed2),
    };
  }, [data.pairs]);

  const layoutStore = useRef<Record<string, LayoutItem>>({});
  
  // --- Reanimated Shared Values ---
  const dragActive = useSharedValue(false);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const activeStartIndex = useSharedValue<number>(-1);
  const activeStartType = useSharedValue<'image' | 'text' | null>(null);
  const potentialMatchIndex = useSharedValue<number>(-1);
  const potentialMatchType = useSharedValue<'image' | 'text' | null>(null);

  const resetDrag = () => {
    'worklet';
    dragActive.value = false;
    activeStartIndex.value = -1;
    activeStartType.value = null;
    potentialMatchIndex.value = -1;
    potentialMatchType.value = null;
  };

  const handleConnection = (fromIndex: number, fromType: string, toIndex: number, toType: string) => {
    const imageIdx = fromType === 'image' ? fromIndex : toIndex;
    const textIdx = fromType === 'text' ? fromIndex : toIndex;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setConnections(prev => {
      const newMap = new Map(prev);
      if (newMap.has(imageIdx)) newMap.delete(imageIdx);
      for (const [img, txt] of newMap.entries()) {
        if (txt === textIdx) {
          newMap.delete(img);
          break;
        }
      }
      newMap.set(imageIdx, textIdx);
      return newMap;
    });
  };

  // --- Gestures ---
  const checkHit = (x: number, y: number): { index: number, type: 'image' | 'text', cx: number, cy: number } | null => {
    'worklet';
    for (const i of shuffledImageIndices) {
      const key = `image-${i}`;
      const layout = layoutStore.current[key];
      if (layout && x >= layout.x - TOUCH_SLOP && x <= layout.x + layout.width + TOUCH_SLOP && y >= layout.y - TOUCH_SLOP && y <= layout.y + layout.height + TOUCH_SLOP) {
        return { index: i, type: 'image', cx: layout.centerX, cy: layout.centerY };
      }
    }
    for (const i of shuffledTextIndices) {
      const key = `text-${i}`;
      const layout = layoutStore.current[key];
      if (layout && x >= layout.x - TOUCH_SLOP && x <= layout.x + layout.width + TOUCH_SLOP && y >= layout.y - TOUCH_SLOP && y <= layout.y + layout.height + TOUCH_SLOP) {
        return { index: i, type: 'text', cx: layout.centerX, cy: layout.centerY };
      }
    }
    return null;
  };

  const gesture = Gesture.Pan()
    // Removed manualActivation and onTouchesDown to fix Reanimated warning
    .onStart((e) => {
      const hit = checkHit(e.x, e.y);
      if (hit && !disabled && !showResult) {
        dragActive.value = true;
        activeStartIndex.value = hit.index;
        activeStartType.value = hit.type;
        startX.value = hit.cx;
        startY.value = hit.cy;
        dragX.value = hit.cx;
        dragY.value = hit.cy;
      } else {
        // If we didn't hit anything, ensure drag is inactive
        dragActive.value = false;
      }
    })
    .onUpdate((e) => {
      if (!dragActive.value) return;
      
      dragX.value = e.x;
      dragY.value = e.y;
      
      // Collision Detection
      const targetType = activeStartType.value === 'image' ? 'text' : 'image';
      const indicesToCheck = targetType === 'image' ? shuffledImageIndices : shuffledTextIndices;
      
      let foundMatch = false;
      for (const i of indicesToCheck) {
        const key = `${targetType}-${i}`;
        const layout = layoutStore.current[key];
        if (layout) {
          const dx = dragX.value - layout.centerX;
          const dy = dragY.value - layout.centerY;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 60) { 
             potentialMatchIndex.value = i;
             potentialMatchType.value = targetType;
             foundMatch = true;
             break;
          }
        }
      }
      if (!foundMatch) {
        potentialMatchIndex.value = -1;
        potentialMatchType.value = null;
      }
    })
    .onEnd(() => {
      if (!dragActive.value) return;
      if (potentialMatchIndex.value !== -1 && potentialMatchType.value !== null) {
        runOnJS(handleConnection)(activeStartIndex.value, activeStartType.value!, potentialMatchIndex.value, potentialMatchType.value);
      }
      resetDrag();
    })
    .runOnJS(true);

  // --- Handlers ---
  const [col2Offset, setCol2Offset] = useState(0);

  const handleItemLayout = useCallback((layout: LayoutItem) => {
    const key = `${layout.type}-${layout.index}`;
    layoutStore.current[key] = layout;
  }, []);

  // --- Animated Props for Line ---
  const activeLineProps = useAnimatedProps(() => {
    if (!dragActive.value) return { x1: 0, y1: 0, x2: 0, y2: 0, strokeOpacity: 0 };
    
    // Snap line end to target if hovering
    let targetX = dragX.value;
    let targetY = dragY.value;
    
    if (potentialMatchIndex.value !== -1 && potentialMatchType.value !== null) {
       // Optional: Add snap logic here if desired
    }

    return {
      x1: startX.value,
      y1: startY.value,
      x2: targetX,
      y2: targetY,
      strokeOpacity: 1,
    };
  });

  // Submit
  const handleSubmit = useCallback(() => {
    if (connections.size !== data.pairs.length || showResult) return;
    
    let correctCount = 0;
    connections.forEach((textIndex, imageIndex) => {
      if (imageIndex === textIndex) correctCount++;
    });
    
    const allCorrect = correctCount === data.pairs.length;
    setShowResult(true);
    
    setTimeout(() => {
      onAnswer(allCorrect);
    }, 2000);
  }, [connections, showResult, data, onAnswer]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header and MatchArea same ... */}
        {/* ... */}
        <MotiView 
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.header}
        >
          <Text style={styles.questionText}>{question}</Text>
          <Text style={styles.hintText}>
            Drag from an image to its matching text
          </Text>
        </MotiView>

        {/* Game Area */}
        <View 
          style={styles.matchArea}
          onLayout={(e) => {
            const { x, y, width, height } = e.nativeEvent.layout;
            setContainerLayout({ x, y, width, height });
          }}
        >
          <GestureDetector gesture={gesture}>
            <Animated.View style={[{ flex: 1 }, connections.size > 0 && { zIndex: 1 }]}>

              {/* SVG Layer */}
              <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                {Array.from(connections.entries()).map(([imgIdx, txtIdx]) => {
                  const imgKey = `image-${imgIdx}`;
                  const txtKey = `text-${txtIdx}`;
                  const imgLayout = layoutStore.current[imgKey];
                  const txtLayout = layoutStore.current[txtKey];
                  
                  if (!imgLayout || !txtLayout) return null;

                  const isCorrect = showResult && imgIdx === txtIdx;
                  const isWrong = showResult && imgIdx !== txtIdx;
                  const color = isCorrect ? COLORS.success : isWrong ? COLORS.error : COLORS.primary;

                  return (
                    <G key={`conn-${imgIdx}`}>
                       <Line
                        x1={imgLayout.centerX}
                        y1={imgLayout.centerY}
                        x2={txtLayout.centerX}
                        y2={txtLayout.centerY}
                        stroke={color}
                        strokeWidth={3}
                        strokeLinecap="round"
                      />
                      <Circle cx={imgLayout.centerX} cy={imgLayout.centerY} r={5} fill={color} />
                      <Circle cx={txtLayout.centerX} cy={txtLayout.centerY} r={5} fill={color} />
                    </G>
                  );
                })}

                <AnimatedLine
                  animatedProps={activeLineProps}
                  stroke={COLORS.primary}
                  strokeWidth={4}
                  strokeDasharray="10, 5"
                  strokeLinecap="round"
                />
              </Svg>

              {/* Content Columns Layer */}
              <View style={styles.columns}>
                {/* Images Column */}
                <View style={[styles.column, { alignItems: 'flex-start' }]}>
                  {shuffledImageIndices.map((pairIndex, i) => {
                    const pair = data.pairs[pairIndex];
                    const isConnected = connections.has(pairIndex);
                    
                    return (
                      <MatchItem
                        key={`img-${pairIndex}`}
                        type="image"
                        index={pairIndex}
                        content={pair.imageUrl}
                        delay={i * 50}
                        connected={isConnected}
                        imageSize={IMAGE_SIZE}
                        onLayout={handleItemLayout}
                        activeItemIndex={activeStartIndex}
                        activeItemType={activeStartType}
                        potentialMatchIndex={potentialMatchIndex}
                        potentialMatchType={potentialMatchType}
                        showResult={showResult}
                        isCorrect={showResult && connections.get(pairIndex) === pairIndex}
                        isWrong={showResult && isConnected && connections.get(pairIndex) !== pairIndex}
                      />
                    );
                  })}
                </View>

                {/* Texts Column */}
                <View 
                  style={[styles.column, { alignItems: 'flex-end' }]}
                  onLayout={(e) => setCol2Offset(e.nativeEvent.layout.x)}
                >
                  {shuffledTextIndices.map((pairIndex, i) => {
                    const pair = data.pairs[pairIndex];
                    const isConnected = Array.from(connections.values()).includes(pairIndex);
                    const connectedFrom = Array.from(connections.entries()).find(([_, t]) => t === pairIndex)?.[0];

                    return (
                      <MatchItem
                        key={`txt-${pairIndex}`}
                        type="text"
                        index={pairIndex}
                        content={pair.text}
                        delay={i * 50}
                        connected={isConnected}
                        imageSize={IMAGE_SIZE}
                        offsetX={col2Offset || 200 }
                        onLayout={handleItemLayout}
                        activeItemIndex={activeStartIndex}
                        activeItemType={activeStartType}
                        potentialMatchIndex={potentialMatchIndex}
                        potentialMatchType={potentialMatchType}
                        showResult={showResult}
                        isCorrect={showResult && connectedFrom === pairIndex}
                        isWrong={showResult && isConnected && connectedFrom !== pairIndex}
                      />
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Footer / Submit */}
        <View style={styles.footer}>
           {!showResult && (
             <Text style={styles.statusText}>
               {connections.size} / {data.pairs.length} connected
             </Text>
           )}

           {connections.size === data.pairs.length && !showResult && (
             <MotiView from={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
               <GestureDetector gesture={Gesture.Tap().onEnd(runOnJS(handleSubmit))}>
                 <View style={styles.submitButton}>
                   <Ionicons name="checkmark-circle" size={24} color={COLORS.text} />
                   <Text style={styles.submitText}>Check Answers</Text>
                 </View>
               </GestureDetector>
             </MotiView>
           )}

           {showResult && (
             <MotiView from={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.resultBox}>
                <Ionicons 
                  name={connections.size === data.pairs.length && Array.from(connections.entries()).every(([k,v]) => k===v) ? "trophy" : "alert-circle"} 
                  size={32} 
                  color={COLORS.text} 
                />
                <Text style={styles.resultText}>
                  {Array.from(connections.entries()).every(([k,v]) => k===v) ? "Perfect Match!" : "Keep Trying!"}
                </Text>
             </MotiView>
           )}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

// --- Sub-Component for Individual Items ---
const MatchItem = ({ 
  type, 
  index, 
  content, 
  delay, 
  connected, 
  onLayout, 
  imageSize,
  offsetX = 0,
  activeItemIndex,
  activeItemType,
  potentialMatchIndex,
  potentialMatchType,
  showResult,
  isCorrect,
  isWrong
}: {
  type: 'image' | 'text',
  index: number,
  content: string,
  delay: number,
  connected: boolean,
  onLayout: (l: LayoutItem) => void,
  imageSize: number, 
  offsetX?: number,
  activeItemIndex: SharedValue<number>,
  activeItemType: SharedValue<'image' | 'text' | null>,
  potentialMatchIndex: SharedValue<number>,
  potentialMatchType: SharedValue<'image' | 'text' | null>,
  showResult: boolean,
  isCorrect?: boolean,
  isWrong?: boolean
}) => {
  const [localLayout, setLocalLayout] = useState<LayoutItem | null>(null);

  // Update parent store whenever local layout or offset changes
  useEffect(() => {
    if (localLayout) {
      const absoluteLayout = {
        ...localLayout,
        x: localLayout.x + offsetX,
        centerX: localLayout.x + offsetX + localLayout.width / 2,
        centerY: localLayout.y + localLayout.height / 2, // Y is relative to column top, which matches container top? Yes usually.
      };
      
      // We pass this "absolute" layout up to the store
      // But wait, the pure onLayout passed from parent was doing the storage.
      // We should probably just call the passed onLayout prop here.
      onLayout(absoluteLayout);
    }
  }, [localLayout, offsetX, onLayout]);

  // Highlighting Animation
  const animatedStyle = useAnimatedStyle(() => {
    // Check if this item is currently being dragged FROM
    const isSource = activeItemIndex.value === index && activeItemType.value === type;
    
    // Check if this item is a potential drop target
    const isTarget = potentialMatchIndex.value === index && potentialMatchType.value === type;

    return {
      transform: [
        { scale: withSpring(isSource || isTarget ? 1.1 : 1) }
      ],
      borderColor: isSource || isTarget ? COLORS.primary : 'transparent',
      borderWidth: isSource || isTarget ? 2 : 0,
    };
  });

  const borderStyle = useMemo(() => {
     if (isCorrect) return { borderColor: COLORS.success, borderWidth: 3 };
     if (isWrong) return { borderColor: COLORS.error, borderWidth: 3 };
     if (connected) return { borderColor: COLORS.accent, borderWidth: 2 };
     return {};
  }, [connected, isCorrect, isWrong]);

  // Image Display
  if (type === 'image') {
    const imageUrl = content.includes('?') 
       ? `${content}&tr=w-${imageSize * 2},h-${imageSize * 2},fo-center`
       : `${content}?tr=w-${imageSize * 2},h-${imageSize * 2},fo-center`;

    return (
      <View 
        style={styles.itemWrapper}
        onLayout={(e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          setLocalLayout({
            x, y, width, height,
            centerX: x + width / 2, 
            centerY: y + height / 2,
            type: 'image',
            index
          });
        }}
      >
        <MotiView
           from={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           delay={delay}
        >
          <Animated.View style={[styles.imageBox, { width: imageSize, height: imageSize }, borderStyle, animatedStyle]}>
            <Image source={{ uri: imageUrl }} style={styles.image} />
            {connected && !showResult && (
               <View style={styles.badge}><Ionicons name="link" size={12} color="white" /></View>
            )}
            {isCorrect && (
               <View style={[styles.badge, { backgroundColor: COLORS.success }]}><Ionicons name="checkmark" size={12} color="white" /></View>
            )}
          </Animated.View>
        </MotiView>
      </View>
    );
  }

  // Text Display
  return (
    <View 
      style={styles.itemWrapper}
      onLayout={(e) => {
        const { x, y, width, height } = e.nativeEvent.layout;
        setLocalLayout({
            x, y, width, height,
            centerX: x + width / 2,
            centerY: y + height / 2,
            type: 'text',
            index
        });
      }}
    >
      <MotiView
        from={{ opacity: 0, translateX: 20 }}
        animate={{ opacity: 1, translateX: 0 }}
        delay={delay}
      >
        <Animated.View style={[
           styles.textBox, 
           { minHeight: imageSize * 0.6 }, // Match somewhat the height
           borderStyle, 
           animatedStyle
        ]}>
          <Text style={styles.textLabel}>{content}</Text>
          {isCorrect && <Ionicons name="checkmark-circle" size={16} color={COLORS.success} style={{marginLeft: 4}} />}
        </Animated.View>
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  matchArea: {
    flex: 1,
    minHeight: 400, // Ensure enough drag space
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.md,
    overflow: 'hidden', // Contain the SVG lines
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    gap: SPACING.xl, // Space between items vertically
    justifyContent: 'center',
  },
  itemWrapper: {
    zIndex: 10, // Ensure touchable above lines
  },
  imageBox: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    ...SHADOWS.sm,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textBox: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    minWidth: 120,
    maxWidth: 160,
    ...SHADOWS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  submitButton: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  submitText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  resultBox: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});
