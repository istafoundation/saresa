// Onboarding Screen - Child Login & Mascot Selection
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import SparkleBackground from '../components/animations/SparkleBackground';
import { useTapFeedback } from '../utils/useTapFeedback';
import Mascot from '../components/Mascot';
import { useChildAuth } from '../utils/childAuth';

type Step = 'welcome' | 'login' | 'mascot';
type MascotType = 'male' | 'female';

export default function OnboardingScreen() {
  const { login, isAuthenticated, token } = useChildAuth();
  const { triggerTap, triggerSelection } = useTapFeedback();
  
  // Convex
  const checkChildUserExists = useQuery(api.users.checkUserExists, token ? { token } : "skip");
  const createUser = useMutation(api.users.createUser);
  
  const [step, setStep] = useState<Step>('welcome');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedMascot, setSelectedMascot] = useState<MascotType>('male');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle navigation based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      if (checkChildUserExists === undefined) return; // Loading
      
      if (checkChildUserExists.exists) {
        // User exists, _layout will redirect to tabs
        // We can show a loading state here if we want
      } else {
        // Authenticated but no user data -> Go to mascot selection
        setStep('mascot');
      }
    }
  }, [isAuthenticated, checkChildUserExists]);

  const handleLogin = async () => {
    if (username.length < 4 || password.length < 6) {
      setError('Please enter a valid username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.error || 'Login failed');
      } else {
        triggerTap('medium');
        // useEffect will handle the transition to mascot or main app
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!token) return;
    setIsLoading(true);
    
    try {
      await createUser({
        token,
        mascot: selectedMascot,
      });
      triggerTap('medium');
      // Navigation happens automatically via _layout.tsx redirect when userCheck.exists becomes true
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    triggerTap('medium');
    if (step === 'welcome') {
      setStep('login');
    } else if (step === 'login') {
      handleLogin();
    } else if (step === 'mascot') {
      handleCompleteOnboarding();
    }
  };

  const handleMascotSelect = (mascot: MascotType) => {
    triggerSelection();
    setSelectedMascot(mascot);
  };

  const isButtonDisabled = () => {
    if (isLoading) return true;
    if (step === 'login') return username.trim().length < 4 || password.length < 6;
    return false;
  };

  const getButtonText = () => {
    if (isLoading) return 'Loading...';
    switch (step) {
      case 'welcome': return "Let's Go!";
      case 'login': return 'Login';
      case 'mascot': return 'Start Adventure!';
      default: return 'Next';
    }
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
              Enter your secret codes to begin your adventure!
            </Text>
            
            <View style={styles.features}>
              <FeatureItem emoji="🧠" text="Fun brain games & quizzes" delay={100} />
              <FeatureItem emoji="🎯" text="Daily word challenges" delay={200} />
              <FeatureItem emoji="⚔️" text="Collect cool weapons" delay={300} />
              <FeatureItem emoji="📚" text="Amazing adventure stories" delay={400} />
            </View>
          </MotiView>
        )}

        {/* Login Step */}
        {step === 'login' && (
          <MotiView
            from={{ opacity: 0, translateX: 50 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'spring' }}
            style={styles.stepContainer}
          >
            <Text style={styles.stepEmoji}>🔑</Text>
            <Text style={styles.stepTitle}>Child Login</Text>
            <Text style={styles.stepSubtitle}>
              Ask your parent for your username & password
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={COLORS.textMuted}
                value={username}
                onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ''))}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
            <Mascot mascotType="female" size="large" animated />
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
                  <Mascot mascotType="male" size="xlarge" />
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
                  <Mascot mascotType="female" size="xlarge" />
                </MotiView>
                <Text style={styles.mascotLabel}>Wizard Girl</Text>
              </Pressable>
            </View>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </MotiView>
        )}

        {/* Next Button */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 300, damping: 15 }}
          style={styles.buttonContainer}
        >
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              isButtonDisabled() && styles.nextButtonDisabled,
              pressed && styles.nextButtonPressed,
            ]}
            onPress={handleNext}
            disabled={isButtonDisabled()}
          >
            <LinearGradient
              colors={
                isButtonDisabled()
                  ? [COLORS.textMuted, COLORS.textMuted]
                  : [COLORS.primary, COLORS.primaryDark]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>{getButtonText()}</Text>
                  <MotiView
                    from={{ translateX: 0 }}
                    animate={{ translateX: 4 }}
                    transition={{ type: 'timing', duration: 800, loop: true }}
                  >
                    <Text style={styles.buttonArrow}>→</Text>
                  </MotiView>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </MotiView>

        {/* Progress Dots */}
        <View style={styles.progressDots}>
          {['welcome', 'login', 'mascot'].map((s, i) => (
            <View 
              key={s}
              style={[
                styles.dot,
                step === s && styles.dotActive,
                ['welcome', 'login', 'mascot'].indexOf(step) > i && styles.dotCompleted,
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
  inputContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  input: {
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
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: SPACING.sm,
    textAlign: 'center',
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
  mascotLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  buttonContainer: {
    marginTop: SPACING.xxl,
  },
  nextButton: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  nextButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonArrow: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
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
