// User actions hook - Wraps Convex mutations for easy use in components
// Updated with comprehensive error handling and logging
import { useMemo } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@ista/convex/_generated/api';
import { useChildAuth } from './childAuth';

// Enable/disable debug logging (only in development)
const DEBUG_SYNC = __DEV__;

function logSync(action: string, data?: any) {
  if (DEBUG_SYNC) {
    console.log(`[ConvexSync] ${action}`, data ?? '');
  }
}

function logError(action: string, error: any) {
  console.error(`[ConvexSync] ${action} FAILED:`, error);
}

export function useUserActions() {
  const { token } = useChildAuth();
  const addXPMutation = useMutation(api.users.addXP);
  const updateCoinsMutation = useMutation(api.users.updateCoins);
  const addCoinsMutation = useMutation(api.users.addCoins);
  const unlockWeaponMutation = useMutation(api.users.unlockWeapon);
  const unlockArtifactMutation = useMutation(api.users.unlockArtifact);
  const addWeaponDuplicateMutation = useMutation(api.users.addWeaponDuplicate);
  const syncProgressionMutation = useMutation(api.users.syncProgression);

  const getAuthToken = () => {
    if (!token) {
      logError('Auth', 'No token available');
      return null;
    }
    return token;
  };

  return useMemo(() => ({
    addXP: async (amount: number): Promise<{ success: boolean; newXP?: number }> => {
      logSync('addXP', { amount });
      const authToken = getAuthToken();
      if (!authToken) return { success: false };

      try {
        const result = await addXPMutation({ amount, token: authToken });
        logSync('addXP SUCCESS', { newXP: result.newXP });
        return { success: true, newXP: result.newXP };
      } catch (error) {
        logError('addXP', error);
        return { success: false };
      }
    },
    
    addWeaponShards: async (amount: number): Promise<{ success: boolean; newCoins?: number }> => {
      // DEPRECATED: Use addCoins instead. This now adds coins.
      logSync('addWeaponShards (deprecated -> addCoins)', { amount });
      const authToken = getAuthToken();
      if (!authToken) return { success: false };

      try {
        const result = await updateCoinsMutation({ amount, operation: 'add', token: authToken });
        logSync('addWeaponShards SUCCESS', { newCoins: result.newCoins });
        return { success: true, newCoins: result.newCoins };
      } catch (error) {
        logError('addWeaponShards', error);
        return { success: false };
      }
    },
    
    addCoins: async (amount: number): Promise<{ success: boolean; newCoins?: number }> => {
      logSync('addCoins', { amount });
      const authToken = getAuthToken();
      if (!authToken) return { success: false };

      try {
        const result = await addCoinsMutation({ amount, token: authToken });
        logSync('addCoins SUCCESS', { newCoins: result.newCoins });
        return { success: true, newCoins: result.newCoins };
      } catch (error) {
        logError('addCoins', error);
        return { success: false };
      }
    },
    
    spendCoins: async (amount: number): Promise<boolean> => {
      logSync('spendCoins', { amount });
      const authToken = getAuthToken();
      if (!authToken) return false;

      try {
        const result = await updateCoinsMutation({ amount, operation: 'spend', token: authToken });
        logSync('spendCoins SUCCESS', { newCoins: result.newCoins });
        return true;
      } catch (error) {
        logError('spendCoins', error);
        return false;
      }
    },
    
    // DEPRECATED: Use spendCoins instead
    spendWeaponShards: async (amount: number): Promise<boolean> => {
      logSync('spendWeaponShards (deprecated -> spendCoins)', { amount });
      const authToken = getAuthToken();
      if (!authToken) return false;

      try {
        const result = await updateCoinsMutation({ amount, operation: 'spend', token: authToken });
        logSync('spendWeaponShards SUCCESS', { newCoins: result.newCoins });
        return true;
      } catch (error) {
        logError('spendWeaponShards', error);
        return false;
      }
    },
    
    unlockWeapon: async (weaponId: string): Promise<boolean> => {
      logSync('unlockWeapon', { weaponId });
      const authToken = getAuthToken();
      if (!authToken) return false;

      try {
        await unlockWeaponMutation({ weaponId, token: authToken });
        logSync('unlockWeapon SUCCESS', { weaponId });
        return true;
      } catch (error) {
        logError('unlockWeapon', error);
        return false;
      }
    },
    
    unlockArtifact: async (artifactId: string): Promise<boolean> => {
      logSync('unlockArtifact', { artifactId });
      const authToken = getAuthToken();
      if (!authToken) return false;

      try {
        await unlockArtifactMutation({ artifactId, token: authToken });
        logSync('unlockArtifact SUCCESS', { artifactId });
        return true;
      } catch (error) {
        logError('unlockArtifact', error);
        return false;
      }
    },
    
    addWeaponDuplicate: async (weaponId: string): Promise<boolean> => {
      logSync('addWeaponDuplicate', { weaponId });
      const authToken = getAuthToken();
      if (!authToken) return false;

      try {
        await addWeaponDuplicateMutation({ weaponId, token: authToken });
        logSync('addWeaponDuplicate SUCCESS', { weaponId });
        return true;
      } catch (error) {
        logError('addWeaponDuplicate', error);
        return false;
      }
    },

    syncProgression: async (): Promise<boolean> => {
      const authToken = getAuthToken();
      if (!authToken) return false;

      try {
        await syncProgressionMutation({ token: authToken });
        logSync('syncProgression CHECK COMPLETE');
        return true;
      } catch (error) {
        logError('syncProgression', error);
        return false;
      }
    },
  }), [token, addXPMutation, updateCoinsMutation, addCoinsMutation, unlockWeaponMutation, unlockArtifactMutation, addWeaponDuplicateMutation, syncProgressionMutation]);
}

