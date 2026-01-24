// Select Renderer - Word selection from sentence (Grammar Detective style)
// Uses inline text with tappable words like the Grammar Detective game
import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

interface SelectRendererProps {
  question: string;
  data: {
    statement: string;
    correctWords: string[];
    selectMode: 'single' | 'multiple' | 'boxed';
  };
  onAnswer: (isCorrect: boolean) => void;
  onFeedback?: (isCorrect: boolean) => void;
  disabled?: boolean;
}

export default function SelectRenderer({
  question,
  data,
  onAnswer,
  onFeedback,
  disabled = false,
}: SelectRendererProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Parse statement into words (preserving punctuation attached to words)
  const words = useMemo(() => {
    return data.statement.split(/\s+/).filter(w => w.length > 0);
  }, [data.statement]);
  
  // Find correct word indices based on correctWords array
  const correctIndices = useMemo(() => {
    const indices: number[] = [];
    words.forEach((word, index) => {
      // Strip punctuation for comparison
      const cleanWord = word.replace(/[.,!?;:'"]/g, '');
      if (data.correctWords.some(cw => 
        cw === cleanWord ||
        cw === word
      )) {
        indices.push(index);
      }
    });
    return indices;
  }, [words, data.correctWords]);
  
  const handleWordPress = useCallback((index: number) => {
    if (disabled || showResult) return;
    
    const newSelected = new Set(selectedIndices);
    
    if (data.selectMode === 'single') {
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.clear();
        newSelected.add(index);
      }
    } else {
      // Multiple OR Boxed (Boxed defaults to multiple)
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
    }
    
    setSelectedIndices(newSelected);
  }, [disabled, showResult, selectedIndices, data.selectMode]);
  
  const handleSubmit = useCallback(() => {
    if (selectedIndices.size === 0 || showResult) return;
    
    // Check if selection matches correct indices
    const selectedArray = Array.from(selectedIndices);
    const correct = 
      selectedArray.length === correctIndices.length &&
      selectedArray.every(i => correctIndices.includes(i));
    
    setIsCorrect(correct);
    setShowResult(true);
    if (onFeedback) {
      onFeedback(correct);
    }
    
    // Immediately notify parent - parent controls timing now
    onAnswer(correct);
  }, [selectedIndices, showResult, correctIndices, onAnswer, onFeedback]);
  
  const isBoxed = data.selectMode === 'boxed';

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Question Card */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        style={styles.questionCard}
      >
        <View style={styles.questionBadge}>
          <Text style={styles.questionBadgeText}>QUESTION</Text>
        </View>
        <Text style={styles.questionText}>{question}</Text>
        <Text style={styles.hintText}>
          {data.selectMode === 'single' 
            ? 'Tap on the correct word below' 
            : 'Tap on all correct words below'}
        </Text>
      </MotiView>
      
      {/* Sentence Card - Inline text like Grammar Detective */}
      <MotiView
        from={{ opacity: 0, translateY: 15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 100 }}
        style={styles.sentenceCard}
      >
        {/* Only show "Read the sentence" header if NOT boxed (optional choice, keeping it clean for boxed) */}
        {!isBoxed && (
          <View style={styles.sentenceHeader}>
            <Ionicons name="document-text-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.sentenceLabel}>Read the sentence:</Text>
          </View>
        )}
        
        {/* Sentence Container */}
        <View style={isBoxed ? styles.boxedContainer : undefined}>
          {isBoxed ? (
            // BOXED RENDERING
            words.map((word, index) => {
              const isSelected = selectedIndices.has(index);
              const isCorrectWord = correctIndices.includes(index);
              
              // Boxed States
              let boxStyle: any = styles.boxedWord;
              let textStyle: any = styles.boxedWordText;

              if (showResult) {
                if (isCorrectWord) {
                  boxStyle = [styles.boxedWord, styles.boxedCorrect];
                  textStyle = styles.boxedTextCorrect;
                } else if (isSelected && !isCorrectWord) {
                  boxStyle = [styles.boxedWord, styles.boxedWrong];
                  textStyle = styles.boxedTextWrong;
                } else {
                   // Unselected, non-correct words in result view
                   boxStyle = [styles.boxedWord, { opacity: 0.5 }];
                }
              } else if (isSelected) {
                boxStyle = [styles.boxedWord, styles.boxedSelected];
                textStyle = styles.boxedTextSelected;
              }

              return (
                <Pressable
                  key={`boxed-${index}`}
                  onPress={() => handleWordPress(index)}
                  style={boxStyle}
                >
                  <Text style={textStyle}>{word}</Text>
                </Pressable>
              );
            })
          ) : (
            // INLINE TEXT RENDERING (Original)
            <Text style={styles.sentenceText}>
              {words.map((word, index) => {
                const isSelected = selectedIndices.has(index);
                const isCorrectWord = correctIndices.includes(index);
                const isWrongSelection = showResult && isSelected && !isCorrectWord;
                const isMissedCorrect = showResult && isCorrectWord && !isSelected;
                
                // Determine background and text color based on state
                let bgStyle = {};
                let textColor = COLORS.text;
                
                if (showResult) {
                  if (isCorrectWord) {
                    bgStyle = styles.wordCorrectBg;
                    textColor = COLORS.success;
                  } else if (isWrongSelection) {
                    bgStyle = styles.wordWrongBg;
                    textColor = COLORS.error;
                  }
                } else if (isSelected) {
                  bgStyle = styles.wordSelectedBg;
                  textColor = COLORS.primary;
                }
                
                const isLastWord = index === words.length - 1;
                
                return (
                  <Text key={`word-${index}`}>
                    <Text
                      onPress={() => handleWordPress(index)}
                      style={[
                        styles.inlineWord,
                        bgStyle,
                        { color: textColor },
                        isMissedCorrect && styles.wordMissedText,
                      ]}
                    >
                      {word}
                    </Text>
                    {!isLastWord && <Text style={styles.wordSpace}> </Text>}
                  </Text>
                );
              })}
            </Text>
          )}
        </View>
        
        {/* Selection indicator */}
        {selectedIndices.size > 0 && !showResult && (
          <MotiView
            from={{ opacity: 0, translateY: 5 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={styles.selectionSummary}
          >
            <Ionicons name="checkmark-done" size={16} color={COLORS.primary} />
            <Text style={styles.selectionText}>
              Selected: {Array.from(selectedIndices).map(i => words[i]).join(', ')}
            </Text>
          </MotiView>
        )}
      </MotiView>
      
      {/* Submit button */}
      {!showResult && selectedIndices.size > 0 && (
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
            <Ionicons name="send" size={20} color={COLORS.text} />
            <Text style={styles.submitText}>Submit Answer</Text>
          </Pressable>
        </MotiView>
      )}
      
      {/* Result Feedback */}
      {showResult && (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          style={[
            styles.resultCard,
            isCorrect ? styles.resultCardCorrect : styles.resultCardWrong,
          ]}
        >
          <View style={styles.resultHeader}>
            <View style={[
              styles.resultIconBg,
              { backgroundColor: isCorrect ? COLORS.success + '20' : COLORS.error + '20' }
            ]}>
              <Ionicons
                name={isCorrect ? 'checkmark' : 'close'}
                size={24}
                color={isCorrect ? COLORS.success : COLORS.error}
              />
            </View>
            <Text style={[
              styles.resultTitle,
              { color: isCorrect ? COLORS.success : COLORS.error }
            ]}>
              {isCorrect ? 'Excellent!' : 'Not quite!'}
            </Text>
          </View>
          {!isCorrect && (
            <View style={styles.correctAnswerContainer}>
              <Ionicons name="bulb-outline" size={18} color={COLORS.accentGold} />
              <Text style={styles.correctAnswerText}>
                Correct: {data.correctWords.join(', ')}
              </Text>
            </View>
          )}
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
    gap: SPACING.sm,
  },
  questionBadge: {
    backgroundColor: COLORS.primary + '30',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  questionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 30,
  },
  hintText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  sentenceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  sentenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sentenceLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sentenceText: {
    fontSize: 20,
    lineHeight: 36,
    color: COLORS.text,
  },
  inlineWord: {
    fontSize: 20,
    fontWeight: '500',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  wordSpace: {
    fontSize: 20,
  },
  wordSelectedBg: {
    backgroundColor: COLORS.primary + '30',
    borderRadius: 6,
    fontWeight: '700',
  },
  wordCorrectBg: {
    backgroundColor: COLORS.success + '30',
    borderRadius: 6,
    fontWeight: '700',
  },
  wordWrongBg: {
    backgroundColor: COLORS.error + '30',
    borderRadius: 6,
    fontWeight: '700',
  },
  wordMissedText: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dashed',
    color: COLORS.success,
    fontWeight: '700',
  },
  // Boxed Styles
  boxedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  boxedWord: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted + '40',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxedSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
    transform: [{ scale: 1.05 }],
  },
  boxedCorrect: {
    backgroundColor: COLORS.success + '15',
    borderColor: COLORS.success,
  },
  boxedWrong: {
    backgroundColor: COLORS.error + '15',
    borderColor: COLORS.error,
  },
  boxedWordText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  boxedTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  boxedTextCorrect: {
    color: COLORS.success,
    fontWeight: '800',
  },
  boxedTextWrong: {
    color: COLORS.error,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.textMuted + '20',
  },
  selectionText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    flex: 1,
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
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  resultCardCorrect: {
    backgroundColor: COLORS.success + '10',
    borderWidth: 1.5,
    borderColor: COLORS.success + '30',
  },
  resultCardWrong: {
    backgroundColor: COLORS.error + '10',
    borderWidth: 1.5,
    borderColor: COLORS.error + '30',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  resultIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  correctAnswerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  correctAnswerText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
});
