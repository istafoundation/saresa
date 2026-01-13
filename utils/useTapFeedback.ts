// Unified tap feedback utility - combines sound and haptics
import * as Haptics from 'expo-haptics';
import { useSoundEffects } from './sound-manager';

/**
 * Hook for providing consistent tap feedback (sound + haptics)
 * Use this for all interactive elements to ensure consistent UX
 */
export function useTapFeedback() {
  const { playTap, playKey } = useSoundEffects();
  
  /**
   * Trigger tap feedback with customizable intensity
   * @param intensity - 'light' for subtle taps, 'medium' for buttons, 'heavy' for important actions
   */
  const triggerTap = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    playTap();
    Haptics.impactAsync(
      intensity === 'light' ? Haptics.ImpactFeedbackStyle.Light :
      intensity === 'medium' ? Haptics.ImpactFeedbackStyle.Medium :
      Haptics.ImpactFeedbackStyle.Heavy
    );
  };
  
  /**
   * Trigger selection feedback - best for toggle switches and picker changes
   */
  const triggerSelection = () => {
    playTap();
    Haptics.selectionAsync();
  };
  
  /**
   * Trigger keyboard key feedback - for virtual keyboards
   */
  const triggerKey = () => {
    playKey();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  /**
   * Trigger haptic only (no sound) - for when sound is handled separately
   */
  const triggerHapticOnly = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    Haptics.impactAsync(
      intensity === 'light' ? Haptics.ImpactFeedbackStyle.Light :
      intensity === 'medium' ? Haptics.ImpactFeedbackStyle.Medium :
      Haptics.ImpactFeedbackStyle.Heavy
    );
  };
  
  return { 
    triggerTap, 
    triggerSelection, 
    triggerKey,
    triggerHapticOnly,
  };
}
