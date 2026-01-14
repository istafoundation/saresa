// User actions hook - Wraps Convex mutations for easy use in components
// Updated with comprehensive error handling and logging
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

// Enable/disable debug logging
const DEBUG_SYNC = __DEV__ || true;

function logSync(action: string, data?: any) {
  if (DEBUG_SYNC) {
    console.log(`[ConvexSync] ${action}`, data ?? '');
  }
}

function logError(action: string, error: any) {
  console.error(`[ConvexSync] ${action} FAILED:`, error);
}

export function useUserActions() {
  const addXPMutation = useMutation(api.users.addXP);
  const updateShardsMutation = useMutation(api.users.updateShards);
  const unlockWeaponMutation = useMutation(api.users.unlockWeapon);
  const unlockArtifactMutation = useMutation(api.users.unlockArtifact);
  const addWeaponDuplicateMutation = useMutation(api.users.addWeaponDuplicate);
  const syncProgressionMutation = useMutation(api.users.syncProgression);

  return {
    addXP: async (amount: number): Promise<{ success: boolean; newXP?: number }> => {
      logSync('addXP', { amount });
      try {
        const result = await addXPMutation({ amount });
        logSync('addXP SUCCESS', { newXP: result.newXP });
        return { success: true, newXP: result.newXP };
      } catch (error) {
        logError('addXP', error);
        return { success: false };
      }
    },
    
    addWeaponShards: async (amount: number): Promise<{ success: boolean; newShards?: number }> => {
      logSync('addWeaponShards', { amount });
      try {
        const result = await updateShardsMutation({ amount, operation: 'add' });
        logSync('addWeaponShards SUCCESS', { newShards: result.newShards });
        return { success: true, newShards: result.newShards };
      } catch (error) {
        logError('addWeaponShards', error);
        return { success: false };
      }
    },
    
    spendWeaponShards: async (amount: number): Promise<boolean> => {
      logSync('spendWeaponShards', { amount });
      try {
        const result = await updateShardsMutation({ amount, operation: 'spend' });
        logSync('spendWeaponShards SUCCESS', { newShards: result.newShards });
        return true;
      } catch (error) {
        logError('spendWeaponShards', error);
        return false;
      }
    },
    
    unlockWeapon: async (weaponId: string): Promise<boolean> => {
      logSync('unlockWeapon', { weaponId });
      try {
        await unlockWeaponMutation({ weaponId });
        logSync('unlockWeapon SUCCESS', { weaponId });
        return true;
      } catch (error) {
        logError('unlockWeapon', error);
        return false;
      }
    },
    
    unlockArtifact: async (artifactId: string): Promise<boolean> => {
      logSync('unlockArtifact', { artifactId });
      try {
        await unlockArtifactMutation({ artifactId });
        logSync('unlockArtifact SUCCESS', { artifactId });
        return true;
      } catch (error) {
        logError('unlockArtifact', error);
        return false;
      }
    },
    
    addWeaponDuplicate: async (weaponId: string): Promise<boolean> => {
      logSync('addWeaponDuplicate', { weaponId });
      try {
        await addWeaponDuplicateMutation({ weaponId });
        logSync('addWeaponDuplicate SUCCESS', { weaponId });
        return true;
      } catch (error) {
        logError('addWeaponDuplicate', error);
        return false;
      }
    },

    syncProgression: async (): Promise<boolean> => {
      // Internal mutation - no log params
      try {
        // We dynamically import the mutation here or if it confuses TS, we just assume it's bound
        // Actually, we need to bind the mutation at top level.
        // Re-writing this file to include the top-level hook binding is safer.
        await syncProgressionMutation();
        logSync('syncProgression CHECK COMPLETE');
        return true;
      } catch (error) {
        logError('syncProgression', error);
        return false;
      }
    },
  };
}

// Game stats actions
export function useGameStatsActions() {
  const updateGKStatsMutation = useMutation(api.gameStats.updateGKStats);
  const updateWordleStatsMutation = useMutation(api.gameStats.updateWordleStats);
  const updateWordFinderStatsMutation = useMutation(api.gameStats.updateWordFinderStats);

  return {
    updateGKStats: async (data: {
      practiceTotal?: number;
      practiceCorrect?: number;
      playedCompetitive?: boolean;
    }): Promise<boolean> => {
      logSync('updateGKStats', data);
      try {
        await updateGKStatsMutation(data);
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
    }): Promise<boolean> => {
      logSync('updateWordleStats', data);
      try {
        await updateWordleStatsMutation(data);
        logSync('updateWordleStats SUCCESS');
        return true;
      } catch (error) {
        logError('updateWordleStats', error);
        return false;
      }
    },
    
    updateWordFinderStats: async (data: {
      mode: 'easy' | 'hard';
      wordsFound: number;
      xpEarned: number;
      correctAnswers?: number;
    }): Promise<boolean> => {
      logSync('updateWordFinderStats', data);
      try {
        await updateWordFinderStatsMutation(data);
        logSync('updateWordFinderStats SUCCESS');
        return true;
      } catch (error) {
        logError('updateWordFinderStats', error);
        return false;
      }
    },
  };
}
