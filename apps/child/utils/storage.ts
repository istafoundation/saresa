// MMKV storage utility for high-performance persistence
import { MMKV } from 'react-native-mmkv';

// Lazy initialization to avoid JSI errors during module load
let _storage: MMKV | null = null;
let _initializationAttempted = false;
let _initializationError: Error | null = null;
let _fallbackWarningLogged = false;

function getStorage(): MMKV | null {
  if (_storage) return _storage;
  
  // Don't retry if we already failed
  if (_initializationAttempted && _initializationError) {
    // Only log the warning once to avoid console spam
    if (!_fallbackWarningLogged) {
      console.warn('MMKV not available, using fallback. Original error:', _initializationError.message);
      _fallbackWarningLogged = true;
    }
    return null;
  }
  
  _initializationAttempted = true;
  
  try {
    _storage = new MMKV({
      id: 'detective-mythology-storage',
    });
    return _storage;
  } catch (error) {
    _initializationError = error as Error;
    console.warn('Failed to initialize MMKV:', (error as Error).message);
    return null;
  }
}

// In-memory fallback storage for when MMKV is not available
const memoryStorage: Map<string, string | number | boolean> = new Map();

// Export a getter for backward compatibility
export const storage = {
  getString: (key: string) => {
    const s = getStorage();
    if (s) return s.getString(key);
    const val = memoryStorage.get(key);
    return typeof val === 'string' ? val : undefined;
  },
  getNumber: (key: string) => {
    const s = getStorage();
    if (s) return s.getNumber(key);
    const val = memoryStorage.get(key);
    return typeof val === 'number' ? val : undefined;
  },
  getBoolean: (key: string) => {
    const s = getStorage();
    if (s) return s.getBoolean(key);
    const val = memoryStorage.get(key);
    return typeof val === 'boolean' ? val : undefined;
  },
  set: (key: string, value: string | number | boolean) => {
    const s = getStorage();
    if (s) {
      s.set(key, value);
    } else {
      memoryStorage.set(key, value);
    }
  },
  delete: (key: string) => {
    const s = getStorage();
    if (s) {
      s.delete(key);
    } else {
      memoryStorage.delete(key);
    }
  },
  clearAll: () => {
    const s = getStorage();
    if (s) {
      s.clearAll();
    } else {
      memoryStorage.clear();
    }
  },
  getAllKeys: () => {
    const s = getStorage();
    if (s) {
      return s.getAllKeys();
    } else {
      return Array.from(memoryStorage.keys());
    }
  },
};

// Helper functions for typed storage access
export const storageUtils = {
  // String
  getString: (key: string): string | undefined => storage.getString(key),
  setString: (key: string, value: string) => storage.set(key, value),
  
  // Number
  getNumber: (key: string): number | undefined => storage.getNumber(key),
  setNumber: (key: string, value: number) => storage.set(key, value),
  
  // Boolean
  getBoolean: (key: string): boolean | undefined => storage.getBoolean(key),
  setBoolean: (key: string, value: boolean) => storage.set(key, value),
  
  // JSON objects
  getObject: <T>(key: string): T | undefined => {
    const json = storage.getString(key);
    if (!json) return undefined;
    try {
      return JSON.parse(json) as T;
    } catch {
      return undefined;
    }
  },
  setObject: <T>(key: string, value: T) => {
    storage.set(key, JSON.stringify(value));
  },
  
  // Delete
  delete: (key: string) => storage.delete(key),
  
  // Clear all
  clearAll: () => storage.clearAll(),
};

// Storage keys
export const STORAGE_KEYS = {
  // User data
  USER_XP: 'user_xp',
  USER_LEVEL: 'user_level',
  USER_STREAK: 'user_streak',
  USER_MASCOT: 'user_mascot',
  USER_NAME: 'user_name',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  
  // Unlocked content
  UNLOCKED_ARTIFACTS: 'unlocked_artifacts',
  UNLOCKED_WEAPONS: 'unlocked_weapons',
  
  // Game state
  GK_LAST_COMPETITIVE_DATE: 'gk_last_competitive_date',
  GK_PRACTICE_STATS: 'gk_practice_stats',
  
  // Wordle
  WORDLE_STATE: 'wordle_state',
  WORDLE_STATS: 'wordle_stats',
  WORDLE_LAST_PLAYED_DATE: 'wordle_last_played_date',
  
  // Misc
  LAST_LOGIN_DATE: 'last_login_date',
  DAILY_FACT_INDEX: 'daily_fact_index',
};

// Zustand persist storage adapter for MMKV
// Use this in all Zustand stores instead of duplicating the adapter
export const zustandStorage = {
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

// ============================================
// LEVEL PROGRESSION STORAGE
// ============================================

export interface LevelGameState {
  currentIndex: number;
  correctCount: number;
  timestamp: number;
}

export const saveLevelProgress = (
  levelId: string,
  difficultyName: string,
  state: Omit<LevelGameState, 'timestamp'>
) => {
  const key = `level_progress_${levelId}_${difficultyName}`;
  const data: LevelGameState = {
    ...state,
    timestamp: Date.now(),
  };
  storage.set(key, JSON.stringify(data));
};

export const loadLevelProgress = (
  levelId: string,
  difficultyName: string
): LevelGameState | null => {
  const key = `level_progress_${levelId}_${difficultyName}`;
  const data = storage.getString(key);
  
  if (data) {
    try {
      return JSON.parse(data) as LevelGameState;
    } catch (e) {
      console.error('Failed to parse game state', e);
      return null;
    }
  }
  return null;
};

export const clearLevelProgress = (levelId: string, difficultyName: string) => {
  const key = `level_progress_${levelId}_${difficultyName}`;
  storage.delete(key);
};

export const hasLevelProgress = (levelId: string, difficultyName: string): boolean => {
  const key = `level_progress_${levelId}_${difficultyName}`;
  return !!storage.getString(key);
};