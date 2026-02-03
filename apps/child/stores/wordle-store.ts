// Wordle game store - LOCAL STATE ONLY
// Stats are stored in Convex and synced via useConvexSync -> user-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { getISTDate } from '../utils/dates';
import { isValidWord } from '../data/wordle-words';

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
  targetHint: string;
  currentGuess: string;
  guesses: string[];
  gameState: GameState;
  
  // Keyboard state
  letterStates: Record<string, LetterState>;
  
  // Persistence - tracks when game was completed
  lastPlayedDate: string | null;
  
  // NEW: Track when game was started (for preserving in-progress games)
  gameStartedDate: string | null;
  
  // Hint state
  hintUsed: boolean;      // Did user use hint today? (persisted)
  hintRevealed: boolean;  // Is hint currently shown? (UI state)
  
  // Actions
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => { valid: boolean; result?: LetterState[]; won?: boolean; lost?: boolean };
  initGame: (todaysWord: string, todaysHint: string) => void;
  canPlayToday: () => boolean;
  resetGame: (todaysWord: string, todaysHint: string) => void;
  reset: () => void;
  useHint: () => void;
  setHintUsedFromServer: (used: boolean) => void;
  setCurrentGuess: (guess: string) => void;
}

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

export const useWordleStore = create<WordleState>()(
  persist(
    (set, get) => ({
      // Initial state - game session only
      targetWord: '',
      targetHint: '',
      currentGuess: '',
      guesses: [],
      gameState: 'playing',
      letterStates: {},
      lastPlayedDate: null,
      gameStartedDate: null,
      hintUsed: false,
      hintRevealed: false,
      
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
        const { currentGuess, targetWord, guesses, letterStates, gameState, gameStartedDate } = get();
        
        if (gameState !== 'playing') {
          return { valid: false };
        }
        
        if (currentGuess.length !== WORD_LENGTH) {
          return { valid: false };
        }
        
        // Validate word is in dictionary (local validation - instant)
        if (!isValidWord(currentGuess)) {
          return { valid: false, error: 'Not in word list' };
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
        const today = getISTDate();
        
        // Mark game as started if this is the first guess
        const shouldMarkStarted = !gameStartedDate || gameStartedDate !== today;
        
        // Update game state if ended
        // NOTE: Stats are updated in Convex via useGameStatsActions().updateWordleStats()
        if (won || lost) {
          set({
            guesses: newGuesses,
            currentGuess: '',
            letterStates: newLetterStates,
            gameState: won ? 'won' : 'lost',
            lastPlayedDate: today,
            gameStartedDate: today,
          });
        } else {
          set({
            guesses: newGuesses,
            currentGuess: '',
            letterStates: newLetterStates,
            // Mark that we started today's game (so it persists if user leaves)
            ...(shouldMarkStarted ? { gameStartedDate: today } : {}),
          });
        }
        
        return { valid: true, result, won, lost };
      },
      
      // Initialize game with word from OTA (Convex)
      initGame: (todaysWord: string, todaysHint: string) => {
        const today = getISTDate();
        const { lastPlayedDate, gameStartedDate, targetWord } = get();
        
        // If already completed today's game, keep current state
        if (lastPlayedDate === today) return;
        
        // If game was started today (has guesses), preserve the state
        // Also verify we're playing today's word to handle new day rollover
        if (gameStartedDate === today && targetWord === todaysWord) {
          // Game in progress for today - don't reset!
          return;
        }
        
        // Start new game - reset for new day
        set({
          targetWord: todaysWord,
          targetHint: todaysHint,
          currentGuess: '',
          guesses: [],
          gameState: 'playing',
          letterStates: {},
          gameStartedDate: null,
          hintUsed: false,
          hintRevealed: false,
        });
      },
      
      canPlayToday: () => {
        const today = getISTDate();
        return get().lastPlayedDate !== today;
      },
      
      // Reset game with word from OTA (Convex)
      resetGame: (todaysWord: string, todaysHint: string) => {
        set({
          targetWord: todaysWord,
          targetHint: todaysHint,
          currentGuess: '',
          guesses: [],
          gameState: 'playing',
          letterStates: {},
          lastPlayedDate: null,
          gameStartedDate: null,
          hintUsed: false,
          hintRevealed: false,
        });
      },

      // Full reset for logout
      reset: () => {
        set({
          targetWord: '',
          targetHint: '',
          currentGuess: '',
          guesses: [],
          gameState: 'playing',
          letterStates: {},
          lastPlayedDate: null,
          gameStartedDate: null,
          hintUsed: false,
          hintRevealed: false,
        });
      },
      
      useHint: () => {
        set({ hintUsed: true, hintRevealed: true });
      },
      
      setHintUsedFromServer: (used: boolean) => {
        // Sync hint state from Convex (called after fetching didUseWordleHint)
        // Only update if the server says hint was used and we haven't locally
        if (used) {
          set({ hintUsed: true, hintRevealed: true });
        }
      },
      
      setCurrentGuess: (guess: string) => {
        const { gameState } = get();
        if (gameState !== 'playing') return;
        // Direct set for native keyboard input (no loops, single update)
        set({ currentGuess: guess.toUpperCase().slice(0, 5) });
      },
    }),
    {
      name: 'wordle-storage',
      storage: createJSONStorage(() => zustandStorage),
      // Persist game session state for resuming in-progress games
      partialize: (state) => ({
        targetWord: state.targetWord,
        targetHint: state.targetHint,

        guesses: state.guesses,
        gameState: state.gameState,
        letterStates: state.letterStates,
        lastPlayedDate: state.lastPlayedDate,
        gameStartedDate: state.gameStartedDate,
        hintUsed: state.hintUsed,
        hintRevealed: state.hintRevealed,
      }),
    }
  )
);
