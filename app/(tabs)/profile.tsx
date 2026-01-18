// Profile Screen - User stats and settings - Now reads from Convex!
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useUserStore } from '../../stores/user-store';
import { getLevelForXP, getXPProgressToNextLevel, LEVELS } from '../../constants/levels';
import { useTapFeedback } from '../../utils/useTapFeedback';
import Mascot from '../../components/Mascot';
import { useChildAuth } from '../../utils/childAuth';

export default function ProfileScreen() {
  const { logout } = useChildAuth();
  
  const { 
    name, mascot, xp, streak, group, unlockedArtifacts, unlockedWeapons, 
    soundEnabled, musicEnabled, sfxVolume, musicVolume,
    setSoundEnabled, setMusicEnabled, setSfxVolume, setMusicVolume,
    // Now reading game stats from Convex-synced data!
    wordleStats, gkStats, gdStats,
    // Subscription status
    isSubscriptionActive, activatedTill, subscriptionStatus
  } = useUserStore();
  
  const levelInfo = getLevelForXP(xp);
  const xpProgress = getXPProgressToNextLevel(xp);
  const { triggerTap, triggerSelection } = useTapFeedback();
  
  const handleSignOut = () => {
    triggerTap('heavy');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Sign Out',
      'You will need to sign in again to access your progress. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring' }}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.profileHeader}
          >
            <View style={styles.avatarContainer}>
              <Mascot mascotType={mascot} size="large" />
            </View>
            
            <Text style={styles.profileName}>{name || 'Detective'}</Text>
            <Text style={styles.profileTitle}>{levelInfo.title}</Text>
            
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Level {levelInfo.level}</Text>
            </View>
            
            {/* Learning Level Group Badge */}
            <View style={styles.groupBadge}>
              <Ionicons name="school-outline" size={14} color={COLORS.text} style={{ marginRight: 4 }} />
              <Text style={styles.groupBadgeText}>
                Group {group} ({group === 'A' ? 'Class 1-4' : group === 'C' ? 'Class 9-10' : 'Class 5-8'})
              </Text>
            </View>
            
            {/* Subscription Status Badge */}
            <View style={[
              styles.subscriptionBadge,
              isSubscriptionActive ? styles.subscriptionActive : styles.subscriptionInactive
            ]}>
              <Ionicons 
                name={isSubscriptionActive ? "checkmark-circle" : "alert-circle"} 
                size={14} 
                color={isSubscriptionActive ? "#10B981" : "#F59E0B"} 
                style={{ marginRight: 4 }} 
              />
              <Text style={[
                styles.subscriptionBadgeText,
                isSubscriptionActive ? styles.subscriptionActiveText : styles.subscriptionInactiveText
              ]}>
                {isSubscriptionActive 
                  ? `Activated till ${activatedTill ? new Date(activatedTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Active'}`
                  : 'Not Activated'
                }
              </Text>
            </View>
          </LinearGradient>
        </MotiView>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard 
            icon="flash"
            label="Total XP"
            value={xp.toString()}
            color={COLORS.accentGold}
            delay={100}
          />
          <StatCard 
            icon="flame"
            label="Day Streak"
            value={streak.toString()}
            color={COLORS.accent}
            delay={150}
          />
          <StatCard 
            icon="sparkles"
            label="Artifacts"
            value={`${unlockedArtifacts.length}/10`}
            color={COLORS.primary}
            delay={200}
          />
          <StatCard 
            icon="shield"
            label="Weapons"
            value={`${unlockedWeapons.length}/20`}
            color={COLORS.rarityRare}
            delay={250}
          />
        </View>

        {/* Game Stats */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 300 }}
        >
          <Text style={styles.sectionTitle}>Game Statistics</Text>
          
          {/* Wordle Stats */}
          <View style={styles.gameStatCard}>
            <View style={styles.gameStatHeader}>
              <Text style={styles.gameStatEmoji}>📝</Text>
              <Text style={styles.gameStatTitle}>Wordle</Text>
            </View>
            <View style={styles.gameStatGrid}>
              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatValue}>{wordleStats.gamesPlayed}</Text>
                <Text style={styles.gameStatLabel}>Played</Text>
              </View>
              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatValue}>
                  {wordleStats.gamesPlayed > 0 
                    ? Math.round((wordleStats.gamesWon / wordleStats.gamesPlayed) * 100) 
                    : 0}%
                </Text>
                <Text style={styles.gameStatLabel}>Win Rate</Text>
              </View>
              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatValue}>{wordleStats.currentStreak}</Text>
                <Text style={styles.gameStatLabel}>Streak</Text>
              </View>
              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatValue}>{wordleStats.maxStreak}</Text>
                <Text style={styles.gameStatLabel}>Max Streak</Text>
              </View>
            </View>
          </View>

          {/* GK Stats */}
          <View style={styles.gameStatCard}>
            <View style={styles.gameStatHeader}>
              <Text style={styles.gameStatEmoji}>🧠</Text>
              <Text style={styles.gameStatTitle}>English Insane</Text>
            </View>
            <View style={styles.gameStatGrid}>
              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatValue}>{gkStats.practiceTotal}</Text>
                <Text style={styles.gameStatLabel}>Questions</Text>
              </View>
              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatValue}>
                  {gkStats.practiceTotal > 0 
                    ? Math.round((gkStats.practiceCorrect / gkStats.practiceTotal) * 100) 
                    : 0}%
                </Text>
                <Text style={styles.gameStatLabel}>Accuracy</Text>
              </View>
            </View>
          </View>

          {/* Grammar Detective Stats - Unique Investigation Theme */}
          <View style={[styles.gameStatCard, styles.gdCard]}>
            <View style={styles.gameStatHeader}>
              <Text style={styles.gameStatEmoji}>🔍</Text>
              <Text style={styles.gameStatTitle}>Grammar Detective</Text>
            </View>
            
            {/* Investigation Progress Bar */}
            <View style={styles.gdProgressContainer}>
              <View style={styles.gdProgressBar}>
                <View 
                  style={[
                    styles.gdProgressFill, 
                    { width: `${gdStats.questionsAnswered > 0 ? Math.min((gdStats.correctAnswers / gdStats.questionsAnswered) * 100, 100) : 0}%` }
                  ]} 
                />
              </View>
              <Text style={styles.gdProgressText}>
                {gdStats.questionsAnswered > 0 
                  ? Math.round((gdStats.correctAnswers / gdStats.questionsAnswered) * 100)
                  : 0}% Cases Solved
              </Text>
            </View>
            
            <View style={styles.gdStatsRow}>
              <View style={styles.gdStatBadge}>
                <Ionicons name="help-circle" size={16} color={COLORS.primary} />
                <Text style={styles.gdStatBadgeValue}>{gdStats.questionsAnswered}</Text>
                <Text style={styles.gdStatBadgeLabel}>Investigated</Text>
              </View>
              <View style={styles.gdStatBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.gdStatBadgeValue}>{gdStats.correctAnswers}</Text>
                <Text style={styles.gdStatBadgeLabel}>Solved</Text>
              </View>
              <View style={styles.gdStatBadge}>
                <Ionicons name="flash" size={16} color={COLORS.accentGold} />
                <Text style={styles.gdStatBadgeValue}>{gdStats.totalXPEarned}</Text>
                <Text style={styles.gdStatBadgeLabel}>XP</Text>
              </View>
            </View>
          </View>
        </MotiView>

        {/* Level Progress */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 400 }}
        >
          <Text style={styles.sectionTitle}>Level Journey</Text>
          <View style={styles.levelJourney}>
            {LEVELS.slice(0, 10).map((level, index) => {
              const isReached = levelInfo.level >= level.level;
              const isCurrent = levelInfo.level === level.level;
              
              return (
                <View key={level.level} style={styles.levelItem}>
                  <View style={[
                    styles.levelDot,
                    isReached && styles.levelDotReached,
                    isCurrent && styles.levelDotCurrent,
                  ]}>
                    {isCurrent && (
                      <MotiView
                        from={{ opacity: 0.5, scale: 1 }}
                        animate={{ opacity: 0, scale: 2 }}
                        transition={{ 
                          loop: true, 
                          type: 'timing', 
                          duration: 1500 
                        }}
                        style={styles.levelDotPulse}
                      />
                    )}
                    <Text style={styles.levelDotNumber}>{level.level}</Text>
                  </View>
                  {index < 9 && (
                    <View style={[
                      styles.levelLine,
                      isReached && styles.levelLineReached,
                    ]} />
                  )}
                </View>
              );
            })}
          </View>
        </MotiView>

        {/* Settings */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 500 }}
        >
          <Text style={styles.sectionTitle}>Sound Settings</Text>
          
          {/* Sound Effects Toggle */}
          <View style={styles.soundSettingCard}>
            <View style={styles.soundSettingRow}>
              <View style={styles.soundSettingLabel}>
                <Ionicons name="volume-high" size={22} color={COLORS.primary} />
                <Text style={styles.settingText}>Sound Effects</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={(value) => {
                  triggerSelection();
                  setSoundEnabled(value);
                }}
                trackColor={{ false: COLORS.backgroundCard, true: COLORS.primary + '60' }}
                thumbColor={soundEnabled ? COLORS.primary : COLORS.textMuted}
              />
            </View>
            {soundEnabled && (
              <View style={styles.sliderContainer}>
                <Ionicons name="volume-low" size={16} color={COLORS.textSecondary} />
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={sfxVolume}
                  onValueChange={setSfxVolume}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.backgroundCard}
                  thumbTintColor={COLORS.primary}
                />
                <Text style={styles.volumePercent}>{Math.round(sfxVolume * 100)}%</Text>
              </View>
            )}
          </View>

          {/* Music Toggle */}
          <View style={styles.soundSettingCard}>
            <View style={styles.soundSettingRow}>
              <View style={styles.soundSettingLabel}>
                <Ionicons name="musical-notes" size={22} color={COLORS.accent} />
                <Text style={styles.settingText}>Background Music</Text>
              </View>
              <Switch
                value={musicEnabled}
                onValueChange={(value) => {
                  triggerSelection();
                  setMusicEnabled(value);
                }}
                trackColor={{ false: COLORS.backgroundCard, true: COLORS.accent + '60' }}
                thumbColor={musicEnabled ? COLORS.accent : COLORS.textMuted}
              />
            </View>
            {musicEnabled && (
              <View style={styles.sliderContainer}>
                <Ionicons name="volume-low" size={16} color={COLORS.textSecondary} />
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={musicVolume}
                  onValueChange={setMusicVolume}
                  minimumTrackTintColor={COLORS.accent}
                  maximumTrackTintColor={COLORS.backgroundCard}
                  thumbTintColor={COLORS.accent}
                />
                <Text style={styles.volumePercent}>{Math.round(musicVolume * 100)}%</Text>
              </View>
            )}
          </View>
        </MotiView>

        {/* Account Actions */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 550 }}
        >
          <Text style={styles.sectionTitle}>Account</Text>
          
          <Pressable style={styles.settingItem} onPress={handleSignOut}>
            <View style={styles.settingContent}>
              <Ionicons name="log-out" size={22} color={COLORS.error} />
              <Text style={[styles.settingText, { color: COLORS.error }]}>
                Sign Out
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.error} />
          </Pressable>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ 
  icon, label, value, color, delay 
}: { 
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', delay }}
      style={styles.statCard}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </MotiView>
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
  profileHeader: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatarEmoji: {
    fontSize: 64,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    padding: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 16,
    color: COLORS.text + 'CC',
    marginBottom: SPACING.md,
  },
  levelBadge: {
    backgroundColor: COLORS.accentGold + '30',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.text + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.sm,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  gameStatCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  gameStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  gameStatEmoji: {
    fontSize: 24,
  },
  gameStatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  gameStatGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gameStatItem: {
    alignItems: 'center',
  },
  gameStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  gameStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  levelJourney: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  levelDot: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelDotReached: {
    backgroundColor: COLORS.primary,
  },
  levelDotCurrent: {
    backgroundColor: COLORS.accentGold,
  },
  levelDotPulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.accentGold,
  },
  levelDotNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  levelLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.backgroundCard,
    marginHorizontal: 2,
  },
  levelLineReached: {
    backgroundColor: COLORS.primary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  soundSettingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  soundSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  soundSettingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.backgroundCard,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: SPACING.sm,
  },
  volumePercent: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    width: 45,
    textAlign: 'right',
  },
  // Grammar Detective unique styles
  gdCard: {
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    backgroundColor: COLORS.surface,
  },
  gdProgressContainer: {
    marginBottom: SPACING.md,
  },
  gdProgressBar: {
    height: 8,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  gdProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  gdProgressText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  gdStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gdStatBadge: {
    alignItems: 'center',
    gap: 4,
  },
  gdStatBadgeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  gdStatBadgeLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  // Subscription Badge Styles
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.sm,
  },
  subscriptionActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  subscriptionInactive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  subscriptionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subscriptionActiveText: {
    color: '#10B981',
  },
  subscriptionInactiveText: {
    color: '#F59E0B',
  },
});
