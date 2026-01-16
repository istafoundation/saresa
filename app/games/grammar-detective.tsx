// Grammar Detective Game - Infinite Rush Mode
// Tap words to select, submit to check answer
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useGrammarDetectiveStore, type GDQuestion } from '../../stores/grammar-detective-store';
import { useUserActions } from '../../utils/useUserActions';
import { useGameAudio } from '../../utils/sound-manager';
import { useTapFeedback } from '../../utils/useTapFeedback';
import { useGrammarDetectiveQuestions } from '../../utils/content-hooks';
import { useChildAuth } from '../../utils/childAuth';
import { api } from '../../convex/_generated/api';

const XP_PER_CORRECT = 2;

export default function GrammarDetectiveScreen() {
  const router = useRouter();
  const { token } = useChildAuth();
  const { addXP } = useUserActions();
  const { playTap, playCorrect, playWrong } = useGameAudio();
  const { triggerTap, triggerHapticOnly } = useTapFeedback();
  
  // OTA Content
  const { content: allQuestions, status: questionsStatus } = useGrammarDetectiveQuestions();
  
  // Convex mutations
  const updateStats = useMutation(api.gameStats.updateGrammarDetectiveStats);
  const serverProgress = useQuery(
    api.gameStats.getGrammarDetectiveProgress,
    token ? { token } : 'skip'
  );
  
  // Store
  const {
    gameState,
    currentQuestionIndex,
    selectedIndices,
    sessionAnswered,
    sessionCorrect,
    sessionXP,
    stats,
    lastResult,
    startGame,
    toggleWordSelection,
    submitAnswer,
    nextQuestion,
    getCurrentQuestion,
    resetGame,
    syncFromConvex,
  } = useGrammarDetectiveStore();

  // Sync from Convex on mount
  useEffect(() => {
    if (serverProgress) {
      syncFromConvex(serverProgress);
    }
  }, [serverProgress]);

  // Start game when questions are loaded
  useEffect(() => {
    if (allQuestions && allQuestions.length > 0 && gameState === 'idle') {
      startGame(allQuestions as GDQuestion[]);
    }
  }, [allQuestions, gameState]);

  const currentQuestion = getCurrentQuestion(allQuestions as GDQuestion[]);

  const handleWordPress = (index: number) => {
    if (gameState !== 'playing') return;
    triggerHapticOnly('light');
    toggleWordSelection(index);
  };

  const handleSubmit = async () => {
    if (!currentQuestion || selectedIndices.length === 0) return;
    
    triggerHapticOnly('medium');
    const result = submitAnswer(currentQuestion);
    
    if (result.correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playCorrect();
      // Add XP
      if (token) {
        await addXP(XP_PER_CORRECT);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playWrong();
    }
    
    // Sync to Convex
    if (token) {
      await updateStats({
        token,
        questionsAnswered: 1,
        correctAnswers: result.correct ? 1 : 0,
        xpEarned: result.correct ? XP_PER_CORRECT : 0,
        currentQuestionIndex: currentQuestionIndex + 1,
      });
    }
  };

  const handleNext = () => {
    triggerTap();
    nextQuestion();
  };

  const handleBack = () => {
    triggerTap();
    resetGame();
    router.back();
  };

  // Loading state
  if (questionsStatus === 'loading' || !currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading questions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Grammar Detective</Text>
          <Text style={styles.headerSubtitle}>Infinite Rush</Text>
        </View>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>+{sessionXP} XP</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={styles.progressItem}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.progressText}>{sessionCorrect}</Text>
        </View>
        <View style={styles.progressItem}>
          <Ionicons name="help-circle" size={18} color={COLORS.textSecondary} />
          <Text style={styles.progressText}>{sessionAnswered}</Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>All-time:</Text>
          <Text style={styles.progressText}>{stats.totalCorrect}/{stats.totalAnswered}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Question */}
        <MotiView
          key={currentQuestion.id}
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring' }}
          style={styles.questionCard}
        >
          <Text style={styles.questionText}>{currentQuestion.questionText}</Text>
        </MotiView>

        {/* Sentence with tappable words */}
        <View style={styles.sentenceContainer}>
          {currentQuestion.words.map((word, index) => {
            const isSelected = selectedIndices.includes(index);
            const isCorrect = lastResult?.correctIndices.includes(index);
            const isWrongSelection = gameState === 'reviewing' && isSelected && !isCorrect;
            const isMissedCorrect = gameState === 'reviewing' && isCorrect && !isSelected;
            
            return (
              <MotiView
                key={`${currentQuestion.id}-${index}`}
                from={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: index * 30 }}
              >
                <Pressable
                  onPress={() => handleWordPress(index)}
                  disabled={gameState === 'reviewing'}
                  style={[
                    styles.wordBubble,
                    isSelected && gameState === 'playing' && styles.wordBubbleSelected,
                    gameState === 'reviewing' && isCorrect && styles.wordBubbleCorrect,
                    isWrongSelection && styles.wordBubbleWrong,
                    isMissedCorrect && styles.wordBubbleMissed,
                  ]}
                >
                  <Text 
                    style={[
                      styles.wordText,
                      isSelected && gameState === 'playing' && styles.wordTextSelected,
                      gameState === 'reviewing' && isCorrect && styles.wordTextCorrect,
                    ]}
                  >
                    {word}
                  </Text>
                  {isSelected && gameState === 'playing' && (
                    <MotiView
                      from={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={styles.selectionIndicator}
                    />
                  )}
                </Pressable>
              </MotiView>
            );
          })}
        </View>

        {/* Result Feedback */}
        {gameState === 'reviewing' && lastResult && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring' }}
            style={[
              styles.resultCard,
              lastResult.correct ? styles.resultCardCorrect : styles.resultCardWrong,
            ]}
          >
            <View style={styles.resultHeader}>
              <Ionicons
                name={lastResult.correct ? 'checkmark-circle' : 'close-circle'}
                size={28}
                color={lastResult.correct ? COLORS.success : COLORS.error}
              />
              <Text style={[
                styles.resultTitle,
                { color: lastResult.correct ? COLORS.success : COLORS.error }
              ]}>
                {lastResult.correct ? 'Correct! +2 XP' : 'Not quite!'}
              </Text>
            </View>
            <Text style={styles.explanationText}>{lastResult.explanation}</Text>
          </MotiView>
        )}
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomContainer}>
        {gameState === 'playing' ? (
          <Pressable
            style={[
              styles.submitButton,
              selectedIndices.length === 0 && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={selectedIndices.length === 0}
          >
            <LinearGradient
              colors={selectedIndices.length > 0 
                ? [COLORS.primary, COLORS.primaryDark] 
                : [COLORS.surface, COLORS.surface]}
              style={styles.submitButtonGradient}
            >
              <Text style={[
                styles.submitButtonText,
                selectedIndices.length === 0 && styles.submitButtonTextDisabled,
              ]}>
                Submit Answer
              </Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <LinearGradient
              colors={[COLORS.accent, COLORS.primaryDark]}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>Next Question</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: COLORS.accentGold + '30',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    gap: SPACING.lg,
  },
  questionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  sentenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    minHeight: 120,
    alignItems: 'center',
  },
  wordBubble: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.surface,
    position: 'relative',
    ...SHADOWS.sm,
  },
  wordBubbleSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  wordBubbleCorrect: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '20',
  },
  wordBubbleWrong: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '20',
  },
  wordBubbleMissed: {
    borderColor: COLORS.success,
    borderStyle: 'dashed',
  },
  wordText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  wordTextSelected: {
    color: COLORS.primary,
  },
  wordTextCorrect: {
    color: COLORS.success,
    fontWeight: '700',
  },
  selectionIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  resultCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  resultCardCorrect: {
    backgroundColor: COLORS.success + '15',
    borderWidth: 1,
    borderColor: COLORS.success + '40',
  },
  resultCardWrong: {
    backgroundColor: COLORS.error + '15',
    borderWidth: 1,
    borderColor: COLORS.error + '40',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  explanationText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  bottomContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  submitButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  submitButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  nextButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});
