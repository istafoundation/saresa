
import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useChildAuth } from '../utils/childAuth';
import { useNetwork } from '../utils/network';
import { 
  getLevelsMeta, 
  getCachedProgress, 
  getCachedSubscription 
} from '../utils/level-cache';
import type { Id } from '../convex/_generated/dataModel';

type DifficultyProgress = {
  difficultyName: string;
  highScore: number;
  passed: boolean;
  attempts: number;
};

type LevelWithProgress = {
  _id: Id<"levels">;
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
  theme?: { emoji: string; color: string };
  state: "locked" | "unlocked" | "completed" | "coming_soon";
  progress: {
    difficultyProgress: DifficultyProgress[];
    isCompleted: boolean;
  } | null;
  groupId?: Id<"levelGroups">;
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
};

/**
 * Provides level data with offline-first semantics:
 * 1. When offline → immediately returns cached data (skip Convex entirely)
 * 2. When online  → uses live Convex data, with cache as fallback while loading
 * 3. Enforces subscription gating on premium levels when offline
 */
export function useOfflineLevels(): LevelWithProgress[] | undefined {
  const { token } = useChildAuth();
  const { isConnected } = useNetwork();

  // Skip Convex query entirely when offline to avoid wasted retries & bandwidth
  const liveLevels = useQuery(
    api.levels.getAllLevelsWithProgress,
    token && isConnected !== false ? { token } : "skip"
  );

  return useMemo(() => {
    // OFFLINE PATH: Always use cache when offline
    if (isConnected === false) {
      const cachedMeta = getLevelsMeta();
      if (cachedMeta.length === 0) {
        // No cache at all — truly first launch while offline
        return undefined;
      }
      return buildLevelsFromCache(cachedMeta);
    }

    // ONLINE PATH: Prefer live data, fall back to cache while loading
    if (liveLevels && liveLevels.length > 0) {
      return liveLevels as LevelWithProgress[];
    }

    // Live data still loading — use cache as interim display
    const cachedMeta = getLevelsMeta();
    if (cachedMeta.length > 0) {
      return buildLevelsFromCache(cachedMeta);
    }

    // No cache, no live data yet — still loading
    return liveLevels as any; // undefined → loading
  }, [liveLevels, isConnected]);
}

/**
 * Builds LevelWithProgress[] from cached MMKV data.
 * Replicates the server's logic for lock/unlock state and subscription gating.
 */
function buildLevelsFromCache(cachedMeta: ReturnType<typeof getLevelsMeta>): LevelWithProgress[] {
  const cachedProgress = getCachedProgress();
  const cachedSub = getCachedSubscription();

  // Build a map of progress by levelId
  const progressMap = new Map<string, any>();
  for (const p of cachedProgress) {
    progressMap.set(p.levelId, p);
  }

  // Determine subscription status for gating
  const isSubscribed = cachedSub?.isActive ?? false;

  let lastCompleted = true; // Levels unlock sequentially

  return cachedMeta.map((level, index) => {
    const progress = progressMap.get(level._id);

    // Build difficulty progress
    const difficultyProgress: DifficultyProgress[] = level.difficulties.map(d => {
      const dp = progress?.difficultyProgress?.find(
        (p: any) => p.difficultyName === d.name
      );
      return {
        difficultyName: d.name,
        highScore: dp?.highScore ?? 0,
        passed: dp?.passed ?? false,
        attempts: dp?.attempts ?? 0,
      };
    });

    const isCompleted = difficultyProgress.length > 0 && 
      difficultyProgress.every(dp => dp.passed);

    // Determine unlock state
    let state: "locked" | "unlocked" | "completed" | "coming_soon";
    
    // Check if we have any local progress on this level (even failed attempts)
    // If user has played it, they should keep access to it offline
    const hasLocalProgress = difficultyProgress.some(dp => dp.attempts > 0 || dp.passed);

    if (!level.isEnabled) {
      state = "coming_soon";
    } else if (isCompleted) {
      state = "completed";
    } else if (hasLocalProgress) {
      state = "unlocked";
    } else if (index === 0 || lastCompleted) {
      // First level is always unlocked, or the previous level was completed
      // Subscription gating: if not subscribed and not the first 3 levels, lock
      if (!isSubscribed && index >= 3) {
        state = "locked";
      } else {
        state = "unlocked";
      }
    } else {
      state = "locked";
    }

    // Track sequential completion for next level unlock
    lastCompleted = isCompleted;

    return {
      _id: level._id as Id<"levels">,
      levelNumber: level.levelNumber,
      name: level.name,
      description: level.description,
      isEnabled: level.isEnabled,
      difficulties: level.difficulties,
      theme: level.theme,
      state,
      progress: difficultyProgress.length > 0 ? {
        difficultyProgress,
        isCompleted,
      } : null,
      groupId: level.groupId as Id<"levelGroups"> | undefined,
      group: level.group ?? null,
    };
  });
}

