
import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { getQuestions } from '../utils/level-cache';

export function useOfflineQuestions(levelId: string | undefined, difficulty: string | undefined, token: string | undefined) {
  const [questions, setQuestions] = useState<any[] | undefined>(undefined);
  
  // Load from cache first
  useEffect(() => {
    if (levelId && difficulty) {
      try {
        const cached = getQuestions(levelId);
        if (cached && cached.questions && cached.questions[difficulty]) {
          console.log(`[useOfflineQuestions] Loaded ${cached.questions[difficulty].length} questions from cache for ${levelId}:${difficulty}`);
          setQuestions(cached.questions[difficulty]);
        }
      } catch (e) {
        console.error("Failed to load questions from cache", e);
      }
    }
  }, [levelId, difficulty]);

  // Try to fetch live data
  const liveQuestions = useQuery(
    api.levels.getLevelQuestions,
    token && levelId && difficulty
      ? { token, levelId: levelId as any, difficultyName: difficulty }
      : 'skip'
  );

  // Update with live data if available
  useEffect(() => {
    if (liveQuestions) {
      console.log(`[useOfflineQuestions] Syncing live questions: ${liveQuestions.length}`);
      setQuestions(liveQuestions);
    }
  }, [liveQuestions]);

  return questions;
}
