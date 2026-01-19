// Onboarding Screen - Child Login & Mascot Selection
// ✨ Enhanced Magical Design with Glassmorphism & Animations
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { api } from '../convex/_generated/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import SparkleBackground, { BubbleBackground } from '../components/animations/SparkleBackground';
import { useTapFeedback } from '../utils/useTapFeedback';
import Mascot from '../components/Mascot';
import { useChildAuth } from '../utils/childAuth';

const { width, height } = Dimensions.get('window');

type Step = 'welcome' | 'login' | 'mascot';
type MascotType = 'male' | 'female';

// Floating Magic Orb Component
function MagicOrb({ delay = 0, size = 60, color = COLORS.primary }: { delay?: number; size?: number; color?: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  
  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 2000 }),
          withTiming(0.5, { duration: 2000 })
        ),
        -1
      )
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View style={[styles.magicOrb, { width: size, height: size }, animatedStyle]}>
      <LinearGradient
        colors={[color + 'CC', color + '66', color + '33']}
        style={[styles.orbGradient, { borderRadius: size / 2 }]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
    </Animated.View>
  );
}

// Shimmer Button Effect Component
function ShimmerButton({ children, onPress, disabled, style }: any) {
  const shimmerPosition = useSharedValue(-1);
  
  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(2, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1
    );
  }, []);
  
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerPosition.value, [-1, 2], [-200, width + 200]) }],
  }));
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.shimmerButton,
        style,
        disabled && styles.shimmerButtonDisabled,
        pressed && styles.shimmerButtonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <LinearGradient
        colors={disabled ? [COLORS.textMuted, COLORS.textMuted] : [COLORS.primaryDark, COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.shimmerButtonGradient}
      >
        {children}
        {!disabled && (
          <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// Animated Magical Crystal Hero
function MagicalCrystal() {
  const rotate = useSharedValue(0);
  const glow = useSharedValue(0.5);
  
  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.5, { duration: 1500 })
      ),
      -1
    );
  }, []);
  
  const crystalStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));
  
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: interpolate(glow.value, [0.5, 1], [1, 1.3]) }],
  }));
  
  return (
    <View style={styles.crystalContainer}>
      {/* Glow effect */}
      <Animated.View style={[styles.crystalGlow, glowStyle]} />
      
      {/* Rotating orbs */}
      <Animated.View style={[styles.orbitContainer, crystalStyle]}>
        <View style={[styles.orbitOrb, { top: 0, backgroundColor: COLORS.accent }]} />
        <View style={[styles.orbitOrb, { bottom: 0, backgroundColor: COLORS.rainbow4 }]} />
        <View style={[styles.orbitOrb, { left: 0, backgroundColor: COLORS.accentGold }]} />
        <View style={[styles.orbitOrb, { right: 0, backgroundColor: COLORS.rainbow1 }]} />
      </Animated.View>
      
      {/* Center crystal */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark, COLORS.accent]}
        style={styles.crystalCore}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.crystalEmoji}>✨</Text>
      </LinearGradient>
    </View>
  );
}

// Glassmorphism Card Component
function GlassCard({ children, style, delay = 0 }: any) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20, scale: 0.95 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 15, delay }}
      style={[styles.glassCard, style]}
    >
      <View style={styles.glassCardInner}>
        {children}
      </View>
    </MotiView>
  );
}

