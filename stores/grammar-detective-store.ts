// Grammar Detective game store - Zustand + Convex
// Infinite Rush mode with multi-select word tapping
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';

// Shared constant - exported for use in game screen
export const XP_PER_CORRECT = 2;

// Types
export interface GDQuestion {
  id: string;
  sentence: string;
  words: string[];
  questionText: string;
  correctIndices: number[];
  explanation: string;
}

export type GameState = 'idle' | 'playing' | 'reviewing';

export interface GDStats {
  totalAnswered: number;
  totalCorrect: number;
  totalXPEarned: number;
}

export interface GrammarDetectiveState {
  // Game state
  gameState: GameState;
  currentQuestionIndex: number;
  shuffledQuestionIds: string[];
  selectedIndices: number[];  // Multi-select support
  
  // Current session stats
  sessionAnswered: number;
  sessionCorrect: number;
  sessionXP: number;
  
  // Persisted all-time stats (synced to Convex)
  stats: GDStats;
  
  // Last answer result for review screen
  lastResult: {
    correct: boolean;
    correctIndices: number[];
    explanation: string;
  } | null;
  
  // Persisted localized session sync state
  syncedSession: {
    answered: number;
    correct: number;
    xp: number;
  };
  
  // Actions
  startGame: (questions: GDQuestion[]) => void;
  toggleWordSelection: (index: number) => void;
  submitAnswer: (question: GDQuestion) => { correct: boolean };
  nextQuestion: () => void;
  resetGame: () => void;
  syncFromConvex: (serverStats: { questionsAnswered: number; correctAnswers: number; totalXPEarned: number; currentQuestionIndex: number }) => void;
  updateSyncedSession: (synced: { answered: number; correct: number; xp: number }) => void;
}

// Shuffle array using Fisher-Yates
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if two arrays contain the same elements (order doesn't matter)
function arraysMatch(arr1: number[], arr2: number[]): boolean {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort((a, b) => a - b);
  const sorted2 = [...arr2].sort((a, b) => a - b);
  return sorted1.every((val, index) => val === sorted2[index]);
}

export const useGrammarDetectiveStore = create<GrammarDetectiveState>()(
  persist(
    (set, get) => ({
      // Initial state
      gameState: 'idle',
      currentQuestionIndex: 0,
      shuffledQuestionIds: [],
      selectedIndices: [],
      sessionAnswered: 0,
      sessionCorrect: 0,
      sessionXP: 0,
      syncedSession: {
        answered: 0,
        correct: 0,
        xp: 0,
      },
      stats: {
        totalAnswered: 0,
        totalCorrect: 0,
        totalXPEarned: 0,
      },
      lastResult: null,



      startGame: (questions) => {
        const { shuffledQuestionIds, currentQuestionIndex } = get();
        
        // If we have existing shuffled order and valid index, resume
        if (shuffledQuestionIds.length > 0 && currentQuestionIndex < shuffledQuestionIds.length) {
          // Check if all question IDs still exist in the content
          const questionIds = new Set(questions.map(q => q.id));
          const validOrder = shuffledQuestionIds.filter(id => questionIds.has(id));
          
          if (validOrder.length > 0) {
            set({
              gameState: 'playing',
              shuffledQuestionIds: validOrder,
              currentQuestionIndex: Math.min(currentQuestionIndex, validOrder.length - 1),
              selectedIndices: [],
              lastResult: null,
              sessionAnswered: 0,
              sessionCorrect: 0,
              sessionXP: 0,
              syncedSession: { answered: 0, correct: 0, xp: 0 },
            });
            return;
          }
        }
        
        // Start fresh with shuffled questions
        const shuffledIds = shuffleArray(questions.map(q => q.id));
        set({
          gameState: 'playing',
          currentQuestionIndex: 0,
          shuffledQuestionIds: shuffledIds,
          selectedIndices: [],
          lastResult: null,
          sessionAnswered: 0,
          sessionCorrect: 0,
          sessionXP: 0,
          syncedSession: { answered: 0, correct: 0, xp: 0 },
        });
      },

      toggleWordSelection: (index) => {
        const { selectedIndices, gameState } = get();
        if (gameState !== 'playing') return;
        
        const newSelection = selectedIndices.includes(index)
          ? selectedIndices.filter(i => i !== index)
          : [...selectedIndices, index];
        
        set({ selectedIndices: newSelection });
      },

      submitAnswer: (question) => {
        const { selectedIndices, stats } = get();
        
        const correct = arraysMatch(selectedIndices, question.correctIndices);
        const xpEarned = correct ? XP_PER_CORRECT : 0;
        
        set((state) => ({
          gameState: 'reviewing',
          lastResult: {
            correct,
            correctIndices: question.correctIndices,
            explanation: question.explanation,
          },
          sessionAnswered: state.sessionAnswered + 1,
          sessionCorrect: state.sessionCorrect + (correct ? 1 : 0),
          sessionXP: state.sessionXP + xpEarned,
          stats: {
            totalAnswered: stats.totalAnswered + 1,
            totalCorrect: stats.totalCorrect + (correct ? 1 : 0),
            totalXPEarned: stats.totalXPEarned + xpEarned,
          },
        }));
        
        return { correct };
      },

      nextQuestion: () => {
        const { currentQuestionIndex, shuffledQuestionIds } = get();
        const nextIndex = currentQuestionIndex + 1;
        
        // Wrap around to beginning if we've done all questions
        const wrappedIndex = nextIndex >= shuffledQuestionIds.length ? 0 : nextIndex;
        
        set({
          gameState: 'playing',
          currentQuestionIndex: wrappedIndex,
          selectedIndices: [],
          lastResult: null,
        });
      },

      resetGame: () => {
        set({
          gameState: 'idle',
          selectedIndices: [],
          lastResult: null,
          sessionAnswered: 0,
          sessionCorrect: 0,
          sessionXP: 0,
          syncedSession: { answered: 0, correct: 0, xp: 0 },
        });
      },

      syncFromConvex: (serverStats) => {
        // Sync from Convex on app load (Convex is source of truth)
        // CRITICAL: Do NOT update index if we are in 'reviewing' state.
        // This prevents the UI from switching to the next question in the background
        // while the user is looking at the result card of the current question.
        const shouldUpdateIndex = get().gameState !== 'reviewing';
        
        set({
          currentQuestionIndex: shouldUpdateIndex ? serverStats.currentQuestionIndex : get().currentQuestionIndex,
          stats: {
            totalAnswered: serverStats.questionsAnswered,
            totalCorrect: serverStats.correctAnswers,
            totalXPEarned: serverStats.totalXPEarned,
          },
        });
      },

      updateSyncedSession: (synced) => {
        set({ syncedSession: synced });
      },
    }),
    {
      name: 'grammar-detective-storage',
      storage: createJSONStorage(() => zustandStorage),
      // Persist game progress and shuffled order AND synced state
      partialize: (state) => ({
        currentQuestionIndex: state.currentQuestionIndex,
        shuffledQuestionIds: state.shuffledQuestionIds,
        stats: state.stats,
        sessionAnswered: state.sessionAnswered,
        sessionCorrect: state.sessionCorrect,
        sessionXP: state.sessionXP,
        syncedSession: state.syncedSession,
      }),
    }
  )
);
