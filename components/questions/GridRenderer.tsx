// Grid Renderer - Word search grid component (Word Finder style)
// Simplified version for level-based gameplay
import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = 8;
const GRID_PADDING = SPACING.md;
const CELL_GAP = 6;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_PADDING * 2 - CELL_GAP * (GRID_SIZE + 1)) / GRID_SIZE);
const CELL_STRIDE = CELL_SIZE + CELL_GAP;
const GRID_WIDTH = CELL_SIZE * GRID_SIZE + CELL_GAP * (GRID_SIZE + 1);

interface CellPosition {
  row: number;
  col: number;
}

interface GridRendererProps {
  question: string;
  data: {
    solution: string;
  };
  onAnswer: (isCorrect: boolean) => void;
  onFeedback?: (isCorrect: boolean) => void;
  disabled?: boolean;
}

// Generate a grid with the word hidden in it
function generateGrid(word: string): { grid: string[][]; positions: CellPosition[] } {
  const grid: string[][] = Array(GRID_SIZE).fill(null).map(() => 
    Array(GRID_SIZE).fill('')
  );
  
  const directions = [
    { dr: 0, dc: 1 },   // right
    { dr: 1, dc: 0 },   // down
    { dr: 1, dc: 1 },   // diagonal down-right
    { dr: 0, dc: -1 },  // left
    { dr: -1, dc: 0 },  // up
    { dr: -1, dc: -1 }, // diagonal up-left
    { dr: 1, dc: -1 },  // diagonal down-left
    { dr: -1, dc: 1 },  // diagonal up-right
  ];
  
  const upperWord = word.toUpperCase();
  let placed = false;
  let positions: CellPosition[] = [];
  
  // Try to place the word
  for (let attempts = 0; attempts < 100 && !placed; attempts++) {
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const startRow = Math.floor(Math.random() * GRID_SIZE);
    const startCol = Math.floor(Math.random() * GRID_SIZE);
    
    // Check if word fits
    const endRow = startRow + dir.dr * (upperWord.length - 1);
    const endCol = startCol + dir.dc * (upperWord.length - 1);
    
    if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) {
      continue;
    }
    
    // Place word
    const tempPositions: CellPosition[] = [];
    let canPlace = true;
    
    for (let i = 0; i < upperWord.length; i++) {
      const r = startRow + dir.dr * i;
      const c = startCol + dir.dc * i;
      
      if (grid[r][c] !== '' && grid[r][c] !== upperWord[i]) {
        canPlace = false;
        break;
      }
      tempPositions.push({ row: r, col: c });
    }
    
    if (canPlace) {
      for (let i = 0; i < upperWord.length; i++) {
        grid[tempPositions[i].row][tempPositions[i].col] = upperWord[i];
      }
      positions = tempPositions;
      placed = true;
    }
  }
  
  // Fill remaining cells with random letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }
  
  return { grid, positions };
}

