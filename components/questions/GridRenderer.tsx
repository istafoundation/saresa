// Grid Renderer - Word search grid component (Word Finder style)
// Simplified version for level-based gameplay
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Pressable,
  Platform,
} from "react-native";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, BORDER_RADIUS } from "../../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_SIZE = 8;
const GRID_PADDING = SPACING.md;
const CELL_GAP = 6;
const CELL_SIZE = Math.floor(
  (SCREEN_WIDTH - GRID_PADDING * 2 - CELL_GAP * (GRID_SIZE + 1)) / GRID_SIZE,
);
const CELL_STRIDE = CELL_SIZE + CELL_GAP;
const GRID_WIDTH = CELL_SIZE * GRID_SIZE + CELL_GAP * (GRID_SIZE + 1);

interface CellPosition {
  row: number;
  col: number;
}

interface GridRendererProps {
  question: string;
  data: {
    solution: string | string[]; // Can now be single word or array of words
  };
  onAnswer: (isCorrect: boolean) => void;
  onFeedback?: (isCorrect: boolean) => void;
  disabled?: boolean;
  showAnswer?: boolean;
}

// Generate a grid with the word(s) hidden in it
function generateGrid(solution: string | string[]): {
  grid: string[][];
  placements: { word: string; found: boolean; positions: CellPosition[] }[];
} {
  const grid: string[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(""));

  const words = Array.isArray(solution) ? solution : [solution];
  // Normalize words: uppercase and remove non-letters
  const normalizedWords = words.map((w) =>
    w.toUpperCase().replace(/[^A-Z]/g, ""),
  );

  const directions = [
    { dr: 0, dc: 1 }, // right
    { dr: 1, dc: 0 }, // down
    { dr: 1, dc: 1 }, // diagonal down-right
  ];

  const placements: {
    word: string;
    found: boolean;
    positions: CellPosition[];
  }[] = [];

  // Try to place each word
  for (const word of normalizedWords) {
    let placed = false;

    // Try random positions 100 times before giving up on a word
    for (let attempts = 0; attempts < 100 && !placed; attempts++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const startRow = Math.floor(Math.random() * GRID_SIZE);
      const startCol = Math.floor(Math.random() * GRID_SIZE);

      // Check if word fits
      const endRow = startRow + dir.dr * (word.length - 1);
      const endCol = startCol + dir.dc * (word.length - 1);

      if (
        endRow < 0 ||
        endRow >= GRID_SIZE ||
        endCol < 0 ||
        endCol >= GRID_SIZE
      ) {
        continue;
      }

      // Check collisions
      const tempPositions: CellPosition[] = [];
      let canPlace = true;

      for (let i = 0; i < word.length; i++) {
        const r = startRow + dir.dr * i;
        const c = startCol + dir.dc * i;

        // Overlap is allowed if letter is same. Empty is obviously allowed.
        if (grid[r][c] !== "" && grid[r][c] !== word[i]) {
          canPlace = false;
          break;
        }
        tempPositions.push({ row: r, col: c });
      }

      if (canPlace) {
        // Place word
        for (let i = 0; i < word.length; i++) {
          grid[tempPositions[i].row][tempPositions[i].col] = word[i];
        }
        placements.push({
          word,
          found: false,
          positions: tempPositions,
        });
        placed = true;
      }
    }
    // If not placed, we skip it (fallback). Ideally we should retry grid gen, but for this simple version it's okay.
  }

  // Fill remaining cells with random letters
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  return { grid, placements };
}

