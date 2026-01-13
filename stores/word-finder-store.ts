// Word Finder game store - Grid generation, game logic, and persistence
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '../utils/storage';
import { 
  getRandomWordSet, 
  getRandomQuestion, 
  type WordSet, 
  type HardQuestion 
} from '../data/word-finder-data';

// Zustand persist storage adapter for MMKV
const zustandStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};

// Types
export type GameMode = 'easy' | 'hard';
export type GameState = 'idle' | 'playing' | 'finished';

export interface CellPosition {
  row: number;
  col: number;
}

export interface WordPlacement {
  word: string;
  positions: CellPosition[];
  found: boolean;
}

export interface WordFinderStats {
  easyGamesPlayed: number;
  easyWordsFound: number;
  hardGamesPlayed: number;
  hardCorrectAnswers: number;
  totalXPEarned: number;
}

export interface WordFinderState {
  // Game mode
  mode: GameMode;
  gameState: GameState;
  
  // Grid state (8x8)
  grid: string[][];
  wordPlacements: WordPlacement[];
  selectedCells: CellPosition[];
  
  // Easy mode
  currentWordSet: WordSet | null;
  
  // Hard mode
  currentQuestion: HardQuestion | null;
  answeredQuestionIds: number[];
  hintUsed: boolean;
  hardQuestionsAnswered: number;
  hardCorrectAnswers: number;
  
  // Timer
  timeRemaining: number; // seconds (600 = 10 min)
  
  // Daily tracking
  lastEasyPlayDate: string | null;
  lastHardPlayDate: string | null;
  hardAttemptsToday: number;
  
  // Statistics
  stats: WordFinderStats;
  
  // Actions
  startGame: (mode: GameMode) => boolean;
  selectCell: (row: number, col: number) => void;
  confirmSelection: () => { valid: boolean; word?: string };
  clearSelection: () => void;
  useHint: () => string | null;
  nextHardQuestion: () => boolean;
  updateTimer: (seconds: number) => void;
  finishGame: () => { xpEarned: number; wordsFound: number; total: number };
  canPlayEasyToday: () => boolean;
  canPlayHardToday: () => boolean;
  resetGame: () => void;
}

const GRID_SIZE = 8;
const MAX_TIME = 600; // 10 minutes in seconds

const initialStats: WordFinderStats = {
  easyGamesPlayed: 0,
  easyWordsFound: 0,
  hardGamesPlayed: 0,
  hardCorrectAnswers: 0,
  totalXPEarned: 0,
};

// Grid generation helpers
const DIRECTIONS = [
  { dr: 0, dc: 1, name: 'right' },     // horizontal right
  { dr: 1, dc: 0, name: 'down' },      // vertical down
  { dr: 1, dc: 1, name: 'diag-down' }, // diagonal down-right
];

function createEmptyGrid(): string[][] {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
}

function canPlaceWord(
  grid: string[][], 
  word: string, 
  startRow: number, 
  startCol: number, 
  direction: { dr: number; dc: number }
): boolean {
  const { dr, dc } = direction;
  
  for (let i = 0; i < word.length; i++) {
    const row = startRow + i * dr;
    const col = startCol + i * dc;
    
    // Check bounds
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return false;
    }
    
    // Check if cell is empty or has same letter
    const currentCell = grid[row][col];
    if (currentCell !== '' && currentCell !== word[i]) {
      return false;
    }
  }
  
  return true;
}

function placeWord(
  grid: string[][], 
  word: string, 
  startRow: number, 
  startCol: number, 
  direction: { dr: number; dc: number }
): CellPosition[] {
  const { dr, dc } = direction;
  const positions: CellPosition[] = [];
  
  for (let i = 0; i < word.length; i++) {
    const row = startRow + i * dr;
    const col = startCol + i * dc;
    grid[row][col] = word[i];
    positions.push({ row, col });
  }
  
  return positions;
}

