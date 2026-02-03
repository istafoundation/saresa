// Difficulty Selector Modal - Shows Easy/Medium/Hard with progress
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useTapFeedback } from '../utils/useTapFeedback';
import type { Id } from '@ista/convex/_generated/dataModel';

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

interface Level {
  _id: Id<"levels">;
  levelNumber: number;
  name: string;
  difficulties: Difficulty[];
  theme?: {
    emoji: string;
    color: string;
  };
  progress: {
    difficultyProgress: DifficultyProgress[];
    isCompleted: boolean;
  } | null;
}

interface DifficultySelectorProps {
  level: Level;
  onSelect: (difficultyName: string) => void;
  onClose: () => void;
}

export default function DifficultySelector({
  level,
  onSelect,
  onClose,
}: DifficultySelectorProps) {
  const { triggerTap } = useTapFeedback();
  
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
  
  const handleSelect = (difficulty: Difficulty, index: number) => {
    if (isDifficultyUnlocked(difficulty, index)) {
      triggerTap('medium');
      onSelect(difficulty.name);
    } else {
      triggerTap('light');
    }
  };
  
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <MotiView
          from={{ opacity: 0, scale: 0.9, translateY: 50 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          style={styles.modal}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.levelInfo}>
                <Text style={styles.levelEmoji}>{level.theme?.emoji ?? '📖'}</Text>
                <View>
                  <Text style={styles.levelLabel}>Level {level.levelNumber}</Text>
                  <Text style={styles.levelName}>{level.name}</Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            
            {/* Difficulties */}
            <View style={styles.difficulties}>
              {sortedDifficulties.map((difficulty, index) => {
                const progress = getProgress(difficulty.name);
                const unlocked = isDifficultyUnlocked(difficulty, index);
                const colors = getDifficultyColor(difficulty);
                
                return (
                  <Pressable
                    key={difficulty.name}
                    onPress={() => handleSelect(difficulty, index)}
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
                          <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
                        </View>
                      )}
                      
                      {/* Passed checkmark */}
                      {progress?.passed && (
                        <View style={styles.passedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        </View>
                      )}
                      
                      <View style={styles.difficultyContent}>
                        <Text style={styles.difficultyName}>{difficulty.displayName}</Text>
                        <Text style={styles.requiredScore}>
                          {difficulty.requiredScore}% to pass
                        </Text>
                      </View>
                      
                      <View style={styles.scoreContainer}>
                        <Text style={styles.scoreLabel}>Best</Text>
                        <Text style={styles.scoreValue}>
                          {progress?.highScore.toFixed(0) ?? 0}%
                        </Text>
                      </View>
                      
                      {unlocked && (
                        <Ionicons 
                          name="play-circle" 
                          size={32} 
                          color="rgba(255,255,255,0.9)" 
                        />
                      )}
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
            
            {/* Instructions */}
            <Text style={styles.instructions}>
              Complete each difficulty in order to unlock the next one
            </Text>
          </Pressable>
        </MotiView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modal: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  levelEmoji: {
    fontSize: 40,
  },
  levelLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  levelName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  difficulties: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  difficultyCard: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
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
    padding: SPACING.md,
    gap: SPACING.md,
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passedBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  difficultyContent: {
    flex: 1,
  },
  difficultyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  requiredScore: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  scoreLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  instructions: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
});
