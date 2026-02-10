// Unified Game Engine - Handles level gameplay with all question types
// Optimized for smooth performance with proper state resets
import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, InteractionManager, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../convex/_generated/api';
import { useSafeNavigation } from '../../../utils/useSafeNavigation';
import { useChildAuth } from '../../../utils/childAuth';
import { useTapFeedback } from '../../../utils/useTapFeedback';
import { useGameAudio } from '../../../utils/sound-manager';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../constants/theme';
import type { Id } from '../../../convex/_generated/dataModel';
import CoinRewardAnimation from '../../../components/animations/CoinRewardAnimation';
import CoinBalance from '../../../components/CoinBalance';
import { saveLevelProgress, loadLevelProgress, clearLevelProgress, hasLevelProgress } from '../../../utils/storage';
import { useUserStore } from '../../../stores/user-store';
import { useOfflineLevels } from '../../../hooks/useOfflineLevels';
import { useOfflineQuestions } from '../../../hooks/useOfflineQuestions';
import { useNetwork } from '../../../utils/network';
import { enqueueAttempt } from '../../../utils/offline-queue';
import { syncEngine, CONTENT_BASE_URL } from '../../../utils/sync-engine';
import { getCachedProgress, setCachedProgress, getQuestions as getCachedQuestions, setQuestions as setCachedQuestions } from '../../../utils/level-cache';
import { convex } from '../../ConvexClientProvider';

// Coin rates matching server-side logic (convex/lib/coins.ts)
const LEVEL_PROGRESSION_COINS: Record<string, number> = { easy: 50, medium: 100, hard: 150 };



// Question renderers - lazy loaded
import MCQRenderer from '../../../components/questions/MCQRenderer';
import GridRenderer from '../../../components/questions/GridRenderer';
import MapRenderer from '../../../components/questions/MapRenderer';
import SelectRenderer from '../../../components/questions/SelectRenderer';
import MatchRenderer from '../../../components/questions/MatchRenderer';
import SpeakingRenderer from '../../../components/questions/SpeakingRenderer';
import MakeSentenceRenderer from '../../../components/questions/MakeSentenceRenderer';
import FillInBlanksRenderer from '../../../components/questions/FillInBlanksRenderer';

type Question = {
  _id: Id<"levelQuestions">;
  questionType: 'mcq' | 'grid' | 'map' | 'select' | 'match' | 'speaking' | 'make_sentence' | 'fill_in_the_blanks';
  question: string;
  questionCode?: string;
  data: any;
};

// Helper to update cached progress locally after a game finishes
function updateCachedProgressLocally(levelId: string, difficultyName: string, score: number, passed: boolean) {
  try {
    const cachedProgress = getCachedProgress();
    const idx = cachedProgress.findIndex((p: any) => p.levelId === levelId);
    
    if (idx >= 0) {
      // Update existing progress
      const existing = cachedProgress[idx];
      const diffIdx = existing.difficultyProgress?.findIndex((dp: any) => dp.difficultyName === difficultyName) ?? -1;
      
      if (diffIdx >= 0) {
        const dp = existing.difficultyProgress[diffIdx];
        existing.difficultyProgress[diffIdx] = {
          ...dp,
          highScore: Math.max(dp.highScore ?? 0, score),
          passed: dp.passed || passed,
          attempts: (dp.attempts ?? 0) + 1,
        };
      } else {
        existing.difficultyProgress = [...(existing.difficultyProgress ?? []), {
          difficultyName,
          highScore: score,
          passed,
          attempts: 1,
        }];
      }
      
      cachedProgress[idx] = { ...existing, updatedAt: Date.now() };
    } else {
      // Create new progress entry
      cachedProgress.push({
        levelId,
        difficultyProgress: [{
          difficultyName,
          highScore: score,
          passed,
          attempts: 1,
        }],
        isCompleted: false,
        updatedAt: Date.now(),
      });
    }
    
    setCachedProgress(cachedProgress);
    console.log('[LevelGame] Updated cached progress locally');
  } catch (e) {
    console.error('[LevelGame] Failed to update cached progress', e);
  }
}

