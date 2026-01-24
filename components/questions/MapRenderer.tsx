// Map Renderer - India map selection component (Explorer style)
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import IndiaMap from '../IndiaMap';
import { INDIA_REGIONS } from '../../data/india-states';

interface MapRendererProps {
  question: string;
  data: {
    solution: string; // Region ID like "IN-MH"
    mapType?: string;
  };
  onAnswer: (isCorrect: boolean) => void;
  onFeedback?: (isCorrect: boolean) => void;
  disabled?: boolean;
  showAnswer?: boolean;
}

export default function MapRenderer({
  question,
  data,
  onAnswer,
  onFeedback,
  disabled = false,
  showAnswer = false,
}: MapRendererProps) {


  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Handle showAnswer prop
  useEffect(() => {
    if (showAnswer) {
      setShowResult(true);
    }
  }, [showAnswer]);
  
  // Get region name from ID
  const getRegionName = (id: string) => {
    const region = INDIA_REGIONS.find(r => r.id === id);
    return region?.name ?? id;
  };
  
  const handleRegionPress = (regionId: string) => {
    if (disabled || showResult || showAnswer) return;
    setSelectedRegion(regionId);
  };
  
  const handleSubmit = () => {
    if (!selectedRegion || showResult) return;
    
    setShowResult(true);
    const isCorrect = selectedRegion === data.solution;
    if (onFeedback) {
      onFeedback(isCorrect);
    }
    
    // Immediately notify parent - parent controls timing now
    onAnswer(isCorrect);
  };
  
  const isCorrect = selectedRegion === data.solution;
  
  return (
    <View style={styles.container}>
      {/* Question */}
      <Text style={styles.question}>{question}</Text>
      
      {/* Map */}
      <View style={styles.mapContainer}>
        <IndiaMap
          targetRegion={showResult || showAnswer ? data.solution : undefined}
          selectedRegion={selectedRegion ?? undefined}
          guessedRegions={[]}
          correctRegion={showResult || showAnswer ? data.solution : undefined}
          wrongRegion={showResult && !isCorrect && !showAnswer ? selectedRegion ?? undefined : undefined}
          onRegionPress={handleRegionPress}
          disabled={disabled || showResult || showAnswer}
        />
      </View>
      

      
      {/* Submit button */}
      {selectedRegion && !showResult && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.submitContainer}
        >
          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitPressed,
            ]}
          >
            <Text style={styles.submitText}>Submit Answer</Text>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.text} />
          </Pressable>
        </MotiView>
      )}
      
      {/* Result feedback */}
      {showResult && (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.resultContainer}
        >
          {showAnswer ? (
             <View style={styles.resultWrong}>
              <Ionicons name="eye" size={24} color={COLORS.primary} />
              <Text style={[styles.resultTextWrong, { color: COLORS.primary }]}>
                Solution Revealed
              </Text>
            </View>
          ) : isCorrect ? (
            <View style={styles.resultCorrect}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.resultTextCorrect}>
                Correct! That's {getRegionName(data.solution)}
              </Text>
            </View>
          ) : (
            <View style={styles.resultWrong}>
              <Ionicons name="close-circle" size={24} color={COLORS.error} />
              <Text style={styles.resultTextWrong}>
                That was {getRegionName(selectedRegion!)}. The correct answer is {getRegionName(data.solution)} (highlighted in green)
              </Text>
            </View>
          )}
        </MotiView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
  },
  question: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
    lineHeight: 28,
  },
  mapContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  submitContainer: {
    marginTop: SPACING.md,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  submitPressed: {
    opacity: 0.9,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultContainer: {
    marginTop: SPACING.md,
  },
  resultCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.success + '20',
    borderRadius: BORDER_RADIUS.md,
  },
  resultWrong: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.error + '20',
    borderRadius: BORDER_RADIUS.md,
  },
  resultTextCorrect: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success,
    flex: 1,
  },
  resultTextWrong: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
    flex: 1,
    lineHeight: 20,
  },
});
