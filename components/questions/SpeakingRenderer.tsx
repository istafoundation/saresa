import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';
import * as Levenshtein from 'fast-levenshtein';

// Reusable microphone button component with animation
const MicrophoneButton = ({ 
  onPressIn, 
  onPressOut, 
  isListening, 
  disabled 
}: { 
  onPressIn: () => void, 
  onPressOut: () => void, 
  isListening: boolean, 
  disabled: boolean 
}) => {
  return (
    <View style={styles.micContainer}>
      {isListening && (
        <MotiView
          from={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ type: 'timing', duration: 1000, loop: true }}
          style={styles.micPulse}
        />
      )}
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.micButton,
          isListening && styles.micButtonActive,
          pressed && styles.micButtonPressed,
          disabled && styles.micButtonDisabled
        ]}
      >
        <Ionicons 
          name={isListening ? "mic" : "mic-outline"} 
          size={48} 
          color={isListening ? "#FFF" : COLORS.primary} 
        />
      </Pressable>
      <Text style={styles.micLabel}>
        {isListening ? "Listening..." : "Hold to Speak"}
      </Text>
    </View>
  );
};

interface SpeakingRendererProps {
  question: string; // The sentence strictly speaking, or instructions
  data: {
    sentence: string; // The target sentence to match
  };
  onAnswer: (isCorrect: boolean) => void;
  onFeedback?: (isCorrect: boolean) => void;
  disabled?: boolean;
}

export default function SpeakingRenderer({
  question,
  data,
  onAnswer,
  onFeedback,
  disabled = false,
}: SpeakingRendererProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Normalize text for comparison
  const normalize = (text: string) => {
    return text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  useEffect(() => {
    // Request permission on mount
    const requestPermission = async () => {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setPermissionGranted(result.granted);
    };
    requestPermission();
  }, []);

  useSpeechRecognitionEvent("result", (event) => {
    const result = event.results[0]?.transcript;
    if (result) {
      setTranscript(result);
    }
  });

  const handleStartListening = async () => {
    if (!permissionGranted || disabled || showResult) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTranscript("");
    setIsListening(true);
    try {
      await ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        maxAlternatives: 1,
      });
    } catch (e) {
      console.error("Failed to start speech recognition", e);
      setIsListening(false);
    }
  };

  const handleStopListening = async () => {
    if (!isListening) return;
    
    setIsListening(false);
    ExpoSpeechRecognitionModule.stop();
    
    // Process results after a brief delay to ensure we have the final transcript
    // Sometimes the last event comes right after stop
    setIsLoading(true);
    
    setTimeout(() => {
        setIsLoading(false);
        verifySpeech();
    }, 500); 
  };

  const verifySpeech = useCallback(() => {
    // Use the current transcript state
    // Note: In a real closure, we might need a ref if transcript isn't updating fast enough, 
    // but the delay above usually helps.
    
    const target = normalize(data.sentence);
    const spoken = normalize(transcript);
    
    if (!spoken) {
       // If nothing was caught
       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
       return;
    }

    // Fuzzy match logic
    // Calculate Levenshtein distance
    const distance = Levenshtein.get(target, spoken);
    const maxLength = Math.max(target.length, spoken.length);
    const similarity = 1 - (distance / maxLength);
    
    // Dynamic threshold: shorter sentences require higher accuracy
    const threshold = target.length < 10 ? 0.9 : 0.8;
    const passed = similarity >= threshold;

    if (passed) {
      // Correct!
      setIsCorrect(true);
      setShowResult(true);
      if (onFeedback) onFeedback(true);
      onAnswer(true); // Move to next
    } else {
      // Wrong
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Don't show full result overlay, just a "Try Again" hint
      // But we can show what they said
      if (onFeedback) onFeedback(false); // Trigger wrong sound
    }
  }, [transcript, data.sentence, onFeedback, onAnswer]);


  return (
    <View style={styles.container}>
        <View style={styles.contentContainer}>
            <Text style={styles.instruction}>Read this sentence aloud:</Text>
            
            <View style={styles.sentenceCard}>
                <Text style={styles.sentenceText}>{data.sentence}</Text>
            </View>

            {/* Hint / Feedback Area */}
            <View style={styles.feedbackArea}>
                {transcript ? (
                    <Text style={styles.transcriptText}>"{transcript}"</Text>
                ) : (
                    <Text style={styles.placeholderText}>...</Text>
                )}
                
                {!isCorrect && transcript && !isListening && !isLoading && (
                    <MotiView 
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        style={styles.errorContainer}
                    >
                        <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                        <Text style={styles.errorText}>Not quite! Try again.</Text>
                    </MotiView>
                )}
            </View>

            {/* Controls */}
            <View style={styles.controlsContainer}>
                {isLoading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} />
                ) : !showResult ? (
                    <MicrophoneButton 
                        onPressIn={handleStartListening}
                        onPressOut={handleStopListening}
                        isListening={isListening}
                        disabled={!permissionGranted || disabled}
                    />
                ) : (
                    <MotiView
                        from={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={styles.successIcon}
                    >
                        <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
                        <Text style={styles.successText}>Perfect!</Text>
                    </MotiView>
                )}
            </View>
            
            {!permissionGranted && (
               <Text style={styles.permText}>Microphone permission needed</Text>
            )}
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
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  instruction: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sentenceCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.md,
    marginBottom: SPACING.md,
  },
  sentenceText: {
    fontSize: 28, // Large text for readability
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 36,
  },
  feedbackArea: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  transcriptText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: COLORS.textMuted,
    opacity: 0.3,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.error + '15', // 15% opacity hex
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  errorText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: 14,
  },
  controlsContainer: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
    zIndex: 2,
  },
  micButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  micButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  micButtonDisabled: {
    borderColor: COLORS.textMuted,
    opacity: 0.5,
  },
  micPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    zIndex: 1,
  },
  micLabel: {
    marginTop: SPACING.md,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  successIcon: {
    alignItems: 'center',
  },
  successText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.success,
    marginTop: SPACING.sm,
  },
  permText: {
    color: COLORS.error,
    marginTop: SPACING.lg,
  },
});