// Floating Stars Component
function FloatingStars() {
  const stars = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    left: 20 + Math.random() * (width - 40),
    size: 16 + Math.random() * 12,
    delay: i * 400,
  }));
  
  return (
    <>
      {stars.map((star) => (
        <MotiView
          key={star.id}
          from={{ opacity: 0, translateY: 20, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], translateY: -50, scale: [0.5, 1, 0.5] }}
          transition={{
            type: 'timing',
            duration: 3000,
            delay: star.delay,
            loop: true,
          }}
          style={[styles.floatingStar, { left: star.left }]}
        >
          <Text style={{ fontSize: star.size }}>⭐</Text>
        </MotiView>
      ))}
    </>
  );
}

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
  const [inputFocused, setInputFocused] = useState<'username' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      if (checkChildUserExists === undefined) return; // Loading
      
      if (checkChildUserExists.exists) {
        // User exists, _layout will redirect to tabs
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
      }
    } catch (err: any) {
      // Parse errors and provide user-friendly messages
      const errorMessage = err?.message || "";
      
      if (errorMessage.includes("Invalid username or password") || errorMessage.includes("not found")) {
        setError("Incorrect username or password. Please try again.");
      } else if (errorMessage.includes("Session") || errorMessage.includes("expired")) {
        setError("Your session has expired. Please try again.");
      } else {
        setError("Unable to log in. Please check your connection and try again.");
      }
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
    } catch (err: any) {
      // Parse errors and provide user-friendly messages
      const errorMessage = err?.message || "";
      
      if (errorMessage.includes("Invalid token") || errorMessage.includes("Session")) {
        setError("Your session has expired. Please log in again.");
      } else if (errorMessage.includes("already exists")) {
        setError("A profile already exists. Please refresh the app.");
      } else {
        setError("Could not create your profile. Please try again.");
      }
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
      case 'welcome': return "Let's Begin! ✨";
      case 'login': return '🔮 Enter Portal';
      case 'mascot': return '🚀 Start Adventure!';
      default: return 'Next';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Background Effects */}
      <BubbleBackground color={COLORS.primaryLight} />
      <SparkleBackground color={COLORS.accentGold} intensity="low" />
      
      {/* Floating Orbs */}
      <View style={styles.orbsContainer} pointerEvents="none">
        <MagicOrb delay={0} size={80} color={COLORS.primary} />
        <MagicOrb delay={500} size={50} color={COLORS.accent} />
        <MagicOrb delay={1000} size={35} color={COLORS.accentGold} />
      </View>
      
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
            {/* Magical Crystal Hero */}
            <MagicalCrystal />
            
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 300 }}
            >
              <Text style={styles.welcomeTitle}>Magic Quest!</Text>
              <Text style={styles.welcomeSubtitle}>
                Your magical adventure awaits! ✨
              </Text>
            </MotiView>
            
            <View style={styles.features}>
              <FeatureItem emoji="🧠" text="Fun brain games & quizzes" delay={100} />
              <FeatureItem emoji="🎯" text="Daily word challenges" delay={200} />
              <FeatureItem emoji="⚔️" text="Collect cool artifacts" delay={300} />
              <FeatureItem emoji="🗺️" text="Explore magical worlds" delay={400} />
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
            {/* Magical Portal Header */}
            <MotiView
              from={{ scale: 0.5, rotate: '-180deg' }}
              animate={{ scale: 1, rotate: '0deg' }}
              transition={{ type: 'spring', damping: 12 }}
              style={styles.portalContainer}
            >
              <LinearGradient
                colors={[COLORS.accent + '40', COLORS.primary + '60', COLORS.primaryDark + '40']}
                style={styles.portalGradient}
              >
                <MotiView
                  from={{ rotate: '0deg' }}
                  animate={{ rotate: '360deg' }}
                  transition={{ type: 'timing', duration: 10000, loop: true }}
                  style={styles.portalInner}
                >
                  <Text style={styles.portalEmoji}>🔮</Text>
                </MotiView>
              </LinearGradient>
            </MotiView>

            <Text style={styles.stepTitle}>Enter the Portal</Text>
            <Text style={styles.stepSubtitle}>
              Use your secret codes from your parent 🗝️
            </Text>
            
            <View style={styles.inputContainer}>
              <View style={[
                styles.inputWrapper,
                inputFocused === 'username' && styles.inputWrapperFocused,
              ]}>
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color={inputFocused === 'username' ? COLORS.primary : COLORS.textMuted} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor={COLORS.textMuted}
                  value={username}
                  onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ''))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setInputFocused('username')}
                  onBlur={() => setInputFocused(null)}
                />
              </View>
              
              <View style={[
                styles.inputWrapper,
                inputFocused === 'password' && styles.inputWrapperFocused,
              ]}>
                <Ionicons 
                  name="key-outline" 
                  size={20} 
                  color={inputFocused === 'password' ? COLORS.primary : COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setInputFocused('password')}
                  onBlur={() => setInputFocused(null)}
                />
                <Pressable 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                    size={22} 
                    color={COLORS.textMuted}
                  />
                </Pressable>
              </View>
            </View>
            
            {error ? (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={styles.errorContainer}
              >
                <Ionicons name="warning-outline" size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </MotiView>
            ) : null}

            {/* Floating mascot hint */}
            <MotiView
              from={{ opacity: 0, translateX: 50 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'spring', delay: 500 }}
              style={styles.mascotHint}
            >
              <Mascot mascotType="female" size="small" animated />
            </MotiView>
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
            <FloatingStars />
            
            <MotiView
              from={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, delay: 200 }}
            >
              <Text style={styles.mascotHeaderEmoji}>🎭</Text>
            </MotiView>
            
            <Text style={styles.stepTitle}>Choose Your Hero!</Text>
            <Text style={styles.stepSubtitle}>
              Select your magical companion for the adventure
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
                    scale: selectedMascot === 'male' ? 1.1 : 1,
                    rotate: selectedMascot === 'male' ? '-5deg' : '0deg',
                  }}
                  transition={{ type: 'spring', damping: 12 }}
                >
                  <Mascot mascotType="male" size="xlarge" />
                </MotiView>
                <Text style={[
                  styles.mascotLabel,
                  selectedMascot === 'male' && styles.mascotLabelSelected,
                ]}>Wizard Boy</Text>
                {selectedMascot === 'male' && (
                  <MotiView
                    from={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={styles.selectedBadge}
                  >
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  </MotiView>
                )}
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
                    scale: selectedMascot === 'female' ? 1.1 : 1,
                    rotate: selectedMascot === 'female' ? '5deg' : '0deg',
                  }}
                  transition={{ type: 'spring', damping: 12 }}
                >
                  <Mascot mascotType="female" size="xlarge" />
                </MotiView>
                <Text style={[
                  styles.mascotLabel,
                  selectedMascot === 'female' && styles.mascotLabelSelected,
                ]}>Wizard Girl</Text>
                {selectedMascot === 'female' && (
                  <MotiView
                    from={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={styles.selectedBadge}
                  >
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  </MotiView>
                )}
              </Pressable>
            </View>
            
            {error ? (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={styles.errorContainer}
              >
                <Ionicons name="warning-outline" size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </MotiView>
            ) : null}
          </MotiView>
        )}

        {/* Next Button */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 400, damping: 15 }}
          style={styles.buttonContainer}
        >
          <ShimmerButton
            onPress={handleNext}
            disabled={isButtonDisabled()}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>{getButtonText()}</Text>
                <MotiView
                  from={{ translateX: 0 }}
                  animate={{ translateX: 4 }}
                  transition={{ type: 'timing', duration: 800, loop: true }}
                >
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </MotiView>
              </>
            )}
          </ShimmerButton>
        </MotiView>

        {/* Progress Dots */}
        <View style={styles.progressDots}>
          {['welcome', 'login', 'mascot'].map((s, i) => {
            const isActive = step === s;
            const isCompleted = ['welcome', 'login', 'mascot'].indexOf(step) > i;
            
            return (
              <MotiView
                key={s}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  backgroundColor: isActive ? COLORS.primary : isCompleted ? COLORS.success : COLORS.surface,
                }}
                transition={{ type: 'spring', damping: 15 }}
                style={[
                  styles.dot,
                  isActive && styles.dotActive,
                ]}
              >
                {isActive && (
                  <View style={styles.dotGlow} />
                )}
              </MotiView>
            );
          })}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FeatureItem({ emoji, text, delay = 0 }: { emoji: string; text: string; delay?: number }) {
  return (
    <GlassCard delay={delay} style={styles.featureCard}>
      <View style={styles.featureItem}>
        <MotiView
          from={{ scale: 0, rotate: '-45deg' }}
          animate={{ scale: 1, rotate: '0deg' }}
          transition={{ type: 'spring', delay: delay + 100, damping: 10 }}
          style={styles.featureEmojiContainer}
        >
          <Text style={styles.featureEmoji}>{emoji}</Text>
        </MotiView>
        <Text style={styles.featureText}>{text}</Text>
      </View>
    </GlassCard>
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
  
  // Orbs
  orbsContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  magicOrb: {
    position: 'absolute',
  },
  orbGradient: {
    width: '100%',
    height: '100%',
  },
  
  // Magical Crystal
  crystalContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  crystalGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primary + '30',
  },
  orbitContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitOrb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  crystalCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  crystalEmoji: {
    fontSize: 36,
  },
  
  // Welcome
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  welcomeSubtitle: {
    fontSize: 17,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  features: {
    width: '100%',
    gap: SPACING.sm,
  },
  
  // Glass Card
  glassCard: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  glassCardInner: {
    backgroundColor: COLORS.surface + 'E0',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '40',
  },
  featureCard: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  featureEmojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureText: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
    fontWeight: '500',
  },
  
  // Portal
  portalContainer: {
    marginBottom: SPACING.xl,
  },
  portalGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  portalInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary + '60',
  },
  portalEmoji: {
    fontSize: 42,
  },
  
  // Step content
  stepTitle: {
    fontSize: 28,
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
    lineHeight: 22,
  },
  
  // Inputs
  inputContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryLight + '40',
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  inputIcon: {
    marginLeft: SPACING.md,
  },
  input: {
    flex: 1,
    padding: SPACING.lg,
    fontSize: 17,
    color: COLORS.text,
  },
  eyeButton: {
    padding: SPACING.md,
    marginRight: SPACING.xs,
  },
  
  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.error + '15',
    borderRadius: BORDER_RADIUS.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Mascot hint
  mascotHint: {
    position: 'absolute',
    right: -20,
    bottom: -80,
    opacity: 0.8,
  },
  
  // Mascot selection
  mascotHeaderEmoji: {
    fontSize: 56,
    marginBottom: SPACING.md,
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
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    ...SHADOWS.md,
  },
  mascotCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
    ...SHADOWS.glow,
  },
  mascotLabel: {
    marginTop: SPACING.sm,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  mascotLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  selectedBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  
  // Floating stars
  floatingStar: {
    position: 'absolute',
    top: -50,
  },
  
  // Shimmer Button
  buttonContainer: {
    marginTop: SPACING.xxl,
  },
  shimmerButton: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  shimmerButtonDisabled: {
    opacity: 0.5,
  },
  shimmerButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  shimmerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg + 2,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
  },
  shimmerGradient: {
    flex: 1,
    width: 100,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Progress Dots
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.surface,
  },
  dotActive: {
    width: 28,
    borderRadius: 14,
  },
  dotGlow: {
    position: 'absolute',
    width: 36,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary + '30',
    transform: [{ scale: 1.5 }],
  },
});
