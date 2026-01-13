// Root layout - App entry point with providers
import { useEffect } from 'react';
import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/theme';
import { useUserStore } from '../stores/user-store';

// Separate component for navigation logic
function InitialLayout() {
  const segments = useSegments();
  const { onboardingComplete, updateStreak } = useUserStore();
  
  useEffect(() => {
    // Update streak on app open (safe to call here since layout is mounted)
    updateStreak();
  }, []);

  // Determine current location
  const inOnboarding = segments[0] === 'onboarding';
  const inTabs = segments[0] === '(tabs)';

  // Handle redirects based on onboarding status
  if (!onboardingComplete && !inOnboarding) {
    return <Redirect href="/onboarding" />;
  }
  
  if (onboardingComplete && inOnboarding) {
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
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />
      <InitialLayout />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

