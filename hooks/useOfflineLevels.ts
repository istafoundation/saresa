
import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { getLevelsMeta, getCachedProgress } from '../utils/level-cache'; // You might need to export getLevelsMeta
import { useChildAuth } from '../utils/childAuth';

export function useOfflineLevels() {
  const { token } = useChildAuth();
  
  // Initialize with cache (instant load)
  const [levels, setLevels] = useState(() => {
    try {
      const meta = getLevelsMeta();
      const progress = getCachedProgress();
      
      if (!meta || meta.length === 0) return null;

      // Merge meta and progress to match LevelWithProgress type
      // We need to map progress array to a map for 0(1) lookup
      const progressMap = new Map(progress.map((p: any) => [p.levelId, p]));

      // Determine previous completion for locking logic (simple version)
      let previousLevelCompleted = true;

      return meta.map((level: any, index: number) => {
        const p = progressMap.get(level._id);
        
        let state = "locked";
        if (!level.isEnabled) state = "coming_soon";
        else if (p?.isCompleted) state = "completed";
        else if (previousLevelCompleted || index === 0) state = "unlocked";
        else state = "locked";

        if (level.isEnabled) {
            previousLevelCompleted = p?.isCompleted ?? false;
        }

        return {
          ...level,
          state,
          progress: p || null,
          group: null // We might not have group data in cached meta yet if we didn't store it fully resolved
                     // If LevelMeta stores groupId, we can't easily resolve group details without caching groups too.
                     // For now, we might accept missing group banners offline or cache groups too.
        };
      });
    } catch (e) {
      console.error("Failed to load levels from cache", e);
      return null;
    }
  });

  // Fetch live data
  const liveLevels = useQuery(
    api.levels.getAllLevelsWithProgress, 
    token ? { token } : "skip"
  );

  // Update state when live data arrives
  useEffect(() => {
    if (liveLevels) {
      setLevels(liveLevels);
    }
  }, [liveLevels]);

  return levels;
}
