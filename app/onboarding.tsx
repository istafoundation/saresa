// Onboarding Screen - Email+OTP Auth, Name, Mascot Selection
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignIn, useSignUp, useAuth } from '@clerk/clerk-expo';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import SparkleBackground from '../components/animations/SparkleBackground';
import { useTapFeedback } from '../utils/useTapFeedback';
import Mascot from '../components/Mascot';

type Step = 'welcome' | 'email' | 'otp' | 'name' | 'mascot';
type MascotType = 'male' | 'female';

export default function OnboardingScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { isSignedIn } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const { triggerTap, triggerSelection } = useTapFeedback();
  
  // Convex
  const userCheck = useQuery(api.users.checkUserExists);
  const createUser = useMutation(api.users.createUser);
  
  const [step, setStep] = useState<Step>('welcome');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedMascot, setSelectedMascot] = useState<MascotType>('male');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  // Check if user is already authenticated and has data
  useEffect(() => {
    // If authenticated but no user data, go to name step
    if (isAuthenticated && userCheck !== undefined && !userCheck?.exists) {
      setStep('name');
    }
    // If authenticated with data, _layout.tsx will redirect automatically
  }, [isAuthenticated, userCheck]);

  const handleSendOTP = async () => {
    if (!signInLoaded || !signUpLoaded) return;
    setIsLoading(true);
    setError('');
    
    try {
      // Try to sign in first (existing user)
      const signInAttempt = await signIn.create({
        identifier: email,
      });
      
      // Prepare email code verification
      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: signInAttempt.supportedFirstFactors?.find(
          (f) => f.strategy === 'email_code'
        )?.emailAddressId!,
      });
      
      setIsNewUser(false);
      triggerTap('medium');
      setStep('otp');
    } catch (err: any) {
      // If user doesn't exist, try sign up
      if (err.errors?.[0]?.code === 'form_identifier_not_found') {
        try {
          await signUp.create({
            emailAddress: email,
          });
          
          await signUp.prepareEmailAddressVerification({
            strategy: 'email_code',
          });
          
          setIsNewUser(true);
          triggerTap('medium');
          setStep('otp');
        } catch (signUpErr: any) {
          setError(signUpErr.errors?.[0]?.message || 'Failed to send code');
        }
      } else {
        setError(err.errors?.[0]?.message || 'Failed to send code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!signInLoaded || !signUpLoaded) return;
    setIsLoading(true);
    setError('');
    
    try {
      if (isNewUser) {
        // Complete sign up
        const result = await signUp.attemptEmailAddressVerification({
          code: otp,
        });
        
        if (result.status === 'complete') {
          await setSignUpActive({ session: result.createdSessionId });
          triggerTap('medium');
          setStep('name');
        }
      } else {
        // Complete sign in
        const result = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code: otp,
        });
        
        if (result.status === 'complete') {
          await setSignInActive({ session: result.createdSessionId });
          // User exists, will redirect via useEffect
          triggerTap('medium');
        }
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (userName.trim().length < 2) return;
    setIsLoading(true);
    
    try {
      await createUser({
        email,
        name: userName.trim(),
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
      setStep('email');
    } else if (step === 'email') {
      handleSendOTP();
    } else if (step === 'otp') {
      handleVerifyOTP();
    } else if (step === 'name') {
      if (userName.trim().length < 2) return;
      setStep('mascot');
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
    if (step === 'email') return email.trim().length < 5 || !email.includes('@');
    if (step === 'otp') return otp.length !== 6;
    if (step === 'name') return userName.trim().length < 2;
    return false;
  };

  const getButtonText = () => {
    if (isLoading) return 'Loading...';
    switch (step) {
      case 'welcome': return "Let's Go!";
      case 'email': return 'Send Code';
      case 'otp': return 'Verify';
      case 'name': return 'Continue';
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

        {/* Email Step */}
        {step === 'email' && (
          <MotiView
            from={{ opacity: 0, translateX: 50 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'spring' }}
            style={styles.stepContainer}
          >
            <Text style={styles.stepEmoji}>📧</Text>
            <Text style={styles.stepTitle}>Parent's Email</Text>
            <Text style={styles.stepSubtitle}>
              We'll send a code to verify your account
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              autoFocus
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </MotiView>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <MotiView
            from={{ opacity: 0, translateX: 50 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'spring' }}
            style={styles.stepContainer}
          >
            <Text style={styles.stepEmoji}>🔐</Text>
            <Text style={styles.stepTitle}>Enter Code</Text>
            <Text style={styles.stepSubtitle}>
              We sent a 6-digit code to {email}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={COLORS.textMuted}
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
              autoFocus
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <Pressable onPress={() => setStep('email')} style={styles.backLink}>
              <Text style={styles.backLinkText}>Wrong email? Go back</Text>
            </Pressable>
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
            <Text style={styles.stepTitle}>What's your name?</Text>
            <Text style={styles.stepSubtitle}>
              This will be your identity on your mythology journey
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.textMuted}
              value={userName}
              onChangeText={setUserName}
              autoFocus
              autoCapitalize="words"
              maxLength={20}
            />
            
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
          {['welcome', 'email', 'otp', 'name', 'mascot'].map((s, i) => (
            <View 
              key={s}
              style={[
                styles.dot,
                step === s && styles.dotActive,
                ['welcome', 'email', 'otp', 'name', 'mascot'].indexOf(step) > i && styles.dotCompleted,
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
  backLink: {
    marginTop: SPACING.lg,
  },
  backLinkText: {
    color: COLORS.primary,
    fontSize: 14,
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
