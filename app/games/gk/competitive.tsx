// GK Competitive Mode - 10 questions, 30s timer, XP rewards
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { useGKStore } from '../../../stores/gk-store';
import { useUserStore } from '../../../stores/user-store';
import { useGameAudio } from '../../../utils/sound-manager';

const TIME_LIMIT = 30;
const TOTAL_QUESTIONS = 10;

export default function CompetitiveScreen() {
  const router = useRouter();
  const { addXP, addWeaponShards, mascot } = useUserStore();
  const {
    quizState,
    currentQuestionIndex,
    questions,
    startQuiz,
    answerQuestion,
    nextQuestion,
    finishQuiz,
    resetQuiz,
  } = useGKStore();
  
  // Sound effects and music
  const { playTap, playCorrect, playWrong, playWin, startMusic, stopMusic } = useGameAudio();

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [gameEnded, setGameEnded] = useState(false);
  const [finalResult, setFinalResult] = useState<{
    correct: number;
    total: number;
    xpEarned: number;
    shardsEarned: number;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timerProgress = useSharedValue(1);

  useEffect(() => {
    const success = startQuiz('competitive');
    if (!success) {
      router.back();
      return;
    }
    startMusic(); // Start background music
    return () => {
      resetQuiz();
      stopMusic(); // Stop music on exit
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Start timer when question changes
  useEffect(() => {
    if (quizState !== 'playing' || showResult) return;
    
    setTimeLeft(TIME_LIMIT);
    timerProgress.value = withTiming(0, { 
      duration: TIME_LIMIT * 1000,
      easing: Easing.linear,
    });

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - auto fail
          handleTimeUp();
          return 0;
        }
        // Haptic at 10, 5, 3, 2, 1
        if ([10, 5, 3, 2, 1].includes(prev - 1)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestionIndex, quizState]);

  const handleTimeUp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    playWrong();
    
    // Auto-select wrong answer
    const result = answerQuestion(-1); // Invalid answer
    setIsCorrect(false);
    setCorrectIndex(result.correctIndex);
    setShowResult(true);
  };

  const handleAnswer = (index: number) => {
    if (showResult) return;
    if (timerRef.current) clearInterval(timerRef.current);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playTap();
    setSelectedAnswer(index);
    
    const result = answerQuestion(index);
    setIsCorrect(result.correct);
    setCorrectIndex(result.correctIndex);
    setShowResult(true);
    
    if (result.correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playCorrect();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playWrong();
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playTap();
    setSelectedAnswer(null);
    setShowResult(false);
    timerProgress.value = 1;
    
    if (currentQuestionIndex >= TOTAL_QUESTIONS - 1) {
      // Quiz finished - stop music and play result sound
      stopMusic();
      const result = finishQuiz();
      const shardsEarned = result.correct * 5; // 5 shards per correct answer
      setFinalResult({ ...result, shardsEarned });
      setGameEnded(true);
      
      // Play win sound for good performance
      if (result.correct >= 5) {
        playWin();
      }
      
      if (result.xpEarned > 0) {
        addXP(result.xpEarned);
      }
      if (shardsEarned > 0) {
        addWeaponShards(shardsEarned);
      }
    } else {
      nextQuestion();
    }
  };

  const timerStyle = useAnimatedStyle(() => ({
    width: `${timerProgress.value * 100}%`,
  }));

  const currentQuestion = questions[currentQuestionIndex];

  // Game ended - show results
  if (gameEnded && finalResult) {
    return (
      <SafeAreaView style={styles.container}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' }}
          style={styles.resultContainer}
        >
          <Text style={styles.resultEmoji}>
            {finalResult.correct >= 7 ? '🏆' : finalResult.correct >= 5 ? '⭐' : '📚'}
          </Text>
          <Text style={styles.resultTitle}>Challenge Complete!</Text>
          
          <View style={styles.scoreCard}>
            <Text style={styles.scoreText}>
              {finalResult.correct} / {finalResult.total}
            </Text>
            <Text style={styles.scoreLabel}>Correct Answers</Text>
          </View>

          <View style={styles.rewardsRow}>
            <View style={styles.xpEarnedBig}>
              <Text style={styles.xpEarnedBigText}>+{finalResult.xpEarned} XP</Text>
            </View>
            {finalResult.shardsEarned > 0 && (
              <View style={styles.shardsEarnedBig}>
                <Text style={styles.shardsEarnedBigText}>+{finalResult.shardsEarned} 💎</Text>
              </View>
            )}
          </View>

          <View style={styles.mascotResult}>
            <Text style={styles.mascotEmoji}>
              {mascot === 'male' ? '🧙' : '🧙‍♀️'}
            </Text>
            <Text style={styles.mascotMessage}>
              {finalResult.correct >= 7 
                ? "Outstanding detective work!" 
                : finalResult.correct >= 5 
                  ? "Good effort! Keep practicing!" 
                  : "Every mystery takes time to solve!"}
            </Text>
          </View>

          <Pressable style={styles.doneButton} onPress={() => router.back()}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.doneButtonGradient}
            >
              <Text style={styles.doneButtonText}>Return to Games</Text>
            </LinearGradient>
          </Pressable>
        </MotiView>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading challenge...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Timer */}
      <View style={styles.header}>
        <View style={styles.questionProgress}>
          <Text style={styles.questionProgressText}>
            {currentQuestionIndex + 1} / {TOTAL_QUESTIONS}
          </Text>
        </View>
        <View style={styles.timerContainer}>
          <Ionicons 
            name="timer-outline" 
            size={20} 
            color={timeLeft <= 5 ? COLORS.error : COLORS.text} 
          />
          <Text style={[
            styles.timerText,
            timeLeft <= 5 && styles.timerTextDanger
          ]}>
            {timeLeft}s
          </Text>
        </View>
      </View>

      {/* Timer Bar */}
      <View style={styles.timerBar}>
        <Animated.View 
          style={[
            styles.timerBarFill,
            timerStyle,
            timeLeft <= 5 && styles.timerBarDanger,
          ]} 
        />
      </View>

      {/* Progress Dots */}
      <View style={styles.progressDots}>
        {Array(TOTAL_QUESTIONS).fill(0).map((_, i) => (
          <View 
            key={i}
            style={[
              styles.progressDot,
              i < currentQuestionIndex && styles.progressDotDone,
              i === currentQuestionIndex && styles.progressDotCurrent,
            ]}
          />
        ))}
      </View>

      {/* Question */}
      <MotiView
        key={currentQuestionIndex}
        from={{ opacity: 0, translateX: 50 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'spring' }}
        style={styles.questionContainer}
      >
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = index === correctIndex;
            
            let bgColor = COLORS.surface;
            if (showResult) {
              if (isCorrectOption) bgColor = COLORS.success + '40';
              else if (isSelected) bgColor = COLORS.error + '40';
            }
            
            return (
              <MotiView
                key={index}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: index * 50 }}
              >
                <Pressable
                  style={[
                    styles.optionButton,
                    { backgroundColor: bgColor },
                  ]}
                  onPress={() => handleAnswer(index)}
                  disabled={showResult}
                >
                  <View style={[
                    styles.optionLetter,
                    showResult && isCorrectOption && styles.optionLetterCorrect,
                    showResult && isSelected && !isCorrectOption && styles.optionLetterWrong,
                  ]}>
                    <Text style={styles.optionLetterText}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text style={styles.optionText}>{option}</Text>
                  
                  {showResult && isCorrectOption && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  )}
                  {showResult && isSelected && !isCorrectOption && (
                    <Ionicons name="close-circle" size={24} color={COLORS.error} />
                  )}
                </Pressable>
              </MotiView>
            );
          })}
        </View>
      </MotiView>

      {/* Next Button */}
      {showResult && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.bottomContainer}
        >
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {currentQuestionIndex >= TOTAL_QUESTIONS - 1 ? 'See Results' : 'Next Question'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
            </LinearGradient>
          </Pressable>
        </MotiView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  questionProgress: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  questionProgressText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  timerTextDanger: {
    color: COLORS.error,
  },
  timerBar: {
    height: 4,
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  timerBarDanger: {
    backgroundColor: COLORS.error,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.md,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface,
  },
  progressDotDone: {
    backgroundColor: COLORS.success,
  },
  progressDotCurrent: {
    backgroundColor: COLORS.primary,
    width: 20,
  },
  questionContainer: {
    flex: 1,
    padding: SPACING.lg,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 32,
    marginBottom: SPACING.xl,
  },
  optionsContainer: {
    gap: SPACING.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterCorrect: {
    backgroundColor: COLORS.success,
  },
  optionLetterWrong: {
    backgroundColor: COLORS.error,
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  bottomContainer: {
    padding: SPACING.lg,
  },
  nextButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  // Results screen styles
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  resultEmoji: {
    fontSize: 80,
    marginBottom: SPACING.lg,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xl,
  },
  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.text,
  },
  scoreLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  xpEarnedBig: {
    backgroundColor: COLORS.accentGold + '30',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  xpEarnedBigText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  // Rewards row for XP + Shards
  rewardsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  shardsEarnedBig: {
    backgroundColor: COLORS.primary + '30',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  shardsEarnedBigText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  mascotResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  mascotEmoji: {
    fontSize: 40,
  },
  mascotMessage: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  doneButton: {
    width: '100%',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  doneButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});
