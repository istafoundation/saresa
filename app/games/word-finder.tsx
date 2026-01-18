// Word Finder Game Screen - 8x8 grid word search with swipe mechanics
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, PanResponder, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useSafeNavigation } from '../../utils/useSafeNavigation';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useWordFinderStore, type GameMode, type CellPosition, type WordSet, type HardQuestion } from '../../stores/word-finder-store';
import { useUserActions, useGameStatsActions } from '../../utils/useUserActions';
import { useGameAudio } from '../../utils/sound-manager';
import { useTapFeedback } from '../../utils/useTapFeedback';
import { useChildAuth } from '../../utils/childAuth';
import { useWordFinderSets, useWordFinderHardQuestions } from '../../utils/content-hooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = 8;
const GRID_PADDING = SPACING.md;
// Circular cells with gaps like Android pattern lock
const CELL_GAP = 8;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_PADDING * 2 - CELL_GAP * (GRID_SIZE + 1)) / GRID_SIZE);
const GRID_WIDTH = CELL_SIZE * GRID_SIZE + CELL_GAP * (GRID_SIZE + 1);

export default function WordFinderScreen() {
  const { safeBack, router } = useSafeNavigation();
  const { mode: urlMode } = useLocalSearchParams<{ mode?: string }>();
  const { triggerTap } = useTapFeedback();
  const { playCorrect, playWrong, playWin, startMusic, stopMusic } = useGameAudio();
  const { addXP } = useUserActions();
  const { updateWordFinderStats } = useGameStatsActions();
  
  // OTA Content - fetch word sets and hard questions
  const { content: wordSets, status: wordSetsStatus } = useWordFinderSets();
  const { content: hardQuestions, status: hardQuestionsStatus } = useWordFinderHardQuestions();
  
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
    startEasyGame,
    startHardGame,
    selectCell,
    confirmSelection,
    clearSelection,
    useHint,
    nextHardQuestion,
    skipHardQuestion,
    updateTimer,
    finishGame,
    resetGame,
  } = useWordFinderStore();
  
  // Get auth token for Convex queries
  const { token } = useChildAuth();
  
  // CONVEX IS SOURCE OF TRUTH for daily play limits
  const canPlayEasyFromServer = useQuery(api.gameStats.canPlayWordFinder,
    token ? { token, mode: 'easy' as const } : 'skip'
  );
  const canPlayHardFromServer = useQuery(api.gameStats.canPlayWordFinder,
    token ? { token, mode: 'hard' as const } : 'skip'
  );
  
  // Fall back to true while loading (will be blocked by server check anyway)
  const canPlayEasyToday = canPlayEasyFromServer ?? true;
  const canPlayHardToday = canPlayHardFromServer ?? true;
  
  // If mode is passed in URL, skip mode selection
  const [showModeSelect, setShowModeSelect] = useState(!urlMode);
  const [showResult, setShowResult] = useState(false);
  const [lastFoundWord, setLastFoundWord] = useState<string | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [result, setResult] = useState<{ xpEarned: number; wordsFound: number; total: number } | null>(null);
  
  // Local selection state for smooth updates
  const [localSelection, setLocalSelection] = useState<CellPosition[]>([]);
  const selectionDirectionRef = useRef<{ dr: number; dc: number } | null>(null);
  
  // Movement tracking for angle-based direction detection
  const firstCellRef = useRef<CellPosition | null>(null);
  const firstCellCenterRef = useRef<{ x: number; y: number } | null>(null);
  const directionLockedRef = useRef(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridLayoutRef = useRef<{ x: number; y: number } | null>(null);
  const prevUrlModeRef = useRef<string | undefined>(undefined);
  
  // Handle URL mode changes - reset and start game in one effect
  useEffect(() => {
    if (urlMode) {
      const modeChanged = urlMode !== prevUrlModeRef.current;
      
      if (modeChanged) {
        // Reset store game state first
        resetGame();
        prevUrlModeRef.current = urlMode;
        
        // Reset all local state for fresh start
        setShowModeSelect(false);
        setShowResult(false);
        setResult(null);
        setLastFoundWord(null);
        setHintText(null);
        setLocalSelection([]);
      }
      
      // Use direct store access to get current state (avoids stale closure)
      const currentState = useWordFinderStore.getState();
      if (currentState.gameState === 'idle') {
        const selectedMode = urlMode as GameMode;
        if (selectedMode === 'easy' && canPlayEasyToday) {
          startEasyGame(wordSets as WordSet[]);
        } else if (selectedMode === 'hard' && canPlayHardToday) {
          startHardGame(hardQuestions as HardQuestion[]);
        } else {
          // Can't play - go back to games tab
          safeBack();
        }
      }
    } else if (prevUrlModeRef.current !== undefined) {
      // Navigated without mode param - show mode selection
      prevUrlModeRef.current = undefined;
      setShowModeSelect(true);
    }
  }, [urlMode, canPlayEasyToday, canPlayHardToday, startEasyGame, startHardGame, wordSets, hardQuestions, resetGame, router]);
  
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
  
  // Background music effect
  useEffect(() => {
    if (gameState === 'playing') {
      startMusic();
    } else if (gameState === 'finished') {
      stopMusic();
    }
    
    return () => {
      stopMusic();
    };
  }, [gameState, startMusic, stopMusic]);
  
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
  
  const handleGameEnd = async () => {
    const gameResult = finishGame();
    setResult(gameResult);
    setShowResult(true);
    
    // ALWAYS Save stats to Convex to record the attempt (even if 0 XP)
    // This ensures daily limits work correctly
    await updateWordFinderStats({
      mode: mode,
      wordsFound: gameResult.wordsFound,
      xpEarned: gameResult.xpEarned,
      correctAnswers: mode === 'hard' ? gameResult.wordsFound : undefined,
    });

    if (gameResult.xpEarned > 0) {
      await addXP(gameResult.xpEarned);
      playWin();
    }
  };
  
  const handleStartGame = (selectedMode: GameMode) => {
    triggerTap('medium');
    let success = false;
    if (selectedMode === 'easy') {
      success = startEasyGame(wordSets as WordSet[]);
    } else {
      success = startHardGame(hardQuestions as HardQuestion[]);
    }
    if (success) {
      setShowModeSelect(false);
      setShowResult(false);
      setResult(null);
      setLastFoundWord(null);
      setHintText(null);
      setLocalSelection([]);
    }
  };
  
  const handleBack = () => {
    triggerTap('light');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    stopMusic();
    resetGame();
    safeBack();
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
  
  const handleNextQuestion = useCallback(() => {
    triggerTap('medium');
    setLastFoundWord(null);
    setHintText(null);
    const hasMore = nextHardQuestion(hardQuestions as HardQuestion[]);
    if (!hasMore) {
      handleGameEnd();
    }
  }, [triggerTap, nextHardQuestion, hardQuestions]);
  
  const handleSkipQuestion = useCallback(() => {
    triggerTap('light');
    setLastFoundWord(null);
    setHintText(null);
    setLocalSelection([]);
    const hasMore = skipHardQuestion(hardQuestions as HardQuestion[]);
    if (!hasMore) {
      handleGameEnd();
    }
  }, [triggerTap, skipHardQuestion, hardQuestions]);
  
  // Helper functions
  const isAdjacent = (cell1: CellPosition, cell2: CellPosition): boolean => {
    const rowDiff = Math.abs(cell1.row - cell2.row);
    const colDiff = Math.abs(cell1.col - cell2.col);
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
  };
  
  const getDirection = (from: CellPosition, to: CellPosition): { dr: number; dc: number } => {
    return {
      dr: Math.sign(to.row - from.row),
      dc: Math.sign(to.col - from.col),
    };
  };
  
  
  const isCellInList = (list: CellPosition[], row: number, col: number): number => {
    return list.findIndex(c => c.row === row && c.col === col);
  };
  
  // Cell stride = cell size + gap
  const CELL_STRIDE = CELL_SIZE + CELL_GAP;
  
  // Get cell center position in grid coordinates
  const getCellCenter = useCallback((cell: CellPosition): { x: number; y: number } => {
    return {
      x: CELL_GAP + cell.col * CELL_STRIDE + CELL_SIZE / 2,
      y: CELL_GAP + cell.row * CELL_STRIDE + CELL_SIZE / 2,
    };
  }, []);
  
  // Get cell from grid-relative coordinates
  const getCellFromRelCoords = useCallback((relX: number, relY: number): CellPosition | null => {
    const col = Math.floor((relX - CELL_GAP) / CELL_STRIDE);
    const row = Math.floor((relY - CELL_GAP) / CELL_STRIDE);
    
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      return { row, col };
    }
    return null;
  }, []);
  
  // Convert angle (radians) to one of 8 directions
  const angleToDirection = useCallback((angle: number): { dr: number; dc: number } => {
    // Normalize angle to 0-360
    let degrees = (angle * 180 / Math.PI + 360) % 360;
    
    // Snap to nearest 45° and get direction
    // 0° = right, 45° = down-right, 90° = down, etc.
    const sector = Math.round(degrees / 45) % 8;
    
    const directions: { dr: number; dc: number }[] = [
      { dr: 0, dc: 1 },   // 0° - right
      { dr: 1, dc: 1 },   // 45° - down-right
      { dr: 1, dc: 0 },   // 90° - down
      { dr: 1, dc: -1 },  // 135° - down-left
      { dr: 0, dc: -1 },  // 180° - left
      { dr: -1, dc: -1 }, // 225° - up-left
      { dr: -1, dc: 0 },  // 270° - up
      { dr: -1, dc: 1 },  // 315° - up-right
    ];
    
    return directions[sector];
  }, []);
  
  // Get all cells from start to current position in locked direction
  const getCellsInDirection = useCallback((
    startCell: CellPosition, 
    direction: { dr: number; dc: number },
    endCell: CellPosition
  ): CellPosition[] => {
    const cells: CellPosition[] = [startCell];
    let current = { ...startCell };
    
    // Add cells until we reach or pass the end cell
    while (cells.length < 20) { // Safety limit
      current = {
        row: current.row + direction.dr,
        col: current.col + direction.dc,
      };
      
      // Check bounds
      if (current.row < 0 || current.row >= GRID_SIZE ||
          current.col < 0 || current.col >= GRID_SIZE) {
        break;
      }
      
      cells.push({ ...current });
      
      // Check if we've reached end position
      if (current.row === endCell.row && current.col === endCell.col) {
        break;
      }
      
      // Check if we've passed end position
      const distToStart = Math.hypot(
        current.row - startCell.row,
        current.col - startCell.col
      );
      const endDistToStart = Math.hypot(
        endCell.row - startCell.row,
        endCell.col - startCell.col
      );
      
      if (distToStart >= endDistToStart) {
        break;
      }
    }
    
    return cells;
  }, []);
  
  // Handle selection end
  const handleSelectionEnd = useCallback((selection: CellPosition[]) => {
    if (selection.length === 0) return;
    
    // Sync to store
    clearSelection();
    selection.forEach(c => selectCell(c.row, c.col));
    
    const { valid, word } = confirmSelection();
    if (valid && word) {
      setLastFoundWord(word);
      playCorrect();
      triggerTap('heavy');
      
      if (mode === 'hard') {
        setTimeout(() => {
          handleNextQuestion();
        }, 1000);
      }
    } else if (selection.length > 0) {
      playWrong();
      triggerTap('light');
      clearSelection();
    }
    
    setLocalSelection([]);
    selectionDirectionRef.current = null;
    firstCellRef.current = null;
    firstCellCenterRef.current = null;
    directionLockedRef.current = false;
  }, [confirmSelection, playCorrect, playWrong, triggerTap, clearSelection, selectCell, mode, handleNextQuestion]);
  
  // Store ref for latest localSelection (for panResponder closure)
  const localSelectionRef = useRef<CellPosition[]>([]);
  useEffect(() => {
    localSelectionRef.current = localSelection;
  }, [localSelection]);
  
  // Movement threshold to lock direction (as fraction of cell stride)
  const DIRECTION_LOCK_THRESHOLD = CELL_STRIDE * 0.4;
  
  // PanResponder with angle-based direction detection
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    
    onPanResponderGrant: (evt) => {
      if (!gridLayoutRef.current) return;
      
      const relX = evt.nativeEvent.pageX - gridLayoutRef.current.x;
      const relY = evt.nativeEvent.pageY - gridLayoutRef.current.y;
      
      const cell = getCellFromRelCoords(relX, relY);
      if (cell) {
        // Initialize first cell tracking
        firstCellRef.current = cell;
        firstCellCenterRef.current = getCellCenter(cell);
        directionLockedRef.current = false;
        selectionDirectionRef.current = null;
        
        setLocalSelection([cell]);
      }
    },
    
    onPanResponderMove: (evt) => {
      if (!gridLayoutRef.current || !firstCellRef.current || !firstCellCenterRef.current) return;
      
      const relX = evt.nativeEvent.pageX - gridLayoutRef.current.x;
      const relY = evt.nativeEvent.pageY - gridLayoutRef.current.y;
      
      const firstCenter = firstCellCenterRef.current;
      const dx = relX - firstCenter.x;
      const dy = relY - firstCenter.y;
      const distance = Math.hypot(dx, dy);
      
      // If direction not locked yet, check if we've moved enough to lock it
      if (!directionLockedRef.current) {
        if (distance > DIRECTION_LOCK_THRESHOLD) {
          // Calculate angle and lock direction
          const angle = Math.atan2(dy, dx);
          const direction = angleToDirection(angle);
          
          selectionDirectionRef.current = direction;
          directionLockedRef.current = true;
          
          // Start with first cell only
          setLocalSelection([firstCellRef.current]);
        }
        return; // Don't select more cells until direction is locked
      }
      
      // Direction is locked - calculate how many cells along direction
      const dir = selectionDirectionRef.current;
      if (!dir) return;
      
      // Project movement onto direction vector
      const dirLength = Math.hypot(dir.dr, dir.dc);
      const normalizedDr = dir.dr / dirLength;
      const normalizedDc = dir.dc / dirLength;
      
      // Calculate movement in grid cell units
      const moveInDirRow = dy / CELL_STRIDE;
      const moveInDirCol = dx / CELL_STRIDE;
      
      // Project onto direction
      const projectedMove = moveInDirRow * normalizedDr + moveInDirCol * normalizedDc;
      
      // Calculate number of cells (including first)
      const numCells = Math.max(1, Math.floor(projectedMove) + 1);
      
      // Generate cells along direction
      const newSelection: CellPosition[] = [];
      let current = { ...firstCellRef.current };
      newSelection.push({ ...current });
      
      for (let i = 1; i < numCells && i < 10; i++) {
        current = {
          row: current.row + dir.dr,
          col: current.col + dir.dc,
        };
        
        // Check bounds
        if (current.row < 0 || current.row >= GRID_SIZE ||
            current.col < 0 || current.col >= GRID_SIZE) {
          break;
        }
        
        newSelection.push({ ...current });
      }
      
      setLocalSelection(newSelection);
    },
    
    onPanResponderRelease: () => {
      handleSelectionEnd(localSelectionRef.current);
    },
    
    onPanResponderTerminate: () => {
      setLocalSelection([]);
      selectionDirectionRef.current = null;
      firstCellRef.current = null;
      firstCellCenterRef.current = null;
      directionLockedRef.current = false;
    },
  }), [getCellFromRelCoords, getCellCenter, angleToDirection, handleSelectionEnd]);
  
  // Check if cell is selected
  const isCellSelected = useCallback((row: number, col: number): boolean => {
    return localSelection.some(c => c.row === row && c.col === col) ||
           selectedCells.some(c => c.row === row && c.col === col);
  }, [localSelection, selectedCells]);
  
  // Check if cell is part of a found word
  const isCellInFoundWord = useCallback((row: number, col: number): boolean => {
    return wordPlacements.some(
      p => p.found && p.positions.some(pos => pos.row === row && pos.col === col)
    );
  }, [wordPlacements]);
  
  // Format timer
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Render mode selection
  if (showModeSelect) {
    const canEasy = canPlayEasyToday;
    const canHard = canPlayHardToday;
    
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
              Swipe across the grid to find words. Words can be horizontal →, vertical ↓, or diagonal ↘
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
                      {canEasy ? 'Find 5 words from the list' : 'No attempts left today!'}
                    </Text>
                  </View>
                  {canEasy ? (
                    <View style={styles.xpBadge}>
                      <Text style={styles.xpBadgeText}>+50 XP</Text>
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
                    <Text style={[styles.infoText, !canEasy && styles.infoTextDisabled]}>2x daily</Text>
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
                      {canHard ? 'Answer questions to find words' : 'Come back tomorrow!'}
                    </Text>
                  </View>
                  {canHard ? (
                    <View style={[styles.xpBadge, styles.xpBadgeGold]}>
                      <Text style={styles.xpBadgeText}>+200 XP</Text>
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
                    <Text style={[styles.infoText, !canHard && styles.infoTextDisabled]}>1x daily</Text>
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
              {mode === 'easy' && (
                <Pressable style={styles.resultButton} onPress={handlePlayAgain}>
                  <Ionicons name="refresh" size={20} color={COLORS.text} />
                  <Text style={styles.resultButtonText}>Play Again</Text>
                </Pressable>
              )}
              {mode === 'hard' && (
                <View style={styles.resultInfoBadge}>
                  <Ionicons name="time" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.resultInfoText}>Come back tomorrow!</Text>
                </View>
              )}
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
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            <View style={styles.questionCardActions}>
              {hintText ? (
                <Text style={styles.hintText}>💡 {hintText}</Text>
              ) : (
                <Pressable style={styles.hintButton} onPress={handleUseHint}>
                  <Ionicons name="bulb-outline" size={16} color={COLORS.warning} />
                  <Text style={styles.hintButtonText}>Use Hint (-50% XP)</Text>
                </Pressable>
              )}
              <Pressable style={styles.skipQuestionButton} onPress={handleSkipQuestion}>
                <Ionicons name="play-skip-forward" size={16} color={COLORS.textMuted} />
                <Text style={styles.skipQuestionButtonText}>Skip</Text>
              </Pressable>
            </View>
          </View>
        ) : mode === 'easy' && currentWordSet ? (
          <View style={styles.wordListContainer}>
            <Text style={styles.wordListTitle}>{currentWordSet.theme}</Text>
            <View style={styles.wordList}>
              {wordPlacements.map((placement) => (
                <View
                  key={placement.word}
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
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  )}
                </View>
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
          <View 
            style={styles.grid}
            onLayout={(event) => {
              event.target.measure((x, y, width, height, pageX, pageY) => {
                gridLayoutRef.current = { x: pageX, y: pageY };
              });
            }}
            {...panResponder.panHandlers}
          >
            
            {grid.map((row, rowIndex) => (
              <View key={rowIndex} style={[styles.gridRow, { marginTop: rowIndex === 0 ? CELL_GAP : 0 }]}>
                {row.map((letter, colIndex) => {
                  const isSelected = isCellSelected(rowIndex, colIndex);
                  const isFound = isCellInFoundWord(rowIndex, colIndex);
                  
                  return (
                    <View
                      key={`${rowIndex}-${colIndex}`}
                      style={[
                        styles.cell,
                        { marginLeft: colIndex === 0 ? CELL_GAP : 0, marginRight: CELL_GAP, marginBottom: CELL_GAP },
                        isSelected && styles.cellSelected,
                        isFound && styles.cellFound,
                      ]}
                    >
                      <Text style={[
                        styles.cellText,
                        isSelected && styles.cellTextSelected,
                        isFound && styles.cellTextFound,
                      ]}>
                        {letter}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          
          {/* Direction hint */}
          <View style={styles.directionHint}>
            <Text style={styles.directionHintText}>
              Swipe: → ↓ ↘
            </Text>
          </View>
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
    paddingTop: SPACING.xs,
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
    marginBottom: SPACING.sm,
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
  questionCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  skipQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  skipQuestionButtonText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  
  // Word List (Easy mode)
  wordListContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  wordListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  wordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  wordItemFound: {
    backgroundColor: COLORS.success + '20',
  },
  wordItemText: {
    fontSize: 12,
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
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
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
    paddingHorizontal: GRID_PADDING,
  },
  grid: {
    width: GRID_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: CELL_SIZE / 2, // Circular!
    ...SHADOWS.sm,
  },
  cellSelected: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 1.05 }],
  },
  cellFound: {
    backgroundColor: COLORS.success,
  },
  cellText: {
    fontSize: CELL_SIZE * 0.45,
    fontWeight: '700',
    color: COLORS.text,
  },
  cellTextSelected: {
    color: '#fff',
  },
  cellTextFound: {
    color: '#fff',
  },
  
  // Direction hint
  directionHint: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.full,
  },
  directionHintText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  
  // Progress
  progressContainer: {
    paddingVertical: SPACING.sm,
    paddingBottom: 40,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  
  // Result Screen
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
    maxWidth: 340,
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
    paddingHorizontal: SPACING.lg,
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
    backgroundColor: COLORS.surface,
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
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  resultButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  resultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  resultInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  resultInfoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
