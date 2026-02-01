// Difficulty Selection Page - Separate screen for choosing difficulty
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../convex/_generated/api';
import { useSafeNavigation } from '../../../utils/useSafeNavigation';
import { useChildAuth } from '../../../utils/childAuth';
import { useTapFeedback } from '../../../utils/useTapFeedback';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../constants/theme';
import type { Id } from '../../../convex/_generated/dataModel';
import { hasLevelProgress } from '../../../utils/storage';

interface Difficulty {
  name: string;
  displayName: string;
  requiredScore: number;
  order: number;
}

interface DifficultyProgress {
  difficultyName: string;
  highScore: number;
  passed: boolean;
  attempts: number;
}

export default function DifficultySelectScreen() {
  const { safeBack, safePush } = useSafeNavigation();
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const { token } = useChildAuth();
  const { triggerTap } = useTapFeedback();
  
  // Fetch levels with progress
  const levels = useQuery(
    api.levels.getAllLevelsWithProgress,
    token ? { token } : 'skip'
  );
  
  // Find the current level
  const level = levels?.find(l => l._id === levelId);
  
  if (!level) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Sort difficulties by order
  const sortedDifficulties = [...level.difficulties].sort((a, b) => a.order - b.order);
  
  // Get progress for each difficulty
  const getProgress = (difficultyName: string): DifficultyProgress | undefined => {
    return level.progress?.difficultyProgress.find(p => p.difficultyName === difficultyName);
  };
  
  // Check if difficulty is unlocked (sequential unlock)
  const isDifficultyUnlocked = (difficulty: Difficulty, index: number): boolean => {
    if (index === 0) return true; // First difficulty always unlocked
    
    // Previous difficulty must be passed
    const prevDifficulty = sortedDifficulties[index - 1];
    const prevProgress = getProgress(prevDifficulty.name);
    return prevProgress?.passed ?? false;
  };
  
  // Get color for difficulty
  const getDifficultyColor = (difficulty: Difficulty): [string, string] => {
    const progress = getProgress(difficulty.name);
    
    if (progress?.passed) {
      return [COLORS.success, '#15803d'];
    }
    
    switch (difficulty.name) {
      case 'easy':
        return ['#10B981', '#059669'];
      case 'medium':
        return ['#F59E0B', '#D97706'];
      case 'hard':
        return ['#EF4444', '#DC2626'];
      default:
        return [COLORS.primary, COLORS.primaryDark];
    }
  };
  
  const handleBack = () => {
    triggerTap('light');
    safeBack();
  };
  
  // Determine if this is the last unlocked level
  const isLastUnlockedLevel = levels?.every(l => {
    // If a level has a higher number and is unlocked/completed, then this is NOT the last unlocked level
    if (l.levelNumber > level.levelNumber && (l.state === 'unlocked' || l.state === 'completed')) {
      return false;
    }
    return true;
  }) ?? false;

  // Find the index of the last unlocked difficulty
  // Iterate and find the last one that returns true for isDifficultyUnlocked
  let lastUnlockedDifficultyIndex = -1;
  sortedDifficulties.forEach((d, i) => {
    if (isDifficultyUnlocked(d, i)) {
      lastUnlockedDifficultyIndex = i;
    }
  });

  const handleSelectDifficulty = (difficulty: Difficulty, index: number) => {
    if (isDifficultyUnlocked(difficulty, index)) {
      triggerTap('medium');
      
      // Check if we can resume:
      // 1. Must be last unlocked level
      // 2. Must be last unlocked difficulty
      // 3. Must have saved progress
      let canResume = false;
      if (isLastUnlockedLevel && index === lastUnlockedDifficultyIndex) {
        // We use require here to avoid import cycles or just import at top. 
        // Better to import at top, but for minimal diff in replace_file_content, I'll add import at top in a separate call or use require if possible.
        // Actually, I'll allow the error "hasLevelProgress not found" and fix it by adding import. 
        // Wait, I should add the import first or do it all in one multi_replace.
        // I will use multi_replace to add import as well.
      }
      
      safePush({
        pathname: '/games/levels/game',
        params: { 
          levelId, 
          difficulty: difficulty.name,
          canResume: (isLastUnlockedLevel && index === lastUnlockedDifficultyIndex).toString() 
        },
      });
    } else {
      triggerTap('light');
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Choose Difficulty</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Level Info Card */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.levelCard}
        >
          <Text style={styles.levelEmoji}>{level.theme?.emoji ?? '📖'}</Text>
          <View style={styles.levelInfo}>
            <Text style={styles.levelLabel}>LEVEL {level.levelNumber}</Text>
            <Text style={styles.levelName}>{level.name}</Text>
            {level.description && (
              <Text style={styles.levelDescription}>{level.description}</Text>
            )}
          </View>
          {level.progress?.isCompleted && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.completedText}>Complete</Text>
            </View>
          )}
        </MotiView>
        
        {/* Difficulties */}
        <View style={styles.difficultiesContainer}>
          {sortedDifficulties.map((difficulty, index) => {
            const progress = getProgress(difficulty.name);
            const unlocked = isDifficultyUnlocked(difficulty, index);
            const colors = getDifficultyColor(difficulty);
            
            return (
              <MotiView
                key={difficulty.name}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'spring', delay: index * 100 }}
              >
                <Pressable
                  onPress={() => handleSelectDifficulty(difficulty, index)}
                  style={({ pressed }) => [
                    styles.difficultyCard,
                    !unlocked && styles.difficultyLocked,
                    pressed && unlocked && styles.difficultyPressed,
                  ]}
                >
                  <LinearGradient
                    colors={unlocked ? colors : ['#6B7280', '#4B5563']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.difficultyGradient}
                  >
                    {/* Lock icon for locked difficulties */}
                    {!unlocked && (
                      <View style={styles.lockBadge}>
                        <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                      </View>
                    )}
                    
                    {/* Passed checkmark */}
                    {progress?.passed && (
                      <View style={styles.passedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                      </View>
                    )}
                    
                    {/* Main content */}
                    <View style={styles.difficultyMain}>
                      <Text style={styles.difficultyName}>{difficulty.displayName}</Text>
                      <Text style={styles.requiredScore}>
                        Score {difficulty.requiredScore}% or higher to pass
                      </Text>
                    </View>
                    
                    {/* Score and attempts */}
                    <View style={styles.statsContainer}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Best</Text>
                        <Text style={styles.statValue}>
                          {progress?.highScore.toFixed(0) ?? 0}%
                        </Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Attempts</Text>
                        <Text style={styles.statValue}>
                          {progress?.attempts ?? 0}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Play button */}
                    {unlocked && (
                      <View style={styles.playButton}>
                        <Ionicons name="play" size={24} color="#FFFFFF" />
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              </MotiView>
            );
          })}
        </View>
        
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.textMuted} />
          <Text style={styles.instructionsText}>
            Complete each difficulty to unlock the next one. Pass all difficulties to complete the level!
          </Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  levelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  levelEmoji: {
    fontSize: 48,
  },
  levelInfo: {
    flex: 1,
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  levelName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  levelDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  difficultiesContainer: {
    gap: SPACING.md,
  },
  difficultyCard: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  difficultyLocked: {
    opacity: 0.7,
  },
  difficultyPressed: {
    transform: [{ scale: 0.98 }],
  },
  difficultyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passedBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },
  difficultyMain: {
    flex: 1,
  },
  difficultyName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  requiredScore: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 60,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
});
