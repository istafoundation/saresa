// Wordle Game Screen - Updated with How-To-Play, Share, and Hints
// Stats are read from Convex via useUserStore (synced by useConvexSync)
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useWordleStore, type LetterState } from '../../stores/wordle-store';
import { useUserStore } from '../../stores/user-store';
import { useUserActions, useGameStatsActions } from '../../utils/useUserActions';
import { useChildAuth } from '../../utils/childAuth';
import { isValidWord } from '../../data/wordle-words';
import HowToPlayModal from '../../components/games/HowToPlayModal';
import ShareButton from '../../components/games/ShareResults';
import { useGameAudio } from '../../utils/sound-manager';
import { useTapFeedback } from '../../utils/useTapFeedback';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

const LETTER_COLORS: Record<LetterState, string> = {
  correct: COLORS.wordleCorrect,
  present: COLORS.wordlePresent,
  absent: COLORS.wordleAbsent,
  unused: COLORS.surface,
};

// XP and shard rewards
const XP_FULL = 100;
const XP_WITH_HINT = 50;
const SHARDS_FULL = 50;
const SHARDS_WITH_HINT = 25;

export default function WordleScreen() {
  const router = useRouter();
  const { token } = useChildAuth();
  const { addXP, addWeaponShards } = useUserActions();
  const { updateWordleStats, markWordleHintUsed } = useGameStatsActions();
  
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
  } = useWordleStore();
  
  // Get stats from Convex-synced store (for initial how-to-play check)
  const { wordleStats } = useUserStore();
  
  // CONVEX IS SOURCE OF TRUTH - Check if user can play today
  const canPlayTodayFromServer = useQuery(api.gameStats.canPlayWordle,
    token ? { token } : 'skip'
  );
  
  // Check if hint was used today (from Convex - for restoring state after app restart)
  const didUseHintToday = useQuery(api.gameStats.didUseWordleHint, 
    token ? { token } : 'skip'
  );
  
  // Sound effects and music
  const { playKey, playSubmit, playWin, playWrong, startMusic, stopMusic } = useGameAudio();
  
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

  // Initialize game - but defer to Convex for source of truth
  useEffect(() => {
    initGame();
    // Don't start music yet - wait for Convex check
    // Show how-to-play on first visit (check Convex stats)
    if (wordleStats.gamesPlayed === 0) {
      setShowHowToPlay(true);
    }
    return () => {
      stopMusic(); // Stop music on exit
    };
  }, []);

  // SYNC WITH CONVEX: Handle game availability and music
  useEffect(() => {
    if (canPlayTodayFromServer === false) {
      // User already played today according to Convex
      setAlreadyPlayedToday(true);
      stopMusic(); // Ensure music is stopped
    } else if (canPlayTodayFromServer === true) {
      // User can play
      setAlreadyPlayedToday(false);
      startMusic(); // Start music only when we confirm we can play
    }
  }, [canPlayTodayFromServer]);

  // Sync hint state from Convex on load
  useEffect(() => {
    if (didUseHintToday === true) {
      setHintUsedFromServer(true);
    }
  }, [didUseHintToday]);

  const handleKeyPress = (key: string) => {
    if (gameState !== 'playing') return;
    
    if (key === '⌫') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playKey();
      removeLetter();
    } else if (key === 'ENTER') {
      handleSubmit();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playKey();
      addLetter(key);
    }
  };

  const handleUseHint = () => {
    if (hintUsed || hintRevealed) return;
    setShowHintConfirm(true);
  };

  const confirmUseHint = async () => {
    setShowHintConfirm(false);
    useHint(); // Update local state
    await markWordleHintUsed(); // Persist to Convex
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSubmit = async () => {
    if (currentGuess.length !== 5) {
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

    if (!isValidWord(currentGuess)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playWrong();
      Alert.alert('Not in word list', 'Try another word');
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(10, { duration: 100 }),
        withTiming(0, { duration: 50 })
      );
      return;
    }

    playSubmit();
    const result = submitGuess();
    if (result.valid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (result.won) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        stopMusic();
        // Calculate rewards based on hint usage
        const xpReward = hintUsed ? XP_WITH_HINT : XP_FULL;
        const shardReward = hintUsed ? SHARDS_WITH_HINT : SHARDS_FULL;
        // Save rewards and stats to Convex
        await addXP(xpReward);
        await addWeaponShards(shardReward);
        const statsResult = await updateWordleStats({ 
          won: true, 
          guessCount: guesses.length + 1,
          usedHint: hintUsed,
        });
        // Use returned stats directly to avoid race condition
        if (statsResult.success && statsResult.stats) {
          setDisplayStats(statsResult.stats);
        }
        // Play win sound when showing result (delayed for animation)
        setTimeout(() => {
          playWin();
          setShowResult(true);
        }, 500);
      } else if (result.lost) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        stopMusic();
        // Save stats to Convex (loss)
        const statsResult = await updateWordleStats({ won: false, usedHint: hintUsed });
        // Use returned stats directly to avoid race condition
        if (statsResult.success && statsResult.stats) {
          setDisplayStats(statsResult.stats);
        }
        setTimeout(() => setShowResult(true), 500);
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
  const shardReward = hintUsed ? SHARDS_WITH_HINT : SHARDS_FULL;

  // If server confirms already played, show the overlay
  if (alreadyPlayedToday && gameState === 'playing') {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => { triggerTap(); router.back(); }} style={styles.backButton}>
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
              onPress={() => { triggerTap(); router.back(); }}
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
        <Pressable onPress={() => { triggerTap(); router.back(); }} style={styles.backButton}>
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

      {/* Grid */}
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

      {/* Keyboard */}
      <View style={styles.keyboard}>
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keyboardRow}>
            {row.map((key) => {
              const state = letterStates[key] || 'unused';
              const isSpecial = key === 'ENTER' || key === '⌫';
              
              return (
                <Pressable
                  key={key}
                  onPress={() => handleKeyPress(key)}
                  style={[
                    styles.key,
                    isSpecial && styles.keyWide,
                    { backgroundColor: LETTER_COLORS[state] },
                  ]}
                >
                  <Text style={[
                    styles.keyText,
                    isSpecial && styles.keyTextSmall,
                  ]}>
                    {key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

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
                <View style={[styles.shardsEarned, hintUsed && styles.reducedReward]}>
                  <Text style={styles.shardsEarnedText}>+{shardReward} 💎</Text>
                </View>
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
              onPress={() => { triggerTap(); router.back(); }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </MotiView>
        </MotiView>
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
                <View style={[styles.rewardBadgeFull, styles.shardBadge]}>
                  <Text style={styles.rewardBadgeText}>{SHARDS_FULL} 💎</Text>
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
                <View style={[styles.rewardBadgeReduced, styles.shardBadgeReduced]}>
                  <Text style={styles.rewardBadgeTextReduced}>{SHARDS_WITH_HINT} 💎</Text>
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
  keyboard: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.sm,
    gap: 6,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  key: {
    minWidth: 32,
    height: 52,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  keyWide: {
    minWidth: 58,
    paddingHorizontal: 12,
  },
  keyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  keyTextSmall: {
    fontSize: 12,
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
  // Rewards container for XP + Shards
  rewardsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  shardsEarned: {
    backgroundColor: COLORS.primary + '30',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  shardsEarnedText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
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
  shardBadge: {
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
  shardBadgeReduced: {
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

