
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'level-content-cache',
});

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
  difficulties: any[];
  questionsVersion: number;
  // ... other fields
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
