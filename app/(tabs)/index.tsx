// Home Screen - Level-based progression with Candy Crush style path
// 🍬 Playful, candy-themed level progression
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useUserStore } from '../../stores/user-store';
import { CandyBackground } from '../../components/animations/SparkleBackground';
import LevelPath from '../../components/LevelPath';

export default function HomeScreen() {
  const { name, streak } = useUserStore();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <CandyBackground />
      
      {/* Header with playful styling */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        style={styles.header}
      >
        <View>
          <Text style={styles.greeting}>Hey there, Hero! 🎮</Text>
          <Text style={styles.username}>{name || 'Explorer'} ✨</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakText}>{streak}</Text>
        </View>
      </MotiView>
      
      {/* Level Path - scrollable Candy Crush style */}
      <LevelPath />
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
    paddingTop: SPACING.sm,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.accentGold + '30',
  },
  streakIcon: {
    fontSize: 20,
  },
  streakText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.accent,
  },
});