// Game stats actions
export function useGameStatsActions() {
  const { token } = useChildAuth();
  const updateGKStatsMutation = useMutation(api.gameStats.updateGKStats);
  const updateWordleStatsMutation = useMutation(api.gameStats.updateWordleStats);
  const updateWordFinderStatsMutation = useMutation(api.gameStats.updateWordFinderStats);
  const useWordleHintMutation = useMutation(api.gameStats.useWordleHint);
  // Batched mutation for optimized game completion (reduces 3 API calls to 1)
  const finishWordleGameMutation = useMutation(api.gameStats.finishWordleGame);

  const getAuthToken = () => {
    if (!token) {
      logError('Auth', 'No token available');
      return null;
    }
    return token;
  };

  return {
    updateGKStats: async (data: {
      practiceTotal?: number;
      practiceCorrect?: number;
      playedCompetitive?: boolean;
    }): Promise<boolean> => {
      logSync('updateGKStats', data);
      const authToken = getAuthToken();
      if (!authToken) return false;

      try {
        await updateGKStatsMutation({ ...data, token: authToken });
        logSync('updateGKStats SUCCESS');
        return true;
      } catch (error) {
        logError('updateGKStats', error);
        return false;
      }
    },
    
    updateWordleStats: async (data: {
      won: boolean;
      guessCount?: number;
      usedHint?: boolean;
    }): Promise<{
      success: boolean;
      stats?: {
        gamesPlayed: number;
        gamesWon: number;
        currentStreak: number;
        maxStreak: number;
        guessDistribution: number[];
        usedHint: boolean;
      };
    }> => {
      logSync('updateWordleStats', data);
      const authToken = getAuthToken();
      if (!authToken) return { success: false };

      try {
        const result = await updateWordleStatsMutation({ ...data, token: authToken });
        logSync('updateWordleStats SUCCESS', result);
        return { success: true, stats: result };
      } catch (error) {
        logError('updateWordleStats', error);
        return { success: false };
      }
    },
    
    updateWordFinderStats: async (data: {
      mode: 'easy' | 'hard';
      wordsFound: number;
      xpEarned: number;
      correctAnswers?: number;
      timeRemaining?: number;
      hintUsed?: boolean;
    }): Promise<{ success: boolean; coinsEarned: number }> => {
      logSync('updateWordFinderStats', data);
      const authToken = getAuthToken();
      if (!authToken) return { success: false, coinsEarned: 0 };

      try {
        const result = await updateWordFinderStatsMutation({ ...data, token: authToken });
        logSync('updateWordFinderStats SUCCESS', result);
        return { success: true, coinsEarned: result.coinsEarned };
      } catch (error) {
        logError('updateWordFinderStats', error);
        return { success: false, coinsEarned: 0 };
      }
    },

    // Mark hint as used for today's Wordle (persists to Convex)
    markWordleHintUsed: async (): Promise<boolean> => {
      logSync('markWordleHintUsed');
      const authToken = getAuthToken();
      if (!authToken) return false;

      try {
        await useWordleHintMutation({ token: authToken });
        logSync('markWordleHintUsed SUCCESS');
        return true;
      } catch (error) {
        logError('markWordleHintUsed', error);
        return false;
      }
    },

    /**
     * BATCHED: Complete Wordle game with XP, coins, and stats in one call
     * Reduces 3 API calls to 1, improving performance and preventing race conditions
     * Note: Rewards are calculated server-side for security
     */
    finishWordleGame: async (data: {
      won: boolean;
      guessCount?: number;
      usedHint: boolean;
    }): Promise<{
      success: boolean;
      stats?: {
        gamesPlayed: number;
        gamesWon: number;
        currentStreak: number;
        maxStreak: number;
        guessDistribution: number[];
        usedHint: boolean;
      };
      newXP?: number;
      newCoins?: number;
      coinsEarned?: number;
    }> => {
      logSync('finishWordleGame', data);
      const authToken = getAuthToken();
      if (!authToken) return { success: false };

      try {
        const result = await finishWordleGameMutation({ ...data, token: authToken });
        logSync('finishWordleGame SUCCESS', { 
          newXP: result.newXP, 
          newCoins: result.newCoins,
          coinsEarned: result.coinsEarned,
          gamesPlayed: result.wordleStats.gamesPlayed 
        });
        return { 
          success: true, 
          stats: result.wordleStats,
          newXP: result.newXP,
          newCoins: result.newCoins,
          coinsEarned: result.coinsEarned,
        };
      } catch (error) {
        logError('finishWordleGame', error);
        return { success: false };
      }
    },
  };
}

