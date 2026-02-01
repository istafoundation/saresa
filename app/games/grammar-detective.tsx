// Grammar Detective Game - Infinite Rush Mode
// Tap words to select, submit to check answer
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { useSafeNavigation } from "../../utils/useSafeNavigation";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from "../../constants/theme";
import {
  useGrammarDetectiveStore,
  type GDQuestion,
  XP_PER_CORRECT,
  COINS_PER_CORRECT,
} from "../../stores/grammar-detective-store";
import { useUserActions } from "../../utils/useUserActions";
import { useGameAudio } from "../../utils/sound-manager";
import { useTapFeedback } from "../../utils/useTapFeedback";
import { useGrammarDetectiveQuestions } from "../../utils/content-hooks";
import { useChildAuth } from "../../utils/childAuth";
import { api } from "../../convex/_generated/api";
import CoinRewardAnimation from "../../components/animations/CoinRewardAnimation";

export default function GrammarDetectiveScreen() {
  const { safeBack } = useSafeNavigation();
  const { token } = useChildAuth();
  const { addXP, addCoins } = useUserActions();
  const { playCorrect, playWrong } = useGameAudio();
  const { triggerTap, triggerHapticOnly } = useTapFeedback();

  // OTA Content
  const { content: allQuestions, status: questionsStatus } =
    useGrammarDetectiveQuestions();

  // Convex mutations
  const updateStats = useMutation(api.gameStats.updateGrammarDetectiveStats);
  const serverProgress = useQuery(
    api.gameStats.getGrammarDetectiveProgress,
    token ? { token } : "skip"
  );

  // Store - use proper hook selectors for reactivity
  const gameState = useGrammarDetectiveStore((s) => s.gameState);
  const currentQuestionIndex = useGrammarDetectiveStore(
    (s) => s.currentQuestionIndex
  );
  const selectedIndices = useGrammarDetectiveStore((s) => s.selectedIndices);
  const sessionAnswered = useGrammarDetectiveStore((s) => s.sessionAnswered);
  const sessionCorrect = useGrammarDetectiveStore((s) => s.sessionCorrect);
  const sessionXP = useGrammarDetectiveStore((s) => s.sessionXP);
  const stats = useGrammarDetectiveStore((s) => s.stats);
  const lastResult = useGrammarDetectiveStore((s) => s.lastResult);
  const shuffledQuestionIds = useGrammarDetectiveStore(
    (s) => s.shuffledQuestionIds
  );
  const syncedSession = useGrammarDetectiveStore((s) => s.syncedSession);
  const sessionCoins = useGrammarDetectiveStore((s) => s.sessionCoins);

  // Actions
  const startGame = useGrammarDetectiveStore((s) => s.startGame);
  const toggleWordSelection = useGrammarDetectiveStore(
    (s) => s.toggleWordSelection
  );
  const submitAnswer = useGrammarDetectiveStore((s) => s.submitAnswer);
  const nextQuestion = useGrammarDetectiveStore((s) => s.nextQuestion);
  const resetGame = useGrammarDetectiveStore((s) => s.resetGame);
  const syncFromConvex = useGrammarDetectiveStore((s) => s.syncFromConvex);
  const updateSyncedSession = useGrammarDetectiveStore(
    (s) => s.updateSyncedSession
  );

  // Mutex lock for sync to prevent race conditions
  const isSyncingRef = useRef(false);
  
  // Coin animation state
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  const [lastCoinsEarned, setLastCoinsEarned] = useState(0);

  // Memoize content IDs for dependency tracking
  const contentIds = useMemo(
    () => allQuestions?.map((q: GDQuestion) => q.id).join(",") ?? "",
    [allQuestions]
  );

  // Memoize current question lookup
  const currentQuestion = useMemo(() => {
    if (
      shuffledQuestionIds.length === 0 ||
      currentQuestionIndex >= shuffledQuestionIds.length
    ) {
      return null;
    }
    const currentId = shuffledQuestionIds[currentQuestionIndex];
    return allQuestions?.find((q: GDQuestion) => q.id === currentId) || null;
  }, [shuffledQuestionIds, currentQuestionIndex, allQuestions]);

  // Calculate accuracy
  const accuracy = useMemo(() => {
    if (stats.totalAnswered === 0) return 0;
    return Math.round((stats.totalCorrect / stats.totalAnswered) * 100);
  }, [stats.totalAnswered, stats.totalCorrect]);

  // Sync from Convex on mount - but ONLY after we have questions loaded
  // This prevents race condition where startGame() resets index to 0 after sync
  // We use a ref to ensure we only sync ONCE when the game loads, then let local state take over
  const hasSyncedRef = useRef(false);
  
  useEffect(() => {
    if (!hasSyncedRef.current && serverProgress && shuffledQuestionIds.length > 0) {
      if (__DEV__) console.log("[GrammarDetective] Initial sync from Convex", serverProgress);
      syncFromConvex(serverProgress);
      hasSyncedRef.current = true;
    }
  }, [serverProgress, syncFromConvex, shuffledQuestionIds.length > 0]);

  // Start or restart game when content changes
  useEffect(() => {
    if (!allQuestions || allQuestions.length === 0) return;

    // If we haven't started yet, start the game
    if (shuffledQuestionIds.length === 0) {
      startGame(allQuestions as GDQuestion[]);
      return;
    }

    const questionIdSet = new Set(allQuestions.map((q: GDQuestion) => q.id));
    
    // RELAXED CHECK: Only restart if the CURRENT question is no longer authentic/valid.
    // Previously we checked if ANY shuffled ID was missing, which caused restarts if future content changed.
    const currentId = shuffledQuestionIds[currentQuestionIndex];
    if (currentId && !questionIdSet.has(currentId)) {
      if (__DEV__) console.log("[GrammarDetective] Current question invalid/missing, restarting game");
      startGame(allQuestions as GDQuestion[]);
    }
  }, [contentIds, allQuestions, shuffledQuestionIds, startGame, currentQuestionIndex]);
  
  // Keep track of latest stats in a ref to use in cleanup/callbacks without triggering re-renders
  const latestStatsRef = useRef({ sessionAnswered, sessionCorrect, sessionXP, sessionCoins, currentQuestionIndex, syncedSession });
  
  useEffect(() => {
    latestStatsRef.current = { sessionAnswered, sessionCorrect, sessionXP, sessionCoins, currentQuestionIndex, syncedSession };
  }, [sessionAnswered, sessionCorrect, sessionXP, sessionCoins, currentQuestionIndex, syncedSession]);

  // OPTIMIZATION: Sync stats to Convex only when exiting or every 1 minute
  // This replaces per-answer syncing, reducing calls from ~800/hr to ~60/hr max
  // Refactored to use refs so it doesn't need to be in the dependency array of effects
  const syncStatsToConvex = useCallback(async () => {
    if (!token) return;
    if (isSyncingRef.current) return; // Prevent concurrent syncs
    
    // Read from ref to get latest values without state dependencies
    const currentStats = latestStatsRef.current;
    
    // Calculate delta based on PERSISTED synced state
    const unsynced = {
      answered: currentStats.sessionAnswered - currentStats.syncedSession.answered,
      correct: currentStats.sessionCorrect - currentStats.syncedSession.correct,
      xp: currentStats.sessionXP - currentStats.syncedSession.xp,
      coins: (currentStats.sessionCoins ?? 0) - (currentStats.syncedSession.coins ?? 0),
    };
    
    if (unsynced.answered > 0) {
      isSyncingRef.current = true;
      try {
        await updateStats({
          token,
          questionsAnswered: unsynced.answered,
          correctAnswers: unsynced.correct,
          xpEarned: unsynced.xp,
          currentQuestionIndex: currentStats.currentQuestionIndex,
        });
        if (unsynced.xp > 0) {
          await addXP(unsynced.xp);
        }
        if (unsynced.coins > 0) {
          await addCoins(unsynced.coins);
        }
        
        // Update the STORE with the new synced state (persisted)
        updateSyncedSession({ 
          answered: currentStats.sessionAnswered, 
          correct: currentStats.sessionCorrect, 
          xp: currentStats.sessionXP,
          coins: currentStats.sessionCoins ?? 0,
        });
        
        if (__DEV__) console.log("[GrammarDetective] Synced successfully:", unsynced);
      } catch (error) {
        if (__DEV__) console.error("[GrammarDetective] Sync error:", error);
      } finally {
        isSyncingRef.current = false;
      }
    }
  }, [token, updateStats, addXP, addCoins, updateSyncedSession]);

  // Sync on component unmount (catches ALL exit methods including Android back)
  // Use a ref to store the latest sync function preventing the effect from re-running
  const syncRef = useRef(syncStatsToConvex);
  useEffect(() => {
    syncRef.current = syncStatsToConvex;
  });

  useEffect(() => {
    return () => {
      // Fire sync on unmount using the latest ref
      syncRef.current();
    };
  }, []); // Empty dependency array = ONLY run on mount/unmount

  // Background safety sync every 1 minute (crash protection)
  useEffect(() => {
    const interval = setInterval(() => {
      syncRef.current();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  // Sync immediately when app goes to background (home button pressed)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        syncRef.current();
      }
    });

    return () => subscription.remove();
  }, []);

  const handleWordPress = useCallback(
    (index: number) => {
      if (gameState !== "playing") return;
      triggerHapticOnly("light");
      toggleWordSelection(index);
    },
    [gameState, triggerHapticOnly, toggleWordSelection]
  );

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion || selectedIndices.length === 0) return;

    try {
      triggerHapticOnly("medium");
      const result = submitAnswer(currentQuestion);

      // OPTIMIZATION: Stats are synced to Convex on exit, not per-answer
      // Local store already tracks sessionAnswered, sessionCorrect, sessionXP
      if (result.correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playCorrect();
        // FIX: Trigger coin animation immediately when answer is correct
        if (COINS_PER_CORRECT > 0) {
          setLastCoinsEarned(COINS_PER_CORRECT);
          setShowCoinAnimation(true);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playWrong();
      }
    } catch (error) {
      if (__DEV__) console.error("[GrammarDetective] Submit error:", error);
    }
  }, [
    currentQuestion,
    selectedIndices,
    triggerHapticOnly,
    submitAnswer,
    playCorrect,
    playWrong,
  ]);

  const handleNext = useCallback(() => {
    triggerTap();
    // FIX: Animation now triggers in handleSubmit, so just advance to next question
    nextQuestion();
  }, [triggerTap, nextQuestion]);
  
  // Handle coin animation complete - just hide the animation, don't navigate
  const handleCoinAnimationComplete = useCallback(() => {
    setShowCoinAnimation(false);
  }, []);

  const handleBack = useCallback(() => {
    triggerTap();
    resetGame();
    safeBack();
  }, [triggerTap, resetGame, safeBack]);

  // Loading state - show if we have no content OR if we are using fallback content
  // User requested "no fallback data instead shows loading" to prevent random question flash
  // FIX: Also show loading if game hasn't started yet (gameState is idle)
  if (!allQuestions || allQuestions.length === 0 || questionsStatus === 'fallback' || gameState === 'idle') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading questions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Still waiting for game to start
  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Starting game...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🔍 Grammar Detective</Text>
        </View>
        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>+{sessionXP} XP</Text>
        </View>
        <View style={styles.coinBadge}>
          <Text style={styles.coinText}>+{sessionCoins} 🪙</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={styles.statValue}>{sessionCorrect}</Text>
          <Text style={styles.statLabel}>correct</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="layers" size={16} color={COLORS.primary} />
          <Text style={styles.statValue}>{sessionAnswered}</Text>
          <Text style={styles.statLabel}>answered</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="analytics" size={16} color={COLORS.accentGold} />
          <Text style={styles.statValue}>{accuracy}%</Text>
          <Text style={styles.statLabel}>accuracy</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Question Card */}
        <MotiView
          key={currentQuestion.id}
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <LinearGradient
            colors={[COLORS.primary + "20", COLORS.primaryDark + "10"]}
            style={styles.questionCard}
          >
            <View style={styles.questionBadge}>
              <Text style={styles.questionBadgeText}>QUESTION</Text>
            </View>
            <Text style={styles.questionText}>
              {currentQuestion.questionText}
            </Text>
            <Text style={styles.hintText}>
              Tap on the correct word(s) below
            </Text>
          </LinearGradient>
        </MotiView>

        {/* Sentence Card - Displays like a proper sentence */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 100 }}
          style={styles.sentenceCard}
        >
          <View style={styles.sentenceHeader}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color={COLORS.textSecondary}
            />
            <Text style={styles.sentenceLabel}>Read the sentence:</Text>
          </View>

          {/* Sentence as inline text with tappable words */}
          <Text style={styles.sentenceText}>
            {currentQuestion.words.map((word, index) => {
              const isSelected = selectedIndices.includes(index);
              const isCorrect = lastResult?.correctIndices.includes(index);
              const isWrongSelection =
                gameState === "reviewing" && isSelected && !isCorrect;
              const isMissedCorrect =
                gameState === "reviewing" && isCorrect && !isSelected;

              // Determine background and text color based on state
              let bgStyle = {};
              let textColor = COLORS.text;

              if (gameState === "reviewing") {
                if (isCorrect) {
                  bgStyle = styles.wordCorrectBg;
                  textColor = COLORS.success;
                } else if (isWrongSelection) {
                  bgStyle = styles.wordWrongBg;
                  textColor = COLORS.error;
                }
              } else if (isSelected) {
                bgStyle = styles.wordSelectedBg;
                textColor = COLORS.primary;
              }

              const isLastWord = index === currentQuestion.words.length - 1;
              const needsSpace = !isLastWord;

              return (
                <Text key={`word-${index}`}>
                  <Text
                    onPress={() => handleWordPress(index)}
                    style={[
                      styles.inlineWord,
                      bgStyle,
                      { color: textColor },
                      isMissedCorrect && styles.wordMissedText,
                    ]}
                  >
                    {word}
                  </Text>
                  {needsSpace && <Text style={styles.wordSpace}> </Text>}
                </Text>
              );
            })}
          </Text>

          {/* Selection indicator */}
          {selectedIndices.length > 0 && gameState === "playing" && (
            <MotiView
              from={{ opacity: 0, translateY: 5 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.selectionSummary}
            >
              <Ionicons
                name="checkmark-done"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.selectionText}>
                Selected:{" "}
                {selectedIndices
                  .map((i) => currentQuestion.words[i])
                  .join(", ")}
              </Text>
            </MotiView>
          )}
        </MotiView>

        {/* Result Feedback */}
        {gameState === "reviewing" && lastResult && (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
            style={[
              styles.resultCard,
              lastResult.correct
                ? styles.resultCardCorrect
                : styles.resultCardWrong,
            ]}
          >
            <View style={styles.resultHeader}>
              <View
                style={[
                  styles.resultIconBg,
                  {
                    backgroundColor: lastResult.correct
                      ? COLORS.success + "20"
                      : COLORS.error + "20",
                  },
                ]}
              >
                <Ionicons
                  name={lastResult.correct ? "checkmark" : "close"}
                  size={24}
                  color={lastResult.correct ? COLORS.success : COLORS.error}
                />
              </View>
              <View style={styles.resultTitleContainer}>
                <Text
                  style={[
                    styles.resultTitle,
                    {
                      color: lastResult.correct ? COLORS.success : COLORS.error,
                    },
                  ]}
                >
                  {lastResult.correct ? "Excellent!" : "Not quite!"}
                </Text>
                {lastResult.correct && (
                  <Text style={styles.xpEarnedText}>
                    +{XP_PER_CORRECT} XP · +{COINS_PER_CORRECT} 🪙 earned
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.explanationContainer}>
              <Ionicons
                name="bulb-outline"
                size={18}
                color={COLORS.accentGold}
              />
              <Text style={styles.explanationText}>
                {lastResult.explanation}
              </Text>
            </View>
          </MotiView>
        )}
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomContainer}>
        {gameState === "playing" ? (
          <Pressable
            style={[
              styles.actionButton,
              selectedIndices.length === 0 && styles.actionButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={selectedIndices.length === 0}
          >
            <LinearGradient
              colors={
                selectedIndices.length > 0
                  ? [COLORS.primary, COLORS.primaryDark]
                  : ["#444", "#333"]
              }
              style={styles.actionButtonGradient}
            >
              <Ionicons
                name="send"
                size={20}
                color={
                  selectedIndices.length > 0 ? COLORS.text : COLORS.textMuted
                }
              />
              <Text
                style={[
                  styles.actionButtonText,
                  selectedIndices.length === 0 &&
                    styles.actionButtonTextDisabled,
                ]}
              >
                Submit Answer
              </Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable style={styles.actionButton} onPress={handleNext}>
            <LinearGradient
              colors={[COLORS.accent, COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
            </LinearGradient>
          </Pressable>
        )}
      </View>
      
      {/* Coin Flying Animation */}
      {showCoinAnimation && lastCoinsEarned > 0 && (
        <CoinRewardAnimation
          coinsEarned={lastCoinsEarned}
          originY={400}
          onComplete={handleCoinAnimationComplete}
        />
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
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.xs,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  xpBadge: {
    backgroundColor: COLORS.accentGold + "25",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accentGold + "40",
  },
  xpText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.accentGold,
  },
  coinBadge: {
    backgroundColor: COLORS.accentGold + "25",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accentGold + "40",
    marginLeft: SPACING.xs,
  },
  coinText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.accentGold,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.textMuted + "30",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  questionCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: "center",
    gap: SPACING.sm,
  },
  questionBadge: {
    backgroundColor: COLORS.primary + "30",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  questionBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 30,
  },
  hintText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  sentenceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  sentenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  sentenceLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  sentenceText: {
    fontSize: 20,
    lineHeight: 36,
    color: COLORS.text,
  },
  inlineWord: {
    fontSize: 20,
    fontWeight: "500",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  wordSpace: {
    fontSize: 20,
  },
  wordSelectedBg: {
    backgroundColor: COLORS.primary + "30",
    borderRadius: 6,
    fontWeight: "700",
  },
  wordCorrectBg: {
    backgroundColor: COLORS.success + "30",
    borderRadius: 6,
    fontWeight: "700",
  },
  wordWrongBg: {
    backgroundColor: COLORS.error + "30",
    borderRadius: 6,
    fontWeight: "700",
  },
  wordMissedText: {
    textDecorationLine: "underline",
    textDecorationStyle: "dashed",
    color: COLORS.success,
    fontWeight: "700",
  },
  selectionSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.textMuted + "20",
  },
  selectionText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    flex: 1,
  },
  resultCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  resultCardCorrect: {
    backgroundColor: COLORS.success + "10",
    borderWidth: 1.5,
    borderColor: COLORS.success + "30",
  },
  resultCardWrong: {
    backgroundColor: COLORS.error + "10",
    borderWidth: 1.5,
    borderColor: COLORS.error + "30",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  resultIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitleContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  xpEarnedText: {
    fontSize: 13,
    color: COLORS.accentGold,
    fontWeight: "600",
  },
  explanationContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  explanationText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  bottomContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  actionButton: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: "hidden",
    ...SHADOWS.md,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  actionButtonTextDisabled: {
    color: COLORS.textMuted,
  },
});
