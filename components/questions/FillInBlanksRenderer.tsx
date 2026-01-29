import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

interface FillInBlanksRendererProps {
  question: string;
  data: any;
  onAnswer: (isCorrect: boolean) => void;
  onFeedback?: (isCorrect: boolean) => void;
  disabled?: boolean;
}

export default function FillInBlanksRenderer({
  question,
  data,
  onAnswer,
  onFeedback,
  disabled
}: FillInBlanksRendererProps) {
  // Parse question to extract segments and blanks
  const { segments, answers } = useMemo(() => {
    const parts = question.split(/({[^}]+})/g);
    const segs: string[] = [];
    const ans: string[] = [];

    parts.forEach(part => {
      if (part.startsWith('{') && part.endsWith('}')) {
        ans.push(part.slice(1, -1));
        segs.push('__BLANK__');
      } else {
        segs.push(part);
      }
    });

    return { segments: segs, answers: ans };
  }, [question]);

  // Combined options (answers + distractors) shuffled
  const [options, setOptions] = useState<string[]>([]);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [activeBlankIndex, setActiveBlankIndex] = useState<number>(0);

  useEffect(() => {
    const distractors = data.distractors || [];
    const allOptions = [...answers, ...distractors];
    // Simple shuffle
    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }
    setOptions(allOptions);
    setUserAnswers(new Array(answers.length).fill(null));
    setActiveBlankIndex(0);
  }, [data, answers]);

  const handleOptionPress = (option: string) => {
    if (disabled) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Find the current active blank or the first empty blank
    let targetIndex = activeBlankIndex;
    if (userAnswers[targetIndex] !== null) {
        // If current is filled, look for next empty
        const nextEmpty = userAnswers.findIndex(a => a === null);
        if (nextEmpty !== -1) targetIndex = nextEmpty;
        else return; // All filled
    }

    const newAnswers = [...userAnswers];
    newAnswers[targetIndex] = option;
    setUserAnswers(newAnswers);

    // Auto-advance to next empty blank
    const nextEmpty = newAnswers.findIndex(a => a === null);
    if (nextEmpty !== -1) {
        setActiveBlankIndex(nextEmpty);
    } else {
        // All filled? Auto-check or just wait? 
        // Let's auto-check if all are filled
        checkAnswers(newAnswers);
    }
  };

  const handleBlankPress = (index: number) => {
    if (disabled) return;
    // If it has an answer, clear it
    if (userAnswers[index] !== null) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newAnswers = [...userAnswers];
        newAnswers[index] = null;
        setUserAnswers(newAnswers);
    }
    setActiveBlankIndex(index);
  };

  const checkAnswers = (currentAnswers: (string | null)[]) => {
      const isCorrect = currentAnswers.every((ans, idx) => ans === answers[idx]);
      if (onFeedback) onFeedback(isCorrect);
      onAnswer(isCorrect);
  };

  return (
    <View style={styles.container}>
      <View style={styles.sentenceContainer}>
        <View style={styles.textWrapper}>
            {segments.map((seg, idx) => {
            if (seg === '__BLANK__') {
                // Determine which blank index this maps to
                const blankIndex = segments.slice(0, idx).filter(s => s === '__BLANK__').length;
                const filledWord = userAnswers[blankIndex];
                const isActive = activeBlankIndex === blankIndex;

                return (
                <TouchableOpacity
                    key={`blank-${idx}`}
                    onPress={() => handleBlankPress(blankIndex)}
                    activeOpacity={0.8}
                >
                    <MotiView
                        from={{ scale: 1 }}
                        animate={{ scale: isActive ? 1.05 : 1 }}
                        style={[
                            styles.blank,
                            isActive && styles.activeBlank,
                            filledWord ? styles.filledBlank : null,
                            // If correct/incorrect validation visual is needed later
                        ]}
                    >
                    <Text style={[styles.blankText, filledWord ? styles.filledText : null]}>
                        {filledWord || "   "}
                    </Text>
                    </MotiView>
                </TouchableOpacity>
                );
            }
            return (
                <Text key={`text-${idx}`} style={styles.text}>
                {seg}
                </Text>
            );
            })}
        </View>
      </View>

      <View style={styles.optionsContainer}>
        {options.map((opt, idx) => {
            // Check if option is already used. 
            // If we allow duplicates in options, we should count usage. 
            // For now assume unique options or simple disabled state if matched.
            const isUsed = userAnswers.includes(opt);
            
            return (
                <TouchableOpacity
                    key={`opt-${idx}`}
                    onPress={() => !isUsed && handleOptionPress(opt)}
                    style={[styles.optionChip, isUsed && styles.usedOption]}
                    disabled={isUsed || disabled}
                >
                    <Text style={[styles.optionText, isUsed && styles.usedOptionText]}>{opt}</Text>
                </TouchableOpacity>
            );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  sentenceContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 40,
  },
  textWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center', // Center the sentence
    gap: 8,
  },
  text: {
    fontSize: 22,
    color: '#334155',
    lineHeight: 34,
    fontFamily: 'Outfit-Medium', // Assuming font family availability
  },
  blank: {
    minWidth: 80,
    height: 40,
    borderBottomWidth: 2,
    borderBottomColor: '#94a3b8',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeBlank: {
    borderBottomColor: '#6366f1',
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  filledBlank: {
    backgroundColor: '#eef2ff',
    borderBottomColor: '#4f46e5',
  },
  blankText: {
    fontSize: 18,
    color: 'transparent',
    fontWeight: '600',
  },
  filledText: {
    color: '#4f46e5',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 20,
  },
  optionChip: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 2,
  },
  usedOption: {
    backgroundColor: '#f1f5f9',
    borderColor: '#f1f5f9',
    shadowOpacity: 0,
    elevation: 0,
  },
  optionText: {
    fontSize: 18,
    color: '#334155',
    fontWeight: '600',
    fontFamily: 'Outfit-Medium',
  },
  usedOptionText: {
    color: '#cbd5e1',
  },
});
