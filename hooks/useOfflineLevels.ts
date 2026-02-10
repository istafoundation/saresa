
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
 * 1. Uses cached data when offline (skip Convex query entirely)
 * 2. Enforces subscription gating on premium levels when offline
 * 3. Falls back to live Convex data when online
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
    // If live data is available, use it (freshest)
    if (liveLevels && liveLevels.length > 0) {
      return liveLevels as LevelWithProgress[];
    }

    // Fall back to cached data
    const cachedMeta = getLevelsMeta();
    if (cachedMeta.length === 0) return liveLevels as any; // null/undefined → loading

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
      if (!level.isEnabled) {
        state = "coming_soon";
      } else if (isCompleted) {
        state = "completed";
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
  }, [liveLevels]);
}
