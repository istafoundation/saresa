import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, NativeModules, BackHandler, AppState, Modal, TouchableOpacity, Platform } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useChildAuth } from '../utils/childAuth';

const { AppBlocker } = NativeModules;

export function AppBlockerListener() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasUsagePermission, setHasUsagePermission] = useState<boolean | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isMonitoringStarted, setIsMonitoringStarted] = useState(false);

  // Child auth context
  const { childId } = useChildAuth();
  
  // Fetch my config (blocked apps)
  const myConfig = useQuery(api.parents.getMyConfigSecure, childId ? { childId: childId as any } : "skip");
  const syncAppsMutation = useMutation(api.parents.updateInstalledApps);

  // Check usage stats permission
  const checkPermission = useCallback(async () => {
    if (Platform.OS !== 'android' || !AppBlocker?.checkUsagePermission) {
      setHasUsagePermission(true); // Skip on iOS/web
      return true;
    }
    try {
      const granted = await AppBlocker.checkUsagePermission();
      setHasUsagePermission(granted);
      return granted;
    } catch (e) {
      console.error('Failed to check permission', e);
      return false;
    }
  }, []);

  // Start monitoring service with delay to ensure app is in foreground
  const startMonitoringService = useCallback(async () => {
    if (Platform.OS !== 'android' || !AppBlocker?.startMonitoring || isMonitoringStarted) {
      return;
    }
    // Delay to ensure app is fully in foreground (Android 12+ restriction)
    setTimeout(async () => {
      try {
        await AppBlocker.startMonitoring();
        setIsMonitoringStarted(true);
        console.log('App monitoring service started');
      } catch (e: any) {
        console.error('Failed to start monitoring service:', e?.message || e);
        // On Android 12+, this may fail if app isn't in foreground
        // Will retry on next app state change
      }
    }, 500);
  }, [isMonitoringStarted]);

  // Request permission (opens settings)
  const requestPermission = useCallback(() => {
    if (AppBlocker?.requestUsagePermission) {
      AppBlocker.requestUsagePermission();
    }
  }, []);

  // Check if launched from blocked app trigger
  useEffect(() => {
    const checkBlocking = async () => {
      if (AppBlocker?.isBlockedLaunch) {
        const blocked = await AppBlocker.isBlockedLaunch();
        if (blocked) {
          setIsBlocked(true);
        }
      }
    };

    checkBlocking();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkBlocking();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Clear blocked state when app goes to background
        // This prevents the blocked screen from showing when returning to our app normally
        setIsBlocked(false);
      }
    });

    return () => subscription.remove();
  }, []);

  // Disable back button when blocked
  useEffect(() => {
    if (isBlocked) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => backHandler.remove();
    }
  }, [isBlocked]);

  // Check permission and show modal on child login
  useEffect(() => {
    if (!childId || Platform.OS !== 'android') return;

    const initPermission = async () => {
      const granted = await checkPermission();
      if (!granted) {
        setShowPermissionModal(true);
      } else {
        // Permission already granted, start monitoring
        startMonitoringService();
      }
    };

    initPermission();
  }, [childId, checkPermission, startMonitoringService]);

  // Re-check permission when app becomes active (returning from settings)
  useEffect(() => {
    if (!childId || Platform.OS !== 'android') return;

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // Re-check permission
        if (showPermissionModal) {
          const granted = await checkPermission();
          if (granted) {
            setShowPermissionModal(false);
            // Delay service start to ensure app is fully in foreground
            startMonitoringService();
          }
        } else if (hasUsagePermission && !isMonitoringStarted) {
          // Retry starting service when app comes to foreground
          startMonitoringService();
        }
      }
    });

    return () => subscription.remove();
  }, [childId, showPermissionModal, hasUsagePermission, isMonitoringStarted, checkPermission, startMonitoringService]);

  // Sync Installed Apps (Send to Server)
  // Re-sync when permission is granted to ensure full app list is fetched
  useEffect(() => {
    const syncApps = async () => {
      if (childId && AppBlocker?.getInstalledApps && hasUsagePermission) {
        try {
          const apps = await AppBlocker.getInstalledApps();
          console.log(`Syncing ${apps.length} installed apps to server`);
          syncAppsMutation({
            childId: childId as any,
            apps: apps
          }).catch(err => console.error("App sync failed", err));
        } catch (e) {
          console.error("Sync failed", e);
        }
      }
    };

    if (childId && hasUsagePermission) {
      syncApps();
    }
  }, [childId, hasUsagePermission, syncAppsMutation]);

  // Sync Block List from Server to Native
  useEffect(() => {
    if (myConfig?.blockedApps && AppBlocker?.setBlockedApps) {
      AppBlocker.setBlockedApps(myConfig.blockedApps);
    }
  }, [myConfig]);

  // Permission Request Modal
  const renderPermissionModal = () => (
    <Modal
      visible={showPermissionModal}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalEmoji}>🔐</Text>
          <Text style={styles.modalTitle}>Permission Required</Text>
          <Text style={styles.modalMessage}>
            To enable parental controls, this app needs access to usage statistics. 
            This allows us to monitor which apps are being used and enforce blocking rules.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <Text style={styles.modalHint}>
            Find "Saresa" in the list and enable access
          </Text>
        </View>
      </View>
    </Modal>
  );

  // Blocked App Screen
  if (isBlocked) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor={COLORS.error} />
        <View style={styles.content}>
          <Text style={styles.emoji}>⛔</Text>
          <Text style={styles.title}>Access Blocked</Text>
          <Text style={styles.message}>
            This app has been blocked by your parent.
          </Text>
          <Text style={styles.subMessage}>
            Go do something productive instead!
          </Text>
        </View>
      </View>
    );
  }

  return <>{renderPermissionModal()}</>;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
    marginTop: 50,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.error,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  subMessage: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  modalEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalHint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
