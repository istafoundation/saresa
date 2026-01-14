// Root layout - App entry point with providers
import { useEffect } from 'react';
import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useConvexAuth } from 'convex/react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { COLORS } from '../constants/theme';
import ConvexClientProvider from './ConvexClientProvider';
import { useConvexSync } from '../utils/useConvexSync';

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
  const { isAuthenticated, isLoading } = useConvexAuth();
  
  // Sync Convex data to Zustand store
  useConvexSync();
  
  // Check if user exists in database
  const userCheck = useQuery(api.users.checkUserExists);
  const updateStreak = useMutation(api.users.updateStreak);
  
  // Update streak when user is authenticated
  useEffect(() => {
    if (isAuthenticated && userCheck?.exists) {
      updateStreak();
    }
  }, [isAuthenticated, userCheck?.exists]);

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Determine current location
  const inOnboarding = segments[0] === 'onboarding';

  // Not authenticated → go to onboarding (will show email/OTP first)
  if (!isAuthenticated && !inOnboarding) {
    return <Redirect href="/onboarding" />;
  }
  
  // Authenticated but no user data yet → still in onboarding (name/mascot steps)
  if (isAuthenticated && !userCheck?.exists && !inOnboarding) {
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
    <ConvexClientProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="dark" />
        <InitialLayout />
      </GestureHandlerRootView>
    </ConvexClientProvider>
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
