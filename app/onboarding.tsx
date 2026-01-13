// Onboarding Screen - Name entry and mascot selection ✨ Kids-Friendly
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useUserStore, type MascotType } from '../stores/user-store';
import SparkleBackground from '../components/animations/SparkleBackground';

type Step = 'welcome' | 'name' | 'mascot';

export default function OnboardingScreen() {
  const router = useRouter();
  const { setName, setMascot, completeOnboarding } = useUserStore();
  
  const [step, setStep] = useState<Step>('welcome');
  const [userName, setUserName] = useState('');
  const [selectedMascot, setSelectedMascot] = useState<MascotType>('male');

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step === 'welcome') {
      setStep('name');
    } else if (step === 'name') {
      if (userName.trim().length < 2) return;
      setName(userName.trim());
      setStep('mascot');
    } else if (step === 'mascot') {
      setMascot(selectedMascot);
      completeOnboarding();
      // Navigation is handled by _layout.tsx Redirect when onboardingComplete becomes true
    }
  };

  const handleMascotSelect = (mascot: MascotType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMascot(mascot);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <SparkleBackground color={COLORS.sparkle} intensity="medium" />
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Welcome Step */}
        {step === 'welcome' && (
          <MotiView
            from={{ opacity: 0, translateY: 30, scale: 0.9 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.stepContainer}
          >
            <MotiView
              from={{ rotate: '-10deg', scale: 0.8 }}
              animate={{ rotate: '0deg', scale: 1 }}
              transition={{ type: 'spring', delay: 200 }}
            >
              <Text style={styles.welcomeEmoji}>🌟🔮✨</Text>
            </MotiView>
            <Text style={styles.welcomeTitle}>Magic Quest!</Text>
            <Text style={styles.welcomeSubtitle}>
              Discover amazing stories, solve fun puzzles, and become a mythology hero!
            </Text>
            
            <View style={styles.features}>
              <FeatureItem emoji="🧠" text="Fun brain games & quizzes" delay={100} />
              <FeatureItem emoji="🎯" text="Daily word challenges" delay={200} />
              <FeatureItem emoji="⚔️" text="Collect cool weapons" delay={300} />
              <FeatureItem emoji="📚" text="Amazing adventure stories" delay={400} />
            </View>
          </MotiView>
        )}

        {/* Name Step */}
        {step === 'name' && (
          <MotiView
            from={{ opacity: 0, translateX: 50 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'spring' }}
            style={styles.stepContainer}
          >
            <Text style={styles.stepEmoji}>👤</Text>
            <Text style={styles.stepTitle}>What's your name, detective?</Text>
            <Text style={styles.stepSubtitle}>
              This will be your identity on your mythology journey
            </Text>
            
            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.textMuted}
              value={userName}
              onChangeText={setUserName}
              autoFocus
              autoCapitalize="words"
              maxLength={20}
            />
          </MotiView>
        )}

        {/* Mascot Step */}
        {step === 'mascot' && (
          <MotiView
            from={{ opacity: 0, translateX: 50, scale: 0.9 }}
            animate={{ opacity: 1, translateX: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.stepContainer}
          >
            <Text style={styles.stepEmoji}>🧙‍♀️✨</Text>
            <Text style={styles.stepTitle}>Pick your hero!</Text>
            <Text style={styles.stepSubtitle}>
              Choose your magical companion for the adventure
            </Text>
            
            <View style={styles.mascotOptions}>
              <Pressable
                style={[
                  styles.mascotCard,
                  selectedMascot === 'male' && styles.mascotCardSelected,
                ]}
                onPress={() => handleMascotSelect('male')}
              >
                <MotiView
                  animate={{ 
                    scale: selectedMascot === 'male' ? 1.15 : 1,
                    rotate: selectedMascot === 'male' ? '-5deg' : '0deg',
                  }}
                  transition={{ type: 'spring', damping: 12 }}
                >
                  <Text style={styles.mascotEmoji}>🧙</Text>
                </MotiView>
                <Text style={styles.mascotLabel}>Wizard Boy</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.mascotCard,
                  selectedMascot === 'female' && styles.mascotCardSelected,
                ]}
                onPress={() => handleMascotSelect('female')}
              >
                <MotiView
                  animate={{ 
                    scale: selectedMascot === 'female' ? 1.15 : 1,
                    rotate: selectedMascot === 'female' ? '5deg' : '0deg',
                  }}
                  transition={{ type: 'spring', damping: 12 }}
                >
                  <Text style={styles.mascotEmoji}>🧙‍♀️</Text>
                </MotiView>
                <Text style={styles.mascotLabel}>Wizard Girl</Text>
              </Pressable>
            </View>
          </MotiView>
        )}

        {/* Next Button */}
        <MotiView
          from={{ opacity: 0, translateY: 20, scale: 0.9 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          transition={{ type: 'spring', delay: 300, damping: 12 }}
          style={styles.buttonContainer}
        >
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              step === 'name' && userName.trim().length < 2 && styles.nextButtonDisabled,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
            onPress={handleNext}
            disabled={step === 'name' && userName.trim().length < 2}
          >
            <LinearGradient
              colors={
                step === 'name' && userName.trim().length < 2
                  ? [COLORS.surface, COLORS.surface]
                  : [COLORS.rainbow1, COLORS.primary, COLORS.rainbow4]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {step === 'welcome' 
                  ? "🚀 Let's Go!" 
                  : step === 'name' 
                    ? "✨ Continue" 
                    : "🎉 Start Adventure!"}
              </Text>
            </LinearGradient>
          </Pressable>
        </MotiView>

        {/* Progress Dots */}
        <View style={styles.progressDots}>
          {['welcome', 'name', 'mascot'].map((s, i) => (
            <View 
              key={s}
              style={[
                styles.dot,
                step === s && styles.dotActive,
                ['welcome', 'name', 'mascot'].indexOf(step) > i && styles.dotCompleted,
              ]}
            />
          ))}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FeatureItem({ emoji, text, delay = 0 }: { emoji: string; text: string; delay?: number }) {
  return (
    <MotiView
      from={{ opacity: 0, translateX: -20, scale: 0.8 }}
      animate={{ opacity: 1, translateX: 0, scale: 1 }}
      transition={{ type: 'spring', delay, damping: 15 }}
    >
      <View style={styles.featureItem}>
        <Text style={styles.featureEmoji}>{emoji}</Text>
        <Text style={styles.featureText}>{text}</Text>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  stepContainer: {
    alignItems: 'center',
  },
  welcomeEmoji: {
    fontSize: 72,
    marginBottom: SPACING.lg,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  features: {
    width: '100%',
    gap: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
  },
  stepEmoji: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  stepSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  nameInput: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary + '40',
  },
  mascotOptions: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  mascotCard: {
    width: 140,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    ...SHADOWS.md,
  },
  mascotCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  mascotEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  mascotLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  buttonContainer: {
    marginTop: SPACING.xxl,
  },
  nextButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonGradient: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  dotCompleted: {
    backgroundColor: COLORS.success,
  },
});
