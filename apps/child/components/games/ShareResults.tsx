// Wordle Share Results Component
import { View, Text, StyleSheet, Share, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { type LetterState } from '../../stores/wordle-store';

interface ShareResultsProps {
  targetWord: string;
  guesses: string[];
  gameState: 'playing' | 'won' | 'lost';
  dayNumber?: number;
}

// Generate emoji grid for sharing
function generateShareGrid(targetWord: string, guesses: string[]): string {
  const lines: string[] = [];
  
  for (const guess of guesses) {
    let line = '';
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const target = targetWord[i];
      
      if (letter === target) {
        line += '🟩'; // Correct
      } else if (targetWord.includes(letter)) {
        line += '🟨'; // Present
      } else {
        line += '⬛'; // Absent
      }
    }
    lines.push(line);
  }
  
  return lines.join('\n');
}

export async function shareWordleResults({
  targetWord,
  guesses,
  gameState,
  dayNumber = 1,
}: ShareResultsProps): Promise<boolean> {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const grid = generateShareGrid(targetWord, guesses);
    const attempts = gameState === 'won' ? guesses.length : 'X';
    
    const message = `🔍 Detective Mythology Wordle #${dayNumber}

${attempts}/6

${grid}

Play at: detectivemythology.app`;

    const result = await Share.share({
      message,
    });

    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Share error:', error);
    return false;
  }
}

// Share Button Component
interface ShareButtonProps {
  targetWord: string;
  guesses: string[];
  gameState: 'playing' | 'won' | 'lost';
}

export default function ShareButton({ targetWord, guesses, gameState }: ShareButtonProps) {
  const handleShare = () => {
    shareWordleResults({ targetWord, guesses, gameState });
  };

  return (
    <Pressable style={styles.shareButton} onPress={handleShare}>
      <Ionicons name="share-social" size={20} color={COLORS.text} />
      <Text style={styles.shareButtonText}>Share Results</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
