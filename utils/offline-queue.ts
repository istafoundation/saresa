
import { MMKV } from 'react-native-mmkv';
import { api } from '../convex/_generated/api';

let _storage: MMKV | null = null;
let _initFailed = false;

// In-memory fallback when MMKV/JSI is unavailable
const _memoryFallback = {
  getString: (_key: string) => undefined as string | undefined,
  set: (_key: string, _value: string | number | boolean) => {},
  delete: (_key: string) => {},
  getNumber: (_key: string) => 0,
  contains: (_key: string) => false,
  getAllKeys: () => [] as string[],
  clearAll: () => {},
} as unknown as MMKV;

function getStorage(): MMKV {
  if (_storage) return _storage;
  if (_initFailed) return _memoryFallback;

  try {
    _storage = new MMKV({ id: 'offline-queue' });
    return _storage;
  } catch (e) {
    console.warn('[OfflineQueue] MMKV init failed, using in-memory fallback:', (e as Error).message);
    _initFailed = true;
    return _memoryFallback;
  }
}
const QUEUE_KEY = 'mutation_queue';

export interface QueuedAttempt {
  id: string; // UUID
  levelId: string;
  difficultyName: string;
  score: number;
  timestamp: number;
  coinsAwarded: number; // Optimistic coins calculated locally
}

export function enqueueAttempt(attempt: QueuedAttempt) {
  const currentQueueStr = getStorage().getString(QUEUE_KEY);
  const queue: QueuedAttempt[] = currentQueueStr ? JSON.parse(currentQueueStr) : [];
  
  queue.push(attempt);
  getStorage().set(QUEUE_KEY, JSON.stringify(queue));
  console.log(`[OfflineQueue] Enqueued attempt for level ${attempt.levelId}`);
}

export async function drainQueue(convexClient: any, token: string) {
  const currentQueueStr = getStorage().getString(QUEUE_KEY);
  if (!currentQueueStr) return;
  
  const queue: QueuedAttempt[] = JSON.parse(currentQueueStr);
  if (queue.length === 0) return;

  console.log(`[OfflineQueue] Draining ${queue.length} items...`);

  const failedItems: QueuedAttempt[] = [];

  for (const item of queue) {
    try {
      await convexClient.mutation(api.levels.submitLevelAttempt, {
        token,
        levelId: item.levelId,
        difficultyName: item.difficultyName,
        score: item.score,
      });
    } catch (err: any) {
      console.error(`[OfflineQueue] Failed to submit item ${item.id}`, err);
      // Determine if retryable? For now, if code is generic error, maybe retry.
      // If validation error (e.g. level not found), discard.
      // For simplicity/robustness, we re-queue on network error.
      // If logic error, we might discard to avoid infinite loop.
      if (err.message && err.message.includes("Network request failed")) {
         failedItems.push(item);
      } else {
         // Assume non-retryable (e.g. auth failed, level deleted)
         // or handle specifically.
         // For now, let's just clear it to unblock unless it's strictly network.
      }
    }
  }

  if (failedItems.length > 0) {
    getStorage().set(QUEUE_KEY, JSON.stringify(failedItems));
  } else {
    getStorage().delete(QUEUE_KEY);
  }
  
  console.log(`[OfflineQueue] Drain complete. Remaining: ${failedItems.length}`);
}

export function getQueueLength(): number {
  const str = getStorage().getString(QUEUE_KEY);
  return str ? JSON.parse(str).length : 0;
}

/** Clear the offline queue (e.g. on logout to prevent cross-user leaks) */
export function clearQueue() {
  getStorage().delete(QUEUE_KEY);
}
