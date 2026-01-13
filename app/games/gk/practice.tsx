// GK Practice Mode - Infinite questions, no XP
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { useGKStore } from '../../../stores/gk-store';
import { useUserStore } from '../../../stores/user-store';
import { useGameAudio } from '../../../utils/sound-manager';
import { useTapFeedback } from '../../../utils/useTapFeedback';

export default function PracticeScreen() {
  const router = useRouter();
  const { mascot } = useUserStore();
  const {
    quizState,
    currentQuestionIndex,
    questions,
    startQuiz,
    answerQuestion,
    nextQuestion,
    resetQuiz,
    practiceTotal,
    practiceCorrect,
  } = useGKStore();
  
  // Sound effects and music
  const { playTap, playCorrect, playWrong, startMusic, stopMusic } = useGameAudio();

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctIndex, setCorrectIndex] = useState(0);
  const { triggerTap } = useTapFeedback();

  useEffect(() => {
    startQuiz('practice');
    startMusic(); // Start background music
    return () => {
      resetQuiz();
      stopMusic(); // Stop music on exit
    };
  }, []);

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = (index: number) => {
    if (showResult) return;
    
    triggerTap('medium');
    setSelectedAnswer(index);
    
    const result = answerQuestion(index);
    setIsCorrect(result.correct);
    setCorrectIndex(result.correctIndex);
    setShowResult(true);
    
    if (result.correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playCorrect();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playWrong();
    }
  };

  const handleNext = () => {
    triggerTap();
    setSelectedAnswer(null);
    setShowResult(false);
    nextQuestion();
  };

  const handleEnd = () => {
    triggerTap();
    stopMusic();
    router.back();
  };

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading questions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const accuracy = practiceTotal > 0 
    ? Math.round((practiceCorrect / practiceTotal) * 100) 
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleEnd} style={styles.backButton}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </Pressable>
        <View style={styles.statsHeader}>
          <Text style={styles.statsText}>Accuracy: {accuracy}%</Text>
          <Text style={styles.statsText}>•</Text>
          <Text style={styles.statsText}>{practiceTotal} answered</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.practiceLabel}>PRACTICE MODE</Text>
        <Text style={styles.questionCount}>Question {currentQuestionIndex + 1}</Text>
      </View>

      {/* Question */}
      <MotiView
        key={currentQuestionIndex}
        from={{ opacity: 0, translateX: 50 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'spring' }}
        style={styles.questionContainer}
      >
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = index === correctIndex;
            
            let bgColor = COLORS.surface;
            if (showResult) {
              if (isCorrectOption) bgColor = COLORS.success + '40';
              else if (isSelected) bgColor = COLORS.error + '40';
            }
            
            return (
              <MotiView
                key={index}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: index * 50 }}
              >
                <Pressable
                  style={[
                    styles.optionButton,
                    { backgroundColor: bgColor },
                    isSelected && !showResult && styles.optionSelected,
                  ]}
                  onPress={() => handleAnswer(index)}
                  disabled={showResult}
                >
                  <View style={[
                    styles.optionLetter,
                    showResult && isCorrectOption && styles.optionLetterCorrect,
                    showResult && isSelected && !isCorrectOption && styles.optionLetterWrong,
                  ]}>
                    <Text style={styles.optionLetterText}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text style={styles.optionText}>{option}</Text>
                  
                  {showResult && isCorrectOption && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  )}
                  {showResult && isSelected && !isCorrectOption && (
                    <Ionicons name="close-circle" size={24} color={COLORS.error} />
                  )}
                </Pressable>
              </MotiView>
            );
          })}
        </View>

        {/* Fun Fact */}
        {showResult && currentQuestion.funFact && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={styles.funFactContainer}
          >
            <Text style={styles.mascotEmoji}>
              {mascot === 'male' ? '🧙' : '🧙‍♀️'}
            </Text>
            <View style={styles.funFactBubble}>
              <Text style={styles.funFactText}>{currentQuestion.funFact}</Text>
            </View>
          </MotiView>
        )}
      </MotiView>

      {/* Next Button */}
      {showResult && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.bottomButtons}
        >
          <Pressable style={styles.endButton} onPress={handleEnd}>
            <Text style={styles.endButtonText}>End Session</Text>
          </Pressable>
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>Next Question</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
            </LinearGradient>
          </Pressable>
        </MotiView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  progressContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  practiceLabel: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  questionCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  questionContainer: {
    flex: 1,
    padding: SPACING.lg,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 32,
    marginBottom: SPACING.xl,
  },
  optionsContainer: {
    gap: SPACING.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  optionSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterCorrect: {
    backgroundColor: COLORS.success,
  },
  optionLetterWrong: {
    backgroundColor: COLORS.error,
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  funFactContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  mascotEmoji: {
    fontSize: 32,
  },
  funFactBubble: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  funFactText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  endButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
});
