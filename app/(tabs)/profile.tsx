// Profile Screen - User stats and settings
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useUserStore } from '../../stores/user-store';
import { useWordleStore } from '../../stores/wordle-store';
import { useGKStore } from '../../stores/gk-store';
import { getLevelForXP, getXPProgressToNextLevel, LEVELS } from '../../constants/levels';

export default function ProfileScreen() {
  const { 
    name, mascot, xp, streak, unlockedArtifacts, unlockedWeapons, 
    resetProgress, setMascot,
    soundEnabled, musicEnabled, sfxVolume, musicVolume,
    setSoundEnabled, setMusicEnabled, setSfxVolume, setMusicVolume
  } = useUserStore();
  const wordleStats = useWordleStore(state => state.stats);
  const { practiceTotal, practiceCorrect } = useGKStore();
  
  const levelInfo = getLevelForXP(xp);
  const xpProgress = getXPProgressToNextLevel(xp);
  
  const handleReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Reset Progress',
      'This will delete all your progress, XP, and unlocked items. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            resetProgress();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      ]
    );
  };

  const handleMascotToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMascot(mascot === 'male' ? 'female' : 'male');
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
            <Pressable onPress={handleMascotToggle} style={styles.avatarContainer}>
              <Text style={styles.avatarEmoji}>
                {mascot === 'male' ? '🧙' : '🧙‍♀️'}
              </Text>
              <View style={styles.avatarBadge}>
                <Ionicons name="swap-horizontal" size={12} color={COLORS.text} />
              </View>
            </Pressable>
            
            <Text style={styles.profileName}>{name || 'Detective'}</Text>
            <Text style={styles.profileTitle}>{levelInfo.title}</Text>
            
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Level {levelInfo.level}</Text>
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
              <Text style={styles.gameStatTitle}>General Knowledge</Text>
            </View>
            <View style={styles.gameStatGrid}>
              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatValue}>{practiceTotal}</Text>
                <Text style={styles.gameStatLabel}>Questions</Text>
              </View>
              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatValue}>
                  {practiceTotal > 0 
                    ? Math.round((practiceCorrect / practiceTotal) * 100) 
                    : 0}%
                </Text>
                <Text style={styles.gameStatLabel}>Accuracy</Text>
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

        {/* Danger Zone */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 550 }}
        >
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          
          <Pressable style={styles.settingItem} onPress={handleReset}>
            <View style={styles.settingContent}>
              <Ionicons name="refresh" size={22} color={COLORS.error} />
              <Text style={[styles.settingText, { color: COLORS.error }]}>
                Reset All Progress
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
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentGold,
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
});