export default function GridRenderer({
  question,
  data,
  onAnswer,
  onFeedback,
  disabled = false,
  showAnswer = false,
}: GridRendererProps) {
  // Generate grid once
  const { grid, placements: initialPlacements } = useMemo(() => {
    return generateGrid(data.solution);
  }, [data.solution]);

  const [placements, setPlacements] = useState(initialPlacements);
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [pendingSelection, setPendingSelection] = useState<CellPosition[]>([]);

  const [showResult, setShowResult] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);

  // Update placements when data.solution changes (e.g. new game)
  useEffect(() => {
    setPlacements(initialPlacements);
    setSelectedCells([]);
    setPendingSelection([]);
    setShowResult(false);
    setAllCorrect(false);
  }, [initialPlacements]);

  // Handle showAnswer prop
  useEffect(() => {
    if (showAnswer) {
      // Mark all as found and show result
      setPlacements(prev => prev.map(p => ({ ...p, found: true })));
      setAllCorrect(false); // It's not "correct" correct, but we show the solution
      setShowResult(true);
    }
  }, [showAnswer]);

  const gridLayoutRef = useRef<{ x: number; y: number } | null>(null);
  const firstCellRef = useRef<CellPosition | null>(null);
  const directionRef = useRef<{ dr: number; dc: number } | null>(null);

  const getCellFromCoords = useCallback(
    (relX: number, relY: number): CellPosition | null => {
      const col = Math.floor((relX - CELL_GAP) / CELL_STRIDE);
      const row = Math.floor((relY - CELL_GAP) / CELL_STRIDE);

      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        return { row, col };
      }
      return null;
    },
    [],
  );

  const angleToDirection = useCallback(
    (angle: number): { dr: number; dc: number } => {
      let degrees = ((angle * 180) / Math.PI + 360) % 360;
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
    },
    [],
  );

  const checkSelection = useCallback(
    (selection: CellPosition[]) => {
      // Check if selection matches any NOT FOUND word
      // We check forward and reverse match for each word

      // Find matching placement
      const matchedPlacementIndex = placements.findIndex((p) => {
        if (p.found) return false;
        if (p.positions.length !== selection.length) return false;

        // Forward check
        const forwardMatch = selection.every(
          (cell, i) =>
            cell.row === p.positions[i].row && cell.col === p.positions[i].col,
        );

        // Reverse check
        const reversePositions = [...p.positions].reverse();
        const reverseMatch = selection.every(
          (cell, i) =>
            cell.row === reversePositions[i].row &&
            cell.col === reversePositions[i].col,
        );

        return forwardMatch || reverseMatch;
      });

      return matchedPlacementIndex;
    },
    [placements],
  );

  // When user finishes swiping
  const handleSelectionEnd = useCallback(
    (selection: CellPosition[]) => {
      if (selection.length === 0 || showResult) return;

      const matchedIndex = checkSelection(selection);

      if (matchedIndex !== -1) {
        // Valid word found!
        const word = placements[matchedIndex].word;

        // Update placements to mark as found
        const newPlacements = [...placements];
        newPlacements[matchedIndex] = {
          ...newPlacements[matchedIndex],
          found: true,
        };
        setPlacements(newPlacements);

        // Visual feedback
        if (onFeedback) onFeedback(true);

        // Check if ALL words found
        const allFound = newPlacements.every((p) => p.found);
        if (allFound) {
          setAllCorrect(true);
          setShowResult(true);
          onAnswer(true);
        }

        // Clear selection immediately so user can find next word
        // (The found word will stay highlighted via placements state)
        // We don't use pendingSelection logic for valid words anymore, direct success.
        setPendingSelection([]);
      } else {
        // Invalid selection
        // We could set pendingSelection if we wanted a "Submit" flow, but for Word Search style,
        // usually it auto-submits on release.
        if (onFeedback) onFeedback(false);

        // Clear selection
        setPendingSelection([]); // or keep it briefly for error animation? Simpler to just clear.
      }
    },
    [showResult, checkSelection, placements, onFeedback, onAnswer],
  );

  const selectionRef = useRef<CellPosition[]>([]);
  useEffect(() => {
    selectionRef.current = selectedCells;
  }, [selectedCells]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
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
            x:
              CELL_GAP + firstCellRef.current.col * CELL_STRIDE + CELL_SIZE / 2,
            y:
              CELL_GAP + firstCellRef.current.row * CELL_STRIDE + CELL_SIZE / 2,
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
          const projectedMove =
            (moveInDirRow * dir.dr + moveInDirCol * dir.dc) / dirLength;
          const numCells = Math.max(1, Math.floor(projectedMove) + 1);

          const newSelection: CellPosition[] = [];
          let current = { ...firstCellRef.current };
          newSelection.push({ ...current });

          for (let i = 1; i < numCells && i < 10; i++) {
            current = {
              row: current.row + dir.dr,
              col: current.col + dir.dc,
            };

            if (
              current.row < 0 ||
              current.row >= GRID_SIZE ||
              current.col < 0 ||
              current.col >= GRID_SIZE
            ) {
              break;
            }

            newSelection.push({ ...current });
          }

          setSelectedCells(newSelection);
        },

        onPanResponderRelease: () => {
          handleSelectionEnd(selectionRef.current);
          setSelectedCells([]);
          firstCellRef.current = null;
          directionRef.current = null;
        },

        onPanResponderTerminate: () => {
          if (!showResult) {
            setSelectedCells([]);
          }
          firstCellRef.current = null;
          directionRef.current = null;
        },
      }),
    [
      disabled,
      showResult,
      getCellFromCoords,
      angleToDirection,
      handleSelectionEnd,
    ],
  );

  const isCellSelected = (row: number, col: number) => {
    return selectedCells.some((c) => c.row === row && c.col === col);
  };

  // Check if cell belongs to any FOUND word
  const isCellFound = (row: number, col: number) => {
    return placements.some(
      (p) =>
        p.found &&
        p.positions.some((pos) => pos.row === row && pos.col === col),
    );
  };

  const getCellStyle = (row: number, col: number) => {
    const selected = isCellSelected(row, col);
    const found = isCellFound(row, col);

    if (found) {
      return styles.cellCorrect;
    }
    if (selected) {
      return styles.cellSelected;
    }

    return styles.cell;
  };

  const wordsRemaining = placements.filter((p) => !p.found).length;

  return (
    <View style={styles.container}>
      {/* Question */}
      <Text style={styles.question}>{question}</Text>

      {/* Instructions / Progress */}
      <Text style={styles.instructions}>
        {wordsRemaining === 0
          ? "All words found!"
          : `Find ${wordsRemaining} more word${wordsRemaining === 1 ? "" : "s"}`}
      </Text>

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
                transition={{
                  type: "timing",
                  delay: (rowIndex * GRID_SIZE + colIndex) * 10,
                }}
                style={getCellStyle(rowIndex, colIndex)}
              >
                <Text
                  style={[
                    styles.cellText,
                    (isCellSelected(rowIndex, colIndex) ||
                      isCellFound(rowIndex, colIndex)) &&
                      styles.cellTextSelected,
                  ]}
                >
                  {letter}
                </Text>
              </MotiView>
            ))}
          </View>
        ))}
      </View>

      {/* Words List to Find (Visual Aid) - Only show when result is revealed per user request */}
      {showResult && (
        <View style={styles.wordsListContainer}>
          {placements.map((p, idx) => (
            <View
              key={idx}
              style={[styles.wordChip, p.found && styles.wordChipFound]}
            >
              <Text
                style={[styles.wordChipText, p.found && styles.wordChipTextFound]}
              >
                {p.word}
              </Text>
              {p.found && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color="white"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          ))}
        </View>
      )}

      {/* Result (Only shown when everything is done) */}
      {showResult && (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.resultContainer}
        >
          {showAnswer ? (
             <View style={styles.resultWrong}>
              <Ionicons name="eye" size={24} color={COLORS.primary} />
              <Text style={[styles.resultTextWrong, { color: COLORS.primary }]}>
                Solution Revealed
              </Text>
            </View>
          ) : allCorrect ? (
            <View style={styles.resultCorrect}>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={COLORS.success}
              />
              <Text style={styles.resultTextCorrect}>
                Excellent! You found all the words.
              </Text>
            </View>
          ) : (
            // Should theoretically not reach here if we only show result on success
            <View />
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
    alignItems: "center",
  },
  question: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: "center",
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_GAP / 2,
    borderRadius: CELL_SIZE / 2,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  cellSelected: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_GAP / 2,
    borderRadius: CELL_SIZE / 2,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scale: 1.05 }],
  },
  cellCorrect: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_GAP / 2,
    borderRadius: CELL_SIZE / 2,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
  },
  cellText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  cellTextSelected: {
    color: "#FFFFFF",
  },
  wordsListContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: SPACING.lg,
    justifyContent: "center",
    width: "100%",
  },
  wordChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.textMuted + "40",
    flexDirection: "row",
    alignItems: "center",
  },
  wordChipFound: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  wordChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  wordChipTextFound: {
    color: "white",
  },
  resultContainer: {
    marginTop: SPACING.lg,
    width: "100%",
  },
  resultCorrect: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.success + "20",
    borderRadius: BORDER_RADIUS.md,
  },
  resultTextCorrect: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.success,
    flex: 1,
  },
  resultWrong: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.primary + "20",
    borderRadius: BORDER_RADIUS.md,
  },
  resultTextWrong: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    flex: 1,
  },
});
