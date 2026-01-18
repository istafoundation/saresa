/**
 * Content Hooks for OTA Content Management
 * 
 * React hooks for fetching game content with:
 * - Automatic caching
 * - Minimal inline fallbacks (no external file imports)
 * - Background refresh
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useChildAuth } from './childAuth';
import { useUserStore } from '../stores/user-store';
import {
  getCachedContent,
  setCachedContent,
  needsCacheRefresh,
} from './content-cache';

// ============================================
// INLINE MINIMAL FALLBACKS (for offline/error states)
// ============================================

// Minimal fallback - just a few words for emergency offline use
const FALLBACK_WORDLE = [
  { word: 'ABOUT', hint: 'Concerning or regarding something' },
  { word: 'HAPPY', hint: 'Feeling joy' },
  { word: 'BRAIN', hint: 'The organ for thinking' },
];

// Minimal fallback word sets
const FALLBACK_WORD_SETS = [
  { id: 1, theme: 'Colors', words: ['BLACK', 'WHITE', 'GREEN', 'BROWN', 'CORAL'] },
  { id: 2, theme: 'Animals', words: ['HORSE', 'SHEEP', 'TIGER', 'ZEBRA', 'WHALE'] },
];

// Minimal fallback hard questions
const FALLBACK_HARD_QUESTIONS = [
  { id: 1, question: 'What word means "extremely happy"?', answer: 'ELATED', hint: 'Feeling great joy' },
  { id: 2, question: 'What is a synonym for "angry"?', answer: 'IRATE', hint: 'Very mad' },
];

// Minimal fallback GK questions
const FALLBACK_GK_QUESTIONS = [
  {
    id: 'e1',
    question: 'Which sentence is grammatically correct?',
    options: ['She don\'t like apples', 'She doesn\'t like apples', 'She not like apples', 'She no like apples'],
    correctIndex: 1,
    difficulty: 'easy' as const,
    category: 'grammar',
    explanation: '"Doesn\'t" is the correct contraction of "does not" used with third-person singular subjects.',
  },
];

// Content types matching the schema
export type ContentStatus = 'loading' | 'cached' | 'fresh' | 'fallback' | 'error';

interface ContentResult<T> {
  content: T;
  status: ContentStatus;
  version: number;
  isStale: boolean;
  refresh: () => Promise<void>;
}

// ============================================
// GAME-SPECIFIC HOOKS
// ============================================

/**
 * Hook for Wordle content
 * OPTIMIZED: Uses specific daily word query to ensure rotation
 */
export function useWordleContent(): ContentResult<typeof FALLBACK_WORDLE> {
  // Use specific query for today's word instead of fetching all words
  const serverData = useQuery(api.content.getTodaysWordleWord);

  const [cachedData, setCachedData] = useState<typeof FALLBACK_WORDLE | null>(null);
  const [status, setStatus] = useState<ContentStatus>('loading');

  // Load cached content on mount
  useEffect(() => {
    getCachedContent<typeof FALLBACK_WORDLE>('wordle').then((cached) => {
      if (cached) {
        setCachedData(cached.data);
        setStatus('cached');
      }
    });
  }, []);

  // Update cache when server content arrives
  useEffect(() => {
    if (serverData) {
      // Wrap single word result in array to match expected interface
      const transformedContent = [serverData] as typeof FALLBACK_WORDLE;
      setCachedData(transformedContent);
      setStatus('fresh');
      
      // Cache with a generated daily version ID (using date string)
      // This is a bit of a hack since this query doesn't return a version, 
      // but effective for daily rotation
      const todayVersion = new Date().toISOString().split('T')[0]; 
      
      setCachedContent(
        'wordle',
        transformedContent,
        Date.now(), // Use timestamp as version for cache
        todayVersion // Use date string as checksum
      );
    }
  }, [serverData]);

  const content = useMemo(() => {
    if (serverData) {
      return [serverData] as typeof FALLBACK_WORDLE;
    }
    if (cachedData && cachedData.length > 0) return cachedData;
    return FALLBACK_WORDLE;
  }, [cachedData, serverData]);

  const refresh = useCallback(async () => {
    setStatus('loading');
    // Convex will auto-refresh via subscription
  }, []);

  return {
    content,
    status: content === FALLBACK_WORDLE ? 'fallback' : status,
    version: 1, // Simplified versioning for daily word
    isStale: status === 'cached',
    refresh,
  };
}

/**
 * Hook for Word Finder word sets (Easy mode)
 * OPTIMIZED: Uses group-filtered query + single combined query
 */
