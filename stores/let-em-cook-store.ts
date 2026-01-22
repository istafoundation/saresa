// Let'em Cook Store - Spice matching game state
// Now uses Convex for spices data (fetched from server)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';

// Spice type from Convex (matches getRandomSpices return type)
export interface Spice {
  id: string;
  name: string;
  imageUrl: string;
  hindiName?: string;
}

// Constants - kept in sync with Convex
export const PAIRS_PER_ROUND = 4;
export const XP_PER_CORRECT = 10;

// Calculate total rounds based on spice count
export function calculateTotalRounds(totalSpices: number): number {
  return Math.ceil(totalSpices / PAIRS_PER_ROUND);
}

// Get spices for a specific round
export function getSpicesForRound(allSpices: Spice[], roundIndex: number): Spice[] {
  const start = roundIndex * PAIRS_PER_ROUND;
  const end = Math.min(start + PAIRS_PER_ROUND, allSpices.length);
  return allSpices.slice(start, end);
}

// Calculate XP based on correct answers
export function calculateXP(correctCount: number): number {
  return correctCount * XP_PER_CORRECT;
}

export type LetEmCookGameState = 'idle' | 'loading' | 'playing' | 'round_complete' | 'finished';

interface LetEmCookState {
  // Game state
  gameState: LetEmCookGameState;
  
  // Session data
  allSpices: Spice[];           // All spices for this session (from Convex)
  totalSpices: number;           // Total count
  totalRounds: number;           // Calculated from totalSpices
  currentRound: number;          // Current round index (0-based)
  currentPairs: Spice[];         // Current 4 spices being matched
  
  // Progress tracking
  correctCount: number;          // Total correct matches across all rounds
  totalAttempted: number;        // Total matches attempted
  roundCorrect: number;          // Correct in current round
  
  // Feedback state
  showFeedback: boolean;
  wasCorrect: boolean;
  
  // Actions
  initGameWithSpices: (spices: Spice[]) => void; // Initialize with Convex data
  startRound: () => void;
  submitRoundAnswer: (allCorrect: boolean, correctInRound: number) => void;
  nextRound: () => boolean; // Returns false if game complete
  closeFeedback: () => void;
  finishGame: () => { xp: number; correct: number; total: number };
  resetGame: () => void;
}

export const useLetEmCookStore = create<LetEmCookState>()(
  persist(
    (set, get) => ({
      // Initial state
      gameState: 'idle',
      allSpices: [],
      totalSpices: 0,
      totalRounds: 0,
      currentRound: 0,
      currentPairs: [],
      correctCount: 0,
      totalAttempted: 0,
      roundCorrect: 0,
      showFeedback: false,
      wasCorrect: false,
      
      // Initialize game with spices from Convex
      initGameWithSpices: (spices: Spice[]) => {
        const totalRounds = calculateTotalRounds(spices.length);
        const firstRoundPairs = getSpicesForRound(spices, 0);
        
        set({
          gameState: 'playing',
          allSpices: spices,
          totalSpices: spices.length,
          totalRounds,
          currentRound: 0,
          currentPairs: firstRoundPairs,
          correctCount: 0,
          totalAttempted: 0,
          roundCorrect: 0,
          showFeedback: false,
        });
      },
      
      // Start a new round
      startRound: () => {
        const { allSpices, currentRound } = get();
        const pairs = getSpicesForRound(allSpices, currentRound);
        
        set({
          currentPairs: pairs,
          gameState: 'playing',
          roundCorrect: 0,
          showFeedback: false,
        });
      },
      
      // Submit answer for the round (called when user matches all pairs)
      submitRoundAnswer: (allCorrect: boolean, correctInRound: number) => {
        const { correctCount, totalAttempted, currentPairs } = get();
        
        set({
          gameState: 'round_complete',
          showFeedback: true,
          wasCorrect: allCorrect,
          correctCount: correctCount + correctInRound,
          totalAttempted: totalAttempted + currentPairs.length,
          roundCorrect: correctInRound,
        });
      },
      
      // Move to next round
      nextRound: () => {
        const { currentRound, totalRounds, allSpices } = get();
        const nextRoundIndex = currentRound + 1;
        
        if (nextRoundIndex >= totalRounds) {
          // All rounds complete
          set({ gameState: 'finished', showFeedback: false });
          return false;
        }
        
        const nextPairs = getSpicesForRound(allSpices, nextRoundIndex);
        
        set({
          currentRound: nextRoundIndex,
          currentPairs: nextPairs,
          gameState: 'playing',
          showFeedback: false,
          roundCorrect: 0,
        });
        
        return true;
      },
      
      // Close feedback modal
      closeFeedback: () => {
        set({ showFeedback: false });
      },
      
      // Finish game and calculate final XP
      finishGame: () => {
        const { correctCount, totalAttempted } = get();
        const xp = calculateXP(correctCount);
        
        set({ gameState: 'finished' });
        
        return { xp, correct: correctCount, total: totalAttempted };
      },
      
      // Reset game state
      resetGame: () => {
        set({
          gameState: 'idle',
          allSpices: [],
          totalSpices: 0,
          totalRounds: 0,
          currentRound: 0,
          currentPairs: [],
          correctCount: 0,
          totalAttempted: 0,
          roundCorrect: 0,
          showFeedback: false,
          wasCorrect: false,
        });
      },
    }),
    {
      name: 'let-em-cook-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        // Only persist game progress if mid-game
        gameState: state.gameState,
        allSpices: state.allSpices,
        totalSpices: state.totalSpices,
        totalRounds: state.totalRounds,
        currentRound: state.currentRound,
        correctCount: state.correctCount,
        totalAttempted: state.totalAttempted,
      }),
    }
  )
);
