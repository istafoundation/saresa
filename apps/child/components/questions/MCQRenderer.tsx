// MCQ Renderer - Multiple Choice Question component (English Insane style)
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

interface MCQRendererProps {
  question: string;
  data: {
    options: string[];
    correctIndex: number;
    explanation?: string;
  };
  onAnswer: (isCorrect: boolean) => void;
  onFeedback?: (isCorrect: boolean) => void;
  disabled?: boolean;
  showAnswer?: boolean;
}

export default function MCQRenderer({
  question,
  data,
  onAnswer,
  onFeedback,
  disabled = false,
  showAnswer = false,
}: MCQRendererProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  // Selection handler - just selects, does NOT submit
  const handleSelect = (index: number) => {
    if (disabled || showResult) return;
    setSelectedIndex(index);
  };
  
  // Submit handler - explicitly submits the selected answer
  const handleSubmit = useCallback(() => {
    if (selectedIndex === null || showResult) return;
    
    setShowResult(true);
    const isCorrect = selectedIndex === data.correctIndex;
    
    if (onFeedback) {
      onFeedback(isCorrect);
    }
    
    // Immediately notify parent - parent controls timing now
    onAnswer(isCorrect);
  }, [selectedIndex, showResult, data.correctIndex, onFeedback, onAnswer]);
  
  // Handle showAnswer prop
  if (showAnswer && !showResult) {
    setShowResult(true);
  }

  const getOptionStyle = (index: number) => {
    if (!showResult && !showAnswer) {
      return index === selectedIndex ? styles.optionSelected : styles.option;
    }
    
    if (index === data.correctIndex) {
      return styles.optionCorrect;
    }
    // If user selected this but it's wrong (not applicable in skipped state)
    if (index === selectedIndex && index !== data.correctIndex && !showAnswer) {
      return styles.optionWrong;
    }
    return styles.option;
  };
  
  const getOptionTextStyle = (index: number) => {
    if (!showResult && !showAnswer && index === selectedIndex) {
      return styles.optionTextSelected;
    }
    if ((showResult || showAnswer) && (index === data.correctIndex || index === selectedIndex)) {
      if (index === data.correctIndex) return styles.optionTextResult;
      // Only show result text style for selected if it's not skipped
      if (index === selectedIndex && !showAnswer) return styles.optionTextResult;
    }
    return styles.optionText;
  };
  
  return (
    <View style={styles.container}>
      {/* Question */}
      <Text style={styles.question}>{question}</Text>
      
      {/* Options */}
      <View style={styles.options}>
        {data.options.map((option, index) => (
          <MotiView
            key={index}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', delay: index * 100 }}
          >
            <Pressable
              onPress={() => handleSelect(index)}
              disabled={disabled || showResult || showAnswer}
              style={({ pressed }) => [
                getOptionStyle(index),
                pressed && !showResult && !showAnswer && styles.optionPressed,
              ]}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionLetter}>
                  {String.fromCharCode(65 + index)}
                </Text>
                <Text style={getOptionTextStyle(index)}>{option}</Text>
              </View>
              
              {(showResult || showAnswer) && index === data.correctIndex && (
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              )}
              {showResult && !showAnswer && index === selectedIndex && index !== data.correctIndex && (
                <Ionicons name="close-circle" size={24} color="#FFFFFF" />
              )}
            </Pressable>
          </MotiView>
        ))}
      </View>
      
      {/* Submit Button - only shown when option selected and not yet submitted */}
      {selectedIndex !== null && !showResult && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.submitContainer}
        >
          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitPressed,
            ]}
          >
            <Text style={styles.submitText}>Submit Answer</Text>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.text} />
          </Pressable>
        </MotiView>
      )}
      
      {/* Explanation on wrong answer */}
      {showResult && selectedIndex !== data.correctIndex && data.explanation && (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.explanation}
        >
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.explanationText}>{data.explanation}</Text>
        </MotiView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
  },
  question: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xl,
    lineHeight: 32,
  },
  options: {
    gap: SPACING.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryLight + '30',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  optionCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.success,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  optionWrong: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.error,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  optionPressed: {
    opacity: 0.8,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    textAlign: 'center',
    lineHeight: 32,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  optionTextSelected: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    flex: 1,
  },
  optionTextResult: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  explanation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: BORDER_RADIUS.md,
  },
  explanationText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  submitContainer: {
    marginTop: SPACING.lg,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  submitPressed: {
    opacity: 0.9,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});
