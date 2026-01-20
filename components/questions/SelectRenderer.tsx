// Select Renderer - Word selection component (Grammar Detective style)
import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface SelectRendererProps {
  question: string;
  data: {
    statement: string;
    correctWords: string[];
    selectMode: 'single' | 'multiple';
  };
  onAnswer: (isCorrect: boolean) => void;
  disabled?: boolean;
}

export default function SelectRenderer({
  question,
  data,
  onAnswer,
  disabled = false,
}: SelectRendererProps) {
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [showResult, setShowResult] = useState(false);
  
  // Parse statement into words
  const words = useMemo(() => {
    return data.statement.split(/\s+/).filter(w => w.length > 0);
  }, [data.statement]);
  
  const handleWordPress = (word: string) => {
    if (disabled || showResult) return;
    
    const newSelected = new Set(selectedWords);
    
    if (data.selectMode === 'single') {
      // Single mode: replace selection
      if (newSelected.has(word)) {
        newSelected.delete(word);
      } else {
        newSelected.clear();
        newSelected.add(word);
      }
    } else {
      // Multiple mode: toggle selection
      if (newSelected.has(word)) {
        newSelected.delete(word);
      } else {
        newSelected.add(word);
      }
    }
    
    setSelectedWords(newSelected);
  };
  
  const handleSubmit = () => {
    if (selectedWords.size === 0 || showResult) return;
    
    setShowResult(true);
    
    // Check if answer is correct
    const selectedArray = Array.from(selectedWords);
    const correctSet = new Set(data.correctWords);
    
    const isCorrect = 
      selectedArray.length === data.correctWords.length &&
      selectedArray.every(w => correctSet.has(w));
    
    // Delay before calling onAnswer
    setTimeout(() => {
      onAnswer(isCorrect);
    }, 1500);
  };
  
  const getWordStyle = (word: string) => {
    const isSelected = selectedWords.has(word);
    const isCorrect = data.correctWords.includes(word);
    
    if (!showResult) {
      return isSelected ? styles.wordSelected : styles.word;
    }
    
    if (isCorrect) {
      return styles.wordCorrect;
    }
    if (isSelected && !isCorrect) {
      return styles.wordWrong;
    }
    return styles.word;
  };
  
  const getWordTextStyle = (word: string) => {
    const isSelected = selectedWords.has(word);
    const isCorrect = data.correctWords.includes(word);
    
    if (!showResult) {
      return isSelected ? styles.wordTextSelected : styles.wordText;
    }
    
    if (isCorrect || (isSelected && !isCorrect)) {
      return styles.wordTextResult;
    }
    return styles.wordText;
  };
  
  return (
    <View style={styles.container}>
      {/* Question */}
      <Text style={styles.question}>{question}</Text>
      
      {/* Instructions */}
      <Text style={styles.instructions}>
        {data.selectMode === 'single' 
          ? 'Tap the correct word' 
          : 'Tap all correct words'}
      </Text>
      
      {/* Words */}
      <View style={styles.wordsContainer}>
        {words.map((word, index) => (
          <MotiView
            key={`${word}-${index}`}
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: index * 50 }}
          >
            <Pressable
              onPress={() => handleWordPress(word)}
              disabled={disabled || showResult}
              style={({ pressed }) => [
                getWordStyle(word),
                pressed && !showResult && styles.wordPressed,
              ]}
            >
              <Text style={getWordTextStyle(word)}>{word}</Text>
            </Pressable>
          </MotiView>
        ))}
      </View>
      
      {/* Submit button */}
      {!showResult && selectedWords.size > 0 && (
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
            <Text style={styles.submitText}>Check Answer</Text>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.text} />
          </Pressable>
        </MotiView>
      )}
      
      {/* Result feedback */}
      {showResult && (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.resultContainer}
        >
          {Array.from(selectedWords).length === data.correctWords.length &&
           Array.from(selectedWords).every(w => data.correctWords.includes(w)) ? (
            <View style={styles.resultCorrect}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.resultTextCorrect}>Correct!</Text>
            </View>
          ) : (
            <View style={styles.resultWrong}>
              <Ionicons name="close-circle" size={24} color={COLORS.error} />
              <Text style={styles.resultTextWrong}>
                Correct: {data.correctWords.join(', ')}
              </Text>
            </View>
          )}
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
    marginBottom: SPACING.md,
    lineHeight: 32,
  },
  instructions: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  word: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  wordSelected: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primaryLight + '30',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  wordCorrect: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  wordWrong: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  wordPressed: {
    opacity: 0.8,
  },
  wordText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  wordTextSelected: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  wordTextResult: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitContainer: {
    marginTop: 'auto',
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
  resultContainer: {
    marginTop: SPACING.lg,
  },
  resultCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.success + '20',
    borderRadius: BORDER_RADIUS.md,
  },
  resultWrong: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.error + '20',
    borderRadius: BORDER_RADIUS.md,
  },
  resultTextCorrect: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success,
  },
  resultTextWrong: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
    flex: 1,
  },
});
