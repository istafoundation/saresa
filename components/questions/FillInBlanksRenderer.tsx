import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  FONTS,
} from "../../constants/theme";

interface FillInBlanksRendererProps {
  question: string;
  data: any;
  onAnswer: (isCorrect: boolean) => void;
  onFeedback?: (isCorrect: boolean) => void;
  disabled?: boolean;
  showAnswer?: boolean;
}

export default function FillInBlanksRenderer({
  question,
  data,
  onAnswer,
  onFeedback,
  disabled,
  showAnswer,
}: FillInBlanksRendererProps) {
  // Parse question to extract segments and blanks
  const { segments, answers } = useMemo(() => {
    const parts = question.split(/({[^}]+})/g);
    const segs: string[] = [];
    const ans: string[] = [];

    parts.forEach((part) => {
      if (part.startsWith("{") && part.endsWith("}")) {
        ans.push(part.slice(1, -1));
        segs.push("__BLANK__");
      } else {
        segs.push(part);
      }
    });

    return { segments: segs, answers: ans };
  }, [question]);

  // Combined options (answers + distractors) shuffled
  const [options, setOptions] = useState<string[]>([]);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [activeBlankIndex, setActiveBlankIndex] = useState<number>(0);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(
    null,
  );

  useEffect(() => {
    const distractors = data.distractors || [];
    const allOptions = [...answers, ...distractors];
    // Simple shuffle
    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }
    setOptions(allOptions);
    setUserAnswers(new Array(answers.length).fill(null));
    setActiveBlankIndex(0);
    setFeedback(null);
    setIsChecking(false);
  }, [data, answers]);

  const handleOptionPress = (option: string) => {
    if (disabled || isChecking) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Find the current active blank or the first empty blank
    let targetIndex = activeBlankIndex;

    // If current target is already filled, look for the next empty one
    if (userAnswers[targetIndex] !== null) {
      const nextEmpty = userAnswers.findIndex((a) => a === null);
      if (nextEmpty !== -1) {
        targetIndex = nextEmpty;
      } else {
        // All filled, just replace the currently active one
        // Or do nothing? Let's allow replacing.
      }
    }

    const newAnswers = [...userAnswers];
    newAnswers[targetIndex] = option;
    setUserAnswers(newAnswers);

    // Auto-advance to next empty blank
    const nextEmpty = newAnswers.findIndex((a) => a === null);
    if (nextEmpty !== -1) {
      setActiveBlankIndex(nextEmpty);
    } else {
      // All filled. Do NOT auto-submit.
      // Just deselect active blank to show we are "done" filling?
      // Or keep focus on the last one?
      // Let's keep focus on the last one filled effectively.
    }
  };

  const handleBlankPress = (index: number) => {
    if (disabled || isChecking) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Create a copy of answers
    const newAnswers = [...userAnswers];

    // If we tap a blank that is already filled, we clear it
    if (newAnswers[index] !== null) {
      newAnswers[index] = null;
      setUserAnswers(newAnswers);
    }

    // Set this as the active blank
    setActiveBlankIndex(index);
  };

  const handleCheck = () => {
    if (disabled || isChecking) return;

    setIsChecking(true);
    const isCorrect = userAnswers.every((ans, idx) => ans === answers[idx]);

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFeedback("correct");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFeedback("incorrect");
    }

    if (onFeedback) onFeedback(isCorrect);

    // Delay to show feedback before proceeding
    setTimeout(() => {
      onAnswer(isCorrect);
      if (!isCorrect) {
        setFeedback(null);
        setIsChecking(false);
      }
    }, 1500); // Wait 1.5s to show result
  };

  const isAllFilled = userAnswers.every((a) => a !== null);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Sentence Area */}
        <View style={styles.sentenceContainer}>
          <View style={styles.textWrapper}>
            {segments.map((seg, idx) => {
              if (seg === "__BLANK__") {
                // Determine which blank index this maps to
                const blankIndex = segments
                  .slice(0, idx)
                  .filter((s) => s === "__BLANK__").length;
                const filledWord = userAnswers[blankIndex];
                const isActive = activeBlankIndex === blankIndex && !isChecking;
                const isCorrect = isChecking && feedback === "correct";
                const isWrong =
                  isChecking &&
                  feedback === "incorrect" &&
                  filledWord !== answers[blankIndex]; // Simple strict wrong check

                return (
                  <TouchableOpacity
                    key={`blank-${idx}`}
                    onPress={() => handleBlankPress(blankIndex)}
                    activeOpacity={0.8}
                    disabled={isChecking}
                  >
                    <MotiView
                      from={{ scale: 1 }}
                      animate={{
                        scale: isActive ? 1.05 : 1,
                        borderColor: isCorrect
                          ? COLORS.success
                          : isWrong
                            ? COLORS.error
                            : isActive
                              ? COLORS.primary
                              : '#e2e8f0',
                      }}
                      style={[
                        styles.blank,
                        isActive && styles.activeBlank,
                        filledWord ? styles.filledBlank : null,
                        isCorrect && styles.correctBlank,
                        isWrong && styles.wrongBlank,
                      ]}
                    >
                      <Text
                        style={[
                          styles.blankText,
                          filledWord ? styles.filledText : null,
                          isCorrect && styles.correctText,
                          isWrong && styles.wrongText,
                        ]}
                      >
                        {filledWord || "       "}
                      </Text>
                    </MotiView>
                  </TouchableOpacity>
                );
              }
              return (
                <Text key={`text-${idx}`} style={styles.text}>
                  {seg}
                </Text>
              );
            })}
          </View>
        </View>

        {/* Options Area */}
        <View style={styles.bottomContainer}>
          <View style={styles.optionsContainer}>
            {options.map((opt, idx) => {
              const isUsed = userAnswers.includes(opt);

              return (
                <TouchableOpacity
                  key={`opt-${idx}`}
                  onPress={() => !isUsed && handleOptionPress(opt)}
                  style={[styles.optionChip, isUsed && styles.usedOption]}
                  disabled={isUsed || disabled || isChecking}
                >
                  <Text
                    style={[styles.optionText, isUsed && styles.usedOptionText]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Check Button */}
          <TouchableOpacity
            onPress={handleCheck}
            disabled={!isAllFilled || isChecking || disabled}
            style={[
              styles.checkButton,
              (!isAllFilled || isChecking || disabled) &&
                styles.checkButtonDisabled,
              feedback === "correct" && styles.checkButtonSuccess,
              feedback === "incorrect" && styles.checkButtonError,
            ]}
          >
            {feedback === "correct" ? (
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            ) : feedback === "incorrect" ? (
              <Ionicons name="close-circle" size={24} color="#FFF" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#FFF" />
            )}
            <Text style={styles.checkButtonText}>
              {feedback === "correct"
                ? "Correct!"
                : feedback === "incorrect"
                  ? "Incorrect"
                  : "Check"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: "space-between",
  },
  sentenceContainer: {
    flex: 1,
    justifyContent: "flex-start", // Align to top
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  textWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    lineHeight: 40,
  },
  text: {
    fontSize: 22,
    color: COLORS.text,
    lineHeight: 36,
    fontFamily: "Outfit-Medium",
  },
  blank: {
    minWidth: 80,
    height: 44,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: 4,
    marginBottom: 4, // for wrap spacing
  },
  activeBlank: {
    borderBottomColor: COLORS.primary,
    backgroundColor: COLORS.primary + "10", // 10% opacity
    borderWidth: 1,
    borderColor: COLORS.primary,
    transform: [{ translateY: -2 }],
    ...SHADOWS.sm,
  },
  filledBlank: {
    backgroundColor: COLORS.primary + "05",
    borderBottomColor: COLORS.primary,
  },
  correctBlank: {
    backgroundColor: COLORS.success + "20",
    borderColor: COLORS.success,
    borderBottomColor: COLORS.success,
  },
  wrongBlank: {
    backgroundColor: COLORS.error + "20",
    borderColor: COLORS.error,
    borderBottomColor: COLORS.error,
  },
  blankText: {
    fontSize: 18,
    color: "transparent",
    fontWeight: "600",
  },
  filledText: {
    color: COLORS.primary,
  },
  correctText: {
    color: COLORS.success,
  },
  wrongText: {
    color: COLORS.error,
  },
  bottomContainer: {
    gap: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  optionChip: {
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.sm,
  },
  usedOption: {
    backgroundColor: COLORS.background,
    borderColor: "transparent",
    ...SHADOWS.none,
    opacity: 0.6,
  },
  optionText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: "600",
    fontFamily: "Outfit-Medium",
  },
  usedOptionText: {
    color: COLORS.textMuted,
  },
  checkButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  checkButtonDisabled: {
      backgroundColor: '#cbd5e1',
      opacity: 0.8,
      ...SHADOWS.none
  },
  checkButtonSuccess: {
    backgroundColor: COLORS.success,
  },
  checkButtonError: {
    backgroundColor: COLORS.error,
  },
  checkButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Outfit-Bold",
  },
});
