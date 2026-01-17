// Hook to sync Convex user data to local Zustand store
// Now also syncs game stats from Convex!
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUserStore, type SyncedUserData } from '../stores/user-store';
import { useChildAuth } from './childAuth';
import { useWordFinderStore } from '../stores/word-finder-store';
import { useGKStore } from '../stores/gk-store';
import { useGrammarDetectiveStore } from '../stores/grammar-detective-store';
import { useExplorerStore } from '../stores/explorer-store';
import { useWordleStore } from '../stores/wordle-store';
import { getISTDate } from './dates';

// Enable/disable debug logging (only in development)
const DEBUG_SYNC = __DEV__;

function logSync(message: string, data?: any) {
  if (DEBUG_SYNC) {
    console.log(`[ConvexSync] ${message}`, data ?? '');
  }
}

// Pre-computed daily game limits (from getMyData.computed)
// OPTIMIZATION: These eliminate 5+ separate Convex queries
export interface ComputedGameLimits {
  canPlayGKCompetitive: boolean;
  canPlayWordle: boolean;
  canPlayWordFinderEasy: boolean;
  canPlayWordFinderHard: boolean;
  didUseWordleHintToday: boolean;
  explorerGuessedToday: string[];
  explorerRemaining: number;
  explorerIsComplete: boolean;
}

// Extended synced data including game stats
export interface SyncedGameStats {
  // GK
  gkPracticeTotal: number;
  gkPracticeCorrect: number;
  gkLastCompetitiveDate: string | null;
  
  // Wordle
  wordleGamesPlayed: number;
  wordleGamesWon: number;
  wordleCurrentStreak: number;
  wordleMaxStreak: number;
  wordleGuessDistribution: number[];
  wordleLastPlayedDate: string | null;
  
  // Word Finder
  wfEasyGamesPlayed: number;
  wfEasyWordsFound: number;
  wfHardGamesPlayed: number;
  wfHardCorrectAnswers: number;
  wfTotalXPEarned: number;
  wfLastEasyDate: string | null;
  wfLastHardDate: string | null;
  wfEasyAttemptsToday: number;
  
  // Grammar Detective
  gdQuestionsAnswered: number;
  gdCorrectAnswers: number;
  gdTotalXPEarned: number;
  
  // Explorer
  expGuessedTodayCount: number;
  expTotalRegions: number;
  expLastPlayedDate: string | null;
  
  // OPTIMIZATION: Pre-computed daily limits (eliminates separate queries)
  limits: ComputedGameLimits;
}

