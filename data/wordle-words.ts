// Word Validation for Wordle
// Validates guesses against a comprehensive word list (14,855 valid 5-letter words)
// 
// NOTE: Word content (WORDLE_WORDS array) has been migrated to Convex OTA.
// Only validation functions remain in this file.

// Import comprehensive word list for validation
import validWordList from '../assets/possible_wordle_words.json';

// Create Set once at module load for O(1) lookups
// Words are already uppercase in the JSON
export const VALID_WORDS: Set<string> = new Set(validWordList);

// Check if a word is valid for guessing (case-insensitive)
export function isValidWord(word: string): boolean {
  return VALID_WORDS.has(word.toUpperCase());
}

// Type for word data (used by OTA content)
export interface WordleWordData {
  word: string;
  hint: string;
}
