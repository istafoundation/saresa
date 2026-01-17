// User store - Local sound settings + Convex sync for user data AND game stats
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { getLevelForXP } from '../constants/levels';
import type { SyncedGameStats } from '../utils/useConvexSync';

export type MascotType = 'male' | 'female';

// User Data from Convex (synced)
export interface SyncedUserData {
  name: string;
  mascot: MascotType;
  xp: number;
  streak: number;
  lastLoginDate: string | null;
  unlockedArtifacts: string[];
  unlockedWeapons: string[];
  weaponShards: number;
  weaponDuplicates: Record<string, number>;
}

// Local settings (not synced)
export interface LocalSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  sfxVolume: number;
  musicVolume: number;
}

export interface UserState extends LocalSettings {
  // Synced data (from Convex)
  syncedData: SyncedUserData | null;
  syncedGameStats: SyncedGameStats | null;
  isLoading: boolean;
  
  // Flatted properties (updated via setters)
  name: string;
  mascot: MascotType;
  xp: number;
  streak: number;
  unlockedArtifacts: string[];
  unlockedWeapons: string[];
  weaponShards: number;
  weaponDuplicates: Record<string, number>;
  level: number;
  levelTitle: string;
  onboardingComplete: boolean;
  
  // Game stats (flattened)
  wordleStats: {
    gamesPlayed: number;
    gamesWon: number;
    currentStreak: number;
    maxStreak: number;
    guessDistribution: number[];
  };
  gkStats: {
    practiceTotal: number;
    practiceCorrect: number;
    lastCompetitiveDate: string | null;
  };
  wordFinderStats: {
    easyGamesPlayed: number;
    easyWordsFound: number;
    hardGamesPlayed: number;
    hardCorrectAnswers: number;
    totalXPEarned: number;
  };
  gdStats: {
    questionsAnswered: number;
    correctAnswers: number;
    totalXPEarned: number;
  };
  explorerStats: {
    correctAnswers: number;
    totalXPEarned: number;
    lastPlayedDate: string | null;
  };
  
  // Actions for synced data
  setSyncedData: (data: SyncedUserData | null) => void;
  setSyncedGameStats: (stats: SyncedGameStats | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Actions for local settings
  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setSfxVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  
  // Helper to check if can afford pack
  canAffordPack: () => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Synced data (populated from Convex)
      syncedData: null,
      syncedGameStats: null,
      isLoading: true,
      
      // Local settings (defaults)
      soundEnabled: true,
      musicEnabled: true,
      sfxVolume: 0.7,
      musicVolume: 0.9,
      
      // Initial values for flattened props
      name: '',
      mascot: 'male',
      xp: 0,
      streak: 0,
      unlockedArtifacts: [],
      unlockedWeapons: [],
      weaponShards: 0,
      weaponDuplicates: {},
      level: 1,
      levelTitle: 'Novice',
      onboardingComplete: false,
      
      wordleStats: {
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
        guessDistribution: [0, 0, 0, 0, 0, 0],
      },
      gkStats: {
        practiceTotal: 0,
        practiceCorrect: 0,
        lastCompetitiveDate: null,
      },
      wordFinderStats: {
        easyGamesPlayed: 0,
        easyWordsFound: 0,
        hardGamesPlayed: 0,
        hardCorrectAnswers: 0,
        totalXPEarned: 0,
      },
      gdStats: {
        questionsAnswered: 0,
        correctAnswers: 0,
        totalXPEarned: 0,
      },
      explorerStats: {
        correctAnswers: 0,
        totalXPEarned: 0,
        lastPlayedDate: null,
      },
      
      // Synced data actions
      setSyncedData: (data) => {
        console.log('[UserStore] Setting syncedData:', data ? `XP:${data.xp} Streak:${data.streak}` : 'null');
        
        // Calculate derived values immediately
        const levelInfo = getLevelForXP(data?.xp ?? 0);
        
        set({ 
          syncedData: data, 
          isLoading: false,
          // Flatten properties
          name: data?.name ?? '',
          mascot: data?.mascot ?? 'male',
          xp: data?.xp ?? 0,
          streak: data?.streak ?? 0,
          unlockedArtifacts: data?.unlockedArtifacts ?? [],
          unlockedWeapons: data?.unlockedWeapons ?? [],
          weaponShards: data?.weaponShards ?? 0,
          weaponDuplicates: data?.weaponDuplicates ?? {},
          level: levelInfo.level,
          levelTitle: levelInfo.title,
          onboardingComplete: data !== null,
        });
      },
      
      setSyncedGameStats: (stats) => {
        console.log('[UserStore] Setting syncedGameStats:', stats ? 'Stats Updated' : 'null');
        set({ 
          syncedGameStats: stats,
          // Flatten game stats
          wordleStats: {
            gamesPlayed: stats?.wordleGamesPlayed ?? 0,
            gamesWon: stats?.wordleGamesWon ?? 0,
            currentStreak: stats?.wordleCurrentStreak ?? 0,
            maxStreak: stats?.wordleMaxStreak ?? 0,
            guessDistribution: stats?.wordleGuessDistribution ?? [0, 0, 0, 0, 0, 0],
          },
          gkStats: {
            practiceTotal: stats?.gkPracticeTotal ?? 0,
            practiceCorrect: stats?.gkPracticeCorrect ?? 0,
            lastCompetitiveDate: stats?.gkLastCompetitiveDate ?? null,
          },
          wordFinderStats: {
            easyGamesPlayed: stats?.wfEasyGamesPlayed ?? 0,
            easyWordsFound: stats?.wfEasyWordsFound ?? 0,
            hardGamesPlayed: stats?.wfHardGamesPlayed ?? 0,
            hardCorrectAnswers: stats?.wfHardCorrectAnswers ?? 0,
            totalXPEarned: stats?.wfTotalXPEarned ?? 0,
          },
          gdStats: {
            questionsAnswered: stats?.gdQuestionsAnswered ?? 0,
            correctAnswers: stats?.gdCorrectAnswers ?? 0,
            totalXPEarned: stats?.gdTotalXPEarned ?? 0,
          },
          explorerStats: {
            correctAnswers: stats?.expCorrectAnswers ?? 0,
            totalXPEarned: stats?.expTotalXPEarned ?? 0,
            lastPlayedDate: stats?.expLastPlayedDate ?? null,
          },
        });
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      // Local settings actions
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setMusicEnabled: (enabled) => set({ musicEnabled: enabled }),
      setSfxVolume: (volume) => set({ sfxVolume: Math.max(0, Math.min(1, volume)) }),
      setMusicVolume: (volume) => set({ musicVolume: Math.max(0, Math.min(1, volume)) }),
      
      canAffordPack: () => {
        return (get().weaponShards ?? 0) >= 100;
      },
    }),
    {
      name: 'user-local-settings',
      storage: createJSONStorage(() => zustandStorage),
      // Only persist local settings
      partialize: (state) => ({
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
        sfxVolume: state.sfxVolume,
        musicVolume: state.musicVolume,
      }),
    }
  )
);
