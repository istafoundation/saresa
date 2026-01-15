// Games Hub - GK Quiz and Wordle access
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useUserStore } from '../../stores/user-store';
import { useChildAuth } from '../../utils/childAuth';
import { useTapFeedback } from '../../utils/useTapFeedback';
import Mascot from '../../components/Mascot';

export default function FunScreen() {
  const router = useRouter();
  const { token } = useChildAuth();
  const { mascot } = useUserStore();
  const { triggerTap } = useTapFeedback();
  
  // CONVEX IS SOURCE OF TRUTH for all daily games
  const canPlayCompetitiveFromServer = useQuery(api.gameStats.canPlayGKCompetitive,
    token ? { token } : 'skip'
  );
  const canPlayCompetitive = canPlayCompetitiveFromServer ?? true;
  
  const canPlayWordleFromServer = useQuery(api.gameStats.canPlayWordle,
    token ? { token } : 'skip'
  );
  const canPlayWordle = canPlayWordleFromServer ?? true;
  
  const canPlayWordFinderEasyFromServer = useQuery(api.gameStats.canPlayWordFinder,
    token ? { token, mode: 'easy' as const } : 'skip'
  );
  const canPlayWordFinderEasy = canPlayWordFinderEasyFromServer ?? true;
  
  const canPlayWordFinderHardFromServer = useQuery(api.gameStats.canPlayWordFinder,
    token ? { token, mode: 'hard' as const } : 'skip'
  );
  const canPlayWordFinderHard = canPlayWordFinderHardFromServer ?? true;
  
  
  
  const handleGamePress = (route: string) => {
    triggerTap('medium');
    router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Fun Zone</Text>
          <Text style={styles.subtitle}>Play games to earn XP and level up!</Text>
        </View>

        {/* Mascot Tip */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 100 }}
          style={styles.mascotTip}
        >
          <Mascot mascotType={mascot} size="small" />
          <Text style={styles.mascotTipText}>
            Tip: Competitive mode gives more XP, but you can only play once per day!
          </Text>
        </MotiView>

        {/* GK Quiz Card */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 200 }}
        >
          <View style={styles.gameCard}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gameCardHeader}
            >
              <Text style={styles.gameCardEmoji}>🧠</Text>
              <View style={styles.gameCardTitleContainer}>
                <Text style={styles.gameCardTitle}>English Insane</Text>
                <Text style={styles.gameCardDesc}>Master hard English grammar</Text>
              </View>
            </LinearGradient>
            
            <View style={styles.gameCardContent}>
              {/* Practice Mode */}
              <Pressable 
                style={styles.modeButton}
                onPress={() => handleGamePress('/games/gk/practice')}
              >
                <View style={styles.modeButtonContent}>
                  <Ionicons name="infinite" size={24} color={COLORS.primary} />
                  <View style={styles.modeButtonText}>
                    <Text style={styles.modeButtonTitle}>Practice Mode</Text>
                    <Text style={styles.modeButtonDesc}>Infinite questions • No XP</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </Pressable>

              {/* Competitive Mode */}
              <Pressable 
                style={[
                  styles.modeButton, 
                  !canPlayCompetitive && styles.modeButtonDisabled
                ]}
                onPress={() => canPlayCompetitive && handleGamePress('/games/gk/competitive')}
                disabled={!canPlayCompetitive}
              >
                <View style={styles.modeButtonContent}>
                  <Ionicons 
                    name="trophy" 
                    size={24} 
                    color={canPlayCompetitive ? COLORS.accentGold : COLORS.textMuted} 
                  />
                  <View style={styles.modeButtonText}>
                    <Text style={[
                      styles.modeButtonTitle,
                      !canPlayCompetitive && styles.modeButtonTitleDisabled
                    ]}>
                      Competitive Mode
                    </Text>
                    <Text style={styles.modeButtonDesc}>
                      {canPlayCompetitive 
                        ? '10 questions • 30s timer • Earn XP!' 
                        : 'Come back tomorrow!'}
                    </Text>
                  </View>
                </View>
                {canPlayCompetitive ? (
                  <View style={styles.xpBadge}>
                    <Text style={styles.xpBadgeText}>+XP</Text>
                  </View>
                ) : (
                  <Ionicons name="lock-closed" size={20} color={COLORS.textMuted} />
                )}
              </Pressable>
            </View>
          </View>
        </MotiView>

        {/* Wordle Card */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 300 }}
        >
          <Pressable
            style={[
              styles.gameCard, 
              !canPlayWordle && styles.gameCardDisabled
            ]}
            onPress={() => canPlayWordle && handleGamePress('/games/wordle')}
            disabled={!canPlayWordle}
          >
            <LinearGradient
              colors={canPlayWordle 
                ? [COLORS.accent, COLORS.accentLight] 
                : [COLORS.surface, COLORS.backgroundCard]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gameCardHeader}
            >
              <Text style={styles.gameCardEmoji}>📝</Text>
              <View style={styles.gameCardTitleContainer}>
                <Text style={[
                  styles.gameCardTitle,
                  !canPlayWordle && styles.gameCardTitleDisabled
                ]}>Wordle</Text>
                <Text style={styles.gameCardDesc}>
                  {canPlayWordle 
                    ? 'Guess the 5-letter word!' 
                    : 'Come back tomorrow!'}
                </Text>
              </View>
              {canPlayWordle ? (
                <View style={styles.dailyBadge}>
                  <Text style={styles.dailyBadgeText}>DAILY</Text>
                </View>
              ) : (
                <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
              )}
            </LinearGradient>
            
            <View style={styles.gameCardContent}>
              <View style={styles.wordleInfo}>
                <View style={styles.wordleInfoItem}>
                  <Ionicons name="grid" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.wordleInfoText}>6 attempts</Text>
                </View>
                <View style={styles.wordleInfoItem}>
                  <Ionicons name="star" size={18} color={canPlayWordle ? COLORS.accentGold : COLORS.textMuted} />
                  <Text style={styles.wordleInfoText}>+100 XP on win</Text>
                </View>
              </View>
            </View>
          </Pressable>
        </MotiView>

        {/* Word Finder Card */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 400 }}
        >
          <View style={styles.gameCard}>
            <LinearGradient
              colors={[COLORS.rainbow2, COLORS.rainbow6]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gameCardHeader}
            >
              <Text style={styles.gameCardEmoji}>🔍</Text>
              <View style={styles.gameCardTitleContainer}>
                <Text style={styles.gameCardTitle}>Word Finder</Text>
                <Text style={styles.gameCardDesc}>Find English vocabulary words</Text>
              </View>
            </LinearGradient>
            
            <View style={styles.gameCardContent}>
              {/* Easy Mode */}
              <Pressable 
                style={[
                  styles.modeButton,
                  !canPlayWordFinderEasy && styles.modeButtonDisabled
                ]}
                onPress={() => canPlayWordFinderEasy && handleGamePress('/games/word-finder?mode=easy')}
                disabled={!canPlayWordFinderEasy}
              >
                <View style={styles.modeButtonContent}>
                  <Ionicons 
                    name="star-outline" 
                    size={24} 
                    color={canPlayWordFinderEasy ? COLORS.rainbow6 : COLORS.textMuted} 
                  />
                  <View style={styles.modeButtonText}>
                    <Text style={[
                      styles.modeButtonTitle,
                      !canPlayWordFinderEasy && styles.modeButtonTitleDisabled
                    ]}>Easy Mode</Text>
                    <Text style={styles.modeButtonDesc}>
                      {canPlayWordFinderEasy 
                        ? 'Find 5 words • 10 min • 2x daily' 
                        : 'No attempts left today!'}
                    </Text>
                  </View>
                </View>
                {canPlayWordFinderEasy ? (
                                  <View style={styles.xpBadge}>
                    <Text style={styles.xpBadgeText}>+50 XP</Text>
                  </View>
                ) : (
                  <Ionicons name="lock-closed" size={20} color={COLORS.textMuted} />
                )}
              </Pressable>

              {/* Hard Mode */}
              <Pressable 
                style={[
                  styles.modeButton,
                  !canPlayWordFinderHard && styles.modeButtonDisabled
                ]}
                onPress={() => canPlayWordFinderHard && handleGamePress('/games/word-finder?mode=hard')}
                disabled={!canPlayWordFinderHard}
              >
                <View style={styles.modeButtonContent}>
                  <Ionicons 
                    name="flash" 
                    size={24} 
                    color={canPlayWordFinderHard ? COLORS.accentGold : COLORS.textMuted} 
                  />
                  <View style={styles.modeButtonText}>
                    <Text style={[
                      styles.modeButtonTitle,
                      !canPlayWordFinderHard && styles.modeButtonTitleDisabled
                    ]}>Hard Mode</Text>
                    <Text style={styles.modeButtonDesc}>
                      {canPlayWordFinderHard 
                        ? 'Answer questions • Hints -50% XP • 1x daily' 
                        : 'Come back tomorrow!'}
                    </Text>
                  </View>
                </View>
                {canPlayWordFinderHard ? (
                                    <View style={[styles.xpBadge, { backgroundColor: COLORS.accentGold + '30' }]}>
                    <Text style={styles.xpBadgeText}>+200 XP</Text>
                  </View>
                ) : (
                  <Ionicons name="lock-closed" size={20} color={COLORS.textMuted} />
                )}
              </Pressable>
            </View>
          </View>
        </MotiView>
        
        {/* Bottom spacing to account for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  mascotTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  mascotEmoji: {
    fontSize: 32,
  },
  mascotTipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  gameCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  gameCardPlayed: {
    opacity: 0.8,
  },
  gameCardDisabled: {
    opacity: 0.7,
  },
  gameCardTitleDisabled: {
    color: COLORS.textMuted,
  },
  gameCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  gameCardEmoji: {
    fontSize: 40,
  },
  gameCardTitleContainer: {
    flex: 1,
  },
  gameCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  gameCardDesc: {
    fontSize: 13,
    color: COLORS.text + 'CC',
    marginTop: 2,
  },
  gameCardContent: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  modeButtonDisabled: {
    backgroundColor: COLORS.surface + '80',
    opacity: 0.7,
  },
  modeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  modeButtonText: {
    gap: 2,
  },
  modeButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  modeButtonTitleDisabled: {
    color: COLORS.textMuted,
  },
  modeButtonDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  xpBadge: {
    backgroundColor: COLORS.accentGold + '30',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  dailyBadge: {
    backgroundColor: COLORS.text + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  dailyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1,
  },
  wordleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
  },
  wordleInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  wordleInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
