// Wordle Game Screen - Updated with How-To-Play, Share, and Hints
// Stats are read from Convex via useUserStore (synced by useConvexSync)
// OPTIMIZED: Uses synced gameLimits instead of separate Convex queries
import { View, Text, StyleSheet, Pressable, TextInput, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useEffect, useState, useRef } from 'react';
import { useSafeNavigation } from '../../utils/useSafeNavigation';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { WORDLE_REWARDS } from '../../constants/rewards';
import { useWordleStore, type LetterState } from '../../stores/wordle-store';
import { useUserStore } from '../../stores/user-store';
import { useUserActions, useGameStatsActions } from '../../utils/useUserActions';
import { isValidWord } from '../../data/wordle-words';
import HowToPlayModal from '../../components/games/HowToPlayModal';
import ShareButton from '../../components/games/ShareResults';
import { useWordleContent } from '../../utils/content-hooks';
import { useTapFeedback } from '../../utils/useTapFeedback';
import { useGameAudio } from '../../utils/sound-manager';
import CoinRewardAnimation from '../../components/animations/CoinRewardAnimation';

// Native keyboard is used instead of custom keyboard

// Use centralized rewards
const { XP_FULL, XP_WITH_HINT, COINS_FULL, COINS_WITH_HINT } = WORDLE_REWARDS;

