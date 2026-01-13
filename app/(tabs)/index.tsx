// Home Screen - Journey overview with XP progress and mascot ✨ Kids-Friendly
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  withSequence,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { getXPProgressToNextLevel, getLevelForXP } from '../../constants/levels';
import { useUserStore } from '../../stores/user-store';
import { getRandomFunFact, getTodaysWordOfTheDay } from '../../data/fun-facts';
import { Ionicons } from '@expo/vector-icons';
import { BubbleBackground } from '../../components/animations/SparkleBackground';

export default function HomeScreen() {
  const router = useRouter();
  const { name, xp, streak, mascot } = useUserStore();
  const [funFact, setFunFact] = useState(() => getRandomFunFact());
  const [showWordOfDay, setShowWordOfDay] = useState(false);
  
  const levelInfo = getLevelForXP(xp);
  const xpProgress = getXPProgressToNextLevel(xp);
  const wordOfDay = getTodaysWordOfTheDay();
  
  // Mascot breathing animation
  const breathScale = useSharedValue(1);
  
  useEffect(() => {
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1
    );
  }, []);
  
  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <BubbleBackground color={COLORS.primaryLight} />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Level Progress Card */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
        >
          <LinearGradient
            colors={[COLORS.primaryDark, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.levelCard}
          >
            <View style={styles.levelHeader}>
              <View>
                <Text style={styles.levelLabel}>LEVEL {levelInfo.level}</Text>
                <Text style={styles.levelTitle}>{levelInfo.title}</Text>
              </View>
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>{xp} XP</Text>
              </View>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <MotiView
                  style={styles.progressBarFill}
                  animate={{ width: `${Math.min(xpProgress.percentage, 100)}%` }}
                  transition={{ type: 'spring', damping: 15 }}
                />
              </View>
              <Text style={styles.progressText}>
                {xpProgress.current} / {xpProgress.required} XP to Level {levelInfo.level + 1}
              </Text>
            </View>
          </LinearGradient>
        </MotiView>

        {/* Mascot with Speech Bubble */}
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 200 }}
          style={styles.mascotSection}
        >
          <Pressable 
            onPress={() => setFunFact(getRandomFunFact())}
            style={styles.mascotContainer}
          >
            <Animated.View style={[styles.mascot, mascotAnimatedStyle]}>
              <Text style={styles.mascotEmoji}>
                {mascot === 'male' ? '🧙' : '🧙‍♀️'}
              </Text>
            </Animated.View>
          </Pressable>
          
          <View style={styles.speechBubble}>
            <View style={styles.speechBubbleArrow} />
            <Text style={styles.speechBubbleText}>{funFact.fact}</Text>
            <Text style={styles.tapHint}>Tap me for more facts!</Text>
          </View>
        </MotiView>

        {/* Word of the Day */}
        <MotiView
          from={{ opacity: 0, translateX: -20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'spring', delay: 400 }}
        >
          <Pressable 
            style={styles.wordCard}
            onPress={() => setShowWordOfDay(!showWordOfDay)}
          >
            <View style={styles.wordCardHeader}>
              <Ionicons name="book-outline" size={20} color={COLORS.accentGold} />
              <Text style={styles.wordCardLabel}>WORD OF THE DAY</Text>
            </View>
            <Text style={styles.wordCardWord}>{wordOfDay.word}</Text>
            {showWordOfDay && (
              <MotiView
                from={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Text style={styles.wordCardMeaning}>{wordOfDay.meaning}</Text>
                {wordOfDay.origin && (
                  <Text style={styles.wordCardOrigin}>Origin: {wordOfDay.origin}</Text>
                )}
              </MotiView>
            )}
            <Text style={styles.tapToReveal}>
              {showWordOfDay ? 'Tap to hide' : 'Tap to reveal meaning'}
            </Text>
          </Pressable>
        </MotiView>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Continue Your Journey</Text>
          
          <Pressable 
            style={styles.actionCard}
            onPress={() => router.push('/fun')}
          >
            <LinearGradient
              colors={[COLORS.accent + '40', COLORS.accent + '20']}
              style={styles.actionCardGradient}
            >
              <Text style={styles.actionCardEmoji}>🎮</Text>
              <View style={styles.actionCardContent}>
                <Text style={styles.actionCardTitle}>Play Games</Text>
                <Text style={styles.actionCardDesc}>Earn XP and unlock artifacts</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.text} />
            </LinearGradient>
          </Pressable>

          <Pressable 
            style={styles.actionCard}
            onPress={() => router.push('/artifacts')}
          >
            <LinearGradient
              colors={[COLORS.primary + '40', COLORS.primary + '20']}
              style={styles.actionCardGradient}
            >
              <Text style={styles.actionCardEmoji}>✨</Text>
              <View style={styles.actionCardContent}>
                <Text style={styles.actionCardTitle}>View Collection</Text>
                <Text style={styles.actionCardDesc}>Explore your artifacts & weapons</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.text} />
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
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
  levelCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  levelLabel: {
    fontSize: 12,
    color: COLORS.text + 'AA',
    fontWeight: '600',
    letterSpacing: 1,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  xpBadge: {
    backgroundColor: COLORS.accentGold + '30',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  progressBarContainer: {
    gap: SPACING.xs,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.background + '60',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accentGold,
    borderRadius: BORDER_RADIUS.full,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.text + 'CC',
    textAlign: 'right',
  },
  mascotSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  mascotContainer: {
    alignItems: 'center',
  },
  mascot: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary + '60',
    ...SHADOWS.md,
  },
  mascotEmoji: {
    fontSize: 40,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '40',
  },
  speechBubbleArrow: {
    position: 'absolute',
    left: -10,
    top: 20,
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 0,
    borderTopColor: 'transparent',
    borderRightColor: COLORS.surface,
    borderBottomColor: 'transparent',
  },
  speechBubbleText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  tapHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  wordCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.accentGold + '30',
  },
  wordCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  wordCardLabel: {
    fontSize: 11,
    color: COLORS.accentGold,
    fontWeight: '600',
    letterSpacing: 1,
  },
  wordCardWord: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  wordCardMeaning: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  wordCardOrigin: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  tapToReveal: {
    fontSize: 11,
    color: COLORS.primaryLight,
    marginTop: SPACING.sm,
  },
  quickActions: {
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  actionCard: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  actionCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  actionCardEmoji: {
    fontSize: 32,
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionCardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