export function useConvexSync() {
  const { isAuthenticated, isLoading: authLoading, token } = useChildAuth();
  
  // Track "today" in IST to force query refresh at midnight
  // This replaces the individual date checks in each game component
  const [todayStr, setTodayStr] = useState(getISTDate());
  
  useEffect(() => {
    const checkDate = () => {
      const current = getISTDate();
      if (current !== todayStr) {
        logSync('Day changed, updating query date', current);
        setTodayStr(current);
      }
    };
    
    // Check every minute
    const interval = setInterval(checkDate, 60000);
    
    // Check on app resume
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') checkDate();
    });
    
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [todayStr]);

  const userData = useQuery(
    api.users.getMyData,
    isAuthenticated && token ? { token, clientDate: todayStr } : "skip" // added clientDate
  );
  const { setSyncedData, setLoading, setSyncedGameStats } = useUserStore();

  useEffect(() => {
    logSync('Auth state changed', { isAuthenticated, authLoading, hasUserData: !!userData });

    if (!isAuthenticated) {
      logSync('Not authenticated, clearing data');
      setSyncedData(null);
      if (setSyncedGameStats) setSyncedGameStats(null);
      setLoading(false);

      // Reset all game stores to prevent data leakage between users
      useWordFinderStore.getState().resetGame();
      useGKStore.getState().resetQuiz();
      useGrammarDetectiveStore.getState().resetGame();
      useExplorerStore.getState().resetGame();
      useWordleStore.getState().reset();
      return;
    }

    if (userData === undefined) {
      // Loading state when we have a token but no data yet
      if (token) {
        logSync('Loading user data from Convex...');
        setLoading(true);
      }
      return;
    }

    if (userData === null) {
      // Authenticated but no user data (new user in onboarding)
      logSync('Authenticated but no user in database (onboarding)');
      setSyncedData(null);
      if (setSyncedGameStats) setSyncedGameStats(null);
      setLoading(false);
      return;
    }

    // Map Convex data to store format - USER DATA
    // We utilize defensive defaults (??) to handle potential schema mismatches or missing fields
    const syncedData: SyncedUserData = {
      name: userData.name ?? 'Explorer',
      mascot: (userData.mascot as 'male' | 'female') ?? 'male',
      xp: userData.xp ?? 0,
      streak: userData.streak ?? 0,
      lastLoginDate: userData.lastLoginDate ?? null,
      unlockedArtifacts: userData.unlockedArtifacts ?? [],
      unlockedWeapons: userData.unlockedWeapons ?? [],
      weaponShards: userData.weaponShards ?? 0,
      weaponDuplicates: (userData.weaponDuplicates as Record<string, number>) ?? {},
    };

    logSync('User data synced from Convex', { 
      name: syncedData.name, 
      xp: syncedData.xp,
      streak: syncedData.streak,
      weaponShards: syncedData.weaponShards,
      weaponsCount: syncedData.unlockedWeapons.length,
      rawXP: userData.xp, // Debug: check what raw data has
    });

    // Extract computed limits from server (pre-computed in getMyData)
    const computed = (userData as any).computed;
    const limits: ComputedGameLimits = computed ? {
      canPlayGKCompetitive: computed.canPlayGKCompetitive ?? true,
      canPlayWordle: computed.canPlayWordle ?? true,
      canPlayWordFinderEasy: computed.canPlayWordFinderEasy ?? true,
      canPlayWordFinderHard: computed.canPlayWordFinderHard ?? true,
      didUseWordleHintToday: computed.didUseWordleHintToday ?? false,
      explorerGuessedToday: computed.explorerGuessedToday ?? [],
      explorerRemaining: computed.explorerRemaining ?? 36,
      explorerIsComplete: computed.explorerIsComplete ?? false,
    } : {
      // Fallback: compute locally if server doesn't provide (backward compat)
      canPlayGKCompetitive: userData.gkLastCompetitiveDate !== getISTDate(),
      canPlayWordle: userData.wordleLastPlayedDate !== getISTDate(),
      canPlayWordFinderEasy: userData.wfLastEasyDate !== getISTDate() || userData.wfEasyAttemptsToday < 2,
      canPlayWordFinderHard: userData.wfLastHardDate !== getISTDate(),
      didUseWordleHintToday: userData.wordleHintUsedDate === getISTDate(),
      explorerGuessedToday: userData.expLastPlayedDate === getISTDate() ? (userData.expGuessedToday ?? []) : [],
      explorerRemaining: userData.expLastPlayedDate === getISTDate() ? 36 - (userData.expGuessedToday?.length ?? 0) : 36,
      explorerIsComplete: userData.expLastPlayedDate === getISTDate() ? (userData.expGuessedToday?.length ?? 0) >= 36 : false,
    };

    // Map GAME STATS from Convex
    const gameStats: SyncedGameStats = {
      // GK
      gkPracticeTotal: userData.gkPracticeTotal ?? 0,
      gkPracticeCorrect: userData.gkPracticeCorrect ?? 0,
      gkLastCompetitiveDate: userData.gkLastCompetitiveDate ?? null,
      
      // Wordle
      wordleGamesPlayed: userData.wordleGamesPlayed ?? 0,
      wordleGamesWon: userData.wordleGamesWon ?? 0,
      wordleCurrentStreak: userData.wordleCurrentStreak ?? 0,
      wordleMaxStreak: userData.wordleMaxStreak ?? 0,
      wordleGuessDistribution: userData.wordleGuessDistribution ?? [0,0,0,0,0,0],
      wordleLastPlayedDate: userData.wordleLastPlayedDate ?? null,
      
      // Word Finder
      wfEasyGamesPlayed: userData.wfEasyGamesPlayed ?? 0,
      wfEasyWordsFound: userData.wfEasyWordsFound ?? 0,
      wfHardGamesPlayed: userData.wfHardGamesPlayed ?? 0,
      wfHardCorrectAnswers: userData.wfHardCorrectAnswers ?? 0,
      wfTotalXPEarned: userData.wfTotalXPEarned ?? 0,
      wfLastEasyDate: userData.wfLastEasyDate ?? null,
      wfLastHardDate: userData.wfLastHardDate ?? null,
      wfEasyAttemptsToday: userData.wfEasyAttemptsToday ?? 0,
      
      // Grammar Detective
      gdQuestionsAnswered: userData.gdQuestionsAnswered ?? 0,
      gdCorrectAnswers: userData.gdCorrectAnswers ?? 0,
      gdTotalXPEarned: userData.gdTotalXPEarned ?? 0,
      
      // Explorer
      expGuessedTodayCount: limits.explorerGuessedToday.length,
      expTotalRegions: 36,
      expLastPlayedDate: userData.expLastPlayedDate ?? null,
      
      // OPTIMIZATION: Pre-computed limits from server
      limits,
    };

    logSync('Game stats synced from Convex', {
      wordleGamesPlayed: gameStats.wordleGamesPlayed,
      gkPracticeTotal: gameStats.gkPracticeTotal,
      wfEasyGamesPlayed: gameStats.wfEasyGamesPlayed,
    });

    setSyncedData(syncedData);
    if (setSyncedGameStats) setSyncedGameStats(gameStats);
    setLoading(false);
  }, [isAuthenticated, authLoading, userData, setSyncedData, setLoading, setSyncedGameStats, token]);

  return {
    isAuthenticated,
    isLoading: userData === undefined,
    hasUserData: userData !== null && userData !== undefined,
  };
}
