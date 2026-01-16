// Grammar Detective Game - Infinite Rush Mode
// Tap words to select, submit to check answer
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { useEffect, useMemo, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from "../../constants/theme";
import {
  useGrammarDetectiveStore,
  type GDQuestion,
  XP_PER_CORRECT,
} from "../../stores/grammar-detective-store";
import { useUserActions } from "../../utils/useUserActions";
import { useGameAudio } from "../../utils/sound-manager";
import { useTapFeedback } from "../../utils/useTapFeedback";
import { useGrammarDetectiveQuestions } from "../../utils/content-hooks";
import { useChildAuth } from "../../utils/childAuth";
import { api } from "../../convex/_generated/api";

export default function GrammarDetectiveScreen() {
  const router = useRouter();
  const { token } = useChildAuth();
  const { addXP } = useUserActions();
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

  // Actions
  const startGame = useGrammarDetectiveStore((s) => s.startGame);
  const toggleWordSelection = useGrammarDetectiveStore(
    (s) => s.toggleWordSelection
  );
  const submitAnswer = useGrammarDetectiveStore((s) => s.submitAnswer);
  const nextQuestion = useGrammarDetectiveStore((s) => s.nextQuestion);
  const resetGame = useGrammarDetectiveStore((s) => s.resetGame);
  const syncFromConvex = useGrammarDetectiveStore((s) => s.syncFromConvex);

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

  // Sync from Convex on mount
  useEffect(() => {
    if (serverProgress) {
      syncFromConvex(serverProgress);
    }
  }, [serverProgress, syncFromConvex]);

  // Start or restart game when content changes
  useEffect(() => {
    if (!allQuestions || allQuestions.length === 0) return;

    const questionIdSet = new Set(allQuestions.map((q: GDQuestion) => q.id));
    const idsMatch =
      shuffledQuestionIds.length > 0 &&
      shuffledQuestionIds.every((id) => questionIdSet.has(id));

    if (!idsMatch) {
      if (__DEV__)
        console.log("[GrammarDetective] Content changed, restarting game");
      startGame(allQuestions as GDQuestion[]);
    }
  }, [contentIds, allQuestions, shuffledQuestionIds, startGame]);

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

      if (result.correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playCorrect();
        if (token) {
          await addXP(XP_PER_CORRECT);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playWrong();
      }

      if (token) {
        await updateStats({
          token,
          questionsAnswered: 1,
          correctAnswers: result.correct ? 1 : 0,
          xpEarned: result.correct ? XP_PER_CORRECT : 0,
          currentQuestionIndex: currentQuestionIndex + 1,
        });
      }
    } catch (error) {
      if (__DEV__) console.error("[GrammarDetective] Submit error:", error);
      // Silently fail - stats will sync on next successful operation
    }
  }, [
    currentQuestion,
    selectedIndices,
    triggerHapticOnly,
    submitAnswer,
    playCorrect,
    playWrong,
    token,
    addXP,
    updateStats,
    currentQuestionIndex,
  ]);

  const handleNext = useCallback(() => {
    triggerTap();
    nextQuestion();
  }, [triggerTap, nextQuestion]);

  const handleBack = useCallback(() => {
    triggerTap();
    resetGame();
    router.back();
  }, [triggerTap, resetGame, router]);

  // Loading state - only show if we have no content at all
  if (!allQuestions || allQuestions.length === 0) {
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
                    +{XP_PER_CORRECT} XP earned
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
