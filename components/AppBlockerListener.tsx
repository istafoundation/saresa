import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, NativeModules, BackHandler, AppState } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
// import { useUserStore } from '../stores/user-store'; // Unused
import { useChildAuth } from '../utils/childAuth';

const { AppBlocker } = NativeModules;

export function AppBlockerListener() {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const checkBlocking = async () => {
      if (AppBlocker && AppBlocker.isBlockedLaunch) {
        const blocked = await AppBlocker.isBlockedLaunch();
        if (blocked) {
          setIsBlocked(true);
        }
      }
    };

    checkBlocking();

    // Listen for app state changes to re-check if we come from background
    const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
            checkBlocking();
        }
    });

    return () => {
        subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isBlocked) {
      // Disable back button
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        return true; // prevent default behavior
      });
      return () => backHandler.remove();
    }
  }, [isBlocked]);

  // Sync installed apps and block list
  const { childId } = useChildAuth();
  
  // Fetch my config (blocked apps)
  const myConfig = useQuery(api.parents.getMyConfigSecure, childId ? { childId: childId as any } : "skip");
  const syncAppsMutation = useMutation(api.parents.updateInstalledApps);
  
  // 1. Sync Installed Apps (Send to Server)
  useEffect(() => {
    const syncApps = async () => {
        if (childId && AppBlocker && AppBlocker.getInstalledApps) {
            try {
                const apps = await AppBlocker.getInstalledApps();
                // Filter system apps if needed
                
                 syncAppsMutation({
                    childId: childId as any, 
                    apps: apps
                 }).catch(err => console.error("App sync failed", err));

            } catch (e) {
                console.error("Sync failed", e);
            }
        }
    };
    
    if (childId) {
        syncApps();
    }
  }, [childId]);

  // 2. Sync Block List (Receive from Server)
  useEffect(() => {
    if (myConfig?.blockedApps && AppBlocker?.setBlockedApps) {
        AppBlocker.setBlockedApps(myConfig.blockedApps);
    }
  }, [myConfig]);



  if (!isBlocked) return null;

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

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background, // Or a solid color like '#FFFFFF'
    zIndex: 99999, // On top of everything
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
});
