// Level Path Component - Candy Crush-style scrollable level path
import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useChildAuth } from '../utils/childAuth';
import { COLORS, SPACING } from '../constants/theme';
import LevelNode from './LevelNode';
import DifficultySelector from './DifficultySelector';
import type { Id } from '../convex/_generated/dataModel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Type for level data from query
type LevelWithProgress = {
  _id: Id<"levels">;
  levelNumber: number;
  name: string;
  description?: string;
  isEnabled: boolean;
  difficulties: Array<{
    name: string;
    displayName: string;
    requiredScore: number;
    order: number;
  }>;
  theme?: {
    emoji: string;
    color: string;
  };
  state: 'locked' | 'unlocked' | 'completed' | 'coming_soon';
  progress: {
    difficultyProgress: Array<{
      difficultyName: string;
      highScore: number;
      passed: boolean;
      attempts: number;
    }>;
    isCompleted: boolean;
  } | null;
};

interface LevelPathProps {
  onStartLevel: (levelId: Id<"levels">, difficulty: string) => void;
}

export default function LevelPath({ onStartLevel }: LevelPathProps) {
  const { token } = useChildAuth();
  const [selectedLevel, setSelectedLevel] = useState<LevelWithProgress | null>(null);
  
  // Fetch levels with progress
  const levels = useQuery(
    api.levels.getAllLevelsWithProgress,
    token ? { token } : 'skip'
  ) as LevelWithProgress[] | undefined;
  
  const handleLevelPress = useCallback((level: LevelWithProgress) => {
    if (level.state === 'unlocked' || level.state === 'completed') {
      setSelectedLevel(level);
    }
  }, []);
  
  const handleSelectDifficulty = useCallback((difficultyName: string) => {
    if (selectedLevel) {
      onStartLevel(selectedLevel._id, difficultyName);
      setSelectedLevel(null);
    }
  }, [selectedLevel, onStartLevel]);
  
  const handleCloseDifficulty = useCallback(() => {
    setSelectedLevel(null);
  }, []);
  
  if (!levels) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading levels...</Text>
      </View>
    );
  }
  
  if (levels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🎮</Text>
        <Text style={styles.emptyText}>No levels available yet!</Text>
        <Text style={styles.emptySubtext}>Check back soon for new content.</Text>
      </View>
    );
  }
  
  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Path line connecting nodes */}
        <View style={styles.pathLine} />
        
        {/* Level nodes */}
        {levels.map((level, index) => (
          <LevelNode
            key={level._id}
            levelNumber={level.levelNumber}
            name={level.name}
            state={level.state}
            theme={level.theme}
            progress={level.progress ?? undefined}
            onPress={() => handleLevelPress(level)}
            isLeft={index % 2 === 0}
          />
        ))}
        
        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* Difficulty selector modal */}
      {selectedLevel && (
        <DifficultySelector
          level={selectedLevel}
          onSelect={handleSelectDifficulty}
          onClose={handleCloseDifficulty}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: SPACING.lg,
    position: 'relative',
  },
  pathLine: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 2,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});
