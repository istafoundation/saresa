// Hook to sync Convex user data to local Zustand store
// Now also syncs game stats from Convex!
import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUserStore, type SyncedUserData } from '../stores/user-store';

// Enable/disable debug logging
const DEBUG_SYNC = __DEV__ || true;

function logSync(message: string, data?: any) {
  if (DEBUG_SYNC) {
    console.log(`[ConvexSync] ${message}`, data ?? '');
  }
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
}

export function useConvexSync() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const userData = useQuery(
    api.users.getMyData,
    isAuthenticated ? {} : "skip"
  );
  const { setSyncedData, setLoading, setSyncedGameStats } = useUserStore();

  useEffect(() => {
    logSync('Auth state changed', { isAuthenticated, authLoading, hasUserData: !!userData });

    if (!isAuthenticated) {
      logSync('Not authenticated, clearing data');
      setSyncedData(null);
      if (setSyncedGameStats) setSyncedGameStats(null);
      setLoading(false);
      return;
    }

    if (userData === undefined) {
      logSync('Loading user data from Convex...');
      setLoading(true);
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
    };

    logSync('Game stats synced from Convex', {
      wordleGamesPlayed: gameStats.wordleGamesPlayed,
      gkPracticeTotal: gameStats.gkPracticeTotal,
      wfEasyGamesPlayed: gameStats.wfEasyGamesPlayed,
    });

    setSyncedData(syncedData);
    if (setSyncedGameStats) setSyncedGameStats(gameStats);
    setLoading(false);
  }, [isAuthenticated, authLoading, userData, setSyncedData, setLoading, setSyncedGameStats]);

  return {
    isAuthenticated,
    isLoading: userData === undefined,
    hasUserData: userData !== null && userData !== undefined,
  };
}
