// Root layout - App entry point with providers
import { useEffect, useRef } from 'react';
import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { COLORS } from '../constants/theme';
import ConvexClientProvider from './ConvexClientProvider';
import { useConvexSync } from '../utils/useConvexSync';
import { useChildAuth } from '../utils/childAuth';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Loading screen while checking auth
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

// Separate component for navigation logic
function InitialLayout() {
  const segments = useSegments();
  const { isAuthenticated, isLoading, token } = useChildAuth();
  const streakUpdatedRef = useRef(false);
  
  // Sync Convex data to Zustand store
  useConvexSync();
  
  // Check if user exists in database (has completed mascot selection)
  const userCheck = useQuery(api.users.checkUserExists, token ? { token } : "skip");
  const updateStreak = useMutation(api.users.updateStreak);
  
  // Update streak when user is authenticated (with debouncing to prevent duplicate calls)
  useEffect(() => {
    if (isAuthenticated && userCheck?.exists && token && !streakUpdatedRef.current) {
      streakUpdatedRef.current = true;
      updateStreak({ token });
    }
    // Reset ref when user logs out
    if (!isAuthenticated) {
      streakUpdatedRef.current = false;
    }
  }, [isAuthenticated, userCheck?.exists, token]);

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Determine current location
  const inOnboarding = segments[0] === 'onboarding';

  // Not authenticated → go to onboarding (login)
  if (!isAuthenticated && !inOnboarding) {
    return <Redirect href="/onboarding" />;
  }
  
  // Authenticated but no user data yet (needs mascot) → still in onboarding
  // We need to wait for userCheck to be loaded to know for sure
  if (isAuthenticated && userCheck !== undefined && !userCheck?.exists && !inOnboarding) {
    return <Redirect href="/onboarding" />;
  }
  
  // Authenticated and has user data → go to main app
  if (isAuthenticated && userCheck?.exists && inOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  // Render the appropriate screen
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen 
        name="games/wordle"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="games/gk/practice"
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="games/gk/competitive"
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ConvexClientProvider>
        <GestureHandlerRootView style={styles.container}>
          <StatusBar style="dark" />
          <InitialLayout />
        </GestureHandlerRootView>
      </ConvexClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
