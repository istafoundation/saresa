// Unified Game Engine - Handles level gameplay with all question types
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../convex/_generated/api';
import { useSafeNavigation } from '../../../utils/useSafeNavigation';
import { useChildAuth } from '../../../utils/childAuth';
import { useTapFeedback } from '../../../utils/useTapFeedback';
import { useGameAudio } from '../../../utils/sound-manager';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../constants/theme';
import type { Id } from '../../../convex/_generated/dataModel';

// Question renderers
import MCQRenderer from '../../../components/questions/MCQRenderer';
import GridRenderer from '../../../components/questions/GridRenderer';
import MapRenderer from '../../../components/questions/MapRenderer';
import SelectRenderer from '../../../components/questions/SelectRenderer';

type Question = {
  _id: Id<"levelQuestions">;
  questionType: 'mcq' | 'grid' | 'map' | 'select';
  question: string;
  data: any;
};

export default function LevelGameScreen() {
  const { safeBack } = useSafeNavigation();
  const { levelId, difficulty } = useLocalSearchParams<{ 
    levelId: string; 
    difficulty: string;
  }>();
  const { token } = useChildAuth();
  const { triggerTap } = useTapFeedback();
  const { playCorrect, playWrong, playWin, startMusic, stopMusic } = useGameAudio();
  
  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameResult, setGameResult] = useState<{
    score: number;
    passed: boolean;
    isNewHighScore: boolean;
    levelCompleted: boolean;
  } | null>(null);
  
  // Fetch questions
  const questions = useQuery(
    api.levels.getLevelQuestions,
    token && levelId && difficulty
      ? { token, levelId: levelId as Id<"levels">, difficultyName: difficulty }
      : 'skip'
  ) as Question[] | undefined;
  
  // Submit attempt mutation
  const submitAttempt = useMutation(api.levels.submitLevelAttempt);
  
  // Get level info for display
  const levels = useQuery(
    api.levels.getAllLevelsWithProgress,
    token ? { token } : 'skip'
  );
  
  const currentLevel = levels?.find(l => l._id === levelId);
  const currentDifficulty = currentLevel?.difficulties.find(d => d.name === difficulty);
  
  // Current question
  const currentQuestion = questions?.[currentIndex];
  const totalQuestions = questions?.length ?? 0;
  
  // Start music when playing
  useEffect(() => {
    if (questions && questions.length > 0 && !showResult) {
      startMusic();
    }
    return () => stopMusic();
  }, [questions, showResult, startMusic, stopMusic]);
  
  // Handle answer from any renderer
  const handleAnswer = useCallback(async (isCorrect: boolean) => {
    if (isCorrect) {
      playCorrect();
      triggerTap('heavy');
      setCorrectCount(prev => prev + 1);
    } else {
      playWrong();
      triggerTap('light');
    }
    
    // Move to next question after delay
    setTimeout(() => {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Game finished - calculate score
        finishGame(isCorrect);
      }
    }, 1500);
  }, [currentIndex, totalQuestions, playCorrect, playWrong, triggerTap]);
  
  // Finish game and submit score
  const finishGame = async (lastAnswerCorrect: boolean) => {
    stopMusic();
    
    const finalCorrect = correctCount + (lastAnswerCorrect ? 1 : 0);
    const score = Math.round((finalCorrect / totalQuestions) * 100);
    
    if (!token || !levelId || !difficulty) return;
    
    try {
      const result = await submitAttempt({
        token,
        levelId: levelId as Id<"levels">,
        difficultyName: difficulty,
        score,
      });
      
      setGameResult({
        score,
        passed: result.passed,
        isNewHighScore: result.isNewHighScore,
        levelCompleted: result.levelCompleted,
      });
      
      if (result.passed) {
        playWin();
      }
    } catch (error) {
      console.error('Failed to submit attempt:', error);
      setGameResult({
        score,
        passed: score >= (currentDifficulty?.requiredScore ?? 0),
        isNewHighScore: false,
        levelCompleted: false,
      });
    }
    
    setShowResult(true);
  };
  
  // Handle back
  const handleBack = () => {
    triggerTap('medium');
    stopMusic();
    safeBack();
  };
  
  // Loading state
  if (!questions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading questions...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // No questions
  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="help-circle-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No questions available</Text>
          <Text style={styles.emptySubtext}>Check back later!</Text>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  
  // Result screen
  if (showResult && gameResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring' }}
            style={styles.resultCard}
          >
            <Text style={styles.resultEmoji}>
              {gameResult.passed ? '🎉' : '😔'}
            </Text>
            <Text style={styles.resultTitle}>
              {gameResult.passed ? 'Great Job!' : 'Keep Trying!'}
            </Text>
            
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreText}>{gameResult.score}%</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
            
            <View style={styles.resultInfo}>
              <View style={styles.resultInfoItem}>
                <Text style={styles.resultInfoValue}>
                  {correctCount + (gameResult.score > (correctCount / totalQuestions) * 100 ? 1 : 0)}/{totalQuestions}
                </Text>
                <Text style={styles.resultInfoLabel}>Correct</Text>
              </View>
              <View style={styles.resultInfoDivider} />
              <View style={styles.resultInfoItem}>
                <Text style={styles.resultInfoValue}>{currentDifficulty?.requiredScore}%</Text>
                <Text style={styles.resultInfoLabel}>Required</Text>
              </View>
            </View>
            
            {gameResult.isNewHighScore && (
              <View style={styles.newHighScoreBadge}>
                <Ionicons name="trophy" size={20} color={COLORS.accentGold} />
                <Text style={styles.newHighScoreText}>New High Score!</Text>
              </View>
            )}
            
            {gameResult.levelCompleted && (
              <View style={styles.levelCompleteBadge}>
                <Ionicons name="star" size={20} color={COLORS.accentGold} />
                <Text style={styles.levelCompleteText}>Level Complete! Next level unlocked!</Text>
              </View>
            )}
            
            {!gameResult.passed && (
              <Text style={styles.encourageText}>
                You need {currentDifficulty?.requiredScore}% to pass. Try again!
              </Text>
            )}
            
            <Pressable style={styles.doneButton} onPress={handleBack}>
              <Text style={styles.doneButtonText}>
                {gameResult.passed ? 'Continue' : 'Try Again'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
            </Pressable>
          </MotiView>
        </View>
      </SafeAreaView>
    );
  }
  
  // Game screen
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </Pressable>
        
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {totalQuestions}
          </Text>
          <View style={styles.progressBar}>
            <MotiView
              animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              transition={{ type: 'timing', duration: 300 }}
              style={styles.progressFill}
            />
          </View>
        </View>
        
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>
            {currentDifficulty?.displayName ?? difficulty}
          </Text>
        </View>
      </View>
      
      {/* Question Renderer based on type */}
      {currentQuestion && (
        <View style={styles.questionContainer}>
          {currentQuestion.questionType === 'mcq' && (
            <MCQRenderer
              question={currentQuestion.question}
              data={currentQuestion.data}
              onAnswer={handleAnswer}
            />
          )}
          {currentQuestion.questionType === 'grid' && (
            <GridRenderer
              question={currentQuestion.question}
              data={currentQuestion.data}
              onAnswer={handleAnswer}
            />
          )}
          {currentQuestion.questionType === 'map' && (
            <MapRenderer
              question={currentQuestion.question}
              data={currentQuestion.data}
              onAnswer={handleAnswer}
            />
          )}
          {currentQuestion.questionType === 'select' && (
            <SelectRenderer
              question={currentQuestion.question}
              data={currentQuestion.data}
              onAnswer={handleAnswer}
            />
          )}
        </View>
      )}
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
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  backButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  progressContainer: {
    flex: 1,
    gap: SPACING.xs,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  difficultyBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'uppercase',
  },
  questionContainer: {
    flex: 1,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  resultCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  resultInfoItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  resultInfoValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultInfoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  resultInfoDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.textMuted,
  },
  newHighScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accentGold + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  newHighScoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accentGold,
  },
  levelCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  levelCompleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  encourageText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});
