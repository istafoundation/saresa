
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
  getLevelsMeta,
  hasQuestions,
  mergeProgress
} from './level-cache';
import { getQueueLength, drainQueue } from './offline-queue';
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
  contentSynced: boolean; // Whether content (questions) has been downloaded at least once
  lastError: string | null;
}

export type TokenGetter = () => string | null;

class SyncEngine {
  private isSyncing = false;
  private isContentSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private lastSyncTime = 0;
  private lastError: string | null = null;
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
      isSyncing: this.isSyncing || this.isContentSyncing,
      contentSynced: getLevelsMeta().length > 0,
      lastError: this.lastError,
    };
  }

  /**
   * Sync content only from GitHub Pages (no auth needed).
   * Downloads manifest, levels-meta, and stale questions.
   * Safe to call before login — these are public static files.
   */
  async syncContentOnly(force = false): Promise<boolean> {
    if (this.isContentSyncing) return false;

    const now = Date.now();
    // Throttle content-only syncs too (unless forced)
    if (!force && getLevelsMeta().length > 0 && now - this.lastSyncTime < THROTTLE_INTERVAL) {
      return false;
    }

    this.isContentSyncing = true;
    this.lastError = null;
    console.log("[SyncEngine] Starting content-only sync...");

    try {
      const contentSynced = await this._fetchContent(now);
      if (contentSynced) {
        console.log("[SyncEngine] Content-only sync complete.");
      }
      return contentSynced;
    } catch (err) {
      console.error("[SyncEngine] Content-only sync failed:", err);
      this.lastError = err instanceof Error ? err.message : String(err);
      return false;
    } finally {
      this.isContentSyncing = false;
    }
  }

  /**
   * Internal: fetch manifest + meta + questions from GitHub Pages.
   * Returns true if any content was fetched/updated.
   */
  private async _fetchContent(now: number): Promise<boolean> {
    // 1. Fetch Manifest (GitHub Pages) - Free Bandwidth
    const manifestRes = await fetch(`${CONTENT_BASE_URL}/manifest.json?t=${now}`);
    if (!manifestRes.ok) throw new Error(`Manifest fetch failed: ${manifestRes.status}`);
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
      } else {
         throw new Error(`Meta fetch failed: ${metaRes.status}`);
      }
    }

    // Identify questions to fetch
    for (const id of allLevelIds) {
      const remoteVer = manifest.levelVersions[id];
      const localVer = cachedVersions[id] ?? -1;
      
      // Fetch if version is newer OR if we don't have the questions cached for this level
      if (remoteVer > localVer || !hasQuestions(id)) {
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

    // SAVE MANIFEST IMMEDIATELY after content is fetched
    // This ensures content is persisted even if Convex progress fetch fails later
    if (staleLevelIds.length > 0 || metaUpdated || !cachedManifest) {
      setCachedManifest(manifest);
    }

    return metaUpdated || staleLevelIds.length > 0;
  }

  async sync(convexClient: any, token: string, force = false) {
    if (this.isSyncing) return;
    
    // Throttle: at least 5 min between non-forced syncs
    const now = Date.now();
    if (!force && now - this.lastSyncTime < THROTTLE_INTERVAL) {
      return;
    }

    this.isSyncing = true;
    this.lastError = null;
    console.log("[SyncEngine] Starting full sync...");

    try {
      // PHASE 0: Drain offline queue first (push local changes)
      // This ensures server has our latest before we fetch
      try {
        await drainQueue(convexClient, token);
      } catch (e) {
        console.error("[SyncEngine] Failed to drain queue:", e);
        // Continue to sync anyway
      }

      // PHASE 1: Content sync from GitHub Pages (free, no auth)
      // This succeeds or fails independently of Convex
      await this._fetchContent(now);
    } catch (err) {
      console.error("[SyncEngine] Content sync failed:", err);
      this.lastError = err instanceof Error ? err.message : String(err);
      // Continue — progress sync can still work
    }

    try {
      // PHASE 2: Progress + Subscription from Convex (needs auth, counted bandwidth)
      const syncData = await convexClient.query(api.levels.getSyncData, { token });
      
      // MERGE progress instead of overwriting
      const merged = mergeProgress(syncData.progress);
      setCachedProgress(merged);
      
      setCachedSubscription(syncData.subscription);

      setLastSyncTime(now);
      this.lastSyncTime = now;
      console.log("[SyncEngine] Full sync complete.");
    } catch (err) {
      // Content was already saved above — only progress failed
      // Still update lastSyncTime for content portion
      const contentCached = getLevelsMeta().length > 0;
      if (contentCached) {
        // Content was successfully synced, mark partial sync time
        setLastSyncTime(now);
        this.lastSyncTime = now;
        console.warn("[SyncEngine] Progress sync failed, but content is cached:", err);
      } else {
        console.error("[SyncEngine] Full sync failed:", err);
        // If content also failed, we already set lastError.
        // If content succeeded but progress failed, we should set error?
        // Maybe append?
        const msg = err instanceof Error ? err.message : String(err);
        this.lastError = this.lastError ? `${this.lastError} | ${msg}` : msg;
      }
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
