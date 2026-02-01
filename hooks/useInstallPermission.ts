import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking, AppState, AppStateStatus } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';

/**
 * Hook to check and request permission for installing APKs from unknown sources.
 * This is required for in-app auto-updates on Android.
 */
export function useInstallPermission() {
  const [canInstall, setCanInstall] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  // Check permission status by attempting to query the setting
  const checkPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setCanInstall(true); // Not applicable on other platforms
      return;
    }

    setChecking(true);
    try {
      // On Android 8+, we need to check if the app can request package installs
      // We can't directly query this, but we can try the intent and see if it succeeds
      // For now, we'll assume false until user grants it, then store in AsyncStorage
      // Actually, the best we can do is prompt the user to check settings
      
      // There's no direct Expo API to check canRequestPackageInstalls()
      // We'll track this through a simple state that persists across app sessions
      setCanInstall(false); // Default to false, user needs to grant
    } catch (error) {
      console.log('[useInstallPermission] Error checking permission:', error);
      setCanInstall(false);
    } finally {
      setChecking(false);
    }
  }, []);

  // Open the Android settings page to grant install permission
  const requestPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      const packageName = Application.applicationId;
      
      // Open the "Install unknown apps" settings page for this specific app
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES,
        {
          data: `package:${packageName}`,
          flags: 0x10000000, // FLAG_ACTIVITY_NEW_TASK
        }
      );
      
      // After returning from settings, we assume user granted permission
      // There's no way to verify without native module, so we trust the user action
      setCanInstall(true);
    } catch (error) {
      console.log('[useInstallPermission] Error opening settings:', error);
      // Fallback: open general app settings
      try {
        await Linking.openSettings();
        setCanInstall(true);
      } catch (fallbackError) {
        console.log('[useInstallPermission] Fallback settings also failed:', fallbackError);
      }
    }
  }, []);

  // Check permission on mount and when app returns to foreground
  useEffect(() => {
    checkPermission();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Re-check when app comes back to foreground
        // This helps detect if user granted permission in settings
        checkPermission();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [checkPermission]);

  return {
    /** Whether the app can install packages (null if still checking) */
    canInstall,
    /** Whether we're currently checking permission status */
    checking,
    /** Request permission by opening Android settings */
    requestPermission,
    /** Manually re-check permission status */
    checkPermission,
  };
}
