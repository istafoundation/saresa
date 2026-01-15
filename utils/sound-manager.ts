// Sound Manager - Handles SFX and background music
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useAudioPlayer, AudioPlayer } from 'expo-audio';
import { AppState, AppStateStatus } from 'react-native';
import { useUserStore } from '../stores/user-store';

// Sound asset paths
const SOUND_ASSETS = {
  correct: require('../assets/sounds/correct.m4a'),
  wrong: require('../assets/sounds/wrong.m4a'),
  win: require('../assets/sounds/win.m4a'),
  tap: require('../assets/sounds/tap.m4a'),
  key: require('../assets/sounds/key.m4a'),
  submit: require('../assets/sounds/submit.m4a'),
} as const;

const MUSIC_ASSET = require('../assets/sounds/questions_music.m4a');

export type SoundType = keyof typeof SOUND_ASSETS;

/**
 * Preload all sound effects for instant playback
 * Note: expo-audio handles preloading internally with useAudioPlayer
 * This function is kept for API compatibility but is essentially a no-op
 */
export async function preloadSounds(): Promise<void> {
  // expo-audio handles preloading internally with useAudioPlayer hooks
  // No manual preloading needed
}

/**
 * Hook for playing sound effects
 */
export function useSoundEffects() {
  const { soundEnabled, sfxVolume } = useUserStore();
  const isUnmountedRef = useRef(false);
  
  // Create players for each sound type
  const correctPlayer = useAudioPlayer(SOUND_ASSETS.correct);
  const wrongPlayer = useAudioPlayer(SOUND_ASSETS.wrong);
  const winPlayer = useAudioPlayer(SOUND_ASSETS.win);
  const tapPlayer = useAudioPlayer(SOUND_ASSETS.tap);
  const keyPlayer = useAudioPlayer(SOUND_ASSETS.key);
  const submitPlayer = useAudioPlayer(SOUND_ASSETS.submit);
  
  // Memoize players object to prevent recreation on every render
  // This fixes a potential memory leak where stale references were used in callbacks
  const players = useMemo<Record<SoundType, AudioPlayer>>(() => ({
    correct: correctPlayer,
    wrong: wrongPlayer,
    win: winPlayer,
    tap: tapPlayer,
    key: keyPlayer,
    submit: submitPlayer,
  }), [correctPlayer, wrongPlayer, winPlayer, tapPlayer, keyPlayer, submitPlayer]);
  
  // Track unmount state
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);
  
  // Update volumes when setting changes
  useEffect(() => {
    if (isUnmountedRef.current) return;
    
    Object.values(players).forEach(player => {
      try {
        player.volume = sfxVolume;
      } catch (e) {
        // Player may have been released
      }
    });
  }, [sfxVolume, players]);
  
  const playSound = useCallback((type: SoundType) => {
    if (!soundEnabled || isUnmountedRef.current) return;
    
    const player = players[type];
    if (player) {
      try {
        // Reset to start and play
        player.seekTo(0);
        player.play();
      } catch (e) {
        // Player may have been released
      }
    }
  }, [soundEnabled, players]);
  
  return {
    playCorrect: () => playSound('correct'),
    playWrong: () => playSound('wrong'),
    playWin: () => playSound('win'),
    playTap: () => playSound('tap'),
    playKey: () => playSound('key'),
    playSubmit: () => playSound('submit'),
    playSound,
  };
}

/**
 * Hook for background music
 */
export function useBackgroundMusic() {
  const { musicEnabled, musicVolume } = useUserStore();
  const musicPlayerRef = useRef<AudioPlayer | null>(null);
  const isUnmountedRef = useRef(false);
  const musicPlayer = useAudioPlayer(MUSIC_ASSET);
  
  // Store ref for cleanup and track unmount state
  useEffect(() => {
    musicPlayerRef.current = musicPlayer;
    isUnmountedRef.current = false;
    
    return () => {
      isUnmountedRef.current = true;
    };
  }, [musicPlayer]);
  
  // Update volume when setting changes
  useEffect(() => {
    if (musicPlayer && !isUnmountedRef.current) {
      try {
        musicPlayer.volume = musicVolume;
      } catch (e) {
        // Player may have been released
      }
    }
  }, [musicVolume, musicPlayer]);
  
  // Handle app state changes (pause on background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (musicPlayerRef.current && !isUnmountedRef.current) {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          try {
            musicPlayerRef.current.pause();
          } catch (e) {
            // Player may have been released
          }
        }
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);
  
  const startMusic = useCallback(() => {
    if (!musicEnabled || !musicPlayer || isUnmountedRef.current) return;
    
    try {
      musicPlayer.loop = true;
      musicPlayer.volume = musicVolume;
      musicPlayer.play();
    } catch (e) {
      // Player may have been released
    }
  }, [musicEnabled, musicVolume, musicPlayer]);
  
  const stopMusic = useCallback(() => {
    if (!musicPlayer) return;
    
    try {
      if (musicPlayer.playing) {
        musicPlayer.pause();
        musicPlayer.seekTo(0);
      }
    } catch (e) {
      // Player may have been released - this is expected during unmount
    }
  }, [musicPlayer]);
  
  const pauseMusic = useCallback(() => {
    if (!musicPlayer) return;
    
    try {
      if (musicPlayer.playing) {
        musicPlayer.pause();
      }
    } catch (e) {
      // Player may have been released
    }
  }, [musicPlayer]);
  
  const resumeMusic = useCallback(() => {
    if (!musicEnabled || !musicPlayer || isUnmountedRef.current) return;
    
    try {
      musicPlayer.play();
    } catch (e) {
      // Player may have been released
    }
  }, [musicEnabled, musicPlayer]);
  
  return {
    startMusic,
    stopMusic,
    pauseMusic,
    resumeMusic,
    isPlaying: musicPlayer?.playing ?? false,
  };
}

/**
 * Combined hook for games that need both SFX and music
 */
export function useGameAudio() {
  const sfx = useSoundEffects();
  const music = useBackgroundMusic();
  
  return {
    ...sfx,
    ...music,
  };
}