export function useWordFinderSets(): ContentResult<typeof FALLBACK_WORD_SETS> {
  const { token } = useChildAuth();
  const userGroup = useUserStore((s) => s.group);
  
  // Use group-filtered query for level-based content
  const serverData = useQuery(
    api.content.getGroupFilteredContentWithVersion,
    token ? { gameId: 'word-finder', type: 'word_set', userGroup } : 'skip'
  );

  const [cachedData, setCachedData] = useState<typeof FALLBACK_WORD_SETS | null>(null);
  const [status, setStatus] = useState<ContentStatus>('loading');

  useEffect(() => {
    getCachedContent<typeof FALLBACK_WORD_SETS>('word-finder-sets').then((cached) => {
      if (cached) {
        setCachedData(cached.data);
        setStatus('cached');
      }
    });
  }, []);

  useEffect(() => {
    if (serverData && serverData.content) {
      const transformedContent = serverData.content.map((c: any, i: number) => ({
        id: i + 1,
        ...c.data,
      })) as typeof FALLBACK_WORD_SETS;
      setCachedData(transformedContent);
      setStatus('fresh');
      setCachedContent(
        'word-finder-sets',
        transformedContent,
        serverData.version,
        serverData.checksum
      );
    }
  }, [serverData]);

  const content = useMemo(() => {
    if (cachedData && cachedData.length > 0) return cachedData;
    if (serverData?.content && serverData.content.length > 0) {
      return serverData.content.map((c: any, i: number) => ({ id: i + 1, ...c.data })) as typeof FALLBACK_WORD_SETS;
    }
    return FALLBACK_WORD_SETS;
  }, [cachedData, serverData]);

  const refresh = useCallback(async () => {
    setStatus('loading');
  }, []);

  return {
    content,
    status: content === FALLBACK_WORD_SETS ? 'fallback' : status,
    version: serverData?.version ?? 0,
    isStale: status === 'cached',
    refresh,
  };
}

/**
 * Hook for Word Finder hard questions (Hard mode)
 * OPTIMIZED: Uses group-filtered query + single combined query
 */
export function useWordFinderHardQuestions(): ContentResult<typeof FALLBACK_HARD_QUESTIONS> {
  const { token } = useChildAuth();
  const userGroup = useUserStore((s) => s.group);
  
  // Use group-filtered query for level-based content
  const serverData = useQuery(
    api.content.getGroupFilteredContentWithVersion,
    token ? { gameId: 'word-finder', type: 'hard_question', userGroup } : 'skip'
  );

  const [cachedData, setCachedData] = useState<typeof FALLBACK_HARD_QUESTIONS | null>(null);
  const [status, setStatus] = useState<ContentStatus>('loading');

  useEffect(() => {
    getCachedContent<typeof FALLBACK_HARD_QUESTIONS>('word-finder-hard').then((cached) => {
      if (cached) {
        setCachedData(cached.data);
        setStatus('cached');
      }
    });
  }, []);

  useEffect(() => {
    if (serverData && serverData.content) {
      const transformedContent = serverData.content.map((c: any, i: number) => ({
        id: i + 1,
        ...c.data,
      })) as typeof FALLBACK_HARD_QUESTIONS;
      setCachedData(transformedContent);
      setStatus('fresh');
      setCachedContent(
        'word-finder-hard',
        transformedContent,
        serverData.version,
        serverData.checksum
      );
    }
  }, [serverData]);

  const content = useMemo(() => {
    if (cachedData && cachedData.length > 0) return cachedData;
    if (serverData?.content && serverData.content.length > 0) {
      return serverData.content.map((c: any, i: number) => ({ id: i + 1, ...c.data })) as typeof FALLBACK_HARD_QUESTIONS;
    }
    return FALLBACK_HARD_QUESTIONS;
  }, [cachedData, serverData]);

  const refresh = useCallback(async () => {
    setStatus('loading');
  }, []);

  return {
    content,
    status: content === FALLBACK_HARD_QUESTIONS ? 'fallback' : status,
    version: serverData?.version ?? 0,
    isStale: status === 'cached',
    refresh,
  };
}

/**
 * Hook for English Insane (GK) questions
 * OPTIMIZED: Uses group-filtered query + single combined query
 */
export function useEnglishInsaneQuestions(): ContentResult<typeof FALLBACK_GK_QUESTIONS> {
  const { token } = useChildAuth();
  const userGroup = useUserStore((s) => s.group);
  
  // Use group-filtered query for level-based content
  const serverData = useQuery(
    api.content.getGroupFilteredContentWithVersion,
    token ? { gameId: 'english-insane', type: 'gk_question', userGroup } : 'skip'
  );

  const [cachedData, setCachedData] = useState<typeof FALLBACK_GK_QUESTIONS | null>(null);
  const [status, setStatus] = useState<ContentStatus>('loading');

  useEffect(() => {
    getCachedContent<typeof FALLBACK_GK_QUESTIONS>('english-insane').then((cached) => {
      if (cached) {
        setCachedData(cached.data);
        setStatus('cached');
      }
    });
  }, []);

  useEffect(() => {
    if (serverData && serverData.content) {
      const transformedContent = serverData.content.map((c: any) => ({
        id: c._id,
        ...c.data,
      })) as typeof FALLBACK_GK_QUESTIONS;
      setCachedData(transformedContent);
      setStatus('fresh');
      setCachedContent(
        'english-insane',
        transformedContent,
        serverData.version,
        serverData.checksum
      );
    }
  }, [serverData]);

  const content = useMemo(() => {
    if (cachedData && cachedData.length > 0) return cachedData;
    if (serverData?.content && serverData.content.length > 0) {
      return serverData.content.map((c: any) => ({
        id: c._id,
        ...c.data,
      })) as typeof FALLBACK_GK_QUESTIONS;
    }
    return FALLBACK_GK_QUESTIONS;
  }, [cachedData, serverData]);

  const refresh = useCallback(async () => {
    setStatus('loading');
  }, []);

  return {
    content,
    status: content === FALLBACK_GK_QUESTIONS ? 'fallback' : status,
    version: serverData?.version ?? 0,
    isStale: status === 'cached',
    refresh,
  };
}

