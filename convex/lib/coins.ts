// Shared COINS configuration - Single Source of Truth
// Used by: levels.ts, gameStats.ts, users.ts
// Centralizes all coin-related logic for consistency and maintainability

// ============================================
// SECURITY CONSTANTS
// ============================================

// Maximum coins that can be added in a single operation (prevents exploits)
export const MAX_COINS_PER_OPERATION = 200;

// Maximum coins that can be spent in a single operation
export const MAX_COINS_PER_SPEND_OPERATION = 200;

// ============================================
// COIN RATES BY GAME - SINGLE SOURCE OF TRUTH
// ============================================

// Level Progression coin rates by difficulty
export const LEVEL_PROGRESSION_COINS: Record<string, number> = {
  easy: 50,
  medium: 100,
  hard: 150,
};

// GK Competitive: coins per correct answer
export const COMPETITIVE_GK_COINS_PER_CORRECT = 10;

// Wordle: coins by guess count (fewer guesses = more coins)
export const WORDLE_COINS_BY_GUESS: Record<number, number> = {
  1: 100, // Perfect!
  2: 80,
  3: 60,
  4: 50,
  5: 40,
  6: 30,
};

// Wordle hint penalty multiplier (50% reduction)
export const WORDLE_HINT_PENALTY = 0.5;

// Word Finder: coins per word/answer
export const WORD_FINDER_EASY_COINS_PER_WORD = 1;
export const WORD_FINDER_HARD_COINS_PER_ANSWER = 2;

// India Explorer: coins per correct region
export const EXPLORER_COINS_PER_CORRECT = 5;

// Let'em Cook: coins per correct match
export const LET_EM_COOK_COINS_PER_CORRECT = 1;

// Flag Champs: coins per correct flag
export const FLAG_CHAMPS_COINS_PER_CORRECT = 2;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safely get current coin balance from user object
 * Handles undefined/null values consistently
 */
export function getCurrentCoins(user: { coins?: number }): number {
  return user.coins ?? 0;
}

/**
 * Calculate new coin total after adding coins
 * @param currentUser - User object with optional coins field
 * @param coinsToAdd - Amount of coins to add (should be positive)
 * @returns New coin total
 */
export function calculateNewCoins(
  currentUser: { coins?: number },
  coinsToAdd: number
): number {
  return getCurrentCoins(currentUser) + coinsToAdd;
}

// ============================================
// GAME-SPECIFIC COIN CALCULATORS
// ============================================

/**
 * Calculate coins earned for Wordle game
 * Only awards coins on win, with penalty for using hints
 */
export function calculateWordleCoins(
  won: boolean,
  guessCount?: number,
  usedHint?: boolean
): number {
  if (!won) return 0; // No coins for losing

  const baseCoins = WORDLE_COINS_BY_GUESS[guessCount ?? 6] ?? 30;
  return usedHint ? Math.floor(baseCoins * WORDLE_HINT_PENALTY) : baseCoins;
}

/**
 * Calculate coins earned for Level Progression game
 * Based on difficulty level
 */
export function calculateLevelProgressionCoins(difficulty: string): number {
  return LEVEL_PROGRESSION_COINS[difficulty] ?? 50;
}

/**
 * Calculate coins earned for Competitive GK
 * Based on number of correct answers
 */
export function calculateCompetitiveGKCoins(correctAnswers: number): number {
  return correctAnswers * COMPETITIVE_GK_COINS_PER_CORRECT;
}

/**
 * Calculate coins earned for Word Finder
 * Easy mode: coins per word found
 * Hard mode: coins per correct answer
 */
export function calculateWordFinderCoins(
  mode: "easy" | "hard",
  wordsFound: number,
  correctAnswers?: number
): number {
  if (mode === "easy") {
    return wordsFound * WORD_FINDER_EASY_COINS_PER_WORD;
  }
  return (correctAnswers ?? 0) * WORD_FINDER_HARD_COINS_PER_ANSWER;
}

/**
 * Calculate coins earned for India Explorer
 * Only awarded on correct answer
 */
export function calculateExplorerCoins(correct: boolean): number {
  return correct ? EXPLORER_COINS_PER_CORRECT : 0;
}

/**
 * Calculate coins earned for Let'em Cook
 * Based on number of correct matches
 */
export function calculateLetEmCookCoins(correctCount: number): number {
  return correctCount * LET_EM_COOK_COINS_PER_CORRECT;
}

/**
 * Calculate coins earned for Flag Champs
 * Based on number of newly correct flags
 */
export function calculateFlagChampsCoins(newCorrect: number): number {
  return newCorrect * FLAG_CHAMPS_COINS_PER_CORRECT;
}
