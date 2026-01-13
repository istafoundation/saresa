// Word Finder Game Screen - 8x8 grid word search with swipe mechanics
import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useWordFinderStore, type GameMode, type CellPosition } from '../../stores/word-finder-store';
import { useUserStore } from '../../stores/user-store';
import { useGameAudio } from '../../utils/sound-manager';
import { useTapFeedback } from '../../utils/useTapFeedback';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = 8;
const GRID_PADDING = SPACING.md;
const CELL_SIZE = (SCREEN_WIDTH - GRID_PADDING * 4) / GRID_SIZE;

export default function WordFinderScreen() {
  const router = useRouter();
  const { triggerTap } = useTapFeedback();
  const { playCorrect, playWrong, playWin } = useGameAudio();
  const addXP = useUserStore(state => state.addXP);
  
  const {
    mode,
    gameState,
    grid,
    wordPlacements,
    selectedCells,
    currentWordSet,
    currentQuestion,
    hintUsed,
    timeRemaining,
    startGame,
    selectCell,
    confirmSelection,
    clearSelection,
    useHint,
    nextHardQuestion,
    updateTimer,
    finishGame,
    canPlayEasyToday,
    canPlayHardToday,
    resetGame,
  } = useWordFinderStore();
  
  const [showModeSelect, setShowModeSelect] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [lastFoundWord, setLastFoundWord] = useState<string | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [result, setResult] = useState<{ xpEarned: number; wordsFound: number; total: number } | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridRef = useRef<View>(null);
  const gridLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Timer effect
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        const currentTime = useWordFinderStore.getState().timeRemaining;
        if (currentTime > 0) {
          updateTimer(currentTime - 1);
        } else {
          handleTimeUp();
        }
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState]);
  
  // Handle game state changes
  useEffect(() => {
    if (gameState === 'finished' && !showResult) {
      handleGameEnd();
    }
  }, [gameState]);
  
  const handleTimeUp = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    handleGameEnd();
  };
  
  const handleGameEnd = () => {
    const gameResult = finishGame();
    setResult(gameResult);
    setShowResult(true);
    
    if (gameResult.xpEarned > 0) {
      addXP(gameResult.xpEarned);
      playWin();
    }
  };
  
  const handleStartGame = (selectedMode: GameMode) => {
    triggerTap('medium');
    const success = startGame(selectedMode);
    if (success) {
      setShowModeSelect(false);
      setShowResult(false);
      setResult(null);
      setLastFoundWord(null);
      setHintText(null);
    }
  };
  
  const handleBack = () => {
    triggerTap('light');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    resetGame();
    router.back();
  };
  
  const handlePlayAgain = () => {
    triggerTap('medium');
    resetGame();
    setShowModeSelect(true);
    setShowResult(false);
    setResult(null);
  };
  
  const handleUseHint = () => {
    triggerTap('light');
    const hint = useHint();
    if (hint) {
      setHintText(hint);
    }
  };
  
  const handleNextQuestion = () => {
    triggerTap('medium');
    setLastFoundWord(null);
    setHintText(null);
    const hasMore = nextHardQuestion();
    if (!hasMore) {
      handleGameEnd();
    }
  };
  
  // Calculate cell position from touch coordinates
  const getCellFromPosition = useCallback((x: number, y: number): CellPosition | null => {
    if (!gridLayoutRef.current) return null;
    
    const { x: gridX, y: gridY } = gridLayoutRef.current;
    const relX = x - gridX;
    const relY = y - gridY;
    
    const col = Math.floor(relX / CELL_SIZE);
    const row = Math.floor(relY / CELL_SIZE);
    
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      return { row, col };
    }
    return null;
  }, []);
  
  // Pan gesture for swiping
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      const cell = getCellFromPosition(event.absoluteX, event.absoluteY);
      if (cell) {
        selectCell(cell.row, cell.col);
      }
    })
    .onUpdate((event) => {
      const cell = getCellFromPosition(event.absoluteX, event.absoluteY);
      if (cell) {
        selectCell(cell.row, cell.col);
      }
    })
    .onEnd(() => {
      const { valid, word } = confirmSelection();
      if (valid && word) {
        setLastFoundWord(word);
        playCorrect();
        triggerTap('heavy');
        
        // In hard mode, auto-advance to next question after a delay
        if (mode === 'hard') {
          setTimeout(() => {
            handleNextQuestion();
          }, 1000);
        }
      } else if (selectedCells.length > 0) {
        playWrong();
        triggerTap('light');
        clearSelection();
      }
    });
  
  // Check if cell is selected
  const isCellSelected = (row: number, col: number): boolean => {
    return selectedCells.some(c => c.row === row && c.col === col);
  };
  
  // Check if cell is part of a found word
  const isCellInFoundWord = (row: number, col: number): boolean => {
    return wordPlacements.some(
      p => p.found && p.positions.some(pos => pos.row === row && pos.col === col)
    );
  };
  
  // Format timer
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Render mode selection
  if (showModeSelect) {
    const canEasy = canPlayEasyToday();
    const canHard = canPlayHardToday();
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.modeSelectContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </Pressable>
            <Text style={styles.title}>Word Finder</Text>
            <View style={styles.placeholder} />
          </View>
          
          {/* Game description */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring' }}
            style={styles.descriptionCard}
          >
            <Text style={styles.descriptionEmoji}>🔍</Text>
            <Text style={styles.descriptionTitle}>Find Hidden Words!</Text>
            <Text style={styles.descriptionText}>
              Swipe across the 8×8 grid to find words hidden horizontally, vertically, or diagonally.
            </Text>
          </MotiView>
          
          {/* Easy Mode Card */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 100 }}
          >
            <Pressable
              style={[styles.modeCard, !canEasy && styles.modeCardDisabled]}
              onPress={() => canEasy && handleStartGame('easy')}
              disabled={!canEasy}
            >
              <LinearGradient
                colors={canEasy ? [COLORS.rainbow6, COLORS.rainbow2] : [COLORS.surface, COLORS.backgroundCard]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modeCardGradient}
              >
                <View style={styles.modeCardContent}>
                  <Text style={styles.modeCardEmoji}>🌟</Text>
                  <View style={styles.modeCardText}>
                    <Text style={styles.modeCardTitle}>Easy Mode</Text>
                    <Text style={styles.modeCardDesc}>
                      {canEasy ? 'Find 5 words from the list' : 'Come back tomorrow!'}
                    </Text>
                  </View>
                  {canEasy ? (
                    <View style={styles.xpBadge}>
                      <Text style={styles.xpBadgeText}>+200 XP</Text>
                    </View>
                  ) : (
                    <Ionicons name="lock-closed" size={24} color={COLORS.textMuted} />
                  )}
                </View>
                <View style={styles.modeCardInfo}>
                  <View style={styles.infoItem}>
                    <Ionicons name="time" size={16} color={canEasy ? COLORS.text : COLORS.textMuted} />
                    <Text style={[styles.infoText, !canEasy && styles.infoTextDisabled]}>10 min</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="star" size={16} color={canEasy ? COLORS.accentGold : COLORS.textMuted} />
                    <Text style={[styles.infoText, !canEasy && styles.infoTextDisabled]}>1x daily</Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </MotiView>
          
          {/* Hard Mode Card */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 200 }}
          >
            <Pressable
              style={[styles.modeCard, !canHard && styles.modeCardDisabled]}
              onPress={() => canHard && handleStartGame('hard')}
              disabled={!canHard}
            >
              <LinearGradient
                colors={canHard ? [COLORS.primary, COLORS.primaryDark] : [COLORS.surface, COLORS.backgroundCard]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modeCardGradient}
              >
                <View style={styles.modeCardContent}>
                  <Text style={styles.modeCardEmoji}>🏆</Text>
                  <View style={styles.modeCardText}>
                    <Text style={styles.modeCardTitle}>Hard Mode</Text>
                    <Text style={styles.modeCardDesc}>
                      {canHard ? 'Answer questions to find words' : 'No attempts left today!'}
                    </Text>
                  </View>
                  {canHard ? (
                    <View style={[styles.xpBadge, styles.xpBadgeGold]}>
                      <Text style={styles.xpBadgeText}>+400 XP</Text>
                    </View>
                  ) : (
                    <Ionicons name="lock-closed" size={24} color={COLORS.textMuted} />
                  )}
                </View>
                <View style={styles.modeCardInfo}>
                  <View style={styles.infoItem}>
                    <Ionicons name="time" size={16} color={canHard ? COLORS.text : COLORS.textMuted} />
                    <Text style={[styles.infoText, !canHard && styles.infoTextDisabled]}>10 min</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="bulb" size={16} color={canHard ? COLORS.warning : COLORS.textMuted} />
                    <Text style={[styles.infoText, !canHard && styles.infoTextDisabled]}>Hints: -50% XP</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="reload" size={16} color={canHard ? COLORS.accentGold : COLORS.textMuted} />
                    <Text style={[styles.infoText, !canHard && styles.infoTextDisabled]}>2x daily</Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </MotiView>
        </View>
      </SafeAreaView>
    );
  }
  
  // Render result screen
  if (showResult && result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring' }}
            style={styles.resultCard}
          >
            <Text style={styles.resultEmoji}>
              {result.wordsFound === result.total ? '🎉' : result.wordsFound > 0 ? '👍' : '😕'}
            </Text>
            <Text style={styles.resultTitle}>
              {result.wordsFound === result.total ? 'Perfect!' : result.wordsFound > 0 ? 'Good Job!' : 'Try Again!'}
            </Text>
            
            <View style={styles.resultStats}>
              <View style={styles.resultStatItem}>
                <Text style={styles.resultStatValue}>{result.wordsFound}/{result.total}</Text>
                <Text style={styles.resultStatLabel}>Words Found</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatItem}>
                <Text style={[styles.resultStatValue, styles.xpValue]}>+{result.xpEarned}</Text>
                <Text style={styles.resultStatLabel}>XP Earned</Text>
              </View>
            </View>
            
            <View style={styles.resultButtons}>
              <Pressable style={styles.resultButton} onPress={handlePlayAgain}>
                <Ionicons name="refresh" size={20} color={COLORS.text} />
                <Text style={styles.resultButtonText}>Play Again</Text>
              </Pressable>
              <Pressable 
                style={[styles.resultButton, styles.resultButtonPrimary]} 
                onPress={handleBack}
              >
                <Ionicons name="home" size={20} color={COLORS.text} />
                <Text style={styles.resultButtonText}>Home</Text>
              </Pressable>
            </View>
          </MotiView>
        </View>
      </SafeAreaView>
    );
  }
  
  // Render game screen
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.gameHeader}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </Pressable>
          
          <View style={styles.timerContainer}>
            <Ionicons 
              name="time" 
              size={20} 
              color={timeRemaining < 60 ? COLORS.error : COLORS.text} 
            />
            <Text style={[
              styles.timerText,
              timeRemaining < 60 && styles.timerTextWarning
            ]}>
              {formatTime(timeRemaining)}
            </Text>
          </View>
          
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>
              {mode === 'easy' ? 'EASY' : 'HARD'}
            </Text>
          </View>
        </View>
        
        {/* Question/Word List */}
        {mode === 'hard' && currentQuestion ? (
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={styles.questionCard}
          >
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            {hintText ? (
              <Text style={styles.hintText}>💡 {hintText}</Text>
            ) : (
              <Pressable style={styles.hintButton} onPress={handleUseHint}>
                <Ionicons name="bulb-outline" size={16} color={COLORS.warning} />
                <Text style={styles.hintButtonText}>Use Hint (-50% XP)</Text>
              </Pressable>
            )}
          </MotiView>
        ) : mode === 'easy' && currentWordSet ? (
          <View style={styles.wordListContainer}>
            <Text style={styles.wordListTitle}>{currentWordSet.theme}</Text>
            <View style={styles.wordList}>
              {wordPlacements.map((placement, index) => (
                <MotiView
                  key={placement.word}
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                  }}
                  transition={{ delay: index * 50 }}
                  style={[
                    styles.wordItem,
                    placement.found && styles.wordItemFound
                  ]}
                >
                  <Text style={[
                    styles.wordItemText,
                    placement.found && styles.wordItemTextFound
                  ]}>
                    {placement.word}
                  </Text>
                  {placement.found && (
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  )}
                </MotiView>
              ))}
            </View>
          </View>
        ) : null}
        
        {/* Found word feedback */}
        {lastFoundWord && (
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0 }}
            style={styles.foundWordBadge}
          >
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.foundWordText}>{lastFoundWord} found!</Text>
          </MotiView>
        )}
        
        {/* Grid */}
        <View style={styles.gridWrapper}>
          <GestureDetector gesture={panGesture}>
            <View 
              ref={gridRef}
              style={styles.grid}
              onLayout={(event) => {
                gridRef.current?.measureInWindow((x, y, width, height) => {
                  gridLayoutRef.current = { x, y, width, height };
                });
              }}
            >
              {grid.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.gridRow}>
                  {row.map((letter, colIndex) => {
                    const isSelected = isCellSelected(rowIndex, colIndex);
                    const isFound = isCellInFoundWord(rowIndex, colIndex);
                    
                    return (
                      <MotiView
                        key={`${rowIndex}-${colIndex}`}
                        animate={{
                          scale: isSelected ? 1.1 : 1,
                          backgroundColor: isFound 
                            ? COLORS.success 
                            : isSelected 
                              ? COLORS.primary 
                              : COLORS.backgroundCard,
                        }}
                        transition={{ type: 'timing', duration: 100 }}
                        style={[
                          styles.cell,
                          isSelected && styles.cellSelected,
                          isFound && styles.cellFound,
                        ]}
                      >
                        <Text style={[
                          styles.cellText,
                          (isSelected || isFound) && styles.cellTextHighlight,
                        ]}>
                          {letter}
                        </Text>
                      </MotiView>
                    );
                  })}
                </View>
              ))}
            </View>
          </GestureDetector>
        </View>
        
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {mode === 'easy' 
              ? `${wordPlacements.filter(p => p.found).length}/${wordPlacements.length} words found`
              : `Question ${useWordFinderStore.getState().hardQuestionsAnswered + 1}/5`
            }
          </Text>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Mode Selection
  modeSelectContainer: {
    flex: 1,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  backButton: {
    padding: SPACING.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  descriptionCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  descriptionEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modeCard: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  modeCardDisabled: {
    opacity: 0.7,
  },
  modeCardGradient: {
    padding: SPACING.lg,
  },
  modeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modeCardEmoji: {
    fontSize: 36,
    marginRight: SPACING.md,
  },
  modeCardText: {
    flex: 1,
  },
  modeCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modeCardDesc: {
    fontSize: 13,
    color: COLORS.text + 'CC',
    marginTop: 2,
  },
  xpBadge: {
    backgroundColor: COLORS.success + '30',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  xpBadgeGold: {
    backgroundColor: COLORS.accentGold + '30',
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  modeCardInfo: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.text + 'CC',
  },
  infoTextDisabled: {
    color: COLORS.textMuted,
  },
  
  // Game Header
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  timerTextWarning: {
    color: COLORS.error,
  },
  modeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1,
  },
  
  // Question Card (Hard mode)
  questionCard: {
    backgroundColor: COLORS.backgroundCard,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  hintText: {
    fontSize: 14,
    color: COLORS.warning,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.xs,
  },
  hintButtonText: {
    fontSize: 12,
    color: COLORS.warning,
  },
  
  // Word List (Easy mode)
  wordListContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  wordListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  wordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  wordItemFound: {
    backgroundColor: COLORS.success + '20',
  },
  wordItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  wordItemTextFound: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  
  // Found word feedback
  foundWordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  foundWordText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  
  // Grid
  gridWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: GRID_PADDING,
  },
  grid: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xs,
    ...SHADOWS.md,
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
    margin: 1,
  },
  cellSelected: {
    backgroundColor: COLORS.primary,
  },
  cellFound: {
    backgroundColor: COLORS.success,
  },
  cellText: {
    fontSize: CELL_SIZE * 0.5,
    fontWeight: '700',
    color: COLORS.text,
  },
  cellTextHighlight: {
    color: COLORS.backgroundCard,
  },
  
  // Progress
  progressContainer: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  
  // Result
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  resultCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    ...SHADOWS.lg,
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  resultStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  resultStatItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  resultStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  xpValue: {
    color: COLORS.accentGold,
  },
  resultStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  resultStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.textMuted + '30',
  },
  resultButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  resultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  resultButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  resultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});
