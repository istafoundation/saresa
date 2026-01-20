// Home Screen - Level-based progression with Candy Crush style path
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { useSafeNavigation } from '../../utils/useSafeNavigation';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useUserStore } from '../../stores/user-store';
import { BubbleBackground } from '../../components/animations/SparkleBackground';
import LevelPath from '../../components/LevelPath';
import type { Id } from '../../convex/_generated/dataModel';

export default function HomeScreen() {
  const { safePush } = useSafeNavigation();
  const { name, streak } = useUserStore();
  
  // Handle starting a level
  const handleStartLevel = useCallback((levelId: Id<"levels">, difficulty: string) => {
    safePush({
      pathname: '/games/levels/game',
      params: { levelId, difficulty },
    });
  }, [safePush]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <BubbleBackground color={COLORS.primaryLight} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey there, Hero!</Text>
          <Text style={styles.username}>{name || 'Explorer'} ✨</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakText}>{streak}</Text>
        </View>
      </View>
      
      {/* Level Path - scrollable Candy Crush style */}
      <LevelPath onStartLevel={handleStartLevel} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  streakIcon: {
    fontSize: 18,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
  },
});
