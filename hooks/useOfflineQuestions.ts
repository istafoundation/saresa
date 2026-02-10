
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useChildAuth } from '../utils/childAuth';
import { useNetwork } from '../utils/network';
import { getQuestions as getCachedQuestions, setQuestions as setCachedQuestions } from '../utils/level-cache';
import { CONTENT_BASE_URL } from '../utils/sync-engine';

/**
 * Provides question data with offline-first semantics:
 * 1. Checks MMKV cache first
 * 2. Falls back to Convex live query when online
 * 3. Skips Convex query when offline to avoid wasted retries
 * 4. Exposes `fetchFromGitHub` for cache-miss fallback
 */
export function useOfflineQuestions(levelId: string | undefined, difficulty?: string) {
  const { token } = useChildAuth();
  const { isConnected } = useNetwork();
  const [questions, setQuestions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Skip Convex query entirely when offline or when we already have cached data
  const liveQuestions = useQuery(
    api.levels.getLevelQuestions,
    token && levelId && difficulty && isConnected !== false && !questions
      ? { token, levelId: levelId as any, difficultyName: difficulty }
      : "skip"
  );

  // 1. Check cache first
  useEffect(() => {
    if (!levelId) return;

    const cached = getCachedQuestions(levelId);
    if (cached && difficulty && cached.questions[difficulty]) {
      setQuestions(cached.questions[difficulty]);
      setLoading(false);
    } else {
      setQuestions(null); // Reset if level/difficulty changed
      setLoading(true);
    }
  }, [levelId, difficulty]);

  // 2. Use live data as fallback
  useEffect(() => {
    if (liveQuestions && liveQuestions.length > 0 && !questions) {
      setQuestions(liveQuestions);
      setLoading(false);
    }
  }, [liveQuestions, questions]);

  // 3. GitHub Pages fallback — callable from game.tsx when cache misses
  const fetchFromGitHub = useCallback(async () => {
    if (!levelId || !difficulty) return null;

    try {
      const res = await fetch(
        `${CONTENT_BASE_URL}/questions/level_${levelId}.json?t=${Date.now()}`
      );
      if (!res.ok) return null;

      const data = await res.json();
      // Cache it for next time
      setCachedQuestions(levelId, data);

      const diffQuestions = data.questions?.[difficulty];
      if (diffQuestions) {
        setQuestions(diffQuestions);
        setLoading(false);
        return diffQuestions;
      }
      return null;
    } catch (e) {
      console.error('[useOfflineQuestions] GitHub fallback failed:', e);
      return null;
    }
  }, [levelId, difficulty]);

  return { questions, loading, fetchFromGitHub };
}
