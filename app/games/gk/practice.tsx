// GK Practice Mode - Infinite questions, no XP
// Stats are synced via Convex (useGameStatsActions)
import { View, Text, StyleSheet, Pressable, ActivityIndicator, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSafeNavigation } from '../../../utils/useSafeNavigation';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { useGKStore, type Question } from '../../../stores/gk-store';
import { useUserStore } from '../../../stores/user-store';
import { useGameStatsActions } from '../../../utils/useUserActions';
import { useGameAudio } from '../../../utils/sound-manager';
import { useTapFeedback } from '../../../utils/useTapFeedback';
import Mascot from '../../../components/Mascot';
import { useEnglishInsaneQuestions } from '../../../utils/content-hooks';

export default function PracticeScreen() {
  const { safeBack } = useSafeNavigation();
  const { mascot, gkStats } = useUserStore();
  const { updateGKStats } = useGameStatsActions();
  
  // OTA Content
  const { content: allQuestions, status: questionsStatus } = useEnglishInsaneQuestions();
  
  const {
    quizState,
    currentQuestionIndex,
    questions,
    startQuiz,
    answerQuestion,
    nextQuestion,
    resetQuiz,
  } = useGKStore();
  
  // Sound effects
  const { playTap, playCorrect, playWrong } = useGameAudio();

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctIndex, setCorrectIndex] = useState(0);
  const { triggerTap, triggerHapticOnly } = useTapFeedback();
  
  // Track session stats locally for immediate UI feedback
  // (Convex will sync eventually, but this gives instant updates)

  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  // OPTIMIZATION: Use refs to track stats for sync operations
  // This prevents effect re-registration on every answer
  const sessionTotalRef = useRef(0);
  const sessionCorrectRef = useRef(0);
  const lastSyncedRef = useRef({ total: 0, correct: 0 });
  const updateGKStatsRef = useRef(updateGKStats);
  
  // Keep refs in sync with state
  useEffect(() => {
    sessionTotalRef.current = sessionTotal;
    sessionCorrectRef.current = sessionCorrect;
  }, [sessionTotal, sessionCorrect]);
  
  useEffect(() => {
    updateGKStatsRef.current = updateGKStats;
  }, [updateGKStats]);

  // Lock base stats when user starts interacting to prevent double counting
  // (We don't want to add session stats to already-updated live stats)
  const [baseStats, setBaseStats] = useState({ 
    practiceTotal: gkStats.practiceTotal, 
    practiceCorrect: gkStats.practiceCorrect 
  });

  useEffect(() => {
    // Only sync with store if user hasn't started this session yet
    // This allows initial load/sync but prevents double counting live updates
    if (sessionTotal === 0) {
      setBaseStats({
        practiceTotal: gkStats.practiceTotal,
        practiceCorrect: gkStats.practiceCorrect
      });
    }
  }, [gkStats.practiceTotal, gkStats.practiceCorrect, sessionTotal]);

  useEffect(() => {
    if (allQuestions && allQuestions.length > 0) {
      startQuiz('practice', allQuestions as Question[]);
    }
    return () => {
      resetQuiz();
    };
  }, [allQuestions]);

  // OPTIMIZATION: Sync function uses refs - never recreated, stable reference
  // This prevents interval/AppState effects from re-registering
  const syncStatsToConvex = useCallback(() => {
    const unsynced = {
      total: sessionTotalRef.current - lastSyncedRef.current.total,
      correct: sessionCorrectRef.current - lastSyncedRef.current.correct,
    };
    
    if (unsynced.total > 0) {
      updateGKStatsRef.current({
        practiceTotal: unsynced.total,
        practiceCorrect: unsynced.correct,
      });
      lastSyncedRef.current = { 
        total: sessionTotalRef.current, 
        correct: sessionCorrectRef.current 
      };
    }
  }, []); // Empty deps - stable callback using refs

  // Sync on component unmount (catches ALL exit methods including Android back)
  useEffect(() => {
    return () => {
      // Use refs to get latest values in cleanup
      const unsynced = {
        total: sessionTotalRef.current - lastSyncedRef.current.total,
        correct: sessionCorrectRef.current - lastSyncedRef.current.correct,
      };
      if (unsynced.total > 0) {
        updateGKStatsRef.current({
          practiceTotal: unsynced.total,
          practiceCorrect: unsynced.correct,
        });
      }
    };
  }, []); // Empty deps - uses refs for latest values

  // Background safety sync every 1 minute (crash protection)
  // OPTIMIZATION: Only registers ONCE since syncStatsToConvex is now stable
  useEffect(() => {
    const interval = setInterval(() => {
      syncStatsToConvex();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [syncStatsToConvex]);

  // Sync immediately when app goes to background (home button pressed)
  // OPTIMIZATION: Only registers ONCE since syncStatsToConvex is now stable
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        syncStatsToConvex();
      }
    });

    return () => subscription.remove();
  }, [syncStatsToConvex]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = async (index: number) => {
    if (showResult) return;
    
    triggerHapticOnly('medium');
    setSelectedAnswer(index);
    
    const result = answerQuestion(index);
    setIsCorrect(result.correct);
    setCorrectIndex(result.correctIndex);
    setShowResult(true);
    
    // Update session stats for immediate UI feedback
    // OPTIMIZATION: Stats are synced to Convex on exit, not per-answer
    setSessionTotal(prev => prev + 1);
    if (result.correct) {
      setSessionCorrect(prev => prev + 1);
    }
    
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
    nextQuestion(allQuestions as Question[]);
  };

  const handleEnd = () => {
    triggerTap();
    safeBack();
  };

  const handleSkip = () => {
    triggerTap('light');
    // Just move to next question without recording any stats
    nextQuestion(allQuestions as Question[]);
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



  // Combine locked base stats + local session stats
  const totalAnswered = baseStats.practiceTotal + sessionTotal;
  const totalCorrect = baseStats.practiceCorrect + sessionCorrect;
  const accuracy = totalAnswered > 0 
    ? Math.round((totalCorrect / totalAnswered) * 100) 
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
          <Text style={styles.statsText}>{totalAnswered} answered</Text>
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

        {/* Explanation - shown when user answers incorrectly */}
        {showResult && !isCorrect && currentQuestion.explanation && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={styles.funFactContainer}
          >
            <Mascot mascotType={mascot} size="small" />
            <View style={styles.funFactBubble}>
              <Text style={styles.funFactText}>{currentQuestion.explanation}</Text>
            </View>
          </MotiView>
        )}
      </MotiView>

      {/* Skip Button - shows before answering */}
      {!showResult && (
        <View style={styles.skipButtonContainer}>
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Ionicons name="play-skip-forward" size={18} color={COLORS.textMuted} />
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        </View>
      )}

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
  skipButtonContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  skipButtonText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
