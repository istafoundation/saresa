// GK Quiz store
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '../utils/storage';
import { getRandomQuestions, type Question } from '../data/gk-questions';

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

export type GameMode = 'practice' | 'competitive';
export type QuizState = 'idle' | 'playing' | 'finished';

export interface QuizResult {
  correct: number;
  total: number;
  averageTime: number; // seconds
  xpEarned: number;
}

export interface GKState {
  // Current game state
  mode: GameMode;
  quizState: QuizState;
  currentQuestionIndex: number;
  questions: Question[];
  answers: (number | null)[];
  timePerQuestion: number[]; // seconds spent per question
  
  // Practice mode tracking
  practiceTotal: number;
  practiceCorrect: number;
  
  // Competitive tracking
  lastCompetitiveDate: string | null;
  
  // Timer state
  questionStartTime: number;
  
  // Actions
  startQuiz: (mode: GameMode) => boolean; // returns false if competitive already played
  answerQuestion: (answerIndex: number) => { correct: boolean; correctIndex: number };
  nextQuestion: () => void;
  finishQuiz: () => QuizResult;
  canPlayCompetitiveToday: () => boolean;
  resetQuiz: () => void;
}

const COMPETITIVE_QUESTION_COUNT = 10;
const TIME_LIMIT_SECONDS = 30;

export const useGKStore = create<GKState>()(
  persist(
    (set, get) => ({
      // Initial state
      mode: 'practice',
      quizState: 'idle',
      currentQuestionIndex: 0,
      questions: [],
      answers: [],
      timePerQuestion: [],
      practiceTotal: 0,
      practiceCorrect: 0,
      lastCompetitiveDate: null,
      questionStartTime: 0,
      
      startQuiz: (mode) => {
        if (mode === 'competitive' && !get().canPlayCompetitiveToday()) {
          return false;
        }
        
        const questionCount = mode === 'competitive' ? COMPETITIVE_QUESTION_COUNT : 5;
        const questions = getRandomQuestions(questionCount);
        
        set({
          mode,
          quizState: 'playing',
          currentQuestionIndex: 0,
          questions,
          answers: new Array(questions.length).fill(null),
          timePerQuestion: [],
          questionStartTime: Date.now(),
        });
        
        return true;
      },
      
      answerQuestion: (answerIndex) => {
        const { currentQuestionIndex, questions, answers, timePerQuestion, questionStartTime, mode } = get();
        const question = questions[currentQuestionIndex];
        const correct = answerIndex === question.correctIndex;
        
        // Calculate time spent
        const timeTaken = (Date.now() - questionStartTime) / 1000;
        const clampedTime = Math.min(timeTaken, TIME_LIMIT_SECONDS);
        
        // Update state
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = answerIndex;
        
        const newTimePerQuestion = [...timePerQuestion, clampedTime];
        
        // Update practice stats
        if (mode === 'practice') {
          set({
            practiceTotal: get().practiceTotal + 1,
            practiceCorrect: get().practiceCorrect + (correct ? 1 : 0),
          });
        }
        
        set({
          answers: newAnswers,
          timePerQuestion: newTimePerQuestion,
        });
        
        return { correct, correctIndex: question.correctIndex };
      },
      
      nextQuestion: () => {
        const { currentQuestionIndex, questions, mode } = get();
        
        if (currentQuestionIndex >= questions.length - 1) {
          // Quiz finished
          set({ quizState: 'finished' });
          return;
        }
        
        // In practice mode, we can continue indefinitely
        if (mode === 'practice' && currentQuestionIndex >= questions.length - 1) {
          // Get more questions
          const moreQuestions = getRandomQuestions(5);
          set({
            questions: [...get().questions, ...moreQuestions],
            answers: [...get().answers, ...new Array(moreQuestions.length).fill(null)],
            currentQuestionIndex: currentQuestionIndex + 1,
            questionStartTime: Date.now(),
          });
        } else {
          set({
            currentQuestionIndex: currentQuestionIndex + 1,
            questionStartTime: Date.now(),
          });
        }
      },
      
      finishQuiz: () => {
        const { mode, questions, answers, timePerQuestion } = get();
        
        const correct = answers.filter((a, i) => a === questions[i].correctIndex).length;
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
          const today = new Date().toISOString().split('T')[0];
          set({ lastCompetitiveDate: today });
        }
        
        set({ quizState: 'finished' });
        
        return { correct, total, averageTime, xpEarned };
      },
      
      canPlayCompetitiveToday: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().lastCompetitiveDate !== today;
      },
      
      resetQuiz: () => {
        set({
          quizState: 'idle',
          currentQuestionIndex: 0,
          questions: [],
          answers: [],
          timePerQuestion: [],
          questionStartTime: 0,
        });
      },
    }),
    {
      name: 'gk-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        practiceTotal: state.practiceTotal,
        practiceCorrect: state.practiceCorrect,
        lastCompetitiveDate: state.lastCompetitiveDate,
      }),
    }
  )
);
