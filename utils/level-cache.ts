
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
