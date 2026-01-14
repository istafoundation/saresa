// Wordle Game Screen - Updated with How-To-Play and Share
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
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useWordleStore, type LetterState } from '../../stores/wordle-store';
import { useUserStore } from '../../stores/user-store';
import { useUserActions, useGameStatsActions } from '../../utils/useUserActions';
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

export default function WordleScreen() {
  const router = useRouter();
  const { addXP, addWeaponShards } = useUserActions();
  const { updateWordleStats } = useGameStatsActions();
  
  // Get game session state from local store
  const {
    targetWord,
    currentGuess,
    guesses,
    gameState,
    letterStates,
    addLetter,
    removeLetter,
    submitGuess,
    initGame,
  } = useWordleStore();
  
  // Get stats from Convex-synced store (for initial how-to-play check)
  const { wordleStats } = useUserStore();
  
  // Sound effects and music
  const { playKey, playSubmit, playWin, playWrong, startMusic, stopMusic } = useGameAudio();
  
  const [showResult, setShowResult] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
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

  useEffect(() => {
    initGame();
    startMusic(); // Start background music
    // Show how-to-play on first visit (check Convex stats)
    if (wordleStats.gamesPlayed === 0) {
      setShowHowToPlay(true);
    }
    return () => {
      stopMusic(); // Stop music on exit
    };
  }, []);

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
        // Save rewards and stats to Convex
        await addXP(100);
        await addWeaponShards(50);
        const statsResult = await updateWordleStats({ won: true, guessCount: guesses.length + 1 });
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
        const statsResult = await updateWordleStats({ won: false });
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { triggerTap(); router.back(); }} style={styles.backButton}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Mythology Wordle</Text>
        <Pressable onPress={() => { triggerTap(); setShowHowToPlay(true); }} style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={28} color={COLORS.text} />
        </Pressable>
      </View>

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
                <View style={styles.xpEarned}>
                  <Text style={styles.xpEarnedText}>+100 XP</Text>
                </View>
                <View style={styles.shardsEarned}>
                  <Text style={styles.shardsEarnedText}>+50 💎</Text>
                </View>
              </View>
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
    marginBottom: SPACING.lg,
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
    marginBottom: SPACING.lg,
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
});
