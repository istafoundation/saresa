import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Keyboard } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS } from '../../constants/theme';
import * as Haptics from 'expo-haptics';
import { validateSentence } from '../../utils/grammar';

interface MakeSentenceRendererProps {
  question: string;
  data: {
    word: string; // The target word to use
  };
  onAnswer: (isCorrect: boolean) => void;
  onFeedback?: (isCorrect: boolean) => void;
  disabled?: boolean;
  showAnswer?: boolean;
}

export default function MakeSentenceRenderer({
  question,
  data,
  onAnswer,
  onFeedback,
  disabled = false,
  showAnswer = false,
}: MakeSentenceRendererProps) {
  const [sentence, setSentence] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleForge = async () => {
    Keyboard.dismiss();
    setError(null);
    setIsValidating(true);

    try {
      // Validation
      const result = await validateSentence(sentence, data.word);

      if (result.isValid) {
        // Success!
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsSuccess(true);
        if (onFeedback) onFeedback(true);
        
        // Delay to show success animation before moving on
        setTimeout(() => {
          onAnswer(true);
        }, 1500);
      } else {
        // Failure
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(result.error || "Something is wrong.");
        if (onFeedback) onFeedback(false);
      }
    } catch (err) {
      console.error("Validation error:", err);
      setError("An unexpected error occurred during validation.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Header / Instruction */}
        <Text style={styles.instruction}>
          {question || "Forge a sentence using:"}
        </Text>

        {/* Target Word Display (The "Ingot") */}
        <MotiView 
          from={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={styles.wordCard}
        >
          <Text style={styles.wordText}>{data.word}</Text>
        </MotiView>

        {/* Input Area (The "Anvil") */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your sentence here..."
            placeholderTextColor={COLORS.textMuted}
            value={sentence}
            onChangeText={(text) => {
              setSentence(text);
              if (error) setError(null); // Clear error on type
            }}
            multiline
            maxLength={100}
            editable={!disabled && !isSuccess}
          />
        </View>

        {/* Feedback Area */}
        <View style={styles.feedbackArea}>
          {error && (
            <MotiView
              from={{ opacity: 0, translateY: -10 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.errorContainer}
            >
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </MotiView>
          )}

          {isSuccess && (
            <MotiView
              from={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={styles.successContainer}
            >
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.successText}>Forged Successfully!</Text>
            </MotiView>
          )}
        </View>

        {/* Action Button (The "Hammer") */}
        <Pressable
          onPress={handleForge}
          disabled={disabled || isSuccess || sentence.length === 0 || isValidating}
          style={({ pressed }) => [
            styles.forgeButton,
            pressed && styles.forgeButtonPressed,
            (disabled || isSuccess || sentence.length === 0 || isValidating) && styles.forgeButtonDisabled
          ]}
        >
          <Ionicons 
            name={isValidating ? "hourglass-outline" : "hammer"} 
            size={24} 
            color="#FFF" 
            style={{ marginRight: 8 }} 
          />
          <Text style={styles.forgeButtonText}>
            {isValidating ? "Testing..." : "Forge"}
          </Text>
        </Pressable>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center', // Center vertically
    gap: SPACING.lg,
  },
  instruction: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  wordCard: {
    backgroundColor: COLORS.primary + '15', // Light primary tint
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    marginBottom: SPACING.sm,
  },
  wordText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
    height: 120, // Give it some height
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    padding: SPACING.md,
    fontSize: 20,
    color: COLORS.text,
    textAlignVertical: 'top', // For multiline android
  },
  feedbackArea: {
    height: 40, // Fixed height to prevent layout jumps
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.error + '10',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  errorText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: 14,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  successText: {
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 18,
  },
  forgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: BORDER_RADIUS.full,
    width: '100%',
    ...SHADOWS.md,
    marginTop: SPACING.md,
  },
  forgeButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  forgeButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.5,
    ...SHADOWS.none,
  },
  forgeButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
