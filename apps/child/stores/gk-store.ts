// English Insane (GK Quiz) store - LOCAL STATE ONLY
// Stats are stored in Convex and synced via useConvexSync -> user-store.ts
// Content is fetched via OTA (useEnglishInsaneQuestions)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { getISTDate } from '../utils/dates';

// Types (self-contained - no external imports for data)
export interface Question {
  id: string;
  type: string;
  question: string;
  data: any;
  // Legacy/Flattened properties for easier access if needed, but 'data' is primary for Renderers
  correctIndex?: number;
  questionCode?: string;
}

export type GameMode = 'practice' | 'competitive';
export type QuizState = 'idle' | 'playing' | 'finished';

export interface QuizResult {
  correct: number;
  total: number;
  averageTime: number; // seconds
  xpEarned: number;
}

export interface GKState {
  // Current game state (local only - for active game session)
  mode: GameMode;
  quizState: QuizState;
  currentQuestionIndex: number;
  questions: Question[];
  results: (boolean | null)[];
  timePerQuestion: number[]; // seconds spent per question
  
  // Competitive tracking - local fast-check (Convex is source of truth)
  lastCompetitiveDate: string | null;
  
  // Timer state
  questionStartTime: number;
  
  // Actions - now accept OTA content as parameters
  startQuiz: (mode: GameMode, allQuestions: Question[]) => boolean;
  answerQuestion: (isCorrect: boolean) => void;
  nextQuestion: (allQuestions: Question[]) => void;
  finishQuiz: () => QuizResult;
  canPlayCompetitiveToday: () => boolean;
  resetQuiz: () => void;
}

const COMPETITIVE_QUESTION_COUNT = 10;
const TIME_LIMIT_SECONDS = 30;

// Helper to get random questions from pool
// Helper to get random questions from pool using Fisher-Yates shuffle
function getRandomQuestions(allQuestions: Question[], count: number): Question[] {
  if (!allQuestions || allQuestions.length === 0) return [];
  
  // Clone array to avoid mutating source
  const shuffled = [...allQuestions];
  
  // Fisher-Yates Shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export const useGKStore = create<GKState>()(
  persist(
    (set, get) => ({
      // Initial state - game session only
      mode: 'practice',
      quizState: 'idle',
      currentQuestionIndex: 0,
      questions: [],
      results: [],
      timePerQuestion: [],
      lastCompetitiveDate: null,
      questionStartTime: 0,
      
      // Start quiz with OTA questions
      startQuiz: (mode, allQuestions) => {
        if (mode === 'competitive' && !get().canPlayCompetitiveToday()) {
          return false;
        }
        
        if (allQuestions.length === 0) {
          return false;
        }
        
        const questionCount = mode === 'competitive' ? COMPETITIVE_QUESTION_COUNT : 5;
        const questions = getRandomQuestions(allQuestions, questionCount);
        
        set({
          mode,
          quizState: 'playing',
          currentQuestionIndex: 0,
          questions,
          results: new Array(questions.length).fill(null),
          timePerQuestion: [],
          questionStartTime: Date.now(),
        });
        
        return true;
      },
      
      answerQuestion: (isCorrect) => {
        const { currentQuestionIndex, results, timePerQuestion, questionStartTime } = get();
        
        // Calculate time spent
        const timeTaken = (Date.now() - questionStartTime) / 1000;
        const clampedTime = Math.min(timeTaken, TIME_LIMIT_SECONDS);
        
        // Update state
        const newResults = [...results];
        newResults[currentQuestionIndex] = isCorrect;
        
        const newTimePerQuestion = [...timePerQuestion, clampedTime];
        
        set({
          results: newResults,
          timePerQuestion: newTimePerQuestion,
        });
      },
      
      // Next question - now accepts OTA questions for adding more in practice mode
      nextQuestion: (allQuestions) => {
        const { currentQuestionIndex, questions, mode } = get();
        
        // In practice mode, add more questions when running low
        if (mode === 'practice' && currentQuestionIndex >= questions.length - 1) {
          const moreQuestions = getRandomQuestions(allQuestions, 5);
          set({
            questions: [...get().questions, ...moreQuestions],
            results: [...get().results, ...new Array(moreQuestions.length).fill(null)],
            currentQuestionIndex: currentQuestionIndex + 1,
            questionStartTime: Date.now(),
          });
          return;
        }
        
        // For competitive mode, check if quiz is complete
        if (currentQuestionIndex >= questions.length - 1) {
          set({ quizState: 'finished' });
          return;
        }
        
        // Move to next question
        set({
          currentQuestionIndex: currentQuestionIndex + 1,
          questionStartTime: Date.now(),
        });
      },
      
      finishQuiz: () => {
        const { mode, questions, results, timePerQuestion } = get();
        
        const correct = results.filter((isCorrect) => isCorrect === true).length;
        const total = questions.length;
        const averageTime = timePerQuestion.length > 0
          ? timePerQuestion.reduce((a, b) => a + b, 0) / timePerQuestion.length
          : 0;
        
        let xpEarned = 0;
        
        if (mode === 'competitive') {
          // XP calculation for competitive mode
          const accuracy = correct / total;
          const speedBonus = Math.max(0, 1 - (averageTime / TIME_LIMIT_SECONDS)) * 0.5 + 1;
          const baseXP = correct * 10;
          xpEarned = Math.round(baseXP * (1 + accuracy) * speedBonus);
          
          // Mark competitive as played today
          const today = getISTDate();
          set({ lastCompetitiveDate: today });
        }
        
        set({ quizState: 'finished' });
        
        return { correct, total, averageTime, xpEarned };
      },
      
      canPlayCompetitiveToday: () => {
        const today = getISTDate();
        return get().lastCompetitiveDate !== today;
      },
      
      resetQuiz: () => {
        set({
          quizState: 'idle',
          currentQuestionIndex: 0,
          questions: [],
          results: [],
          timePerQuestion: [],
          questionStartTime: 0,
        });
      },
    }),
    {
      name: 'gk-storage',
      storage: createJSONStorage(() => zustandStorage),
      // Only persist game session state, NOT stats (stats are in Convex)
      partialize: (state) => ({
        lastCompetitiveDate: state.lastCompetitiveDate,
      }),
    }
  )
);
