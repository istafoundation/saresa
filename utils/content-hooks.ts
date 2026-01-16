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
 */
export function useWordleContent(): ContentResult<typeof FALLBACK_WORDLE> {
  const { token } = useChildAuth();
  
  // Fetch from Convex
  const serverContent = useQuery(
    api.content.getGameContent,
    token ? { gameId: 'wordle', type: 'wordle_word' } : 'skip'
  );
  
  const serverVersion = useQuery(
    api.content.getContentVersion,
    token ? { gameId: 'wordle' } : 'skip'
  );

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
    if (serverContent && serverVersion) {
      const transformedContent = serverContent.map((c: any) => c.data) as typeof FALLBACK_WORDLE;
      setCachedData(transformedContent);
      setStatus('fresh');
      setCachedContent(
        'wordle',
        transformedContent,
        serverVersion.version,
        serverVersion.checksum
      );
    }
  }, [serverContent, serverVersion]);

  const content = useMemo(() => {
    if (cachedData && cachedData.length > 0) return cachedData;
    if (serverContent && serverContent.length > 0) {
      return serverContent.map((c: any) => c.data) as typeof FALLBACK_WORDLE;
    }
    return FALLBACK_WORDLE;
  }, [cachedData, serverContent]);

  const refresh = useCallback(async () => {
    setStatus('loading');
    // Convex will auto-refresh via subscription
  }, []);

  return {
    content,
    status: content === FALLBACK_WORDLE ? 'fallback' : status,
    version: serverVersion?.version ?? 0,
    isStale: status === 'cached',
    refresh,
  };
}

/**
 * Hook for Word Finder word sets (Easy mode)
 */
export function useWordFinderSets(): ContentResult<typeof FALLBACK_WORD_SETS> {
  const { token } = useChildAuth();
  
  const serverContent = useQuery(
    api.content.getGameContent,
    token ? { gameId: 'word-finder', type: 'word_set' } : 'skip'
  );
  
  const serverVersion = useQuery(
    api.content.getContentVersion,
    token ? { gameId: 'word-finder' } : 'skip'
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
    if (serverContent && serverVersion) {
      const transformedContent = serverContent.map((c: any, i: number) => ({
        id: i + 1,
        ...c.data,
      })) as typeof FALLBACK_WORD_SETS;
      setCachedData(transformedContent);
      setStatus('fresh');
      setCachedContent(
        'word-finder-sets',
        transformedContent,
        serverVersion.version,
        serverVersion.checksum
      );
    }
  }, [serverContent, serverVersion]);

  const content = useMemo(() => {
    if (cachedData && cachedData.length > 0) return cachedData;
    if (serverContent && serverContent.length > 0) {
      return serverContent.map((c: any, i: number) => ({ id: i + 1, ...c.data })) as typeof FALLBACK_WORD_SETS;
    }
    return FALLBACK_WORD_SETS;
  }, [cachedData, serverContent]);

  const refresh = useCallback(async () => {
    setStatus('loading');
  }, []);

  return {
    content,
    status: content === FALLBACK_WORD_SETS ? 'fallback' : status,
    version: serverVersion?.version ?? 0,
    isStale: status === 'cached',
    refresh,
  };
}

/**
 * Hook for Word Finder hard questions (Hard mode)
 */
export function useWordFinderHardQuestions(): ContentResult<typeof FALLBACK_HARD_QUESTIONS> {
  const { token } = useChildAuth();
  
  const serverContent = useQuery(
    api.content.getGameContent,
    token ? { gameId: 'word-finder', type: 'hard_question' } : 'skip'
  );
  
  const serverVersion = useQuery(
    api.content.getContentVersion,
    token ? { gameId: 'word-finder' } : 'skip'
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
    if (serverContent && serverVersion) {
      const transformedContent = serverContent.map((c: any, i: number) => ({
        id: i + 1,
        ...c.data,
      })) as typeof FALLBACK_HARD_QUESTIONS;
      setCachedData(transformedContent);
      setStatus('fresh');
      setCachedContent(
        'word-finder-hard',
        transformedContent,
        serverVersion.version,
        serverVersion.checksum
      );
    }
  }, [serverContent, serverVersion]);

  const content = useMemo(() => {
    if (cachedData && cachedData.length > 0) return cachedData;
    if (serverContent && serverContent.length > 0) {
      return serverContent.map((c: any, i: number) => ({ id: i + 1, ...c.data })) as typeof FALLBACK_HARD_QUESTIONS;
    }
    return FALLBACK_HARD_QUESTIONS;
  }, [cachedData, serverContent]);

  const refresh = useCallback(async () => {
    setStatus('loading');
  }, []);

  return {
    content,
    status: content === FALLBACK_HARD_QUESTIONS ? 'fallback' : status,
    version: serverVersion?.version ?? 0,
    isStale: status === 'cached',
    refresh,
  };
}