function tryPlaceWord(grid: string[][], word: string): CellPosition[] | null {
  // Shuffle directions for variety
  const shuffledDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5);
  
  // Try random positions
  const positions: { row: number; col: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      positions.push({ row: r, col: c });
    }
  }
  positions.sort(() => Math.random() - 0.5);
  
  for (const dir of shuffledDirs) {
    for (const pos of positions) {
      if (canPlaceWord(grid, word, pos.row, pos.col, dir)) {
        return placeWord(grid, word, pos.row, pos.col, dir);
      }
    }
  }
  
  return null;
}

function fillEmptyCells(grid: string[][]): void {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }
}

function generateGrid(words: string[]): { grid: string[][]; placements: WordPlacement[] } {
  // Sort by length descending (place longer words first)
  const sortedWords = [...words].sort((a, b) => b.length - a.length);
  
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const grid = createEmptyGrid();
    const placements: WordPlacement[] = [];
    let allPlaced = true;
    
    for (const word of sortedWords) {
      const positions = tryPlaceWord(grid, word.toUpperCase());
      if (positions) {
        placements.push({ word: word.toUpperCase(), positions, found: false });
      } else {
        allPlaced = false;
        break;
      }
    }
    
    if (allPlaced) {
      fillEmptyCells(grid);
      return { grid, placements };
    }
    
    attempts++;
  }
  
  // Fallback: Create grid with just the words we could place
  const grid = createEmptyGrid();
  const placements: WordPlacement[] = [];
  
  for (const word of sortedWords) {
    const positions = tryPlaceWord(grid, word.toUpperCase());
    if (positions) {
      placements.push({ word: word.toUpperCase(), positions, found: false });
    }
  }
  
  fillEmptyCells(grid);
  return { grid, placements };
}

function positionsMatch(pos1: CellPosition[], pos2: CellPosition[]): boolean {
  if (pos1.length !== pos2.length) return false;
  
  // Check forward match
  const forwardMatch = pos1.every((p, i) => 
    p.row === pos2[i].row && p.col === pos2[i].col
  );
  
  // Check reverse match (user might swipe in opposite direction)
  const reverseMatch = pos1.every((p, i) => 
    p.row === pos2[pos2.length - 1 - i].row && p.col === pos2[pos2.length - 1 - i].col
  );
  
  return forwardMatch || reverseMatch;
}

