// Let'em Cook - Match spice images to names
// One-time game: spices from Convex, match 4 at a time
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useSafeNavigation } from '../../utils/useSafeNavigation';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useLetEmCookStore, calculateXP, type Spice } from '../../stores/let-em-cook-store';
import { useChildAuth } from '../../utils/childAuth';
import { useTapFeedback } from '../../utils/useTapFeedback';
import { useGameAudio } from '../../utils/sound-manager';
import { useUserStore } from '../../stores/user-store';
import MatchRenderer from '../../components/questions/MatchRenderer';
import Mascot from '../../components/Mascot';

// Default spice count for display (actual comes from Convex)
const DEFAULT_SPICE_COUNT = 30;

export default function LetEmCookScreen() {
  const { safeBack } = useSafeNavigation();
  const { token } = useChildAuth();
  const { triggerTap } = useTapFeedback();
  const { playTap, playCorrect, playWrong, playWin, startMusic, stopMusic } = useGameAudio();
  const { mascot } = useUserStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  // Store state
  const {
    gameState,
    allSpices,
    totalSpices,
    totalRounds,
    currentRound,
    currentPairs,
    correctCount,
    totalAttempted,
    roundCorrect,
    showFeedback,
    wasCorrect,
    initGameWithSpices,
    startRound,
    submitRoundAnswer,
    nextRound,
    closeFeedback,
    finishGame,
    resetGame,
  } = useLetEmCookStore();
  
  // Convex queries and mutations
  const canPlay = useQuery(api.gameStats.canPlayLetEmCook, 
    token ? { token } : 'skip'
  );
  // Fetch random spices from Convex (only when starting game)
  const spicesFromConvex = useQuery(api.spices.getRandomSpices, 
    // Only fetch if game is starting
    isStarting ? { count: DEFAULT_SPICE_COUNT } : 'skip'
  );
  const finishLetEmCookMutation = useMutation(api.gameStats.finishLetEmCook);
  
  // Handle background music
  useEffect(() => {
    const shouldPlay = canPlay?.canPlay && (gameState === 'playing' || gameState === 'round_complete');
    
    if (shouldPlay) {
      startMusic();
    } else {
      stopMusic();
    }
  }, [canPlay, gameState, startMusic, stopMusic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMusic();
    };
  }, [stopMusic]);
  
  // Effect to initialize game when spices are loaded from Convex
  useEffect(() => {
    if (isStarting && spicesFromConvex && spicesFromConvex.length > 0) {
      // Convert Convex spices to store format
      const spices: Spice[] = spicesFromConvex.map(s => ({
        id: s.id,
        name: s.name,
        imageUrl: s.imageUrl,
        hindiName: s.hindiName,
      }));
      initGameWithSpices(spices);
      setIsStarting(false);
    }
  }, [isStarting, spicesFromConvex, initGameWithSpices]);
  
  // Start game handler - triggers spice fetch
  const handleStartGame = useCallback(() => {
    if (!canPlay?.canPlay) return;
    
    triggerTap('medium');
    setIsStarting(true);
    // Spices will be fetched via the useQuery and game initialized in the effect above
  }, [canPlay, triggerTap]);
  
  // Handle match answer from MatchRenderer
  const handleMatchAnswer = useCallback((isCorrect: boolean) => {
    // MatchRenderer calls this when all pairs are matched
    // isCorrect is true if ALL pairs were correctly matched
    
    // Count correct matches in this round
    const correctInRound = isCorrect ? currentPairs.length : 0; // Simplified - MatchRenderer handles internal logic
    
    submitRoundAnswer(isCorrect, correctInRound);
    
    if (isCorrect) {
      playCorrect();
    } else {
      playWrong();
    }
  }, [currentPairs.length, submitRoundAnswer, playCorrect, playWrong]);

  // Handle feedback for sound effects
  const handleMatchFeedback = useCallback((isCorrect: boolean) => {
    // Sound is already handled in handleMatchAnswer
  }, []);
  
  // Continue to next round
  const handleContinue = useCallback(async () => {
    triggerTap('light');
    closeFeedback();
    
    const hasMore = nextRound();
    if (!hasMore && token) {
      // Game complete - submit to Convex
      setIsSaving(true);
      try {
        await finishLetEmCookMutation({
          token,
          correctCount,
          totalQuestions: totalSpices,
        });
        playWin();
      } catch (error) {
        console.error('Failed to save game:', error);
      } finally {
        setIsSaving(false);
      }
    }
  }, [closeFeedback, nextRound, token, correctCount, totalSpices, finishLetEmCookMutation, triggerTap, playWin]);
  
  // Back to games
  const handleBack = useCallback(() => {
    triggerTap('medium');
    stopMusic();
    resetGame();
    safeBack();
  }, [resetGame, triggerTap, stopMusic, safeBack]);
  
  // Calculate session result
  const sessionResult = useMemo(() => {
    if (gameState !== 'finished') return null;
    return { xp: calculateXP(correctCount), correct: correctCount, total: totalAttempted };
  }, [gameState, correctCount, totalAttempted]);
  
  // Convert current pairs to MatchRenderer format
  const matchData = useMemo(() => ({
    pairs: currentPairs.map(spice => ({
      imageUrl: spice.imageUrl,
      text: spice.name,
    }))
  }), [currentPairs]);
  
  // Loading state
  if (canPlay === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Already completed - can't play again
  if (!canPlay?.canPlay && gameState === 'idle') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>Let'em Cook</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.completedContainer}>
          <Mascot mascotType={mascot} size="large" />
          <Text style={styles.completedTitle}>🔒 Already Completed!</Text>
          <Text style={styles.completedText}>
            You've already completed this one-time challenge.
          </Text>
          {canPlay?.stats && (
            <View style={styles.previousStats}>
              <Text style={styles.previousStatsTitle}>Your Score:</Text>
              <Text style={styles.previousStatsValue}>
                {canPlay.stats.correctAnswers}/{DEFAULT_SPICE_COUNT} correct
              </Text>
              <Text style={styles.previousStatsXp}>
                +{canPlay.stats.totalXPEarned} XP earned
              </Text>
            </View>
          )}
          
          <Pressable style={styles.backToGamesButton} onPress={handleBack}>
            <Text style={styles.backToGamesText}>Back to Games</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  
  // Idle state - show start screen
  if (gameState === 'idle') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>Let'em Cook</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.startContainer}>
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 100 }}
          >
            <View style={styles.startCard}>
              <LinearGradient
                colors={['#e74c3c', '#c0392b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startCardGradient}
              >
                <Text style={styles.startEmoji}>🌶️</Text>
                <Text style={styles.startTitle}>Spice Challenge</Text>
                <Text style={styles.startSubtitle}>
                  Match {DEFAULT_SPICE_COUNT} spice images to their names
                </Text>
              </LinearGradient>
              
              <View style={styles.startInfo}>
                <View style={styles.startInfoItem}>
                  <Ionicons name="grid" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.startInfoText}>8 rounds</Text>
                </View>
                <View style={styles.startInfoItem}>
                  <Ionicons name="warning" size={18} color={COLORS.accentGold} />
                  <Text style={styles.startInfoText}>One-time only!</Text>
                </View>
              </View>
              
              <Pressable 
                style={[styles.startButton, isStarting && styles.startButtonDisabled]}
                onPress={handleStartGame}
                disabled={isStarting}
              >
                {isStarting ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <Text style={styles.startButtonText}>Start Cooking!</Text>
                    <Ionicons name="flame" size={20} color={COLORS.text} />
                  </>
                )}
              </Pressable>
            </View>
          </MotiView>
        </View>
      </SafeAreaView>
    );
  }
  
  // Finished state
  if (gameState === 'finished' && sessionResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 200 }}
          >
            <Text style={styles.resultEmoji}>🎉</Text>
            <Text style={styles.resultTitle}>Challenge Complete!</Text>
            
            <View style={styles.resultStats}>
              <View style={styles.resultStatItem}>
                <Text style={styles.resultStatValue}>{correctCount}</Text>
                <Text style={styles.resultStatLabel}>Correct</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatItem}>
                <Text style={styles.resultStatValue}>{totalSpices}</Text>
                <Text style={styles.resultStatLabel}>Total</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatItem}>
                <Text style={[styles.resultStatValue, { color: COLORS.accentGold }]}>
                  +{sessionResult.xp}
                </Text>
                <Text style={styles.resultStatLabel}>XP</Text>
              </View>
            </View>
            
            <Text style={styles.resultHint}>
              {correctCount >= totalSpices * 0.8 
                ? '🏆 Master Chef! Outstanding performance!'
                : correctCount >= totalSpices * 0.5
                ? '👍 Good job! You know your spices!'
                : '📚 Keep learning about Indian spices!'}
            </Text>
            
            <Pressable 
              style={styles.resultButton} 
              onPress={handleBack}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.resultButtonText}>Done</Text>
              )}
            </Pressable>
          </MotiView>
        </View>
      </SafeAreaView>
    );
  }
  
  // Playing state
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.gameHeader}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </Pressable>
        
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Round {currentRound + 1} / {totalRounds}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentRound + 1) / totalRounds) * 100}%` }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.scoreContainer}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={styles.scoreText}>{correctCount}</Text>
        </View>
      </View>
      
      {/* Match Game */}
      <View style={styles.matchContainer}>
        <MatchRenderer
          question="Match each spice image to its name"
          data={matchData}
          onAnswer={handleMatchAnswer}
          onFeedback={handleMatchFeedback}
          disabled={showFeedback}
        />
      </View>
      
      {/* Round Complete Feedback */}
      {showFeedback && (
        <MotiView
          from={{ opacity: 0, translateY: 100 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring' }}
          style={styles.feedbackContainer}
        >
          <LinearGradient
            colors={wasCorrect ? [COLORS.success, '#15803d'] : [COLORS.error, '#b91c1c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.feedbackCard}
          >
            <View style={styles.feedbackHeader}>
              <View style={styles.feedbackIconBg}>
                <Text style={styles.feedbackEmoji}>
                  {wasCorrect ? '🔥' : '🤔'}
                </Text>
              </View>
              <View style={styles.feedbackTextContainer}>
                <Text style={styles.feedbackTitle}>
                  {wasCorrect ? 'Perfect Round!' : 'Keep Trying!'}
                </Text>
                <Text style={styles.feedbackSubtitle}>
                  {wasCorrect 
                    ? `All ${currentPairs.length} matches correct!` 
                    : 'Some matches were incorrect'}
                </Text>
              </View>
            </View>

            <Pressable style={styles.feedbackButton} onPress={handleContinue}>
              <Text style={styles.feedbackButtonText}>
                {currentRound + 1 >= totalRounds ? 'See Results' : 'Next Round'}
              </Text>
              <Ionicons name="arrow-forward-circle" size={24} color={wasCorrect ? COLORS.success : COLORS.error} />
            </Pressable>
          </LinearGradient>
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
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // Start screen
  startContainer: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  startCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  startCardGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  startEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  startSubtitle: {
    fontSize: 14,
    color: COLORS.text + 'CC',
    textAlign: 'center',
  },
  startInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textMuted,
  },
  startInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  startInfoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  startButtonDisabled: {
    opacity: 0.7,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Completed screen
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  completedText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  previousStats: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  previousStatsTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  previousStatsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  previousStatsXp: {
    fontSize: 16,
    color: COLORS.accentGold,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  backToGamesButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  backToGamesText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Game header
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  progressContainer: {
    flex: 1,
    gap: SPACING.xs,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  
  // Match container
  matchContainer: {
    flex: 1,
  },
  
  // Feedback
  feedbackContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  feedbackCard: {
    borderRadius: BORDER_RADIUS.xl + 4,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  feedbackIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackEmoji: {
    fontSize: 28,
  },
  feedbackTextContainer: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  feedbackSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  feedbackButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // Result screen
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  resultEmoji: {
    fontSize: 72,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  resultStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  resultStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  resultStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  resultStatDivider: {
    width: 1,
    backgroundColor: COLORS.textMuted,
    marginHorizontal: SPACING.md,
  },
  resultHint: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  resultButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl * 2,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  resultButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
});
