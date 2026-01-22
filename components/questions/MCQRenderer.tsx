// MCQ Renderer - Multiple Choice Question component (English Insane style)
import { useState } from 'react';
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
}

export default function MCQRenderer({
  question,
  data,
  onAnswer,
  onFeedback,
  disabled = false,
}: MCQRendererProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  const handleSelect = (index: number) => {
    if (disabled || showResult) return;
    
    setSelectedIndex(index);
    setShowResult(true);
    
    const isCorrect = index === data.correctIndex;
    if (onFeedback) {
      onFeedback(isCorrect);
    }
    
    // Delay before calling onAnswer to show feedback
    setTimeout(() => {
      onAnswer(isCorrect);
    }, 1500);
  };
  
  const getOptionStyle = (index: number) => {
    if (!showResult) {
      return index === selectedIndex ? styles.optionSelected : styles.option;
    }
    
    if (index === data.correctIndex) {
      return styles.optionCorrect;
    }
    if (index === selectedIndex && index !== data.correctIndex) {
      return styles.optionWrong;
    }
    return styles.option;
  };
  
  const getOptionTextStyle = (index: number) => {
    if (!showResult && index === selectedIndex) {
      return styles.optionTextSelected;
    }
    if (showResult && (index === data.correctIndex || index === selectedIndex)) {
      return styles.optionTextResult;
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
              disabled={disabled || showResult}
              style={({ pressed }) => [
                getOptionStyle(index),
                pressed && !showResult && styles.optionPressed,
              ]}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionLetter}>
                  {String.fromCharCode(65 + index)}
                </Text>
                <Text style={getOptionTextStyle(index)}>{option}</Text>
              </View>
              
              {showResult && index === data.correctIndex && (
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              )}
              {showResult && index === selectedIndex && index !== data.correctIndex && (
                <Ionicons name="close-circle" size={24} color="#FFFFFF" />
              )}
            </Pressable>
          </MotiView>
        ))}
      </View>
      
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
});