export default function LevelGameScreen() {
  const { safeBack } = useSafeNavigation();
  const router = useRouter();
  const { levelId, difficulty, canResume } = useLocalSearchParams<{ 
    levelId: string; 
    difficulty: string;
    canResume?: string;
  }>();
  const { token } = useChildAuth();
  const { triggerTap } = useTapFeedback();
  const { playCorrect, playWrong, playWin } = useGameAudio();
  
  // Access store for optimistic updates
  const setSyncedData = useUserStore(state => state.setSyncedData);
  const coins = useUserStore(state => state.coins);
  const syncedData = useUserStore(state => state.syncedData);
  
  // Coin Animation
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false); // Final game result
  const [showQuestionResult, setShowQuestionResult] = useState(false); // Per-question result
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [questionStatus, setQuestionStatus] = useState<'correct' | 'wrong' | 'skipped' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [questionKey, setQuestionKey] = useState(0); // Force re-render of question component
  const [gameResult, setGameResult] = useState<{
    score: number;
    passed: boolean;
    isNewHighScore: boolean;
    levelCompleted: boolean;
    coinsEarned?: number; // Add coinsEarned to gameResult type
  } | null>(null);
  
  // Refs for avoiding stale closures
  const correctCountRef = useRef(0);
  const isProcessingRef = useRef(false);
  
  // Fetch questions (offline-first)
  const questions = useOfflineQuestions(levelId, difficulty, token ?? undefined);
  
  // Submit attempt mutation
  const submitAttempt = useMutation(api.levels.submitLevelAttempt);
  const { isConnected } = useNetwork();
  
  // Get level info for display (offline-first)
  const levels = useOfflineLevels();
  
  const currentLevel = levels?.find((l: any) => l._id === levelId);
  const currentDifficulty = currentLevel?.difficulties.find((d: any) => d.name === difficulty);
  

  const totalQuestions = questions?.length ?? 0;
  
  // Resume Game Logic
  useEffect(() => {
    if (canResume === 'true' && levelId && difficulty) {
      if (hasLevelProgress(levelId, difficulty)) {
        Alert.alert(
          'Resume Game',
          'Do you want to continue where you left off?',
          [
            {
              text: 'Start Over',
              style: 'destructive',
              onPress: () => {
                clearLevelProgress(levelId, difficulty);
              }
            },
            {
              text: 'Continue',
              onPress: () => {
                const state = loadLevelProgress(levelId, difficulty);
                if (state) {
                   // Ensure we don't go out of bounds if questions changed
                   if (questions && state.currentIndex < questions.length) {
                       setCurrentIndex(state.currentIndex);
                       setCorrectCount(state.correctCount);
                       correctCountRef.current = state.correctCount;
                       // Also need to set key to force re-render of current question type
                       setQuestionKey(state.currentIndex);
                   } else if (!questions) {
                       // If questions aren't loaded yet, we might have a race condition.
                       // Ideally we wait for questions. But this effect runs when deps change.
                       // We can check if questions is defined.
                       // If questions are NOT defined, we probably shouldn't be here or we wait.
                       // Actually this effect depends on 'questions' implicitely if we use it?
                       // No, we should probably set a "pending resume" state if questions aren't ready?
                       // Or simple hack: The query hook handles loading.
                       // If questions is undefined, we can't validate bounds.
                       // Let's safe guard:
                       // We can just set the state. If questions load later, currentIndex will be applied.
                       setCurrentIndex(state.currentIndex);
                       setCorrectCount(state.correctCount);
                       correctCountRef.current = state.correctCount;
                       setQuestionKey(state.currentIndex);
                   }
                }
              }
            }
          ]
        );
      }
    }
  }, [canResume, levelId, difficulty, /* run once on mount effectively, but canResume ensures we check */]);

  // Auto-save progress
  useEffect(() => {
      // Only save if we are in verifiable "resume" mode and have actually started playing
      if (canResume === 'true' && levelId && difficulty && currentIndex > 0) {
          // Don't save if finished
          if (currentIndex < totalQuestions) {
              saveLevelProgress(levelId, difficulty, {
                  currentIndex,
                  correctCount
              });
          }
      }
  }, [currentIndex, correctCount, canResume, levelId, difficulty, totalQuestions]);
  

  
  // Handle feedback (sound + haptics) - triggered by renderer immediately on visual feedback
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

  // Handle answer from any renderer - now shows question result, waits for Next button
  const handleAnswer = useCallback((isCorrect: boolean) => {
    // Prevent double-processing
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    // Update count immediately using ref
    if (isCorrect) {
      correctCountRef.current += 1;
      setCorrectCount(correctCountRef.current);
    }
    
    // Show per-question result overlay
    setLastAnswerCorrect(isCorrect);
    setShowQuestionResult(true);
  }, []);
  
  // Handle Next button - advance to next question
  // Note: finishGame uses refs and state setters which are stable, so we only need
  // currentIndex and totalQuestions as deps
  const handleNext = useCallback(() => {
    setShowQuestionResult(false);
    setLastAnswerCorrect(null);
    setQuestionStatus(null);
    
    if (currentIndex < totalQuestions - 1) {
      setQuestionKey(prev => prev + 1);
      setCurrentIndex(prev => prev + 1);
      isProcessingRef.current = false;
    } else {
      // Game finished - inline the finishGame logic to avoid dependency issues
      // finishGame uses refs which don't need to be in deps
      finishGameWithScore();
    }
  }, [currentIndex, totalQuestions]);
  
  // Handle Skip button - skip current question (counts as wrong)
  const handleSkip = useCallback(() => {
    if (isProcessingRef.current || showQuestionResult) return;
    
    triggerTap('light');
    
    // Show per-question result overlay with "Skipped" state
    setLastAnswerCorrect(false); // Counts as wrong/skipped
    setQuestionStatus('skipped'); // New state to track explicit skip
    setShowQuestionResult(true);
  }, [showQuestionResult, triggerTap]);
  
  // Handle coin landing for animation synchronization
  const handleCoinLand = useCallback(() => {
    // This could be used to trigger local visual updates if we weren't fully relying on the store
    // For now, the CoinBalance component watches the store which updates via sync
    triggerTap('light');
  }, [triggerTap]);

  // Finish game and submit score - wrapped in useCallback to be a stable dependency
  const finishGameWithScore = useCallback(async () => {
    // correctCountRef.current already contains the final correct count
    // (including the last answer which was already counted)
    const finalCorrect = correctCountRef.current;
    const score = Math.round((finalCorrect / totalQuestions) * 100);
    
    console.log('[LevelGame] Finishing game', { 
      levelId, 
      difficulty, 
      finalCorrect, 
      score,
      token: token ? 'present' : 'missing' 
    });

    if (!token || !levelId || !difficulty) {
        console.error('[LevelGame] Missing required params', { token, levelId, difficulty });
        return;
    }
    
    if (!isConnected) {
        // Offline Mode: Queue attempt with optimistic coins
        console.log('[LevelGame] Offline - Queuing attempt');
        
        try {
            const passed = score >= (currentDifficulty?.requiredScore ?? 0);
            
            // Calculate optimistic coins (same logic as server)
            // Only award if passed AND this difficulty wasn't already passed
            const cachedProgress = getCachedProgress();
            const levelProg = cachedProgress.find((p: any) => p.levelId === levelId);
            const diffProg = levelProg?.difficultyProgress?.find((dp: any) => dp.difficultyName === difficulty);
            const alreadyPassed = diffProg?.passed ?? false;
            
            let optimisticCoins = 0;
            if (passed && !alreadyPassed) {
                optimisticCoins = LEVEL_PROGRESSION_COINS[difficulty] ?? 50;
            }
            
            enqueueAttempt({
                id: Date.now().toString(),
                levelId,
                difficultyName: difficulty,
                score,
                timestamp: Date.now(),
                coinsAwarded: optimisticCoins,
            });
            
            // Determine if level is completed (all difficulties passed)
            const allDiffs = currentLevel?.difficulties ?? [];
            const diffIndex = allDiffs.findIndex((d: any) => d.name === difficulty);
            const isLastDifficulty = diffIndex === allDiffs.length - 1;
            const levelCompleted = passed && isLastDifficulty;
            
            const isNewHighScore = score > (diffProg?.highScore ?? 0);
            
            setGameResult({
                score,
                passed,
                isNewHighScore,
                levelCompleted,
                coinsEarned: optimisticCoins,
            });
            
            // Optimistically update coin balance
            if (optimisticCoins > 0 && syncedData) {
                setSyncedData({
                    ...syncedData,
                    coins: (coins ?? 0) + optimisticCoins
                });
                setEarnedCoins(optimisticCoins);
                setTimeout(() => setShowCoinAnimation(true), 500);
            }
            
            // Update cached progress locally
            updateCachedProgressLocally(levelId, difficulty, score, passed);
            
            triggerTap(passed ? 'heavy' : 'medium');
            if (passed) playWin();
            
            setShowResult(true);
            setIsTransitioning(false);
            isProcessingRef.current = false;
            return;
        } catch (e) {
            console.error('[LevelGame] Failed to queue offline attempt', e);
        }
    }

    try {
      const result = await submitAttempt({
        token,
        levelId: levelId as Id<"levels">,
        difficultyName: difficulty,
        score,
      });
      
      console.log('[LevelGame] Submit success', result);

      // Clear progress on completion (pass or fail)
      if (canResume === 'true' && levelId && difficulty) {
          clearLevelProgress(levelId, difficulty);
      }
      
      setGameResult({
        score,
        passed: result.passed,
        isNewHighScore: result.isNewHighScore,
        levelCompleted: result.levelCompleted,
        coinsEarned: result.coinsEarned,
      });
      
      if (result.coinsEarned && result.coinsEarned > 0) {
          console.log('[LevelGame] Earned coins:', result.coinsEarned);
          setEarnedCoins(result.coinsEarned);
          
          // Optimistically update coin balance immediately
          if (syncedData) {
            setSyncedData({
                ...syncedData,
                coins: (coins ?? 0) + result.coinsEarned
            });
          }

          // Small delay to allow result screen to mount/animate in
          setTimeout(() => {
            setShowCoinAnimation(true);
          }, 500);
      }
      
      triggerTap(result.passed ? 'heavy' : 'medium');
      if (result.passed) {
        playWin();
      }
    } catch (error) {
      console.error('[LevelGame] Failed to submit level attempt:', error);
      
      // If error is network related, we might want to queue it here too?
      // For now, simple error feedback or fallback ui
      
      setGameResult({
        score,
        passed: score >= (currentDifficulty?.requiredScore ?? 0),
        isNewHighScore: false,
        levelCompleted: false,
      });
    }
    
    // Update cached progress locally for online attempts too
    updateCachedProgressLocally(levelId, difficulty, score, score >= (currentDifficulty?.requiredScore ?? 0));
    
    // Trigger post-game sync to refresh cached data
    if (token) {
      syncEngine.sync(convex, token, true).catch((e) =>
        console.error('[LevelGame] Post-game sync failed', e)
      );
    }
    
    setShowResult(true);
    setIsTransitioning(false);
    isProcessingRef.current = false;
  }, [token, levelId, difficulty, totalQuestions, submitAttempt, playWin, triggerTap, currentDifficulty?.requiredScore, syncedData, coins]);
  
  // Handle back
  const handleBack = useCallback(() => {
    triggerTap('medium');
    safeBack();
  }, [triggerTap, safeBack]);
  
  // Cache-miss fallback: if no questions and online, try fetching from GitHub Pages
  const [isFetchingFallback, setIsFetchingFallback] = useState(false);
  const fallbackAttempted = useRef(false);
  
  useEffect(() => {
    if (!questions && isConnected && levelId && difficulty && !fallbackAttempted.current && !isFetchingFallback) {
      fallbackAttempted.current = true;
      setIsFetchingFallback(true);
      
      // Try GitHub Pages fallback
      fetch(`${CONTENT_BASE_URL}/questions/level_${levelId}.json?t=${Date.now()}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.questions?.[difficulty]) {
            // Cache it for future use
            setCachedQuestions(levelId, data);
            console.log('[LevelGame] Fallback: fetched questions from GitHub Pages');
          }
        })
        .catch(e => console.error('[LevelGame] Fallback fetch failed', e))
        .finally(() => setIsFetchingFallback(false));
    }
  }, [questions, isConnected, levelId, difficulty]);
  
  // Loading state
  if (!questions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MotiView
            from={{ rotate: '0deg' }}
            animate={{ rotate: '360deg' }}
            transition={{ type: 'timing', duration: 1000, loop: true }}
          >
            <Text style={styles.loadingEmoji}>🎯</Text>
          </MotiView>
          <Text style={styles.loadingText}>
            {isFetchingFallback ? 'Downloading questions...' : 'Loading questions...'}
          </Text>
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

  // Safe to access questions here as it's checked above
  const currentQuestion = questions[currentIndex];
  
  // Guard against out of bounds or undefined question
  if (!currentQuestion) {
    return (
       <SafeAreaView style={styles.container}>
         <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Error loading question</Text>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
         </View>
       </SafeAreaView>
    );
  }
  
  // Result screen
  if (showResult && gameResult) {
    const progress = (currentIndex + 1) / totalQuestions;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultHeader}>
          <Pressable onPress={handleBack} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <CoinBalance size="medium" />
        </View>

        <View style={styles.resultContainer}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.resultCard}
          >
            <Text style={styles.resultEmoji}>
              {gameResult.passed ? '🎉' : '😔'}
            </Text>
            <Text style={styles.resultTitle}>
              {gameResult.passed ? 'Great Job!' : 'Keep Trying!'}
            </Text>
            
            <View style={styles.resultStatsRow}>
              <View style={styles.resultStat}>
                 <Text style={styles.resultStatLabel}>Score</Text>
                 <Text style={styles.resultStatValue}>{gameResult.score}%</Text>
              </View>
              {/* Always show coins for debug/verification, default to 0 if undefined */}
              <View style={[styles.resultStat, styles.coinStat]}>
                 <Text style={styles.resultStatLabel}>Coins</Text>
                 <Text style={[styles.resultStatValue, { color: COLORS.accentGold }]}>
                    +{gameResult.coinsEarned ?? 0}
                 </Text>
              </View>
            </View>

            {/* Debug Info removed */}

            <View style={styles.resultActions}>
              <View style={styles.resultInfoItem}>
                <Text style={styles.resultInfoValue}>
                  {correctCountRef.current}/{totalQuestions}
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
                <Ionicons name="star" size={20} color={COLORS.success} />
                <Text style={styles.levelCompleteText}>Level Complete!</Text>
              </View>
            )}
            
            {!gameResult.passed && (
              <Text style={styles.encourageText}>
                You need {currentDifficulty?.requiredScore}% to pass
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
        
        {/* Coin Animation Overlay */}
        {showCoinAnimation && (
            <CoinRewardAnimation 
                coinsEarned={earnedCoins}
                onComplete={() => setShowCoinAnimation(false)}
                onCoinLand={handleCoinLand}
            />
        )}
      </SafeAreaView>
    );
  }
  
  // Game screen
  const progress = (currentIndex + 1) / totalQuestions;
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
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
                  { width: `${progress * 100}%` }
                ]} 
              />
            </View>
          </View>

          <CoinBalance size="small" />
        </View> 
      
      {/* Question Renderer - key forces fresh state on question change */}
      {currentQuestion && !isTransitioning && (
        <View style={styles.questionContainer}>
          {currentQuestion?.questionCode && (
            <View style={{ 
              position: 'absolute',
              top: 8,
              right: 16,
              zIndex: 10,
              paddingHorizontal: 6, 
              paddingVertical: 2, 
              backgroundColor: 'rgba(0,0,0,0.05)', 
              borderRadius: 4,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.1)'
            }}>

              <Text style={{ fontSize: 10, color: COLORS.textMuted, opacity: 0.7 }}>
                #{currentQuestion.questionCode}
              </Text>
            </View>
          )}
          {currentQuestion.questionType === 'mcq' && (
            <MCQRenderer
              key={`mcq-${questionKey}`}
              question={currentQuestion.question}
              data={currentQuestion.data}
              onAnswer={handleAnswer}
              onFeedback={handleFeedback}
              disabled={showQuestionResult}
              showAnswer={questionStatus === 'skipped'}
            />
          )}
          {currentQuestion.questionType === 'grid' && (
            <GridRenderer
              key={`grid-${questionKey}`}
              question={currentQuestion.question}
              data={currentQuestion.data}
              onAnswer={handleAnswer}
              onFeedback={handleFeedback}
              disabled={showQuestionResult}
              showAnswer={questionStatus === 'skipped'}
            />
          )}
          {currentQuestion.questionType === 'map' && (
            <MapRenderer
              key={`map-${questionKey}`}
              question={currentQuestion.question}
              data={currentQuestion.data}
              onAnswer={handleAnswer}
              onFeedback={handleFeedback}
              disabled={showQuestionResult}
              showAnswer={questionStatus === 'skipped'}
            />
          )}
          {currentQuestion.questionType === 'select' && (
            <SelectRenderer
              key={`select-${questionKey}`}
              question={currentQuestion.question}
              data={currentQuestion.data}
              onAnswer={handleAnswer}
              onFeedback={handleFeedback}
              disabled={showQuestionResult}
              showAnswer={questionStatus === 'skipped'}
            />
          )}
          {currentQuestion.questionType === 'match' && (
            <MatchRenderer
              key={`match-${questionKey}`}
              question={currentQuestion.question}
              data={currentQuestion.data}
              onAnswer={handleAnswer}
              onFeedback={handleFeedback}
              disabled={showQuestionResult}
              showAnswer={questionStatus === 'skipped'}
            />
          )}
          {currentQuestion.questionType === 'speaking' && (
            <SpeakingRenderer
              key={`speaking-${questionKey}`}
              question={currentQuestion.question}
              data={currentQuestion.data}
              onAnswer={handleAnswer}
              onFeedback={handleFeedback}
              disabled={showQuestionResult}
              showAnswer={questionStatus === 'skipped'}
            />
          )}
          {currentQuestion.questionType === 'make_sentence' && (
            <MakeSentenceRenderer
              key={`make-sentence-${questionKey}`}
              question={currentQuestion.question}
              data={currentQuestion.data}
              onAnswer={handleAnswer}
              onFeedback={handleFeedback}
              disabled={showQuestionResult}
            />
          )}
          {currentQuestion.questionType === 'fill_in_the_blanks' && (
            <FillInBlanksRenderer
              key={`fill-blanks-${questionKey}`}
              question={currentQuestion.question}
              data={currentQuestion.data}
              onAnswer={handleAnswer}
              onFeedback={handleFeedback}
              disabled={showQuestionResult}
            />
          )}
        </View>
      )}

      {/* Bottom Skip Button */}
      {!showQuestionResult && !isTransitioning && !showResult && (
        <View style={styles.footer}>
          <Pressable 
            style={styles.bottomSkipButton} 
            onPress={handleSkip}
            disabled={isProcessingRef.current}
          >
            <Text style={styles.bottomSkipButtonText}>Skip</Text>
            <Ionicons name="play-skip-forward-outline" size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      )}
      
      {/* Per-question result overlay with Next button */}
      {showQuestionResult && (
        <View style={styles.questionResultOverlay}>
          <MotiView
            from={{ translateY: 50 }}
            animate={{ translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={[
              styles.questionResultCard,
              lastAnswerCorrect ? styles.questionResultCorrect : styles.questionResultWrong
            ]}
          >
            <View style={styles.questionResultHeader}>
              <Ionicons 
                name={questionStatus === 'skipped' ? "help-circle" : (lastAnswerCorrect ? "checkmark-circle" : "close-circle")} 
                size={48} 
                color={questionStatus === 'skipped' ? COLORS.primary : (lastAnswerCorrect ? COLORS.success : COLORS.error)} 
              />
              <Text style={[
                styles.questionResultTitle,
                { color: questionStatus === 'skipped' ? COLORS.primary : (lastAnswerCorrect ? COLORS.success : COLORS.error) }
              ]}>
                {questionStatus === 'skipped' ? "Skipped" : (lastAnswerCorrect ? "Correct!" : "Not Quite!")}
              </Text>
              <Text style={styles.questionResultSubtitle}>
                {questionStatus === 'skipped'
                  ? "Here is the correct answer"
                  : (lastAnswerCorrect 
                      ? "Great job! Keep it up!" 
                      : "Check the correct answer above")}
              </Text>
            </View>
            
            <Pressable 
              onPress={handleNext} 
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.nextButtonPressed
              ]}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex < totalQuestions - 1 ? "Next Question" : "Finish"}
              </Text>
              <Ionicons name="arrow-forward" size={24} color={COLORS.text} />
            </Pressable>
          </MotiView>
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
  loadingEmoji: {
    fontSize: 48,
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
  transitionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitionText: {
    fontSize: 16,
    color: COLORS.textMuted,
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
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    width: '100%',
    zIndex: 10,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  questionResultOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  questionResultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.lg,
  },
  resultStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  resultStat: {
    alignItems: 'center',
    gap: 4,
  },
  coinStat: {
    // Optional additional styling for coin stat
  },
  resultStatLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  resultStatValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  resultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
  },
  questionResultCorrect: {
    borderWidth: 2,
    borderColor: COLORS.success + '40',
  },
  questionResultWrong: {
    borderWidth: 2,
    borderColor: COLORS.error + '40',
  },
  questionResultHeader: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  questionResultTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  questionResultSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    marginTop: SPACING.sm,
  },
  nextButtonPressed: {
    opacity: 0.9,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  footer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSkipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.textMuted + '40',
  },
  bottomSkipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
