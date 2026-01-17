// Explorer Store - India Explorer game state
// Uses Convex for daily progress sync (prevents seeing same state twice)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { INDIA_REGIONS, getRandomUnguessedRegion, calculateXP, TOTAL_REGIONS, type IndiaRegion } from '../data/india-states';

export type ExplorerGameState = 'idle' | 'playing' | 'answering' | 'finished';

interface ExplorerState {
  // Game state
  gameState: ExplorerGameState;
  currentRegion: IndiaRegion | null;
  selectedRegion: string | null;  // Currently selected (not yet submitted)
  
  // Today's progress (synced from Convex)
  guessedToday: string[];
  correctCount: number;
  
  // Feedback state
  showFeedback: boolean;
  wasCorrect: boolean;
  
  // Actions
  initGame: (guessedToday: string[]) => void;
  nextQuestion: () => boolean; // Returns false if all done
  preSelectRegion: (regionId: string) => void; // Just select, don't submit
  submitSelection: () => boolean; // Submit current selection, returns true if correct
  closeFeedback: () => void;
  finishGame: () => { xp: number; correct: number; total: number };
  resetGame: () => void;
}

export const useExplorerStore = create<ExplorerState>()(
  persist(
    (set, get) => ({
      // Initial state
      gameState: 'idle',
      currentRegion: null,
      selectedRegion: null,
      guessedToday: [],
      correctCount: 0,
      showFeedback: false,
      wasCorrect: false,
      
      // Initialize game with today's progress from Convex
      initGame: (guessedToday) => {
        set({
          gameState: 'playing',
          guessedToday,
          correctCount: 0,
          currentRegion: null,
          selectedRegion: null,
          showFeedback: false,
        });
      },
      
      // Get next question (random unguessed region)
      nextQuestion: () => {
        const { guessedToday } = get();
        const nextRegion = getRandomUnguessedRegion(guessedToday);
        
        if (!nextRegion) {
          // All regions guessed today!
          set({ gameState: 'finished', currentRegion: null });
          return false;
        }
        
        set({
          currentRegion: nextRegion,
          selectedRegion: null,
          showFeedback: false,
          gameState: 'playing',
        });
        
        return true;
      },
      
      // User taps a region on the map (just select, don't submit)
      preSelectRegion: (regionId: string) => {
        const { gameState } = get();
        if (gameState !== 'playing') return;
        
        set({ selectedRegion: regionId });
      },
      
      // User submits their selection
      submitSelection: () => {
        const { currentRegion, selectedRegion, guessedToday, correctCount, gameState } = get();
        if (!currentRegion || !selectedRegion || gameState !== 'playing') return false;
        
        const isCorrect = selectedRegion === currentRegion.id;
        
        // Add to guessed list (whether correct or not - they "saw" it)
        const newGuessedToday = [...guessedToday, currentRegion.id];
        
        set({
          showFeedback: true,
          wasCorrect: isCorrect,
          gameState: 'answering',
          guessedToday: newGuessedToday,
          correctCount: isCorrect ? correctCount + 1 : correctCount,
        });
        
        return isCorrect;
      },
      
      // Close feedback and move to next
      closeFeedback: () => {
        set({ showFeedback: false });
      },
      
      // Finish game and calculate XP
      finishGame: () => {
        const { correctCount, guessedToday } = get();
        const total = guessedToday.length;
        const xp = calculateXP(correctCount);
        
        set({ gameState: 'finished' });
        
        return { xp, correct: correctCount, total };
      },
      
      // Reset game state
      resetGame: () => {
        set({
          gameState: 'idle',
          currentRegion: null,
          selectedRegion: null,
          guessedToday: [],
          correctCount: 0,
          showFeedback: false,
          wasCorrect: false,
        });
      },
    }),
    {
      name: 'explorer-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        guessedToday: state.guessedToday,
        correctCount: state.correctCount,
        gameState: state.gameState,
        currentRegion: state.currentRegion,
        selectedRegion: state.selectedRegion,
      }),
    }
  )
);