export default function GridRenderer({
  question,
  data,
  onAnswer,
  onFeedback,
  disabled = false,
}: GridRendererProps) {
  // Generate grid once
  const { grid, positions: solutionPositions } = useMemo(() => {
    return generateGrid(data.solution);
  }, [data.solution]);
  
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [pendingSelection, setPendingSelection] = useState<CellPosition[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const gridLayoutRef = useRef<{ x: number; y: number } | null>(null);
  const firstCellRef = useRef<CellPosition | null>(null);
  const directionRef = useRef<{ dr: number; dc: number } | null>(null);
  
  const getCellFromCoords = useCallback((relX: number, relY: number): CellPosition | null => {
    const col = Math.floor((relX - CELL_GAP) / CELL_STRIDE);
    const row = Math.floor((relY - CELL_GAP) / CELL_STRIDE);
    
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      return { row, col };
    }
    return null;
  }, []);
  
  const angleToDirection = useCallback((angle: number): { dr: number; dc: number } => {
    let degrees = (angle * 180 / Math.PI + 360) % 360;
    const sector = Math.round(degrees / 45) % 8;
    
    const directions = [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 1 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: -1 },
      { dr: 0, dc: -1 },
      { dr: -1, dc: -1 },
      { dr: -1, dc: 0 },
      { dr: -1, dc: 1 },
    ];
    
    return directions[sector];
  }, []);
  
  const checkAnswer = useCallback((selection: CellPosition[]) => {
    if (selection.length !== solutionPositions.length) return false;
    
    // Check if selection matches solution (in order or reverse)
    const matches = selection.every((cell, i) => 
      cell.row === solutionPositions[i].row && cell.col === solutionPositions[i].col
    );
    
    const reversedPositions = [...solutionPositions].reverse();
    const matchesReverse = selection.every((cell, i) => 
      cell.row === reversedPositions[i].row && cell.col === reversedPositions[i].col
    );
    
    return matches || matchesReverse;
  }, [solutionPositions]);
  
  // When user finishes swiping, store selection as pending (not submitted)
  const handleSelectionEnd = useCallback((selection: CellPosition[]) => {
    if (selection.length === 0 || showResult) return;
    setPendingSelection(selection);
  }, [showResult]);
  
  // Submit handler - explicitly submits the selected answer
  const handleSubmit = useCallback(() => {
    if (pendingSelection.length === 0 || showResult) return;
    
    const correct = checkAnswer(pendingSelection);
    setIsCorrect(correct);
    setSelectedCells(pendingSelection);
    setShowResult(true);
    
    if (onFeedback) {
      onFeedback(correct);
    }
    
    // Immediately notify parent - parent controls timing now
    onAnswer(correct);
  }, [pendingSelection, showResult, checkAnswer, onFeedback, onAnswer]);
  
  const selectionRef = useRef<CellPosition[]>([]);
  useEffect(() => {
    selectionRef.current = selectedCells;
  }, [selectedCells]);
  
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !showResult,
    onMoveShouldSetPanResponder: () => !disabled && !showResult,
    
    onPanResponderGrant: (evt) => {
      if (!gridLayoutRef.current) return;
      
      const relX = evt.nativeEvent.pageX - gridLayoutRef.current.x;
      const relY = evt.nativeEvent.pageY - gridLayoutRef.current.y;
      
      const cell = getCellFromCoords(relX, relY);
      if (cell) {
        firstCellRef.current = cell;
        directionRef.current = null;
        setSelectedCells([cell]);
      }
    },
    
    onPanResponderMove: (evt) => {
      if (!gridLayoutRef.current || !firstCellRef.current) return;
      
      const relX = evt.nativeEvent.pageX - gridLayoutRef.current.x;
      const relY = evt.nativeEvent.pageY - gridLayoutRef.current.y;
      
      const firstCenter = {
        x: CELL_GAP + firstCellRef.current.col * CELL_STRIDE + CELL_SIZE / 2,
        y: CELL_GAP + firstCellRef.current.row * CELL_STRIDE + CELL_SIZE / 2,
      };
      
      const dx = relX - firstCenter.x;
      const dy = relY - firstCenter.y;
      const distance = Math.hypot(dx, dy);
      
      if (!directionRef.current && distance > CELL_STRIDE * 0.4) {
        const angle = Math.atan2(dy, dx);
        directionRef.current = angleToDirection(angle);
      }
      
      if (!directionRef.current) return;
      
      const dir = directionRef.current;
      const moveInDirRow = dy / CELL_STRIDE;
      const moveInDirCol = dx / CELL_STRIDE;
      const dirLength = Math.hypot(dir.dr, dir.dc);
      const projectedMove = (moveInDirRow * dir.dr + moveInDirCol * dir.dc) / dirLength;
      const numCells = Math.max(1, Math.floor(projectedMove) + 1);
      
      const newSelection: CellPosition[] = [];
      let current = { ...firstCellRef.current };
      newSelection.push({ ...current });
      
      for (let i = 1; i < numCells && i < 10; i++) {
        current = {
          row: current.row + dir.dr,
          col: current.col + dir.dc,
        };
        
        if (current.row < 0 || current.row >= GRID_SIZE ||
            current.col < 0 || current.col >= GRID_SIZE) {
          break;
        }
        
        newSelection.push({ ...current });
      }
      
      setSelectedCells(newSelection);
      setPendingSelection(newSelection);
    },
    
    onPanResponderRelease: () => {
      handleSelectionEnd(selectionRef.current);
    },
    
    onPanResponderTerminate: () => {
      if (!showResult) {
        setSelectedCells([]);
      }
      firstCellRef.current = null;
      directionRef.current = null;
    },
  }), [disabled, showResult, getCellFromCoords, angleToDirection, handleSelectionEnd]);
  
  const isCellSelected = (row: number, col: number) => {
    return selectedCells.some(c => c.row === row && c.col === col);
  };
  
  const isCellSolution = (row: number, col: number) => {
    return solutionPositions.some(c => c.row === row && c.col === col);
  };
  
  const getCellStyle = (row: number, col: number) => {
    const selected = isCellSelected(row, col);
    const solution = isCellSolution(row, col);
    
    if (showResult) {
      if (solution) {
        return isCorrect ? styles.cellCorrect : styles.cellSolution;
      }
      if (selected && !solution) {
        return styles.cellWrong;
      }
    } else if (selected) {
      return styles.cellSelected;
    }
    
    return styles.cell;
  };
  
  return (
    <View style={styles.container}>
      {/* Question */}
      <Text style={styles.question}>{question}</Text>
      
      {/* Instructions */}
      <Text style={styles.instructions}>Swipe to select the word</Text>
      
      {/* Grid */}
      <View 
        style={styles.gridContainer}
        onLayout={(e) => {
          e.target.measure((x, y, width, height, pageX, pageY) => {
            gridLayoutRef.current = { x: pageX, y: pageY };
          });
        }}
        {...panResponder.panHandlers}
      >
        {grid.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((letter, colIndex) => (
              <MotiView
                key={`${rowIndex}-${colIndex}`}
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', delay: (rowIndex * GRID_SIZE + colIndex) * 10 }}
                style={getCellStyle(rowIndex, colIndex)}
              >
                <Text style={[
                  styles.cellText,
                  (isCellSelected(rowIndex, colIndex) || (showResult && isCellSolution(rowIndex, colIndex))) 
                    && styles.cellTextSelected
                ]}>
                  {letter}
                </Text>
              </MotiView>
            ))}
          </View>
        ))}
      </View>
      
      {/* Submit Button - appears when selection exists but not yet submitted */}
      {pendingSelection.length > 0 && !showResult && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.submitContainer}
        >
          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitPressed,
            ]}
          >
            <Text style={styles.submitText}>Submit Answer</Text>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.text} />
          </Pressable>
        </MotiView>
      )}
      
      {/* Result */}
      {showResult && (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.resultContainer}
        >
          {isCorrect ? (
            <View style={styles.resultCorrect}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.resultTextCorrect}>
                Correct! The word was "{data.solution.toUpperCase()}"
              </Text>
            </View>
          ) : (
            <View style={styles.resultWrong}>
              <Ionicons name="close-circle" size={24} color={COLORS.error} />
              <Text style={styles.resultTextWrong}>
                The word was "{data.solution.toUpperCase()}" (highlighted in green)
              </Text>
            </View>
          )}
        </MotiView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
    alignItems: 'center',
  },
  question: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    lineHeight: 28,
  },
  instructions: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  gridContainer: {
    width: GRID_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: CELL_GAP / 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_GAP / 2,
    borderRadius: CELL_SIZE / 2,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_GAP / 2,
    borderRadius: CELL_SIZE / 2,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellCorrect: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_GAP / 2,
    borderRadius: CELL_SIZE / 2,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSolution: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_GAP / 2,
    borderRadius: CELL_SIZE / 2,
    backgroundColor: COLORS.success + '80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellWrong: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_GAP / 2,
    borderRadius: CELL_SIZE / 2,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cellTextSelected: {
    color: '#FFFFFF',
  },
  resultContainer: {
    marginTop: SPACING.lg,
    width: '100%',
  },
  resultCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.success + '20',
    borderRadius: BORDER_RADIUS.md,
  },
  resultWrong: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.error + '20',
    borderRadius: BORDER_RADIUS.md,
  },
  resultTextCorrect: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success,
    flex: 1,
  },
  resultTextWrong: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
    flex: 1,
    lineHeight: 20,
  },
  submitContainer: {
    marginTop: SPACING.lg,
    width: '100%',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  submitPressed: {
    opacity: 0.9,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});
