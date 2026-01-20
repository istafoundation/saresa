import { Stack } from 'expo-router';

export default function LevelsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="game" />
    </Stack>
  );
}