export const useWordFinderStore = create<WordFinderState>()(
  persist(
    (set, get) => ({
      // Initial state
      mode: 'easy',
      gameState: 'idle',
      grid: [],
      wordPlacements: [],
      selectedCells: [],
      currentWordSet: null,
      currentQuestion: null,
      answeredQuestionIds: [],
      hintUsed: false,
      hardQuestionsAnswered: 0,
      hardCorrectAnswers: 0,
      timeRemaining: MAX_TIME,
      lastEasyPlayDate: null,
      lastHardPlayDate: null,
      hardAttemptsToday: 0,
      stats: initialStats,
      
      startGame: (mode) => {
        const today = new Date().toISOString().split('T')[0];
        
        if (mode === 'easy' && !get().canPlayEasyToday()) {
          return false;
        }
        
        if (mode === 'hard' && !get().canPlayHardToday()) {
          return false;
        }
        
        if (mode === 'easy') {
          const wordSet = getRandomWordSet();
          const { grid, placements } = generateGrid(wordSet.words);
          
          set({
            mode: 'easy',
            gameState: 'playing',
            grid,
            wordPlacements: placements,
            selectedCells: [],
            currentWordSet: wordSet,
            currentQuestion: null,
            hintUsed: false,
            timeRemaining: MAX_TIME,
          });
        } else {
          // Hard mode: Start with first question
          const question = getRandomQuestion([]);
          if (!question) return false;
          
          const { grid, placements } = generateGrid([question.answer]);
          
          set({
            mode: 'hard',
            gameState: 'playing',
            grid,
            wordPlacements: placements,
            selectedCells: [],
            currentWordSet: null,
            currentQuestion: question,
            answeredQuestionIds: [],
            hintUsed: false,
            hardQuestionsAnswered: 0,
            hardCorrectAnswers: 0,
            timeRemaining: MAX_TIME,
          });
        }
        
        return true;
      },
      
      selectCell: (row, col) => {
        const { selectedCells, gameState } = get();
        if (gameState !== 'playing') return;
        
        const lastCell = selectedCells[selectedCells.length - 1];
        
        // If selecting the same cell, ignore
        if (lastCell && lastCell.row === row && lastCell.col === col) {
          return;
        }
        
        // If first cell or adjacent to last cell
        if (!lastCell || isAdjacent(lastCell, { row, col })) {
          // Check if cell is already in selection (going back)
          const existingIndex = selectedCells.findIndex(c => c.row === row && c.col === col);
          if (existingIndex !== -1) {
            // Going back - remove cells after this one
            set({ selectedCells: selectedCells.slice(0, existingIndex + 1) });
          } else {
            // Check if selection is in a valid line (straight or diagonal)
            if (selectedCells.length >= 2) {
              const dir = getDirection(selectedCells[0], selectedCells[1]);
              const expectedDir = getDirection(lastCell, { row, col });
              if (dir.dr !== expectedDir.dr || dir.dc !== expectedDir.dc) {
                // Direction changed, start new selection
                set({ selectedCells: [{ row, col }] });
                return;
              }
            }
            set({ selectedCells: [...selectedCells, { row, col }] });
          }
        } else {
          // Not adjacent - start new selection
          set({ selectedCells: [{ row, col }] });
        }
      },
      
      confirmSelection: () => {
        const { selectedCells, wordPlacements, grid, mode } = get();
        
        if (selectedCells.length < 2) {
          set({ selectedCells: [] });
          return { valid: false };
        }
        
        // Build word from selection
        const selectedWord = selectedCells
          .map(c => grid[c.row][c.col])
          .join('');
        
        // Check if it matches any unfound word
        const matchingPlacement = wordPlacements.find(
          p => !p.found && positionsMatch(p.positions, selectedCells)
        );
        
        if (matchingPlacement) {
          // Mark as found
          const newPlacements = wordPlacements.map(p => 
            p.word === matchingPlacement.word ? { ...p, found: true } : p
          );
          
          set({ 
            wordPlacements: newPlacements, 
            selectedCells: [] 
          });
          
          // Check if all words found (Easy mode) or question answered (Hard mode)
          const allFound = newPlacements.every(p => p.found);
          
          if (mode === 'easy' && allFound) {
            set({ gameState: 'finished' });
          } else if (mode === 'hard') {
            // Correct answer in hard mode
            set({ 
              hardCorrectAnswers: get().hardCorrectAnswers + 1,
              hardQuestionsAnswered: get().hardQuestionsAnswered + 1,
            });
          }
          
          return { valid: true, word: matchingPlacement.word };
        }
        
        set({ selectedCells: [] });
        return { valid: false };
      },
      
      clearSelection: () => {
        set({ selectedCells: [] });
      },
      
      useHint: () => {
        const { currentQuestion, mode } = get();
        if (mode !== 'hard' || !currentQuestion) return null;
        
        set({ hintUsed: true });
        return currentQuestion.hint;
      },
      
      nextHardQuestion: () => {
        const { answeredQuestionIds, hardQuestionsAnswered, timeRemaining } = get();
        
        // Max 5 questions per hard mode session
        if (hardQuestionsAnswered >= 5 || timeRemaining <= 0) {
          set({ gameState: 'finished' });
          return false;
        }
        
        const question = getRandomQuestion(answeredQuestionIds);
        if (!question) {
          set({ gameState: 'finished' });
          return false;
        }
        
        const { grid, placements } = generateGrid([question.answer]);
        
        set({
          grid,
          wordPlacements: placements,
          selectedCells: [],
          currentQuestion: question,
          answeredQuestionIds: [...answeredQuestionIds, question.id],
          hintUsed: false,
        });
        
        return true;
      },
      
      updateTimer: (seconds) => {
        const { gameState } = get();
        if (gameState !== 'playing') return;
        
        if (seconds <= 0) {
          set({ timeRemaining: 0, gameState: 'finished' });
        } else {
          set({ timeRemaining: seconds });
        }
      },
      
      finishGame: () => {
        const { mode, wordPlacements, hintUsed, hardCorrectAnswers, timeRemaining, stats } = get();
        const today = new Date().toISOString().split('T')[0];
        
        let xpEarned = 0;
        let wordsFound = 0;
        let total = 0;
        
        if (mode === 'easy') {
          wordsFound = wordPlacements.filter(p => p.found).length;
          total = wordPlacements.length;
          
          // XP calculation: base 40 per word, time bonus up to 50%
          const baseXP = wordsFound * 40;
          const timeBonus = 1 + 0.5 * (timeRemaining / MAX_TIME);
          xpEarned = Math.round(baseXP * timeBonus);
          
          set({ 
            lastEasyPlayDate: today,
            stats: {
              ...stats,
              easyGamesPlayed: stats.easyGamesPlayed + 1,
              easyWordsFound: stats.easyWordsFound + wordsFound,
              totalXPEarned: stats.totalXPEarned + xpEarned,
            },
          });
        } else {
          wordsFound = hardCorrectAnswers;
          total = 5; // Max 5 questions
          
          // XP calculation: base 80 per correct, time bonus, hint penalty
          const baseXP = hardCorrectAnswers * 80;
          const timeBonus = 1 + 0.5 * (timeRemaining / MAX_TIME);
          const hintPenalty = hintUsed ? 0.5 : 1;
          xpEarned = Math.round(baseXP * timeBonus * hintPenalty);
          
          const { lastHardPlayDate, hardAttemptsToday } = get();
          const newAttempts = lastHardPlayDate === today ? hardAttemptsToday + 1 : 1;
          
          set({ 
            lastHardPlayDate: today,
            hardAttemptsToday: newAttempts,
            stats: {
              ...stats,
              hardGamesPlayed: stats.hardGamesPlayed + 1,
              hardCorrectAnswers: stats.hardCorrectAnswers + hardCorrectAnswers,
              totalXPEarned: stats.totalXPEarned + xpEarned,
            },
          });
        }
        
        set({ gameState: 'finished' });
        
        return { xpEarned, wordsFound, total };
      },
      
      canPlayEasyToday: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().lastEasyPlayDate !== today;
      },
      
      canPlayHardToday: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastHardPlayDate, hardAttemptsToday } = get();
        
        if (lastHardPlayDate !== today) return true;
        return hardAttemptsToday < 2;
      },
      
      resetGame: () => {
        set({
          gameState: 'idle',
          grid: [],
          wordPlacements: [],
          selectedCells: [],
          currentWordSet: null,
          currentQuestion: null,
          answeredQuestionIds: [],
          hintUsed: false,
          hardQuestionsAnswered: 0,
          hardCorrectAnswers: 0,
          timeRemaining: MAX_TIME,
        });
      },
    }),
    {
      name: 'word-finder-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        lastEasyPlayDate: state.lastEasyPlayDate,
        lastHardPlayDate: state.lastHardPlayDate,
        hardAttemptsToday: state.hardAttemptsToday,
        stats: state.stats,
      }),
    }
  )
);

// Helper functions
function isAdjacent(cell1: CellPosition, cell2: CellPosition): boolean {
  const rowDiff = Math.abs(cell1.row - cell2.row);
  const colDiff = Math.abs(cell1.col - cell2.col);
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
}

function getDirection(from: CellPosition, to: CellPosition): { dr: number; dc: number } {
  return {
    dr: Math.sign(to.row - from.row),
    dc: Math.sign(to.col - from.col),
  };
}
