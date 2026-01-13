// Wordle How-To-Play Modal
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface HowToPlayModalProps {
  visible: boolean;
  onClose: () => void;
}

function ExampleTile({ 
  letter, 
  state 
}: { 
  letter: string; 
  state: 'correct' | 'present' | 'absent' | 'empty';
}) {
  const colors = {
    correct: COLORS.wordleCorrect,
    present: COLORS.wordlePresent,
    absent: COLORS.wordleAbsent,
    empty: COLORS.surface,
  };

  return (
    <View style={[styles.tile, { backgroundColor: colors[state] }]}>
      <Text style={styles.tileText}>{letter}</Text>
    </View>
  );
}

export default function HowToPlayModal({ visible, onClose }: HowToPlayModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' }}
          style={styles.modal}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>How To Play</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Rules */}
            <Text style={styles.subtitle}>Guess the Mythology Word</Text>
            <Text style={styles.description}>
              Guess the 5-letter mythology word in 6 tries. A new word is available each day!
            </Text>

            {/* How it works */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How it works</Text>
              <View style={styles.rule}>
                <Text style={styles.ruleNumber}>1</Text>
                <Text style={styles.ruleText}>
                  Type any valid 5-letter word and press ENTER
                </Text>
              </View>
              <View style={styles.rule}>
                <Text style={styles.ruleNumber}>2</Text>
                <Text style={styles.ruleText}>
                  The tiles will change color to show how close your guess was
                </Text>
              </View>
              <View style={styles.rule}>
                <Text style={styles.ruleNumber}>3</Text>
                <Text style={styles.ruleText}>
                  You have 6 attempts to find the word
                </Text>
              </View>
            </View>

            {/* Examples */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Examples</Text>
              
              {/* Correct example */}
              <View style={styles.example}>
                <View style={styles.exampleTiles}>
                  <ExampleTile letter="S" state="correct" />
                  <ExampleTile letter="H" state="empty" />
                  <ExampleTile letter="I" state="empty" />
                  <ExampleTile letter="V" state="empty" />
                  <ExampleTile letter="A" state="empty" />
                </View>
                <View style={styles.exampleExplain}>
                  <View style={[styles.colorDot, { backgroundColor: COLORS.wordleCorrect }]} />
                  <Text style={styles.exampleText}>
                    <Text style={styles.bold}>S</Text> is in the word and in the correct spot
                  </Text>
                </View>
              </View>

              {/* Present example */}
              <View style={styles.example}>
                <View style={styles.exampleTiles}>
                  <ExampleTile letter="K" state="empty" />
                  <ExampleTile letter="A" state="present" />
                  <ExampleTile letter="R" state="empty" />
                  <ExampleTile letter="M" state="empty" />
                  <ExampleTile letter="A" state="empty" />
                </View>
                <View style={styles.exampleExplain}>
                  <View style={[styles.colorDot, { backgroundColor: COLORS.wordlePresent }]} />
                  <Text style={styles.exampleText}>
                    <Text style={styles.bold}>A</Text> is in the word but in the wrong spot
                  </Text>
                </View>
              </View>

              {/* Absent example */}
              <View style={styles.example}>
                <View style={styles.exampleTiles}>
                  <ExampleTile letter="D" state="empty" />
                  <ExampleTile letter="E" state="empty" />
                  <ExampleTile letter="V" state="absent" />
                  <ExampleTile letter="A" state="empty" />
                  <ExampleTile letter="S" state="empty" />
                </View>
                <View style={styles.exampleExplain}>
                  <View style={[styles.colorDot, { backgroundColor: COLORS.wordleAbsent }]} />
                  <Text style={styles.exampleText}>
                    <Text style={styles.bold}>V</Text> is not in the word at all
                  </Text>
                </View>
              </View>
            </View>

            {/* XP Info */}
            <View style={styles.xpInfo}>
              <Ionicons name="star" size={20} color={COLORS.accentGold} />
              <Text style={styles.xpInfoText}>
                Win to earn <Text style={styles.xpHighlight}>100 XP</Text>!
              </Text>
            </View>

            {/* Daily reminder */}
            <View style={styles.dailyReminder}>
              <Ionicons name="calendar" size={18} color={COLORS.primary} />
              <Text style={styles.dailyText}>
                A new mythology word is available every day!
              </Text>
            </View>
          </ScrollView>

          {/* Got it button */}
          <Pressable style={styles.gotItButton} onPress={onClose}>
            <Text style={styles.gotItText}>Got it!</Text>
          </Pressable>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modal: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: SPACING.lg,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  ruleNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '30',
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  example: {
    marginBottom: SPACING.lg,
  },
  exampleTiles: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.textMuted + '40',
  },
  tileText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  exampleExplain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  exampleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  xpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentGold + '20',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  xpInfoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  xpHighlight: {
    fontWeight: '700',
    color: COLORS.accentGold,
  },
  dailyReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  dailyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  gotItButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    alignItems: 'center',
    margin: SPACING.lg,
    marginTop: 0,
    borderRadius: BORDER_RADIUS.lg,
  },
  gotItText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
});
