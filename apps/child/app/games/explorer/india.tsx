// India Explorer - Identify states and union territories on the map
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { View, Text, StyleSheet, Pressable, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useSafeNavigation } from '../../../utils/useSafeNavigation';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@ista/convex/_generated/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../constants/theme';
import { useExplorerStore } from '../../../stores/explorer-store';
import { useChildAuth } from '../../../utils/childAuth';
import { useTapFeedback } from '../../../utils/useTapFeedback';
import { useGameAudio } from '../../../utils/sound-manager';
import { useUserStore } from '../../../stores/user-store';
import { TOTAL_REGIONS, XP_PER_CORRECT, MAX_XP, calculateXP, INDIA_REGIONS } from '../../../data/india-states';
import IndiaMap from '../../../components/IndiaMap';
import Mascot from '../../../components/Mascot';
import CoinRewardAnimation from '../../../components/animations/CoinRewardAnimation';
import CoinBalance from '../../../components/CoinBalance';
import { getISTDate } from '../../../utils/dates';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper to getting IST date string (YYYY-MM-DD)
// Matches backend logic: UTC + 5:30
const getClientISTDate = getISTDate;

export default function IndiaExplorerScreen() {
  const { safeBack } = useSafeNavigation();
  const { token } = useChildAuth();
  const { triggerTap } = useTapFeedback();
  // Use combined audio hook for SFX only (music is now global)
  const { playTap, playCorrect, playWrong, playWin } = useGameAudio();
  const { mascot } = useUserStore();
  const [isStarting, setIsStarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Coin Animation
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);
  
  // Audio debounce guard - prevents rapid-fire sound effects
  const lastSoundTimeRef = useRef<number>(0);
  const SOUND_DEBOUNCE_MS = 150;
  
  // Store state
  const {
    gameState,
    currentRegion,
    selectedRegion,
    guessedToday,
    correctCount,
    showFeedback,
    wasCorrect,
    initGame,
    nextQuestion,
    preSelectRegion,
    submitSelection,
    closeFeedback,
    finishGame,
    resetGame,
  } = useExplorerStore();
  
  // Track "today" in IST to force query refresh at midnight
  const [todayStr, setTodayStr] = useState(getClientISTDate());

  // Check for day change when app comes to foreground or every minute
  useEffect(() => {
    // interval check
    const interval = setInterval(() => {
      const current = getClientISTDate();
      if (current !== todayStr) {
        setTodayStr(current);
      }
    }, 60000); // Check every minute

    // App state listener (for when returning from background)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const current = getClientISTDate();
        if (current !== todayStr) {
          setTodayStr(current);
        }
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [todayStr]);

  // Convex queries and mutations -- NOW DEPENDS ON todayStr
  const progress = useQuery(api.gameStats.getExplorerProgress, 
    token ? { token, clientDate: todayStr } : 'skip'
  );
  const updateStats = useMutation(api.gameStats.updateExplorerStats);
  
  // Check if already completed today
  const isCompletedToday = progress?.isCompletedToday ?? false;
  const remaining = TOTAL_REGIONS - (progress?.guessedToday?.length ?? 0);


  
  // Auto-start game if in idle state (MUST be before early returns for hook order)
  useEffect(() => {
    if (gameState === 'idle' && progress && !isStarting && !isCompletedToday) {
      // Delay slightly to ensure UI is ready
      const timer = setTimeout(() => {
        if (!progress) return;
        setIsStarting(true);
        initGame(progress.guessedToday);
        setTimeout(() => {
          nextQuestion();
          setIsStarting(false);
        }, 300);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [gameState, progress, isStarting, isCompletedToday, initGame, nextQuestion]);
  
  // Calculate session result (must be before early returns to maintain hook order)
  const sessionResult = useMemo(() => {
    if (gameState !== 'finished') return null;
    return { xp: calculateXP(correctCount), correct: correctCount, total: guessedToday.length };
  }, [gameState, correctCount, guessedToday.length]);

  // Memoize filtered guessed regions for the map
  // Must be at top level to avoid hook order errors
  const filteredGuessedRegions = useMemo(() => {
    return guessedToday.filter(id => id !== currentRegion?.id);
  }, [guessedToday, currentRegion?.id]);

  // Get selected region name for feedback
  const selectedRegionName = useMemo(() => {
    if (!selectedRegion) return '';
    const region = INDIA_REGIONS.find(r => r.id === selectedRegion);
    return region?.name || 'Unknown';
  }, [selectedRegion]);
  
  // Start or continue game
  const handleStartGame = useCallback(() => {
    if (!progress) return;
    
    triggerTap('medium');
    setIsStarting(true);
    
    // Initialize with today's progress from Convex
    initGame(progress.guessedToday);
    
    // Get first question
    setTimeout(() => {
      nextQuestion();
      setIsStarting(false);
    }, 300);
  }, [progress, initGame, nextQuestion, triggerTap]);
  
  // Handle map tap - just select the region (don't submit yet)
  const handleRegionPress = useCallback((regionId: string) => {
    if (gameState !== 'playing' || !currentRegion || showFeedback) return;
    
    // Only haptic feedback, no tap sound for map selection
    triggerTap('light');
    preSelectRegion(regionId);
  }, [gameState, currentRegion, showFeedback, preSelectRegion, triggerTap]);
  
  // Handle submit button - check the answer
  const handleSubmit = useCallback(async () => {
    if (gameState !== 'playing' || !currentRegion || !selectedRegion || !token || isSaving) return;
    
    setIsSaving(true);
    triggerTap('medium');
    const isCorrect = submitSelection();
    
    // Play sound feedback
    if (isCorrect) {
      playCorrect();
    } else {
      playWrong();
    }
    
    // Update Convex
    try {
      await updateStats({
        token,
        regionId: currentRegion.id,
        correct: isCorrect,
        xpEarned: isCorrect ? XP_PER_CORRECT : 0,
      });

      if (isCorrect) {
          setEarnedCoins(5);
          setShowCoinAnimation(true);
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
    } finally {
      setIsSaving(false);
    }
  }, [gameState, currentRegion, selectedRegion, token, isSaving, submitSelection, updateStats, triggerTap, playCorrect, playWrong]);
  
  // Continue to next question or finish
  const handleContinue = useCallback(() => {
    triggerTap('light');
    closeFeedback();
    
    const hasMore = nextQuestion();
    if (!hasMore) {
      // All done - play win sound if they got at least half correct!
      if (correctCount >= guessedToday.length / 2) {
        playWin();
      }
      finishGame();
    }
  }, [closeFeedback, nextQuestion, finishGame, triggerTap, playWin, correctCount, guessedToday.length]);
  
  // Back to games
  const handleBack = useCallback(() => {
    triggerTap('medium');
    resetGame();
    safeBack();
  }, [resetGame, triggerTap, safeBack]);
  
  // Loading state
  if (!progress) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading progress...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Completed today state
  if (isCompletedToday && gameState === 'idle') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>India Explorer</Text>
          <CoinBalance />
        </View>
        
        <View style={styles.completedContainer}>
          <Mascot mascotType={mascot} size="large" />
          <Text style={styles.completedTitle}>🎉 All Done for Today!</Text>
          <Text style={styles.completedText}>
            You've identified all {TOTAL_REGIONS} states and union territories!
          </Text>
          <Text style={styles.completedStats}>
            Total XP Earned: {progress.totalXPEarned}
          </Text>
          <Text style={styles.completedHint}>Come back tomorrow for more exploring!</Text>
          
          <Pressable style={styles.backToGamesButton} onPress={handleBack}>
            <Text style={styles.backToGamesText}>Back to Games</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  
  // Idle state - show loading while starting
  if (gameState === 'idle') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Starting exploration...</Text>
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
            <Text style={styles.resultTitle}>Session Complete!</Text>
            
            <View style={styles.resultStats}>
              <View style={styles.resultStatItem}>
                <Text style={styles.resultStatValue}>{correctCount}</Text>
                <Text style={styles.resultStatLabel}>Correct</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatItem}>
                <Text style={styles.resultStatValue}>{guessedToday.length}</Text>
                <Text style={styles.resultStatLabel}>Answered</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatItem}>
                <Text style={[styles.resultStatValue, { color: COLORS.accentGold }]}>
                  +{sessionResult.xp}
                </Text>
                <Text style={styles.resultStatLabel}>XP</Text>
              </View>
            </View>
            
            {guessedToday.length >= TOTAL_REGIONS ? (
              <Text style={styles.resultHint}>
                🏆 You've completed all regions! Come back tomorrow.
              </Text>
            ) : (
              <Text style={styles.resultHint}>
                {TOTAL_REGIONS - guessedToday.length} regions remaining today
              </Text>
            )}
            
            <Pressable style={styles.resultButton} onPress={handleBack}>
              <Text style={styles.resultButtonText}>Done</Text>
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
            {guessedToday.length} / {TOTAL_REGIONS}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(guessedToday.length / TOTAL_REGIONS) * 100}%` }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.scoreContainer}>
          <Ionicons name="star" size={16} color={COLORS.accentGold} />
          <Text style={styles.scoreText}>{correctCount * XP_PER_CORRECT}</Text>
        </View>
      </View>
      
      {/* Question */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionLabel}>Find this on the map:</Text>
        <Text style={styles.questionText}>{currentRegion?.name}</Text>
        <Text style={styles.questionType}>
          {currentRegion?.type === 'state' ? 'State' : 'Union Territory'}
        </Text>
      </View>
      
      {/* Map */}
      <View style={styles.mapContainer}>
        <IndiaMap
          targetRegion={currentRegion?.id}
          selectedRegion={selectedRegion ?? undefined}
          guessedRegions={filteredGuessedRegions}
          correctRegion={showFeedback ? currentRegion?.id : undefined}
          wrongRegion={showFeedback && !wasCorrect ? selectedRegion ?? undefined : undefined}
          onRegionPress={handleRegionPress}
          disabled={showFeedback || gameState !== 'playing'}
        />
      </View>
      
      {/* Submit Button - appears when a region is selected */}
      {selectedRegion && !showFeedback && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          style={styles.submitContainer}
        >
          <Pressable
            style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Answer</Text>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.text} />
              </>
            )}
          </Pressable>
        </MotiView>
      )}
      
      {/* Feedback Modal */}
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
                  {wasCorrect ? '🎉' : '🤔'}
                </Text>
              </View>
              <View style={styles.feedbackTextContainer}>
                <Text style={styles.feedbackTitle}>
                  {wasCorrect ? 'Excellent!' : 'Not quite!'}
                </Text>
                {wasCorrect ? (
                  <View>
                    <Text style={styles.feedbackSubtitle}>
                        You found {currentRegion?.name}
                    </Text>
                    <Text style={styles.feedbackCoins}>+5 Coins 🪙</Text>
                  </View>
                ) : (
                  <Text style={styles.feedbackSubtitle}>
                    That was {selectedRegionName}
                  </Text>
                )}
              </View>
            </View>

            {wasCorrect ? (
              <View style={styles.xpPill}>
                <Ionicons name="star" size={16} color={COLORS.accentGold} />
                <Text style={styles.xpPillText}>+{XP_PER_CORRECT} XP Earned</Text>
              </View>
            ) : (
              <View style={styles.hintContainer}>
                <Ionicons name="eye-outline" size={20} color="rgba(255,255,255,0.8)" />
                <Text style={styles.feedbackHint}>
                  The one highlighted in green is {currentRegion?.name}
                </Text>
              </View>
            )}

            <Pressable style={styles.feedbackButton} onPress={handleContinue}>
              <Text style={styles.feedbackButtonText}>
                {guessedToday.length >= TOTAL_REGIONS ? 'Finish Game' : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward-circle" size={24} color={wasCorrect ? COLORS.success : COLORS.error} />
            </Pressable>
          </LinearGradient>
        </MotiView>
      )}
      {/* Coin Animation Overlay */}
      {showCoinAnimation && (
          <CoinRewardAnimation 
              coinsEarned={earnedCoins}
              onComplete={() => setShowCoinAnimation(false)}
          />
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
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  
  // Start screen
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
    marginBottom: SPACING.md,
  },
  completedStats: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.accentGold,
    marginBottom: SPACING.sm,
  },
  completedHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl,
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
    color: COLORS.accentGold,
  },
  
  // Question
  questionContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  questionLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  questionType: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
  },
  
  // Map
  mapContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: SPACING.xs,
    marginTop: SPACING.sm,
  },
  
  // Feedback
  feedbackContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingBottom: SPACING.xl, // Extra padding for safe area
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
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  xpPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  feedbackHint: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
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
  
  // Submit button
  submitContainer: {
    position: 'absolute',
    bottom: SPACING.xl,
    alignSelf: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.md,
  },
  submitButtonDisabled: {
    opacity: 0.8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // Feedback Overlay
  feedbackOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
    zIndex: 100,
  },
  feedbackEmojiWrong: {
    opacity: 0.8,
  },
  feedbackCoins: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accentGold,
    marginTop: 4,
  },
  
  // Result
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  resultEmoji: {
    fontSize: 80,
    marginBottom: SPACING.md,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xl,
  },
  resultStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  resultStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  resultStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  resultStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  resultStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.text + '20',
  },
  resultHint: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: SPACING.xl,
  },
  resultButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl * 2,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  resultButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
