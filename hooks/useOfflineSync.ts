
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useChildAuth } from '../utils/childAuth';
import { useNetwork } from '../utils/network';
import { syncEngine, SyncStatus } from '../utils/sync-engine';
import { drainQueue } from '../utils/offline-queue';
import { convex } from '../app/ConvexClientProvider';

/**
 * Hook that wires SyncEngine + offline queue drain into the app lifecycle.
 * 
 * Triggers:
 * - Start periodic sync when authenticated
 * - Drain offline queue when coming online
 * - Sync on app foreground (if >5min since last — throttled by SyncEngine)
 * - Sync on network recovery (offline → online)
 * 
 * Returns sync status for UI display.
 */
export function useOfflineSync() {
  const { token, isAuthenticated } = useChildAuth();
  const { isConnected } = useNetwork();
  const prevConnected = useRef<boolean | null>(null);
  const syncStarted = useRef(false);
  const contentSyncAttempted = useRef(false);
  const tokenRef = useRef<string | null>(token);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Keep tokenRef in sync so the getter always returns the latest value
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Token getter function — SyncEngine uses this instead of a stale closure
  const tokenGetter = useCallback(() => tokenRef.current, []);

  // Refresh sync status every 30s for UI display
  useEffect(() => {
    const refreshStatus = () => setSyncStatus(syncEngine.getSyncStatus());
    refreshStatus();
    const interval = setInterval(refreshStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

  // CONTENT-ONLY sync on mount — runs regardless of auth
  // Downloads manifest + meta + questions from GitHub Pages (public, free)
  useEffect(() => {
    if (contentSyncAttempted.current) return;
    if (isConnected === false) return; // Can't sync without internet

    contentSyncAttempted.current = true;
    console.log('[useOfflineSync] Triggering content-only sync (no auth needed)');
    syncEngine.syncContentOnly()
      .then(() => setSyncStatus(syncEngine.getSyncStatus()))
      .catch((e) =>
        console.error('[useOfflineSync] Content-only sync failed', e)
      );
  }, [isConnected]);

  // Start/stop periodic sync based on auth
  useEffect(() => {
    if (isAuthenticated && token && !syncStarted.current) {
      console.log('[useOfflineSync] Starting periodic sync');
      syncStarted.current = true;
      syncEngine.startPeriodicSync(convex, tokenGetter);
      // Refresh status after initial sync starts
      setTimeout(() => setSyncStatus(syncEngine.getSyncStatus()), 3000);
    }

    return () => {
      if (syncStarted.current) {
        syncEngine.stopSync();
        syncStarted.current = false;
      }
    };
  }, [isAuthenticated, token, tokenGetter]);

  // Drain queue + trigger sync on network recovery (offline → online)
  useEffect(() => {
    if (prevConnected.current === false && isConnected === true && token) {
      console.log('[useOfflineSync] Network recovered — draining queue and syncing');
      drainQueue(convex, token).catch((e) =>
        console.error('[useOfflineSync] Failed to drain queue', e)
      );
      syncEngine.sync(convex, token, true)
        .then(() => setSyncStatus(syncEngine.getSyncStatus()))
        .catch((e) =>
          console.error('[useOfflineSync] Failed to sync on recovery', e)
        );
    } else if (prevConnected.current === false && isConnected === true && !token) {
      // Network recovered but no auth — at least sync content
      console.log('[useOfflineSync] Network recovered (no auth) — content-only sync');
      syncEngine.syncContentOnly(true)
        .then(() => setSyncStatus(syncEngine.getSyncStatus()))
        .catch((e) =>
          console.error('[useOfflineSync] Content sync on recovery failed', e)
        );
    }
    prevConnected.current = isConnected;
  }, [isConnected, token]);

  // Sync on app foreground (SyncEngine throttles internally)
  useEffect(() => {
    if (!token) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // SyncEngine internally throttles, so safe to call
        syncEngine.sync(convex, token)
          .then(() => setSyncStatus(syncEngine.getSyncStatus()))
          .catch((e) =>
            console.error('[useOfflineSync] Failed to sync on foreground', e)
          );
        // Also try to drain any queued attempts
        drainQueue(convex, token).catch((e) =>
          console.error('[useOfflineSync] Failed to drain queue on foreground', e)
        );
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [token]);

  return syncStatus;
}

/**
 * Lightweight read-only hook — returns current sync status without starting the engine.
 * Safe to use in any component (no side effects).
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    const refresh = () => setStatus(syncEngine.getSyncStatus());
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, []);

  return status;
}
