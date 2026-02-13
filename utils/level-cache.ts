
import { MMKV } from 'react-native-mmkv';

export let storage: MMKV;

try {
  storage = new MMKV({
    id: 'level-content-cache',
  });
} catch (e) {
  console.error("MMKV initiation failed. Falling back to in-memory storage.", e);
  
  class MemoryStorage {
    private map = new Map<string, string>();

    set(key: string, value: boolean | string | number) {
      if (typeof value === 'boolean') {
        this.map.set(key, value ? 'true' : 'false');
      } else if (typeof value === 'number') {
        this.map.set(key, value.toString());
      } else {
        this.map.set(key, value);
      }
    }

    getString(key: string) {
      return this.map.get(key);
    }

    getNumber(key: string) {
      const val = this.map.get(key);
      return val ? Number(val) : 0;
    }

    contains(key: string) {
      return this.map.has(key);
    }

    delete(key: string) {
      this.map.delete(key);
    }

    getAllKeys() {
      return Array.from(this.map.keys());
    }

    clearAll() {
      this.map.clear();
    }

    addOnValueChangedListener() {
      return { remove: () => {} };
    }
  }

  // @ts-ignore
  storage = new MemoryStorage();
}

// Keys
const KEY_MANIFEST = 'lf_manifest';
const KEY_LEVELS_META = 'lf_levels_meta';
const KEY_PROGRESS = 'lf_progress';
const KEY_SUBSCRIPTION = 'lf_sub_status';
const KEY_LAST_SYNC = 'lf_last_sync';

// Types (mirrors backend/JSON structure)
export interface LevelManifest {
  publishedAt: number;
  totalQuestions: number;
  levelVersions: Record<string, number>;
}

export interface LevelMeta {
  _id: string;
  levelNumber: number;
  name: string;
  description?: string;
  isEnabled: boolean;
  difficulties: Array<{
    name: string;
    displayName: string;
    requiredScore: number;
    order: number;
  }>;
  questionsVersion: number;
  theme?: {
    emoji: string;
    color: string;
  };
  groupId?: string;
  group?: {
    name: string;
    description?: string;
    order: number;
    theme?: {
      primaryColor: string;
      secondaryColor?: string;
      backgroundImage?: string;
      emoji?: string;
    };
  } | null;
}

export interface CachedLevelQuestions {
  levelId: string;
  version: number;
  questions: Record<string, any[]>; // difficulty -> questions[]
}

export interface CachedSubscription {
  isActive: boolean;
  activatedTill: number;
  subscriptionId?: string;
  planId?: string;
}

// === MANIFEST ===
export function getCachedManifest(): LevelManifest | null {
  const json = storage.getString(KEY_MANIFEST);
  return json ? JSON.parse(json) : null;
}

export function setCachedManifest(manifest: LevelManifest) {
  storage.set(KEY_MANIFEST, JSON.stringify(manifest));
}

// === LEVELS META ===
export function getLevelsMeta(): LevelMeta[] {
  const json = storage.getString(KEY_LEVELS_META);
  return json ? JSON.parse(json) : [];
}

export function setLevelsMeta(meta: LevelMeta[]) {
  storage.set(KEY_LEVELS_META, JSON.stringify(meta));
}

// === QUESTIONS ===
export function getQuestions(levelId: string): CachedLevelQuestions | null {
  const key = `lf_questions_${levelId}`;
  const json = storage.getString(key);
  return json ? JSON.parse(json) : null;
}

export function setQuestions(levelId: string, data: CachedLevelQuestions) {
  const key = `lf_questions_${levelId}`;
  storage.set(key, JSON.stringify(data));
}

/** O(1) check — does a level have cached questions? (No JSON.parse) */
export function hasQuestions(levelId: string): boolean {
  return storage.contains(`lf_questions_${levelId}`);
}

// === PROGRESS ===
export function getCachedProgress(): any[] {
  const json = storage.getString(KEY_PROGRESS);
  return json ? JSON.parse(json) : [];
}

export function setCachedProgress(progress: any[]) {
  storage.set(KEY_PROGRESS, JSON.stringify(progress));
}

/**
 * Merges server progress with local progress.
 * Strategy:
 * - Match by levelId
 * - For each level, match by difficulty
 * - Keep the "best" result (passed > not passed, high score > low score)
 * - Preserve local-only levels (unsynced progress)
 * - Add server-only levels
 */
export function mergeProgress(serverProgress: any[]): any[] {
  const localProgress = getCachedProgress();
  const mergedMap = new Map<string, any>();

  // 1. Index local progress by levelId
  for (const lp of localProgress) {
    mergedMap.set(lp.levelId, lp);
  }

  // 2. Merge server progress
  for (const sp of serverProgress) {
    const lp = mergedMap.get(sp.levelId);
    
    if (!lp) {
      // Server has level that local doesn't — just add it
      mergedMap.set(sp.levelId, sp);
      continue;
    }

    // Level exists in both — merge difficulties
    const mergedDifficulties = [...(lp.difficultyProgress || [])];

    // Check each server difficulty
    if (sp.difficultyProgress) {
      for (const sd of sp.difficultyProgress) {
        const localDiffIndex = mergedDifficulties.findIndex((d: any) => d.difficultyName === sd.difficultyName);
        
        if (localDiffIndex === -1) {
          // Server has difficulty local doesn't
          mergedDifficulties.push(sd);
        } else {
          // Both have it — keep best
          const ld = mergedDifficulties[localDiffIndex];
          
          const keepServer = 
            (sd.passed && !ld.passed) || 
            (sd.highScore > (ld.highScore || 0));
            
          if (keepServer) {
            mergedDifficulties[localDiffIndex] = {
              ...sd,
              // If we keep server, but local had more attempts, maybe sum them?
              // For now, simple "best state" wins.
              // If local deemed "passed" but server has higher score, we might want to flag passed?
              // Server passed should imply passed.
              // If local passed locally offline, keep that passed status if server says failed?
              // Check inverse:
            };
          } else {
             // Local is better or equal — keep local
             // ensure 'passed' is true if either is true
             if (sd.passed && !ld.passed) {
                 mergedDifficulties[localDiffIndex].passed = true;
             }
          }
        }
      }
    }

    // Re-verify completion status
    // If server says completed, or local says completed, trust the one with more difficulties passed?
    // Simply: Is completed if all required difficulties passed?
    // We'll trust the "isCompleted" flag from the source that provided the most recent/best update,
    // OR just recalculate if we had the rules here.
    // For now: specific override
    const isCompleted = sp.isCompleted || lp.isCompleted;

    mergedMap.set(sp.levelId, {
      ...lp, // base on local to keep extra fields if any
      ...sp, // overlay server
      difficultyProgress: mergedDifficulties,
      isCompleted
    });
  }

  return Array.from(mergedMap.values());
}

// === SUBSCRIPTION ===
export function getCachedSubscription(): CachedSubscription | null {
  const json = storage.getString(KEY_SUBSCRIPTION);
  return json ? JSON.parse(json) : null;
}

export function setCachedSubscription(sub: CachedSubscription) {
  storage.set(KEY_SUBSCRIPTION, JSON.stringify(sub));
}

// === SYNC METADATA ===
export function getLastSyncTime(): number {
  return storage.getNumber(KEY_LAST_SYNC) || 0;
}

export function setLastSyncTime(time: number) {
  storage.set(KEY_LAST_SYNC, time);
}

export function clearAllCache() {
  storage.clearAll();
}
