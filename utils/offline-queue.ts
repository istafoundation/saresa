
import { MMKV } from 'react-native-mmkv';
import { api } from '../convex/_generated/api';

const storage = new MMKV({ id: 'offline-queue' });
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
  const currentQueueStr = storage.getString(QUEUE_KEY);
  const queue: QueuedAttempt[] = currentQueueStr ? JSON.parse(currentQueueStr) : [];
  
  queue.push(attempt);
  storage.set(QUEUE_KEY, JSON.stringify(queue));
  console.log(`[OfflineQueue] Enqueued attempt for level ${attempt.levelId}`);
}

export async function drainQueue(convexClient: any, token: string) {
  const currentQueueStr = storage.getString(QUEUE_KEY);
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
    storage.set(QUEUE_KEY, JSON.stringify(failedItems));
  } else {
    storage.delete(QUEUE_KEY);
  }
  
  console.log(`[OfflineQueue] Drain complete. Remaining: ${failedItems.length}`);
}

export function getQueueLength(): number {
  const str = storage.getString(QUEUE_KEY);
  return str ? JSON.parse(str).length : 0;
}
