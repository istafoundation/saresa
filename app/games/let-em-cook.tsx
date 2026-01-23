// Let'em Cook - Match spice images to names
// Refactored: Level-Progression pattern, no Zustand store
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useSafeNavigation } from '../../utils/useSafeNavigation';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useChildAuth } from '../../utils/childAuth';
import { useTapFeedback } from '../../utils/useTapFeedback';
import { useGameAudio } from '../../utils/sound-manager';
import { useUserStore } from '../../stores/user-store';
import MatchRenderer from '../../components/questions/MatchRenderer';
import Mascot from '../../components/Mascot';

// Constants
const SPICES_PER_QUESTION = 4;
const XP_PER_CORRECT = 10;

interface Spice {
  id: string;
  name: string;
  imageUrl: string;
}

export default function LetEmCookScreen() {
  const { safeBack } = useSafeNavigation();
  const { token } = useChildAuth();
  const { triggerTap } = useTapFeedback();
  const { playCorrect, playWrong, playWin } = useGameAudio();
  const { mascot } = useUserStore();
  
  // Game state (local, no Zustand)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [questionKey, setQuestionKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs
  const correctCountRef = useRef(0);
  const isProcessingRef = useRef(false);
  
  // Convex queries
  const canPlay = useQuery(api.gameStats.canPlayLetEmCook, 
    token ? { token } : 'skip'
  );
  const settings = useQuery(api.spices.getLetEmCookSettings);
  
  // Calculate how many spices we need
  const questionsPerGame = settings?.questionsPerGame ?? 1;
  const totalSpicesNeeded = questionsPerGame * SPICES_PER_QUESTION;
  
  // Fetch spices once we know how many we need
  const spicesData = useQuery(
    api.spices.getRandomSpices,
    settings ? { count: totalSpicesNeeded } : 'skip'
  );
  
  // Mutation
  const finishLetEmCookMutation = useMutation(api.gameStats.finishLetEmCook);
  
  // Group spices into questions (4 spices each)
  const questions = useMemo(() => {
    if (!spicesData) return [];
    
    const grouped: Spice[][] = [];
    for (let i = 0; i < spicesData.length; i += SPICES_PER_QUESTION) {
      const chunk = spicesData.slice(i, i + SPICES_PER_QUESTION);
      if (chunk.length === SPICES_PER_QUESTION) {
        grouped.push(chunk);
      }
    }
    return grouped;
  }, [spicesData]);
  
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const totalSpices = totalQuestions * SPICES_PER_QUESTION;
  
  // Convert to MatchRenderer format
  const matchData = useMemo(() => {
    if (!currentQuestion) return null;
    return {
      pairs: currentQuestion.map(spice => ({
        imageUrl: spice.imageUrl,
        text: spice.name,
      }))
    };
  }, [currentQuestion]);
  

  
  // Handle feedback (sound + haptics)
  const handleFeedback = useCallback((isCorrect: boolean) => {
    requestAnimationFrame(() => {
      if (isCorrect) {
        playCorrect();
        triggerTap('heavy');
      } else {
        playWrong();
        triggerTap('light');
      }
    });
  }, [playCorrect, playWrong, triggerTap]);
  
  // Handle answer from MatchRenderer
  // MatchRenderer returns true if ALL pairs matched correctly
  const handleAnswer = useCallback((allCorrect: boolean) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsTransitioning(true);
    
    // Count correct spices (if all correct, add 4; otherwise 0)
    // NOTE: MatchRenderer only tells us if ALL matches are correct
    if (allCorrect) {
      correctCountRef.current += SPICES_PER_QUESTION;
      setCorrectCount(correctCountRef.current);
    }
    
    // Move to next question after delay
    setTimeout(() => {
      if (currentIndex < totalQuestions - 1) {
        setQuestionKey(prev => prev + 1);
        setCurrentIndex(prev => prev + 1);
        
        InteractionManager.runAfterInteractions(() => {
          setIsTransitioning(false);
          isProcessingRef.current = false;
        });
      } else {
        // Game finished
        finishGame();
      }
    }, 1500);
  }, [currentIndex, totalQuestions]);
  
  // Finish game and submit score
  const finishGame = async () => {

    setIsSaving(true);
    
    const finalCorrect = correctCountRef.current;
    
    if (token) {
      try {
        await finishLetEmCookMutation({
          token,
          correctCount: finalCorrect,
          totalQuestions: totalSpices,
        });
        playWin();
      } catch (error) {
        console.error('Failed to save game:', error);
      }
    }
    
    setIsSaving(false);
    setShowResult(true);
    setIsTransitioning(false);
    isProcessingRef.current = false;
  };
  
  // Back handler
  const handleBack = useCallback(() => {
    triggerTap('medium');
    safeBack();
  }, [triggerTap, safeBack]);
  
  // Loading state
  if (canPlay === undefined || settings === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Already completed today
  if (!canPlay?.canPlay) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>Let'em Cook</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.completedContainer}>
          <Mascot mascotType={mascot} size="large" />
          <Text style={styles.completedTitle}>🛑 Daily Challenge Done!</Text>
          <Text style={styles.completedText}>
            You've already completed today's spice challenge.
            Come back tomorrow for a fresh batch!
          </Text>
          {canPlay?.stats && (
            <View style={styles.previousStats}>
              <Text style={styles.previousStatsTitle}>Today's Score:</Text>
              <Text style={styles.previousStatsValue}>
                {canPlay.stats.correctAnswers}/{totalSpices || '?'} correct
              </Text>
              <Text style={styles.previousStatsXp}>
                +{canPlay.stats.totalXPEarned} XP earned
              </Text>
            </View>
          )}
          
          <Pressable style={styles.backToGamesButton} onPress={handleBack}>
            <Text style={styles.backToGamesText}>Back to Games</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  
  // Loading spices
  if (!spicesData || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>Let'em Cook</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.loadingContainer}>
          <MotiView
            from={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'timing', duration: 800, loop: true }}
          >
            <Text style={{ fontSize: 48 }}>👨‍🍳</Text>
          </MotiView>
          <Text style={[styles.loadingText, { marginTop: SPACING.lg }]}>
            Getting ingredients ready...
          </Text>
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: SPACING.md }} />
        </View>
      </SafeAreaView>
    );
  }
  
  // Result screen
  if (showResult) {
    const xpEarned = correctCountRef.current * XP_PER_CORRECT;
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 200 }}
          >
            <Text style={styles.resultEmoji}>🎉</Text>
            <Text style={styles.resultTitle}>Challenge Complete!</Text>
            
            <View style={styles.resultStats}>
              <View style={styles.resultStatItem}>
                <Text style={styles.resultStatValue}>{correctCountRef.current}</Text>
                <Text style={styles.resultStatLabel}>Correct</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatItem}>
                <Text style={styles.resultStatValue}>{totalSpices}</Text>
                <Text style={styles.resultStatLabel}>Total</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatItem}>
                <Text style={[styles.resultStatValue, { color: COLORS.accentGold }]}>
                  +{xpEarned}
                </Text>
                <Text style={styles.resultStatLabel}>XP</Text>
              </View>
            </View>
            
            <Text style={styles.resultHint}>
              {correctCountRef.current >= totalSpices * 0.8 
                ? '🏆 Master Chef! See you tomorrow!'
                : correctCountRef.current >= totalSpices * 0.5
                ? '👍 Good job! Come back tomorrow!'
                : '📚 Keep learning! See you tomorrow!'}
            </Text>
            
            <Pressable 
              style={styles.resultButton} 
              onPress={handleBack}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.resultButtonText}>Done</Text>
              )}
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
      <View style={styles.gameHeader}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </Pressable>
        
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {totalQuestions}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentIndex + 1) / totalQuestions) * 100}%` }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.scoreContainer}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={styles.scoreText}>{correctCount}/{totalSpices}</Text>
        </View>
      </View>
      
      {/* Match Game */}
      {matchData && !isTransitioning && (
        <View style={styles.matchContainer}>
          <MatchRenderer
            key={`match-${questionKey}`}
            question="Match each spice to its name"
            data={matchData}
            onAnswer={handleAnswer}
            onFeedback={handleFeedback}
          />
        </View>
      )}
      
      {/* Transition loading */}
      {isTransitioning && (
        <View style={styles.transitionContainer}>
          <MotiView
            from={{ opacity: 0.5, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 200 }}
          >
            <Text style={styles.transitionText}>Next question...</Text>
          </MotiView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // Completed screen
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  completedText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  previousStats: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  previousStatsTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  previousStatsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  previousStatsXp: {
    fontSize: 16,
    color: COLORS.accentGold,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  backToGamesButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  backToGamesText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Game header
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
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
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  
  // Match container
  matchContainer: {
    flex: 1,
  },
  
  // Transition
  transitionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitionText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  
  // Result screen
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  resultEmoji: {
    fontSize: 72,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  resultStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  resultStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  resultStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  resultStatDivider: {
    width: 1,
    backgroundColor: COLORS.textMuted,
    marginHorizontal: SPACING.md,
  },
  resultHint: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  resultButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl * 2,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  resultButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
});
