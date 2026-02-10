
import { 
  getCachedManifest, 
  setCachedManifest, 
  setLevelsMeta, 
  setQuestions, 
  setCachedProgress, 
  setCachedSubscription, 
  setLastSyncTime,
  LevelManifest,
  getLevelsMeta
} from './level-cache';
import { api } from '../convex/_generated/api';

const SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour
export const CONTENT_BASE_URL = "https://istafoundation.github.io/kids-content"; // Replace with your repo user/page

class SyncEngine {
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private lastSyncTime = 0;

  startPeriodicSync(convexClient: any, token: string) {
    // Initial sync
    this.sync(convexClient, token);
    
    // Periodic sync
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => this.sync(convexClient, token), SYNC_INTERVAL);
  }

  stopSync() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = null;
  }

  async sync(convexClient: any, token: string, force = false) {
    if (this.isSyncing) return;
    
    // Throttle if not forced (e.g. at least 5 mins between manual syncs if needed, 
    // but here we just rely on interval/state)
    const now = Date.now();
    if (!force && now - this.lastSyncTime < 5 * 60 * 1000) { 
       // Optionally throttle strict syncs, but let's allow it for now
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
      // Check if we have levelsMeta at all
      const hasLevelsMeta = getLevelsMeta().length > 0;
      
      const staleLevelIds: string[] = [];
      const allLevelIds = Object.keys(manifest.levelVersions);

      // If we don't have meta, we need to fetch it.
      // If manifest version > cached version, we need to fetch questions for that level.
      
      let metaUpdated = false;

      // Check if we need to update meta (if new levels added or forced)
      // We can use a hash or version in manifest for meta too, but usually it's small enough to just fetch if manifest changed.
      // For simplicity: if manifest publishedAt > cached publishedAt, fetch meta.
      if (!cachedManifest || manifest.publishedAt > cachedManifest.publishedAt || !hasLevelsMeta) {
        // Fetch Levels Meta
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

      // 3. Fetch Stale Questions
      // Fetch in parallel batches to avoid overloading connection/memory
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

      // 4. Fetch User Progess (Convex) - Counted Bandwidth (Small)
      // Using runQuery because query won't work inside non-component function easily without client
      const progress = await convexClient.query(api.levels.getBulkLevelProgress, { token });
      setCachedProgress(progress);

      // 5. Fetch Subscription (Convex) - Counted Bandwidth (Small)
      const subStatus = await convexClient.query(api.levels.getSubscriptionStatus, { token });
      setCachedSubscription(subStatus);

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