/**
 * Hook for English Insane (GK) questions
 */
export function useEnglishInsaneQuestions(): ContentResult<typeof FALLBACK_GK_QUESTIONS> {
  const { token } = useChildAuth();
  
  const serverContent = useQuery(
    api.content.getGameContent,
    token ? { gameId: 'english-insane', type: 'gk_question' } : 'skip'
  );
  
  const serverVersion = useQuery(
    api.content.getContentVersion,
    token ? { gameId: 'english-insane' } : 'skip'
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
    if (serverContent && serverVersion) {
      const transformedContent = serverContent.map((c: any) => ({
        id: c._id,
        ...c.data,
      })) as typeof FALLBACK_GK_QUESTIONS;
      setCachedData(transformedContent);
      setStatus('fresh');
      setCachedContent(
        'english-insane',
        transformedContent,
        serverVersion.version,
        serverVersion.checksum
      );
    }
  }, [serverContent, serverVersion]);

  const content = useMemo(() => {
    if (cachedData && cachedData.length > 0) return cachedData;
    if (serverContent && serverContent.length > 0) {
      return serverContent.map((c: any) => ({
        id: c._id,
        ...c.data,
      })) as typeof FALLBACK_GK_QUESTIONS;
    }
    return FALLBACK_GK_QUESTIONS;
  }, [cachedData, serverContent]);

  const refresh = useCallback(async () => {
    setStatus('loading');
  }, []);

  return {
    content,
    status: content === FALLBACK_GK_QUESTIONS ? 'fallback' : status,
    version: serverVersion?.version ?? 0,
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

/**
 * Hook for Grammar Detective (Parts of Speech) questions
 */
export function useGrammarDetectiveQuestions(): ContentResult<typeof FALLBACK_GD_QUESTIONS> {
  const { token } = useChildAuth();
  
  // Fetch ALL content for grammar-detective, then filter client-side
  // (type filter was causing issues with the new pos_question type)
  const serverContent = useQuery(
    api.content.getGameContent,
    token ? { gameId: 'grammar-detective' } : 'skip'
  );
  
  const serverVersion = useQuery(
    api.content.getContentVersion,
    token ? { gameId: 'grammar-detective' } : 'skip'
  );

  // Debug logging
  console.log('[GDHook] Token:', !!token, 'ServerContent:', serverContent?.length, 'ServerVersion:', serverVersion?.version);

  const [cachedData, setCachedData] = useState<typeof FALLBACK_GD_QUESTIONS | null>(null);
  const [status, setStatus] = useState<ContentStatus>('loading');

  useEffect(() => {
    getCachedContent<typeof FALLBACK_GD_QUESTIONS>('grammar-detective').then((cached) => {
      if (cached) {
        setCachedData(cached.data);
        setStatus('cached');
      }
    });
  }, []);

  useEffect(() => {
    if (serverContent && serverContent.length > 0) {
      console.log('[GDHook] Received server content:', serverContent.length, 'items');
      const transformedContent = serverContent.map((c: any) => ({
        id: c._id,
        ...c.data,
      })) as typeof FALLBACK_GD_QUESTIONS;
      setCachedData(transformedContent);
      setStatus('fresh');
      setCachedContent(
        'grammar-detective',
        transformedContent,
        serverVersion?.version ?? 0,
        serverVersion?.checksum ?? ''
      );
    }
  }, [serverContent, serverVersion]);

  const content = useMemo(() => {
    if (cachedData && cachedData.length > 0) return cachedData;
    if (serverContent && serverContent.length > 0) {
      return serverContent.map((c: any) => ({
        id: c._id,
        ...c.data,
      })) as typeof FALLBACK_GD_QUESTIONS;
    }
    return FALLBACK_GD_QUESTIONS;
  }, [cachedData, serverContent]);

  const refresh = useCallback(async () => {
    setStatus('loading');
  }, []);

  return {
    content,
    status: content === FALLBACK_GD_QUESTIONS ? 'fallback' : status,
    version: serverVersion?.version ?? 0,
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
    console.log('Content viewed:', contentId, gameId);
  }, []);

  const trackContentCorrect = useCallback((contentId: string, gameId: string) => {
    // TODO: Call mutation to track correct answer
    console.log('Content correct:', contentId, gameId);
  }, []);

  const trackContentIncorrect = useCallback((contentId: string, gameId: string) => {
    // TODO: Call mutation to track incorrect answer
    console.log('Content incorrect:', contentId, gameId);
  }, []);

  return {
    trackContentView,
    trackContentCorrect,
    trackContentIncorrect,
  };
}
