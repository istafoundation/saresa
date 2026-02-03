// Centralized game reward constants
// All XP and coin rewards in one place for easy balancing

// Wordle rewards
export const WORDLE_REWARDS = {
  XP_FULL: 100,
  XP_WITH_HINT: 50,
  COINS_FULL: 50,
  COINS_WITH_HINT: 25,
} as const;

// GK Quiz rewards
export const GK_REWARDS = {
  XP_PER_CORRECT_COMPETITIVE: 10,
  XP_ACCURACY_BONUS_MULTIPLIER: 1,      // +100% at 100% accuracy
  XP_SPEED_BONUS_MULTIPLIER: 0.5,       // +50% for fast answers
  TIME_LIMIT_SECONDS: 30,
} as const;

// Word Finder rewards
export const WORD_FINDER_REWARDS = {
  // Easy mode
  EASY_XP_PER_WORD: 10,
  EASY_TIME_BONUS_MULTIPLIER: 0.5,      // +50% for fast completion
  EASY_MAX_XP: 50,
  EASY_ATTEMPTS_PER_DAY: 2,
  
  // Hard mode
  HARD_XP_PER_CORRECT: 40,
  HARD_TIME_BONUS_MULTIPLIER: 0.5,      // +50% for fast completion
  HARD_HINT_PENALTY_MULTIPLIER: 0.5,    // 50% rewards if hint used
  HARD_MAX_XP: 200,
  HARD_QUESTIONS_PER_SESSION: 5,
  HARD_ATTEMPTS_PER_DAY: 1,
  
  // Timer
  MAX_TIME_SECONDS: 600,                // 10 minutes
} as const;

// General progression
export const PROGRESSION = {
  INITIAL_COINS: 100,
  PACK_COST: 100,
} as const;
