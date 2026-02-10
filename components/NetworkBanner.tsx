
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../utils/network';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLastSyncTime } from '../utils/level-cache';

const STALE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

export function NetworkBanner() {
  const { isConnected, isInternetReachable } = useNetwork();
  const insets = useSafeAreaInsets();
  const [showOnline, setShowOnline] = useState(false);
  const [isStale, setIsStale] = useState(false);

  // Track whether the user has EVER been offline this session
  // Prevents "Back Online" from flashing on first mount
  const wasEverOffline = useRef(false);
  
  // We consider it offline if explicitly false. If null (unknown), we assume online/loading.
  const isOffline = isConnected === false || isInternetReachable === false;

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isOffline) {
      wasEverOffline.current = true;
      setShowOnline(false); // Remove any lingering "back online" banner
    } else if (wasEverOffline.current) {
      // Only show "Back Online" if user was genuinely offline before
      setShowOnline(true);
      timeout = setTimeout(() => setShowOnline(false), 3000);
    }
    // If wasEverOffline is false and !isOffline → first mount, do nothing

    return () => clearTimeout(timeout);
  }, [isOffline]);

  // Check for stale cache periodically
  useEffect(() => {
    const checkStale = () => {
      const lastSync = getLastSyncTime();
      if (lastSync > 0) {
        setIsStale(Date.now() - lastSync > STALE_THRESHOLD);
      }
    };
    
    checkStale();
    const interval = setInterval(checkStale, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Show stale banner when online but cache is old
  if (!isOffline && !showOnline && isStale) {
    return (
      <View style={[
        styles.container,
        { paddingTop: insets.top > 0 ? insets.top : 10 },
        styles.stale
      ]}>
        <Text style={styles.text}>📦 Content may be outdated. Connect to sync</Text>
      </View>
    );
  }

  if (!isOffline && !showOnline) return null;

  return (
    <View style={[
      styles.container, 
      { paddingTop: insets.top > 0 ? insets.top : 10 },
      isOffline ? styles.offline : styles.online
    ]}>
      <Text style={styles.text}>
        {isOffline ? "📡 No Internet Connection" : "✅ Back Online"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    zIndex: 9999,
  },
  offline: {
    backgroundColor: '#D32F2F',
  },
  online: {
    backgroundColor: '#388E3C',
  },
  stale: {
    backgroundColor: '#F57C00',
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