export default function WordleScreen() {
  const { safeBack } = useSafeNavigation();
  // OPTIMIZATION: Use batched finishWordleGame instead of individual addXP/addCoins
  const { finishWordleGame, markWordleHintUsed } = useGameStatsActions();
  
  // Get game session state from local store
  const {
    targetWord,
    targetHint,
    currentGuess,
    guesses,
    gameState,
    letterStates,
    hintUsed,
    hintRevealed,
    addLetter,
    removeLetter,
    submitGuess,
    initGame,
    useHint,
    setHintUsedFromServer,
    setCurrentGuess,
  } = useWordleStore();
  
  // Get stats from Convex-synced store (for initial how-to-play check)
  // OPTIMIZATION: Also use gameLimits for canPlay and hintUsed checks
  const { wordleStats, gameLimits } = useUserStore();
  
  // Use synced limits instead of separate queries (eliminates 2 Convex queries)
  const canPlayTodayFromLimits = gameLimits.canPlayWordle;
  const didUseHintTodayFromLimits = gameLimits.didUseWordleHintToday;
  
  // Note: Day change is handled by useConvexSync which updates gameLimits
  // when getMyData subscription updates on day boundary
  
  // OTA: Get today's word from content hook (handles caching & fallback)
  // This replaces direct useQuery to ensure we have cache/fallback and avoid infinite loading
  const { content: wordleContent, refresh } = useWordleContent();
  const todaysData = wordleContent?.[0];
  
  // Sound effects
  const { playKey, playSubmit, playWin, playWrong } = useGameAudio();
  
  const [showResult, setShowResult] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showHintConfirm, setShowHintConfirm] = useState(false);
  const [alreadyPlayedToday, setAlreadyPlayedToday] = useState(false);
  // Stats from mutation result - used in modal to avoid race condition
  const [displayStats, setDisplayStats] = useState<{
    gamesPlayed: number;
    gamesWon: number;
    currentStreak: number;
    maxStreak: number;
    guessDistribution: number[];
  } | null>(null);
  const shakeX = useSharedValue(0);
  const { triggerTap } = useTapFeedback();
  
  // Native keyboard support
  const inputRef = useRef<TextInput>(null);
  const [invalidWordError, setInvalidWordError] = useState(false);
  
  // Coin animation state
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);

  // Initialize game when we have today's word
  useEffect(() => {
    if (todaysData) {
      initGame(todaysData.word, todaysData.hint);
    }
    // Don't start music yet - wait for Convex check
    // Show how-to-play on first visit (check Convex stats)
    if (wordleStats.gamesPlayed === 0) {
      setShowHowToPlay(true);
    }
  }, [todaysData]);

  // SYNC WITH STORE: Handle game availability (now uses synced limits)
  useEffect(() => {
    if (canPlayTodayFromLimits === false) {
      setAlreadyPlayedToday(true);
    } else if (canPlayTodayFromLimits === true) {
      setAlreadyPlayedToday(false);
    }
  }, [canPlayTodayFromLimits]);



  // Sync hint state from synced limits on load
  useEffect(() => {
    if (didUseHintTodayFromLimits === true) {
      setHintUsedFromServer(true);
    }
  }, [didUseHintTodayFromLimits]);

  // Handle text input from native keyboard
  const handleTextChange = (text: string) => {
    if (gameState !== 'playing') return;
    
    // Filter to only allow letters
    const filtered = text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    
    // Clear any previous error when user starts typing again
    if (invalidWordError && filtered.length < 5) {
      setInvalidWordError(false);
    }
    
    const prevLen = currentGuess.length;
    const newLen = filtered.length;
    
    // Only update if actually changed
    if (filtered !== currentGuess) {
      // Single haptic feedback for the change
      if (newLen !== prevLen) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        playKey();
      }
      
      // Direct update - single store call, no loops
      setCurrentGuess(filtered);
      
      // Auto-submit when 5 letters are typed
      if (filtered.length === 5 && prevLen < 5) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          handleSubmit();
        }, 50);
      }
    }
  };
  


  const handleUseHint = () => {
    if (hintUsed || hintRevealed) return;
    Keyboard.dismiss();
    setShowHintConfirm(true);
  };

  const confirmUseHint = async () => {
    setShowHintConfirm(false);
    Keyboard.dismiss(); // Ensure keyboard stays closed during hint reveal
    useHint(); // Update local state
    await markWordleHintUsed(); // Persist to Convex
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSubmit = async () => {
    // Get fresh state for auto-submit
    const freshGuess = useWordleStore.getState().currentGuess;
    
    if (freshGuess.length !== 5) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playWrong();
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(10, { duration: 100 }),
        withTiming(0, { duration: 50 })
      );
      return;
    }

    if (!isValidWord(freshGuess)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playWrong();
      setInvalidWordError(true);
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(10, { duration: 100 }),
        withTiming(0, { duration: 50 })
      );
      // Clear the invalid word and let user try again
      for (let i = 0; i < 5; i++) {
        removeLetter();
      }
      // Auto-dismiss error after 2 seconds
      setTimeout(() => setInvalidWordError(false), 2000);
      return;
    }

    playSubmit();
    const result = submitGuess();
    if (result.valid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (result.won) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Calculate rewards based on hint usage
        const xpReward = hintUsed ? XP_WITH_HINT : XP_FULL;
        const coinReward = hintUsed ? COINS_WITH_HINT : COINS_FULL;
        
        // OPTIMIZATION: Single batched API call instead of 3 separate calls
        const result = await finishWordleGame({
          won: true,
          guessCount: guesses.length + 1,
          usedHint: hintUsed,
          xpReward,
          coinReward,
        });
        
        // Use returned stats directly to avoid race condition
        if (result.success && result.stats) {
          setDisplayStats(result.stats);
          // Track coins earned for animation
          if (result.coinsEarned && result.coinsEarned > 0) {
            setCoinsEarned(result.coinsEarned);
            // Auto-trigger coin animation after a short delay
            setTimeout(() => setShowCoinAnimation(true), 800);
          }
        }
        // Play win sound when showing result (delayed for animation)
        setTimeout(() => {
          playWin();
          Keyboard.dismiss();
          setShowResult(true);
        }, 500);
      } else if (result.lost) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        
        // OPTIMIZATION: Single batched API call (no XP/coins for loss)
        const statsResult = await finishWordleGame({
          won: false,
          usedHint: hintUsed,
          xpReward: 0,
          coinReward: 0,
        });
        
        // Use returned stats directly to avoid race condition
        if (statsResult.success && statsResult.stats) {
          setDisplayStats(statsResult.stats);
          // Track coins earned for animation
          if (statsResult.coinsEarned && statsResult.coinsEarned > 0) {
            setCoinsEarned(statsResult.coinsEarned);
          }
        }
        setTimeout(() => {
          Keyboard.dismiss();
          setShowResult(true);
        }, 500);
      }
    }
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const getLetterColor = (rowIndex: number, colIndex: number): string => {
    if (rowIndex < guesses.length) {
      const guess = guesses[rowIndex];
      const letter = guess[colIndex];
      const target = targetWord[colIndex];
      
      if (letter === target) return COLORS.wordleCorrect;
      if (targetWord.includes(letter)) return COLORS.wordlePresent;
      return COLORS.wordleAbsent;
    }
    return COLORS.surface;
  };

  const getLetterValue = (rowIndex: number, colIndex: number): string => {
    if (rowIndex < guesses.length) {
      return guesses[rowIndex][colIndex] || '';
    }
    if (rowIndex === guesses.length) {
      return currentGuess[colIndex] || '';
    }
    return '';
  };

  // Calculate reward amounts for display
  const xpReward = hintUsed ? XP_WITH_HINT : XP_FULL;
  const coinReward = hintUsed ? COINS_WITH_HINT : COINS_FULL;

  // No loading state needed - useWordleContent handles fallback/cache internally assignment

  // If server confirms already played, show the overlay
  if (alreadyPlayedToday && gameState === 'playing') {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => { triggerTap(); safeBack(); }} style={styles.backButton}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>Wordle</Text>
          <View style={styles.headerRight}>
            <Pressable onPress={() => { triggerTap(); setShowHowToPlay(true); }} style={styles.helpButton}>
              <Ionicons name="help-circle-outline" size={28} color={COLORS.text} />
            </Pressable>
          </View>
        </View>

        {/* Already Played Message */}
        <View style={styles.alreadyPlayedContainer}>
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.alreadyPlayedCard}
          >
            <Text style={styles.alreadyPlayedEmoji}>✅</Text>
            <Text style={styles.alreadyPlayedTitle}>Already Played Today!</Text>
            <Text style={styles.alreadyPlayedSubtitle}>
              Come back tomorrow for a new word
            </Text>
            <Pressable
              style={styles.alreadyPlayedButton}
              onPress={() => { triggerTap(); safeBack(); }}
            >
              <Text style={styles.alreadyPlayedButtonText}>Go Back</Text>
            </Pressable>
          </MotiView>
        </View>

        {/* How To Play Modal */}
        <HowToPlayModal
          visible={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { triggerTap(); safeBack(); }} style={styles.backButton}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Wordle</Text>
        <View style={styles.headerRight}>
          {/* Hint button - only show if playing and hint not yet used */}
          {gameState === 'playing' && !hintRevealed && !alreadyPlayedToday && (
            <Pressable onPress={() => { triggerTap(); handleUseHint(); }} style={styles.hintButton}>
              <Ionicons name="bulb-outline" size={24} color={COLORS.accentGold} />
            </Pressable>
          )}
          <Pressable onPress={() => { triggerTap(); setShowHowToPlay(true); }} style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={28} color={COLORS.text} />
          </Pressable>
        </View>
      </View>

      {/* Hint Banner - shown when hint is revealed */}
      {hintRevealed && (
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          style={styles.hintBanner}
        >
          <Ionicons name="bulb" size={18} color={COLORS.accentGold} />
          <Text style={styles.hintText}>{targetHint}</Text>
        </MotiView>
      )}

      {/* Grid container with overlaid input */}
      <View style={styles.gridWrapper}>
        <Animated.View style={[styles.gridContainer, shakeStyle]}>
          {[0, 1, 2, 3, 4, 5].map((rowIndex) => (
            <MotiView
              key={rowIndex}
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: rowIndex * 50 }}
              style={styles.row}
            >
              {[0, 1, 2, 3, 4].map((colIndex) => {
                const letter = getLetterValue(rowIndex, colIndex);
                const bgColor = getLetterColor(rowIndex, colIndex);
                const isCurrentRow = rowIndex === guesses.length;
                const hasLetter = letter !== '';
                
                return (
                  <MotiView
                    key={colIndex}
                    animate={{
                      scale: isCurrentRow && hasLetter ? [1, 1.1, 1] : 1,
                      backgroundColor: bgColor,
                    }}
                    transition={{ 
                      type: 'timing', 
                      duration: 150,
                    }}
                    style={[
                      styles.cell,
                      hasLetter && styles.cellFilled,
                      rowIndex < guesses.length && styles.cellRevealed,
                    ]}
                  >
                    <Text style={styles.cellText}>{letter}</Text>
                  </MotiView>
                );
              })}
            </MotiView>
          ))}
        </Animated.View>

        {/* Overlay TextInput - covers the grid to capture taps directly */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={currentGuess}
          onChangeText={handleTextChange}
          maxLength={5}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          keyboardType="default"
          returnKeyType="done"
          blurOnSubmit={false}
          caretHidden={true}
          autoFocus={gameState === 'playing'}
        />
      </View>

      {/* Invalid word error banner */}
      {invalidWordError && (
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0 }}
          style={styles.errorBanner}
        >
          <Ionicons name="alert-circle" size={18} color={COLORS.error} />
          <Text style={styles.errorText}>Not a valid word. Try again!</Text>
        </MotiView>
      )}

      {/* Tap to type hint */}
      {gameState === 'playing' && currentGuess.length === 0 && guesses.length < 6 && (
        <Text style={styles.tapHint}>Tap the grid to type</Text>
      )}



      {/* Result Modal */}
      {showResult && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={styles.resultOverlay}
        >
          <MotiView
            from={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'timing', duration: 250 }}
            style={styles.resultCard}
          >
            <Text style={styles.resultEmoji}>
              {gameState === 'won' ? '🎉' : '😔'}
            </Text>
            <Text style={styles.resultTitle}>
              {gameState === 'won' ? 'Congratulations!' : 'Better luck next time!'}
            </Text>
            <Text style={styles.resultWord}>
              The word was: <Text style={styles.resultWordBold}>{targetWord}</Text>
            </Text>
            
            {gameState === 'won' && (
              <View style={styles.rewardsContainer}>
                <View style={[styles.xpEarned, hintUsed && styles.reducedReward]}>
                  <Text style={styles.xpEarnedText}>+{xpReward} XP</Text>
                </View>
                <View style={[styles.coinsEarnedBadge, hintUsed && styles.reducedReward]}>
                  <Text style={styles.coinsEarnedBadgeText}>+{coinReward} 🪙</Text>
                </View>
                {coinsEarned > 0 && (
                  <Pressable 
                    style={[styles.coinsEarned, hintUsed && styles.reducedReward]}
                    onPress={() => setShowCoinAnimation(true)}
                  >
                    <Text style={styles.coinsEarnedText}>+{coinsEarned} 🪙</Text>
                  </Pressable>
                )}
              </View>
            )}

            {gameState === 'won' && hintUsed && (
              <Text style={styles.hintUsedNote}>
                💡 Rewards reduced (hint used)
              </Text>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {displayStats?.gamesPlayed ?? wordleStats.gamesPlayed}
                </Text>
                <Text style={styles.statLabel}>Played</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {(displayStats?.gamesPlayed ?? wordleStats.gamesPlayed) > 0 
                    ? Math.round(
                        ((displayStats?.gamesWon ?? wordleStats.gamesWon) / 
                         (displayStats?.gamesPlayed ?? wordleStats.gamesPlayed)) * 100
                      ) 
                    : 0}%
                </Text>
                <Text style={styles.statLabel}>Win %</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {displayStats?.currentStreak ?? wordleStats.currentStreak}
                </Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
            </View>

            {/* Share Button */}
            <ShareButton
              targetWord={targetWord}
              guesses={guesses}
              gameState={gameState}
            />

            <Pressable 
              style={styles.closeButton}
              onPress={() => { triggerTap(); safeBack(); }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </MotiView>
        </MotiView>
      )}
      
      {/* Coin Reward Animation */}
      {showCoinAnimation && coinsEarned > 0 && (
        <CoinRewardAnimation
          coinsEarned={coinsEarned}
          onComplete={() => setShowCoinAnimation(false)}
        />
      )}

      {/* Hint Confirmation Modal */}
      {showHintConfirm && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={styles.resultOverlay}
        >
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.hintConfirmCard}
          >
            {/* Icon */}
            <View style={styles.hintConfirmIcon}>
              <Ionicons name="bulb" size={40} color={COLORS.accentGold} />
            </View>
            
            <Text style={styles.hintConfirmTitle}>Need a Hint?</Text>
            <Text style={styles.hintConfirmSubtitle}>
              Using a hint will reduce your rewards
            </Text>

            {/* Reward Comparison */}
            <View style={styles.rewardComparison}>
              {/* Without Hint */}
              <View style={styles.rewardColumn}>
                <Text style={styles.rewardColumnLabel}>Without Hint</Text>
                <View style={styles.rewardBadgeFull}>
                  <Text style={styles.rewardBadgeText}>{XP_FULL} XP</Text>
                </View>
                <View style={[styles.rewardBadgeFull, styles.coinBadge]}>
                  <Text style={styles.rewardBadgeText}>{COINS_FULL} 🪙</Text>
                </View>
              </View>

              {/* Arrow */}
              <View style={styles.rewardArrow}>
                <Ionicons name="arrow-forward" size={24} color={COLORS.textMuted} />
              </View>

              {/* With Hint */}
              <View style={styles.rewardColumn}>
                <Text style={styles.rewardColumnLabel}>With Hint</Text>
                <View style={styles.rewardBadgeReduced}>
                  <Text style={styles.rewardBadgeTextReduced}>{XP_WITH_HINT} XP</Text>
                </View>
                <View style={[styles.rewardBadgeReduced, styles.coinBadgeReduced]}>
                  <Text style={styles.rewardBadgeTextReduced}>{COINS_WITH_HINT} 🪙</Text>
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.hintConfirmButtons}>
              <Pressable
                style={styles.hintCancelButton}
                onPress={() => { triggerTap(); setShowHintConfirm(false); }}
              >
                <Text style={styles.hintCancelButtonText}>Keep Trying</Text>
              </Pressable>
              <Pressable
                style={styles.hintConfirmButton}
                onPress={() => { triggerTap(); confirmUseHint(); }}
              >
                <Ionicons name="bulb" size={18} color="#000" />
                <Text style={styles.hintConfirmButtonText}>Show Hint</Text>
              </Pressable>
            </View>
          </MotiView>
        </MotiView>
      )}

      {/* How To Play Modal */}
      <HowToPlayModal
        visible={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hintButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentGold + '20',
    marginHorizontal: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.accentGold,
    fontWeight: '500',
  },
  gridContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  cell: {
    width: 58,
    height: 58,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  cellFilled: {
    borderColor: COLORS.textMuted,
  },
  cellRevealed: {
    borderColor: 'transparent',
  },
  cellText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  gridWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Hidden TextInput overlay that covers the grid
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    // Ensure it sits on top to catch taps
    zIndex: 10,
  },
  // Error banner for invalid words
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error + '20',
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '500',
  },
  // Tap hint for keyboard focus
  tapHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  resultCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  resultWord: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  resultWordBold: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  xpEarned: {
    backgroundColor: COLORS.accentGold + '30',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  xpEarnedText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  // Rewards container for XP + Coins
  rewardsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  coinsEarnedBadge: {
    backgroundColor: COLORS.primary + '30',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  coinsEarnedBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  coinsEarned: {
    backgroundColor: COLORS.accentGold + '30',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  coinsEarnedText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  reducedReward: {
    opacity: 0.7,
  },
  hintUsedNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: SPACING.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  // Hint Confirmation Modal Styles
  hintConfirmCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  hintConfirmIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accentGold + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  hintConfirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  hintConfirmSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  rewardComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  rewardColumn: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rewardColumnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  rewardBadgeFull: {
    backgroundColor: COLORS.wordleCorrect,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  rewardBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  coinBadge: {
    backgroundColor: COLORS.primary,
  },
  rewardBadgeReduced: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.textMuted + '40',
  },
  rewardBadgeTextReduced: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  coinBadgeReduced: {
    borderColor: COLORS.textMuted + '40',
  },
  rewardArrow: {
    paddingHorizontal: SPACING.sm,
  },
  hintConfirmButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  hintCancelButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  hintCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  hintConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.accentGold,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  hintConfirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  // Already Played Today Styles
  alreadyPlayedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  alreadyPlayedCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  alreadyPlayedEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  alreadyPlayedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  alreadyPlayedSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  alreadyPlayedButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  alreadyPlayedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
});

