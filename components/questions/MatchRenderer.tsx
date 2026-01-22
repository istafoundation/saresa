import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, LayoutChangeEvent, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, G, Circle } from 'react-native-svg';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedProps, 
  withSpring, 
  withTiming, 
  runOnJS,
  interpolate,
  useDerivedValue,
  SharedValue
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

// --- Constants & Types ---
const IMAGE_SIZE = 80; // Slightly larger for better touch target
const TOUCH_SLOP = 20; // Extra area for easier grabbing

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
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
  // --- State & Setup ---
  const [containerLayout, setContainerLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  // Connections: Map<imageIndex, textIndex>
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

  // Layout Store (Mutable ref for performance, read in worklets)
  // keys: "image-0", "text-1", etc.
  const layoutStore = useRef<Record<string, LayoutItem>>({});
  
  // --- Reanimated Shared Values ---
  const dragActive = useSharedValue(false);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  
  // Track which item we started dragging from
  const activeStartIndex = useSharedValue<number>(-1);
  const activeStartType = useSharedValue<'image' | 'text' | null>(null);
  
  // Track potential drop target
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
    // Determine image and text indices
    const imageIdx = fromType === 'image' ? fromIndex : toIndex;
    const textIdx = fromType === 'text' ? fromIndex : toIndex;
    
    // Play haptic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Update state
    setConnections(prev => {
      const newMap = new Map(prev);
      // Remove any existing connections for these specific items to prevent duplicates/conflicts
      // 1. If imageIdx was connected to something else, remove it
      if (newMap.has(imageIdx)) newMap.delete(imageIdx);
      
      // 2. If something else was connected to textIdx, remove that connection
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

  const disconnect = (imageIdx: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setConnections(prev => {
      const newMap = new Map(prev);
      newMap.delete(imageIdx);
      return newMap;
    });
  };

  // --- Gestures ---
  const gesture = Gesture.Pan()
    .onStart((e) => {
      if (disabled || showResult) return;
      
      // Hit testing: find which item receives the touch
      const hitX = e.x;
      const hitY = e.y;
      
      // Check images
      for (const i of shuffledImageIndices) {
        const key = `image-${i}`;
        const layout = layoutStore.current[key];
        if (layout && 
            hitX >= layout.x - TOUCH_SLOP && hitX <= layout.x + layout.width + TOUCH_SLOP &&
            hitY >= layout.y - TOUCH_SLOP && hitY <= layout.y + layout.height + TOUCH_SLOP) {
              
          dragActive.value = true;
          activeStartIndex.value = i;
          activeStartType.value = 'image';
          startX.value = layout.centerX;
          startY.value = layout.centerY;
          dragX.value = layout.centerX;
          dragY.value = layout.centerY;
          return;
        }
      }

      // Check texts
      for (const i of shuffledTextIndices) {
        const key = `text-${i}`;
        const layout = layoutStore.current[key];
        if (layout && 
            hitX >= layout.x - TOUCH_SLOP && hitX <= layout.x + layout.width + TOUCH_SLOP &&
            hitY >= layout.y - TOUCH_SLOP && hitY <= layout.y + layout.height + TOUCH_SLOP) {
              
          dragActive.value = true;
          activeStartIndex.value = i;
          activeStartType.value = 'text';
          startX.value = layout.centerX;
          startY.value = layout.centerY;
          dragX.value = layout.centerX;
          dragY.value = layout.centerY;
          return;
        }
      }
    })
    .onUpdate((e) => {
      if (!dragActive.value) return;
      
      dragX.value = e.x;
      dragY.value = e.y;
      
      // Collision Detection for Drop Zone
      // We look for the "opposing" type
      const targetType = activeStartType.value === 'image' ? 'text' : 'image';
      const indicesToCheck = targetType === 'image' ? shuffledImageIndices : shuffledTextIndices;
      
      let foundMatch = false;
      
      for (const i of indicesToCheck) {
        const key = `${targetType}-${i}`;
        const layout = layoutStore.current[key];
        
        if (layout) {
          // Simple distance check or bounding box
          // Using distance here for smoother "magnetic" feel range
          const dx = dragX.value - layout.centerX;
          const dy = dragY.value - layout.centerY;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 60) { // SNAP DISTANCE
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
        // Valid Match Found!
        runOnJS(handleConnection)(
          activeStartIndex.value, 
          activeStartType.value!, 
          potentialMatchIndex.value, 
          potentialMatchType.value
        );
      } else {
        // No match, just dropped. 
        // If we dragged FROM an item that was connected, maybe disconnect?
        // Let's implement disconnect if you drag away and drop nowhere.
        /* 
           Actually, commonly better UX: 
           - Dragging from an already connected item re-routes that connection.
           - If connection exists and you drag to empty space, maybe remove it?
           - Let's keep it simple: Dragging creates/overwrites. Tapping removes (implemented separately).
        */
      }
      
      resetDrag();
    })
    .runOnJS(true); // Needed for haptics triggering mostly, but we used runOnJS explicitly for the state update.

  // --- Handlers ---
  const handleLayout = (index: number, type: 'image' | 'text', event: LayoutChangeEvent) => {
    // This runs on JS thread, so we can update the ref directly
    // Ideally we want these to be relative to the matchArea container
    // But since the items are children of columns, their layout x/y is relative to the column.
    // We need to adjust 'x' based on which column it is.
    
    const { x, y, width, height } = event.nativeEvent.layout;
    
    // We need to know column offsets. Hard to get perfectly dynamically without more measurements.
    // Simplification: We know the columns are row-flexed.
    // Let's assume the container is roughly split.
    // BETTER FIX: use measure() if possible, but onLayout is faster.
    // Workaround: We will use the fact that Images are Left, Text is Right.
    // We'll add an offset to Text items later, or just trust the visual layout if we structure it flatly?
    // Let's structure the view so specific offsets aren't needed or are predictable.
    
    // Actually, `x` and `y` from onLayout are relative to parent view.
    // If we have: Row -> [Col1, Col2].
    // Col1 items x is 0 relative to Col1.
    // Col2 items x is 0 relative to Col2.
    // We need Col2's x position relative to Container.
    
    // Let's adjust in the store.
    // We will measure the 'Columns' view to update the offsets.
  };

  const [col2Offset, setCol2Offset] = useState(0);

  // --- Animated Props for Line ---
  const activeLineProps = useAnimatedProps(() => {
    if (!dragActive.value) return { x1: 0, y1: 0, x2: 0, y2: 0, strokeOpacity: 0 };
    
    // Snap line end to target if hovering
    let targetX = dragX.value;
    let targetY = dragY.value;
    
    if (potentialMatchIndex.value !== -1 && potentialMatchType.value !== null) {
       // Snap visual feedback
       // We can't easily read layoutStore here in a purely derived way unless we made it a sharedValue.
       // But we can just use dragX/Y because onUpdate is fast enough to make it feel fine?
       // OR: We can store the snapped center in shared values during onUpdate.
       // Let's stick to finger position for the line tip, but maybe show a highlight on the target.
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
        {/* Header Question */}
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
            <Animated.View style={StyleSheet.absoluteFill}>
              {/* SVG Layer for Lines */}
              <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                {/* Existing Connections */}
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
                      {/* End dots for polish */}
                      <Circle cx={imgLayout.centerX} cy={imgLayout.centerY} r={5} fill={color} />
                      <Circle cx={txtLayout.centerX} cy={txtLayout.centerY} r={5} fill={color} />
                    </G>
                  );
                })}

                {/* Active Drag Line */}
                <AnimatedLine
                  animatedProps={activeLineProps}
                  stroke={COLORS.primary}
                  strokeWidth={4}
                  strokeDasharray="10, 5" // Dashed while dragging
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
                        onLayout={(layout) => {
                          layoutStore.current[`image-${pairIndex}`] = layout;
                        }}
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
                    // find which image connected to this text
                    const connectedFrom = Array.from(connections.entries()).find(([_, t]) => t === pairIndex)?.[0];

                    return (
                      <MatchItem
                        key={`txt-${pairIndex}`}
                        type="text"
                        index={pairIndex}
                        content={pair.text}
                        delay={i * 50}
                        connected={isConnected}
                        offsetX={col2Offset || 200 } // Fallback until measured
                        onLayout={(layout) => {
                           // Adjust X by the column offset since layout is relative to column
                           // But wait! MatchItem calculates mostly relative to itself.
                           // Actually we need global coordinates relative to matchArea.
                           // Since 'column' is a child of 'matchArea' (via 'columns'), 
                           // we just need to know the layout relative to 'matchArea'.
                           // The 'columns' view is flex-row.
                           // 'onLayout' for items gives x relative to 'column'.
                           // So we DO need to add col2Offset for the second column.
                           const absoluteLayout = {
                             ...layout,
                             x: layout.x + (col2Offset || 0), // Add column offset
                             centerX: layout.centerX + (col2Offset || 0)
                           };
                           layoutStore.current[`text-${pairIndex}`] = absoluteLayout;
                        }}
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
  offsetX?: number,
  activeItemIndex: SharedValue<number>,
  activeItemType: SharedValue<'image' | 'text' | null>,
  potentialMatchIndex: SharedValue<number>,
  potentialMatchType: SharedValue<'image' | 'text' | null>,
  showResult: boolean,
  isCorrect?: boolean,
  isWrong?: boolean
}) => {
  
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
       ? `${content}&tr=w-${IMAGE_SIZE * 2},h-${IMAGE_SIZE * 2},fo-center`
       : `${content}?tr=w-${IMAGE_SIZE * 2},h-${IMAGE_SIZE * 2},fo-center`;

    return (
      <View 
        style={styles.itemWrapper}
        onLayout={(e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          onLayout({
            x, y, width, height,
            centerX: x + width / 2, // will be adjusted by consumer
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
          <Animated.View style={[styles.imageBox, borderStyle, animatedStyle]}>
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
         onLayout({
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
        <Animated.View style={[styles.textBox, borderStyle, animatedStyle]}>
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
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
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
