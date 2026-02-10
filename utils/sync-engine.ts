
import { 
  getCachedManifest, 
  setCachedManifest, 
  setLevelsMeta, 
  setQuestions, 
  setCachedProgress, 
  setCachedSubscription, 
  setLastSyncTime,
  getLastSyncTime,
  LevelManifest,
  getLevelsMeta
} from './level-cache';
import { getQueueLength } from './offline-queue';
import { api } from '../convex/_generated/api';

const SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour
const THROTTLE_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between non-forced syncs
export const CONTENT_BASE_URL = "https://istafoundation.github.io/kids-content";

// Sync status for UI consumption
export interface SyncStatus {
  lastSyncTime: number;
  cachedLevelCount: number;
  queueLength: number;
  isSyncing: boolean;
}

export type TokenGetter = () => string | null;

class SyncEngine {
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private lastSyncTime = 0;
  private tokenGetter: TokenGetter | null = null;
  private convexClient: any = null;

  startPeriodicSync(convexClient: any, tokenGetter: TokenGetter) {
    this.convexClient = convexClient;
    this.tokenGetter = tokenGetter;

    // Load last sync time from persisted cache
    this.lastSyncTime = getLastSyncTime();

    // Initial sync
    const token = tokenGetter();
    if (token) {
      this.sync(convexClient, token);
    }
    
    // Periodic sync — always gets fresh token via getter
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      const currentToken = this.tokenGetter?.();
      if (currentToken) {
        this.sync(this.convexClient, currentToken);
      }
    }, SYNC_INTERVAL);
  }

  stopSync() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = null;
    this.convexClient = null;
    this.tokenGetter = null;
  }

  /** Get current sync status for UI display */
  getSyncStatus(): SyncStatus {
    return {
      lastSyncTime: this.lastSyncTime || getLastSyncTime(),
      cachedLevelCount: getLevelsMeta().length,
      queueLength: getQueueLength(),
      isSyncing: this.isSyncing,
    };
  }

  async sync(convexClient: any, token: string, force = false) {
    if (this.isSyncing) return;
    
    // Throttle: at least 5 min between non-forced syncs
    const now = Date.now();
    if (!force && now - this.lastSyncTime < THROTTLE_INTERVAL) {
      return; // ← Fix: was missing this return
    }

    this.isSyncing = true;
    console.log("[SyncEngine] Starting sync...");

    try {
      // 1. Fetch Manifest (GitHub Pages) - Free Bandwidth
      const manifestRes = await fetch(`${CONTENT_BASE_URL}/manifest.json?t=${now}`);
      if (!manifestRes.ok) throw new Error("Failed to fetch manifest");
      const manifest: LevelManifest = await manifestRes.json();

      const cachedManifest = getCachedManifest();
      const cachedVersions = cachedManifest?.levelVersions || {};

      // 2. Determine Stale Levels
      const hasLevelsMeta = getLevelsMeta().length > 0;
      
      const staleLevelIds: string[] = [];
      const allLevelIds = Object.keys(manifest.levelVersions);

      let metaUpdated = false;

      // If manifest publishedAt > cached, or no meta cached, fetch meta
      if (!cachedManifest || manifest.publishedAt > cachedManifest.publishedAt || !hasLevelsMeta) {
        const metaRes = await fetch(`${CONTENT_BASE_URL}/levels-meta.json?t=${now}`);
        if (metaRes.ok) {
           const meta = await metaRes.json();
           setLevelsMeta(meta);
           metaUpdated = true;
        }
      }

      // Identify questions to fetch
      for (const id of allLevelIds) {
        const remoteVer = manifest.levelVersions[id];
        const localVer = cachedVersions[id] ?? -1;
        
        if (remoteVer > localVer) {
          staleLevelIds.push(id);
        }
      }

      console.log(`[SyncEngine] Found ${staleLevelIds.length} stale levels.`);

      // 3. Fetch Stale Questions in parallel batches
      const BATCH_SIZE = 5;
      for (let i = 0; i < staleLevelIds.length; i += BATCH_SIZE) {
        const batch = staleLevelIds.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (id) => {
          try {
             const qRes = await fetch(`${CONTENT_BASE_URL}/questions/level_${id}.json?t=${now}`);
             if (qRes.ok) {
               const qData = await qRes.json();
               setQuestions(id, qData);
             }
          } catch (e) {
            console.error(`[SyncEngine] Failed to fetch questions for ${id}`, e);
          }
        }));
      }

      // Update Manifest
      if (staleLevelIds.length > 0 || metaUpdated || !cachedManifest) {
        setCachedManifest(manifest);
      }

      // 4. Fetch Progress + Subscription in ONE Convex call (merged query)
      const syncData = await convexClient.query(api.levels.getSyncData, { token });
      setCachedProgress(syncData.progress);
      setCachedSubscription(syncData.subscription);

      setLastSyncTime(now);
      this.lastSyncTime = now;
      console.log("[SyncEngine] Sync complete.");

    } catch (err) {
      console.error("[SyncEngine] Sync failed:", err);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
