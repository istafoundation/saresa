// Match Renderer - Picture matching with connecting lines
// User taps an image, then taps corresponding text to create a match
import { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, LayoutChangeEvent } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line } from 'react-native-svg';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

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

// Fisher-Yates shuffle with seed for consistent results
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

// Image size for 1:1 aspect ratio
const IMAGE_SIZE = 70;

export default function MatchRenderer({
  question,
  data,
  onAnswer,
  disabled = false,
}: MatchRendererProps) {
  // Create shuffled indices for images and texts
  const { shuffledImageIndices, shuffledTextIndices } = useMemo(() => {
    const seed1 = data.pairs.length * 1234;
    const seed2 = data.pairs.length * 5678;
    return {
      shuffledImageIndices: shuffleArray(data.pairs.map((_, i) => i), seed1),
      shuffledTextIndices: shuffleArray(data.pairs.map((_, i) => i), seed2),
    };
  }, [data.pairs]);
  
  // State
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [connections, setConnections] = useState<Map<number, number>>(new Map()); // imageIndex -> textIndex
  const [showResult, setShowResult] = useState(false);
  
  // Positions for drawing lines
  const [imagePositions, setImagePositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [textPositions, setTextPositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  const containerRef = useRef<View>(null);
  const [containerLayout, setContainerLayout] = useState({ x: 0, y: 0 });
  
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { x, y } = event.nativeEvent.layout;
    setContainerLayout({ x, y });
  }, []);
  
  const handleImageLayout = useCallback((pairIndex: number, event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setImagePositions(prev => {
      const newMap = new Map(prev);
      newMap.set(pairIndex, { x: x + width, y: y + height / 2 });
      return newMap;
    });
  }, []);
  
  const handleTextLayout = useCallback((pairIndex: number, event: LayoutChangeEvent) => {
    const { x, y, height } = event.nativeEvent.layout;
    setTextPositions(prev => {
      const newMap = new Map(prev);
      newMap.set(pairIndex, { x, y: y + height / 2 });
      return newMap;
    });
  }, []);
  
  // Handle image tap
  const handleImagePress = useCallback((pairIndex: number) => {
    if (disabled || showResult) return;
    
    // If already connected, disconnect it
    if (connections.has(pairIndex)) {
      setConnections(prev => {
        const newMap = new Map(prev);
        newMap.delete(pairIndex);
        return newMap;
      });
      return;
    }
    
    setSelectedImageIndex(pairIndex);
  }, [disabled, showResult, connections]);
  
  // Handle text tap
  const handleTextPress = useCallback((pairIndex: number) => {
    if (disabled || showResult || selectedImageIndex === null) return;
    
    // Check if this text is already connected
    const existingConnection = Array.from(connections.entries()).find(([_, textIdx]) => textIdx === pairIndex);
    if (existingConnection) {
      // Remove existing connection
      setConnections(prev => {
        const newMap = new Map(prev);
        newMap.delete(existingConnection[0]);
        return newMap;
      });
    }
    
    // Create new connection
    setConnections(prev => {
      const newMap = new Map(prev);
      newMap.set(selectedImageIndex, pairIndex);
      return newMap;
    });
    setSelectedImageIndex(null);
  }, [disabled, showResult, selectedImageIndex, connections]);
  
  // Check if all pairs are connected
  const allConnected = connections.size === data.pairs.length;
  
  // Submit and check answers
  const handleSubmit = useCallback(() => {
    if (!allConnected || showResult) return;
    
    // Check if each connection is correct (image index should match text index)
    let correctCount = 0;
    connections.forEach((textIndex, imageIndex) => {
      if (imageIndex === textIndex) {
        correctCount++;
      }
    });
    
    const allCorrect = correctCount === data.pairs.length;
    setShowResult(true);
    
    setTimeout(() => {
      onAnswer(allCorrect);
    }, 2000);
  }, [allConnected, showResult, connections, data.pairs.length, onAnswer]);
  
  // Check if a specific connection is correct (for result display)
  const isConnectionCorrect = (imageIndex: number): boolean => {
    const textIndex = connections.get(imageIndex);
    return textIndex === imageIndex;
  };
  
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Question */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        style={styles.questionCard}
      >
        <Text style={styles.questionText}>{question}</Text>
        <Text style={styles.hintText}>
          Tap an image, then tap its matching text
        </Text>
      </MotiView>
      
      {/* Matching Area */}
      <View 
        ref={containerRef}
        style={styles.matchArea}
        onLayout={handleContainerLayout}
      >
        {/* SVG Overlay for lines */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from(connections.entries()).map(([imageIndex, textIndex]) => {
            const imagePos = imagePositions.get(imageIndex);
            const textPos = textPositions.get(textIndex);
            
            if (!imagePos || !textPos) return null;
            
            const isCorrect = showResult && imageIndex === textIndex;
            const isWrong = showResult && imageIndex !== textIndex;
            
            return (
              <Line
                key={`line-${imageIndex}-${textIndex}`}
                x1={imagePos.x}
                y1={imagePos.y}
                x2={textPos.x}
                y2={textPos.y}
                stroke={isCorrect ? COLORS.success : isWrong ? COLORS.error : COLORS.primary}
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
        
        {/* Two columns */}
        <View style={styles.columns}>
          {/* Left column - Images */}
          <View style={styles.column}>
            {shuffledImageIndices.map((pairIndex, displayIndex) => {
              const pair = data.pairs[pairIndex];
              const isSelected = selectedImageIndex === pairIndex;
              const isConnected = connections.has(pairIndex);
              const correct = showResult && isConnectionCorrect(pairIndex);
              const wrong = showResult && isConnected && !correct;
              
              // ImageKit transformation for 1:1 crop
              const imageUrl = pair.imageUrl.includes('?') 
                ? `${pair.imageUrl}&tr=w-${IMAGE_SIZE * 2},h-${IMAGE_SIZE * 2},fo-center`
                : `${pair.imageUrl}?tr=w-${IMAGE_SIZE * 2},h-${IMAGE_SIZE * 2},fo-center`;
              
              return (
                <MotiView
                  key={`img-${pairIndex}`}
                  from={{ opacity: 0, translateX: -20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ delay: displayIndex * 80 }}
                >
                  <Pressable
                    onPress={() => handleImagePress(pairIndex)}
                    onLayout={(e) => handleImageLayout(pairIndex, e)}
                    style={[
                      styles.imageBox,
                      isSelected && styles.imageSelected,
                      isConnected && !showResult && styles.imageConnected,
                      correct && styles.imageCorrect,
                      wrong && styles.imageWrong,
                    ]}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                    {isConnected && !showResult && (
                      <View style={styles.connectedBadge}>
                        <Ionicons name="link" size={14} color={COLORS.primary} />
                      </View>
                    )}
                    {correct && (
                      <View style={styles.resultBadge}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                    {wrong && (
                      <View style={[styles.resultBadge, styles.wrongBadge]}>
                        <Ionicons name="close" size={16} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                </MotiView>
              );
            })}
          </View>
          
          {/* Right column - Texts */}
          <View style={styles.column}>
            {shuffledTextIndices.map((pairIndex, displayIndex) => {
              const pair = data.pairs[pairIndex];
              const isConnectedTo = Array.from(connections.values()).includes(pairIndex);
              const connectedFrom = Array.from(connections.entries()).find(([_, t]) => t === pairIndex)?.[0];
              const correct = showResult && connectedFrom === pairIndex;
              const wrong = showResult && isConnectedTo && connectedFrom !== pairIndex;
              
              return (
                <MotiView
                  key={`text-${pairIndex}`}
                  from={{ opacity: 0, translateX: 20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ delay: displayIndex * 80 }}
                >
                  <Pressable
                    onPress={() => handleTextPress(pairIndex)}
                    onLayout={(e) => handleTextLayout(pairIndex, e)}
                    style={[
                      styles.textBox,
                      selectedImageIndex !== null && styles.textSelectable,
                      isConnectedTo && !showResult && styles.textConnected,
                      correct && styles.textCorrect,
                      wrong && styles.textWrong,
                    ]}
                  >
                    <Text 
                      style={[
                        styles.textLabel,
                        correct && styles.textLabelResult,
                        wrong && styles.textLabelResult,
                      ]}
                      numberOfLines={2}
                    >
                      {pair.text}
                    </Text>
                  </Pressable>
                </MotiView>
              );
            })}
          </View>
        </View>
      </View>
      
      {/* Connection status */}
      {!showResult && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {connections.size} / {data.pairs.length} connected
          </Text>
        </View>
      )}
      
      {/* Submit button */}
      {allConnected && !showResult && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
        >
          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitPressed,
            ]}
          >
            <Ionicons name="checkmark-circle" size={24} color={COLORS.text} />
            <Text style={styles.submitText}>Check Answers</Text>
          </Pressable>
        </MotiView>
      )}
      
      {/* Result feedback */}
      {showResult && (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          style={[
            styles.resultCard,
            Array.from(connections.entries()).every(([img, txt]) => img === txt)
              ? styles.resultCardCorrect
              : styles.resultCardWrong,
          ]}
        >
          <Ionicons
            name={Array.from(connections.entries()).every(([img, txt]) => img === txt) ? 'trophy' : 'refresh'}
            size={32}
            color={Array.from(connections.entries()).every(([img, txt]) => img === txt) ? COLORS.accentGold : COLORS.error}
          />
          <Text style={styles.resultText}>
            {Array.from(connections.entries()).every(([img, txt]) => img === txt)
              ? 'Perfect Match!'
              : 'Some matches were incorrect'}
          </Text>
        </MotiView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  questionCard: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  hintText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  matchArea: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    minHeight: 300,
    ...SHADOWS.md,
  },
  columns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    gap: SPACING.md,
    flex: 1,
  },
  imageBox: {
    width: IMAGE_SIZE + 8,
    height: IMAGE_SIZE + 8,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 3,
    borderColor: COLORS.textMuted + '40',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  imageSelected: {
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  imageConnected: {
    borderColor: COLORS.accent,
  },
  imageCorrect: {
    borderColor: COLORS.success,
    borderWidth: 3,
  },
  imageWrong: {
    borderColor: COLORS.error,
    borderWidth: 3,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  connectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent + '30',
    borderRadius: 10,
    padding: 2,
  },
  resultBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    padding: 4,
  },
  wrongBadge: {
    backgroundColor: COLORS.error,
  },
  textBox: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignSelf: 'flex-end',
    minWidth: 100,
    maxWidth: 140,
  },
  textSelectable: {
    borderColor: COLORS.primary + '50',
    borderStyle: 'dashed',
  },
  textConnected: {
    backgroundColor: COLORS.accent + '15',
    borderColor: COLORS.accent,
  },
  textCorrect: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
  },
  textWrong: {
    backgroundColor: COLORS.error + '20',
    borderColor: COLORS.error,
  },
  textLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  textLabelResult: {
    color: '#fff',
  },
  statusBar: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
  },
  submitPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
  },
  resultCardCorrect: {
    backgroundColor: COLORS.success + '15',
    borderWidth: 2,
    borderColor: COLORS.success + '40',
  },
  resultCardWrong: {
    backgroundColor: COLORS.error + '15',
    borderWidth: 2,
    borderColor: COLORS.error + '40',
  },
  resultText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});
