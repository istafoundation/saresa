// User store - manages XP, levels, unlocks, and profile
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '../utils/storage';
import { getLevelForXP, LEVELS } from '../constants/levels';

// Zustand persist storage adapter for MMKV
const zustandStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};

export type MascotType = 'male' | 'female';

export interface UserState {
  // Profile
  name: string;
  mascot: MascotType;
  onboardingComplete: boolean;
  
  // Progression
  xp: number;
  streak: number;
  lastLoginDate: string | null;
  
  // Collections
  unlockedArtifacts: string[];
  unlockedWeapons: string[];
  
  // Weapon Pack Currency
  weaponShards: number;
  weaponDuplicates: Record<string, number>; // Track duplicate counts for each weapon
  
  // Sound Settings
  soundEnabled: boolean;
  musicEnabled: boolean;
  sfxVolume: number; // 0-1
  musicVolume: number; // 0-1
  
  // Computed (not persisted)
  level: number;
  levelTitle: string;
  
  // Actions
  setName: (name: string) => void;
  setMascot: (mascot: MascotType) => void;
  completeOnboarding: () => void;
  addXP: (amount: number) => { leveledUp: boolean; newLevel?: number; unlockedArtifact?: string };
  unlockArtifact: (artifactId: string) => void;
  unlockWeapon: (weaponId: string) => void;
  updateStreak: () => void;
  resetProgress: () => void;
  
  // Weapon Shards Actions
  addWeaponShards: (amount: number) => void;
  spendWeaponShards: (amount: number) => boolean; // Returns false if not enough shards
  addWeaponDuplicate: (weaponId: string) => void;
  canAffordPack: () => boolean;
  
  // Sound Actions
  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setSfxVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      name: '',
      mascot: 'male',
      onboardingComplete: false,
      xp: 0,
      streak: 0,
      lastLoginDate: null,
      unlockedArtifacts: [],
      unlockedWeapons: [],
      
      // Weapon Pack Currency (initial)
      weaponShards: 100, // Start with enough for 1 pack
      weaponDuplicates: {},
      
      // Sound Settings (defaults)
      soundEnabled: true,
      musicEnabled: true,
      sfxVolume: 0.7,
      musicVolume: 0.3,
      
      // Computed properties
      get level() {
        return getLevelForXP(get().xp).level;
      },
      get levelTitle() {
        return getLevelForXP(get().xp).title;
      },
      
      // Actions
      setName: (name) => set({ name }),
      
      setMascot: (mascot) => set({ mascot }),
      
      completeOnboarding: () => set({ onboardingComplete: true }),
      
      addXP: (amount) => {
        const currentXP = get().xp;
        const currentLevel = getLevelForXP(currentXP);
        const newXP = currentXP + amount;
        const newLevelInfo = getLevelForXP(newXP);
        
        const leveledUp = newLevelInfo.level > currentLevel.level;
        
        set({ xp: newXP });
        
        // Check for artifact unlock
        if (leveledUp && newLevelInfo.artifactId) {
          get().unlockArtifact(newLevelInfo.artifactId);
        }
        
        return {
          leveledUp,
          newLevel: leveledUp ? newLevelInfo.level : undefined,
          unlockedArtifact: leveledUp ? newLevelInfo.artifactId ?? undefined : undefined,
        };
      },
      
      unlockArtifact: (artifactId) => {
        const current = get().unlockedArtifacts;
        if (!current.includes(artifactId)) {
          set({ unlockedArtifacts: [...current, artifactId] });
        }
      },
      
      unlockWeapon: (weaponId) => {
        const current = get().unlockedWeapons;
        if (!current.includes(weaponId)) {
          set({ unlockedWeapons: [...current, weaponId] });
        }
      },
      
      updateStreak: () => {
        const today = new Date().toISOString().split('T')[0];
        const lastLogin = get().lastLoginDate;
        
        if (lastLogin === today) return; // Already logged in today
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastLogin === yesterdayStr) {
          // Consecutive day - increase streak
          set({ streak: get().streak + 1, lastLoginDate: today });
        } else {
          // Streak broken - reset
          set({ streak: 1, lastLoginDate: today });
        }
      },
      
      resetProgress: () => set({
        name: '',
        mascot: 'male',
        onboardingComplete: false,
        xp: 0,
        streak: 0,
        lastLoginDate: null,
        unlockedArtifacts: [],
        unlockedWeapons: [],
        weaponShards: 100,
        weaponDuplicates: {},
        soundEnabled: true,
        musicEnabled: true,
        sfxVolume: 0.7,
        musicVolume: 0.3,
      }),
      
      // Weapon Shards Actions
      addWeaponShards: (amount) => {
        set({ weaponShards: get().weaponShards + amount });
      },
      
      spendWeaponShards: (amount) => {
        const current = get().weaponShards;
        if (current >= amount) {
          set({ weaponShards: current - amount });
          return true;
        }
        return false;
      },
      
      addWeaponDuplicate: (weaponId) => {
        const current = get().weaponDuplicates;
        set({
          weaponDuplicates: {
            ...current,
            [weaponId]: (current[weaponId] || 0) + 1,
          },
        });
      },
      
      canAffordPack: () => {
        return get().weaponShards >= 100; // PACK_COST
      },
      
      // Sound Actions
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setMusicEnabled: (enabled) => set({ musicEnabled: enabled }),
      setSfxVolume: (volume) => set({ sfxVolume: Math.max(0, Math.min(1, volume)) }),
      setMusicVolume: (volume) => set({ musicVolume: Math.max(0, Math.min(1, volume)) }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        name: state.name,
        mascot: state.mascot,
        onboardingComplete: state.onboardingComplete,
        xp: state.xp,
        streak: state.streak,
        lastLoginDate: state.lastLoginDate,
        unlockedArtifacts: state.unlockedArtifacts,
        unlockedWeapons: state.unlockedWeapons,
        weaponShards: state.weaponShards,
        weaponDuplicates: state.weaponDuplicates,
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
        sfxVolume: state.sfxVolume,
        musicVolume: state.musicVolume,
      }),
    }
  )
);
