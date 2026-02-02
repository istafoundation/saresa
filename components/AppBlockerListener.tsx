import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, BackHandler, AppState, Modal, TouchableOpacity, Platform, PermissionsAndroid } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useChildAuth } from '../utils/childAuth';
import { AppBlocker } from '../modules/app-blocker/src';

export function AppBlockerListener() {
  const [hasUsagePermission, setHasUsagePermission] = useState<boolean | null>(null);
  const [hasOverlayPermission, setHasOverlayPermission] = useState<boolean | null>(null);
  
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showOverlayModal, setShowOverlayModal] = useState(false);
  
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

  // Check Overlay Permission (System Alert Window)
  const checkOverlayPermission = useCallback(async () => {
    if (Platform.OS !== 'android' || !AppBlocker?.checkOverlayPermission) {
      setHasOverlayPermission(true);
      return true;
    }
    try {
      const granted = await AppBlocker.checkOverlayPermission();
      setHasOverlayPermission(granted);
      return granted;
    } catch (e) {
      console.error('Failed to check overlay permission', e);
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
      }
    }, 500);
  }, [isMonitoringStarted]);

  // Request Usage permission
  const requestPermission = useCallback(() => {
    if (AppBlocker?.requestUsagePermission) {
      AppBlocker.requestUsagePermission();
    }
  }, []);

  // Request Overlay permission
  const requestOverlayPermission = useCallback(() => {
    if (AppBlocker?.requestOverlayPermission) {
      AppBlocker.requestOverlayPermission();
    }
  }, []);



  // Check permissions on load / auth
  useEffect(() => {
    if (!childId || Platform.OS !== 'android') return;

    const initPermission = async () => {
      // 1. Usage Stats
      const usageGranted = await checkPermission();
      if (!usageGranted) {
        setShowPermissionModal(true);
        return;
      } else {
        setShowPermissionModal(false);
      }

      // 2. Overlay Permission
      const overlayGranted = await checkOverlayPermission();
      if (!overlayGranted) {
        setShowOverlayModal(true);
        return;
      } else {
        setShowOverlayModal(false);
      }

      // 3. Notification (Optional-ish but good practice)
      // Removed notification permission check as we want to suppress it

      // Start Service
      startMonitoringService();
    };

    initPermission();
  }, [childId, checkPermission, checkOverlayPermission, startMonitoringService]);

  // Re-check permission when app becomes active
  useEffect(() => {
    if (!childId || Platform.OS !== 'android') return;

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const usageGranted = await checkPermission();
        if (usageGranted) setShowPermissionModal(false);
        
        const overlayGranted = await checkOverlayPermission();
        if (overlayGranted) setShowOverlayModal(false);

        if (usageGranted && overlayGranted && !isMonitoringStarted) {
          startMonitoringService();
        }
      }
    });

    return () => subscription.remove();
  }, [childId, checkPermission, checkOverlayPermission, startMonitoringService, isMonitoringStarted]);

  // Sync Installed Apps
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

  // Sync Block List
  useEffect(() => {
    if (myConfig?.blockedApps && AppBlocker?.setBlockedApps) {
      AppBlocker.setBlockedApps(myConfig.blockedApps);
    }
  }, [myConfig]);

  // Usage Config Modal
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
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <Text style={styles.modalHint}>
            Find "Saresa" &rarr; Enable Access
          </Text>
        </View>
      </View>
    </Modal>
  );

  // Overlay Config Modal
  const renderOverlayModal = () => (
    <Modal
      visible={showOverlayModal}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalEmoji}>📺</Text>
          <Text style={styles.modalTitle}>Overlay Required</Text>
          <Text style={styles.modalMessage}>
             To block apps effectively, "Display over other apps" permission is required.
          </Text>
          <TouchableOpacity style={[styles.permissionButton, {backgroundColor: COLORS.accent}]} onPress={requestOverlayPermission}>
            <Text style={styles.permissionButtonText}>Grant Overlay</Text>
          </TouchableOpacity>
           <Text style={styles.modalHint}>
            Find "Saresa" &rarr; Enable "Allow display over other apps"
          </Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      {renderPermissionModal()}
      {renderOverlayModal()}
    </>
  );
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
