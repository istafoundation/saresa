
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useChildAuth } from '../utils/childAuth';
import { useNetwork } from '../utils/network';
import { syncEngine } from '../utils/sync-engine';
import { drainQueue } from '../utils/offline-queue';
import { convex } from '../app/ConvexClientProvider';

/**
 * Hook that wires SyncEngine + offline queue drain into the app lifecycle.
 * 
 * Triggers:
 * - Start periodic sync when authenticated
 * - Drain offline queue when coming online
 * - Sync on app foreground (if >1h since last)
 * - Sync on network recovery (offline → online)
 */
export function useOfflineSync() {
  const { token, isAuthenticated } = useChildAuth();
  const { isConnected } = useNetwork();
  const prevConnected = useRef<boolean | null>(null);
  const syncStarted = useRef(false);

  // Start/stop periodic sync based on auth
  useEffect(() => {
    if (isAuthenticated && token && !syncStarted.current) {
      console.log('[useOfflineSync] Starting periodic sync');
      syncStarted.current = true;
      syncEngine.startPeriodicSync(convex, token);
    }

    return () => {
      if (syncStarted.current) {
        syncEngine.stopSync();
        syncStarted.current = false;
      }
    };
  }, [isAuthenticated, token]);

  // Drain queue + trigger sync on network recovery (offline → online)
  useEffect(() => {
    if (prevConnected.current === false && isConnected === true && token) {
      console.log('[useOfflineSync] Network recovered — draining queue and syncing');
      drainQueue(convex, token).catch((e) =>
        console.error('[useOfflineSync] Failed to drain queue', e)
      );
      syncEngine.sync(convex, token, true).catch((e) =>
        console.error('[useOfflineSync] Failed to sync on recovery', e)
      );
    }
    prevConnected.current = isConnected;
  }, [isConnected, token]);

  // Sync on app foreground (if >1h since last)
  useEffect(() => {
    if (!token) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // SyncEngine internally throttles, so safe to call
        syncEngine.sync(convex, token).catch((e) =>
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
}
