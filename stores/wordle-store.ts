// Wordle game store - LOCAL STATE ONLY
// Stats are stored in Convex and synced via useConvexSync -> user-store.ts
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

// NOTE: Stats are now in Convex! Use useUserStore().wordleStats instead.
// This interface is kept for backwards compatibility but should not be used.
export interface WordleStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];
}

export interface WordleState {
  // Current game state (local only - for active game session)
  targetWord: string;
  currentGuess: string;
  guesses: string[];
  gameState: GameState;
  
  // Keyboard state
  letterStates: Record<string, LetterState>;
  
  // Persistence - local fast-check (Convex is source of truth)
  lastPlayedDate: string | null;
  
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

export const useWordleStore = create<WordleState>()(
  persist(
    (set, get) => ({
      // Initial state - game session only
      targetWord: '',
      currentGuess: '',
      guesses: [],
      gameState: 'playing',
      letterStates: {},
      lastPlayedDate: null,
      
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
        const { currentGuess, targetWord, guesses, letterStates, gameState } = get();
        
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
        
        // Update game state if ended
        // NOTE: Stats are updated in Convex via useGameStatsActions().updateWordleStats()
        if (won || lost) {
          const today = new Date().toISOString().split('T')[0];
          set({
            guesses: newGuesses,
            currentGuess: '',
            letterStates: newLetterStates,
            gameState: won ? 'won' : 'lost',
            lastPlayedDate: today,
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
      // Only persist game session state, NOT stats (stats are in Convex)
      partialize: (state) => ({
        targetWord: state.targetWord,
        currentGuess: state.currentGuess,
        guesses: state.guesses,
        gameState: state.gameState,
        letterStates: state.letterStates,
        lastPlayedDate: state.lastPlayedDate,
      }),
    }
  )
);