// Minimal fallback Grammar Detective questions
const FALLBACK_GD_QUESTIONS = [
  {
    id: 'gd1',
    sentence: 'The quick brown fox jumps over the lazy dog.',
    words: ['The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog.'],
    questionText: 'Find ALL the adjectives in this sentence.',
    correctIndices: [1, 2, 7], // quick, brown, lazy
    explanation: 'Adjectives describe nouns. "Quick" and "brown" describe "fox", and "lazy" describes "dog".',
  },
];

// Type for Grammar Detective questions
export interface GrammarDetectiveQuestion {
  id: string;
  sentence: string;
  words: string[];
  questionText: string;
  correctIndices: number[];
  explanation: string;
}

/**
 * Hook for Grammar Detective (Parts of Speech) questions
 * OPTIMIZED: Uses single combined query instead of 2 separate queries
 */
export function useGrammarDetectiveQuestions(): ContentResult<GrammarDetectiveQuestion[]> {
  const { token } = useChildAuth();
  
  // OPTIMIZATION: Single query for content + version
  const serverData = useQuery(
    api.content.getGameContentWithVersion,
    token ? { gameId: 'grammar-detective' } : 'skip'
  );

  const [cachedData, setCachedData] = useState<GrammarDetectiveQuestion[] | null>(null);
  const [status, setStatus] = useState<ContentStatus>('loading');

  // Load cached content on mount
  useEffect(() => {
    getCachedContent<GrammarDetectiveQuestion[]>('grammar-detective').then((cached) => {
      if (cached) {
        setCachedData(cached.data);
        setStatus('cached');
      }
    });
  }, []);

  // Transform server content - memoized to avoid recomputation
  const transformedServerContent = useMemo(() => {
    if (!serverData?.content || serverData.content.length === 0) return null;
    return serverData.content.map((c: any) => ({
      id: c._id,
      ...c.data,
    })) as GrammarDetectiveQuestion[];
  }, [serverData?.content]);

  // Update cache when server content arrives
  useEffect(() => {
    if (transformedServerContent && transformedServerContent.length > 0) {
      setCachedData(transformedServerContent);
      setStatus('fresh');
      setCachedContent(
        'grammar-detective',
        transformedServerContent,
        serverData?.version ?? 0,
        serverData?.checksum ?? ''
      );
    }
  }, [transformedServerContent, serverData?.version, serverData?.checksum]);

  // Return content with priority: cached > server > fallback
  const content = useMemo(() => {
    if (cachedData && cachedData.length > 0) return cachedData;
    if (transformedServerContent && transformedServerContent.length > 0) return transformedServerContent;
    return FALLBACK_GD_QUESTIONS;
  }, [cachedData, transformedServerContent]);

  const refresh = useCallback(async () => {
    setStatus('loading');
  }, []);

  return {
    content,
    status: content === FALLBACK_GD_QUESTIONS ? 'fallback' : status,
    version: serverData?.version ?? 0,
    isStale: status === 'cached',
    refresh,
  };
}

// ============================================
// ANALYTICS HOOK (for tracking content usage)
// ============================================

/**
 * Hook for tracking content engagement
 * Call this when a piece of content is shown to the user
 */
export function useContentTracking() {
  const trackContentView = useCallback((contentId: string, gameId: string) => {
    // TODO: Call mutation to track view
    if (__DEV__) console.log('Content viewed:', contentId, gameId);
  }, []);

  const trackContentCorrect = useCallback((contentId: string, gameId: string) => {
    // TODO: Call mutation to track correct answer
    if (__DEV__) console.log('Content correct:', contentId, gameId);
  }, []);

  const trackContentIncorrect = useCallback((contentId: string, gameId: string) => {
    // TODO: Call mutation to track incorrect answer
    if (__DEV__) console.log('Content incorrect:', contentId, gameId);
  }, []);

  return {
    trackContentView,
    trackContentCorrect,
    trackContentIncorrect,
  };
}
