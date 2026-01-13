// Wordle game store
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '../utils/storage';
import { getTodaysWord } from '../data/wordle-words';

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

export type LetterState = 'correct' | 'present' | 'absent' | 'unused';
export type GameState = 'playing' | 'won' | 'lost';

export interface WordleStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[]; // Index 0-5 for guesses 1-6
}

export interface WordleState {
  // Current game state
  targetWord: string;
  currentGuess: string;
  guesses: string[];
  gameState: GameState;
  
  // Keyboard state
  letterStates: Record<string, LetterState>;
  
  // Persistence
  lastPlayedDate: string | null;
  
  // Statistics
  stats: WordleStats;
  
  // Actions
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => { valid: boolean; result?: LetterState[]; won?: boolean; lost?: boolean };
  initGame: () => void;
  canPlayToday: () => boolean;
  resetGame: () => void;
}

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const initialStats: WordleStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0],
};

export const useWordleStore = create<WordleState>()(
  persist(
    (set, get) => ({
      // Initial state
      targetWord: '',
      currentGuess: '',
      guesses: [],
      gameState: 'playing',
      letterStates: {},
      lastPlayedDate: null,
      stats: initialStats,
      
      addLetter: (letter) => {
        const { currentGuess, gameState } = get();
        if (gameState !== 'playing') return;
        if (currentGuess.length >= WORD_LENGTH) return;
        set({ currentGuess: currentGuess + letter.toUpperCase() });
      },
      
      removeLetter: () => {
        const { currentGuess, gameState } = get();
        if (gameState !== 'playing') return;
        if (currentGuess.length === 0) return;
        set({ currentGuess: currentGuess.slice(0, -1) });
      },
      
      submitGuess: () => {
        const { currentGuess, targetWord, guesses, letterStates, stats, gameState } = get();
        
        if (gameState !== 'playing') {
          return { valid: false };
        }
        
        if (currentGuess.length !== WORD_LENGTH) {
          return { valid: false };
        }
        
        // Calculate result for each letter
        const result: LetterState[] = [];
        const targetLetters = targetWord.split('');
        const guessLetters = currentGuess.split('');
        const newLetterStates = { ...letterStates };
        
        // First pass: mark correct letters
        const remaining: (string | null)[] = [...targetLetters];
        guessLetters.forEach((letter, i) => {
          if (letter === targetLetters[i]) {
            result[i] = 'correct';
            remaining[i] = null;
            newLetterStates[letter] = 'correct';
          }
        });
        
        // Second pass: mark present/absent
        guessLetters.forEach((letter, i) => {
          if (result[i]) return; // Already marked correct
          
          const remainingIndex = remaining.indexOf(letter);
          if (remainingIndex !== -1) {
            result[i] = 'present';
            remaining[remainingIndex] = null;
            if (newLetterStates[letter] !== 'correct') {
              newLetterStates[letter] = 'present';
            }
          } else {
            result[i] = 'absent';
            if (!newLetterStates[letter]) {
              newLetterStates[letter] = 'absent';
            }
          }
        });
        
        const newGuesses = [...guesses, currentGuess];
        const won = currentGuess === targetWord;
        const lost = !won && newGuesses.length >= MAX_GUESSES;
        
        // Update stats if game ended
        let newStats = stats;
        if (won || lost) {
          const today = new Date().toISOString().split('T')[0];
          newStats = {
            gamesPlayed: stats.gamesPlayed + 1,
            gamesWon: won ? stats.gamesWon + 1 : stats.gamesWon,
            currentStreak: won ? stats.currentStreak + 1 : 0,
            maxStreak: won 
              ? Math.max(stats.maxStreak, stats.currentStreak + 1) 
              : stats.maxStreak,
            guessDistribution: won 
              ? stats.guessDistribution.map((v, i) => i === newGuesses.length - 1 ? v + 1 : v)
              : stats.guessDistribution,
          };
          
          set({
            guesses: newGuesses,
            currentGuess: '',
            letterStates: newLetterStates,
            gameState: won ? 'won' : 'lost',
            lastPlayedDate: today,
            stats: newStats,
          });
        } else {
          set({
            guesses: newGuesses,
            currentGuess: '',
            letterStates: newLetterStates,
          });
        }
        
        return { valid: true, result, won, lost };
      },
      
      initGame: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastPlayedDate } = get();
        
        // If already played today, keep current state
        if (lastPlayedDate === today) return;
        
        // Start new game
        set({
          targetWord: getTodaysWord(),
          currentGuess: '',
          guesses: [],
          gameState: 'playing',
          letterStates: {},
        });
      },
      
      canPlayToday: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().lastPlayedDate !== today;
      },
      
      resetGame: () => {
        set({
          targetWord: getTodaysWord(),
          currentGuess: '',
          guesses: [],
          gameState: 'playing',
          letterStates: {},
          lastPlayedDate: null,
        });
      },
    }),
    {
      name: 'wordle-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        targetWord: state.targetWord,
        currentGuess: state.currentGuess,
        guesses: state.guesses,
        gameState: state.gameState,
        letterStates: state.letterStates,
        lastPlayedDate: state.lastPlayedDate,
        stats: state.stats,
      }),
    }
  )
);
