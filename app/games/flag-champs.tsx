// Flag Champs - Fill-in-the-blanks flag guessing game
// Resume capability + 5-minute batch sync pattern (like practice mode)
import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, Pressable, ActivityIndicator, Image, AppState, 
  TextInput, Keyboard, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useSafeNavigation } from '../../utils/useSafeNavigation';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useChildAuth } from '../../utils/childAuth';
import { useTapFeedback } from '../../utils/useTapFeedback';
import { useGameAudio } from '../../utils/sound-manager';
import { useUserStore } from '../../stores/user-store';
import Mascot from '../../components/Mascot';
import { getISTDate } from '../../utils/dates';
import { 
  COUNTRIES, 
  TOTAL_COUNTRIES, 
  FC_XP_CORRECT, 
  FC_XP_HINT, 
  FC_XP_WRONG,
  shuffleCountries,
  type Country 
} from '../../data/world-flags';
import CoinRewardAnimation from '../../components/animations/CoinRewardAnimation';
import CoinBalance from '../../components/CoinBalance';

// Constants
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Generate revealed letters for hint (~50% of letters revealed after hint)
function generateHintReveals(word: string): number[] {
  const upper = word.toUpperCase();
  const letterIndices: number[] = [];
  
  // Get indices of all actual letters (not spaces)
  upper.split('').forEach((char, i) => {
    if (char.match(/[A-Z]/)) {
      letterIndices.push(i);
    }
  });
  
  // Shuffle and take ~50% to reveal as hints
  const shuffled = letterIndices.sort(() => Math.random() - 0.5);
  const revealCount = Math.floor(letterIndices.length * 0.4);
  return shuffled.slice(0, revealCount).sort((a, b) => a - b);
}

export default function FlagChampsScreen() {
  const { safeBack } = useSafeNavigation();
  const { token } = useChildAuth();
  const { triggerTap } = useTapFeedback();
  const { playCorrect, playWrong, playWin } = useGameAudio();
  const { mascot } = useUserStore();
  
  // Track today for day-change detection
  const [todayStr, setTodayStr] = useState(getISTDate());
  
  // Game state
  const [shuffledCountries, setShuffledCountries] = useState<Country[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [hintReveals, setHintReveals] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [wasSkipped, setWasSkipped] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  
  // Input ref for focus management
  const inputRef = useRef<TextInput>(null);
  
  // Session stats (local tracking)
  const [sessionGuessed, setSessionGuessed] = useState<string[]>([]);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  
  // Refs for batch sync (like practice mode)
  const guessedRef = useRef<string[]>([]);
  const correctRef = useRef(0);
  const xpRef = useRef(0);
  const lastSyncedRef = useRef({ guessed: [] as string[], correct: 0, xp: 0 });
  const syncMutationRef = useRef<typeof syncStats | null>(null);
  
  // Coin Animation
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);
  
  // Convex
  const progress = useQuery(api.gameStats.getFlagChampsProgress,
    token ? { token, clientDate: todayStr } : 'skip'
  );
  const syncStats = useMutation(api.gameStats.syncFlagChampsStats);
  
  // Keep mutation ref updated
  useEffect(() => {
    syncMutationRef.current = syncStats;
  }, [syncStats]);
  
  // Keep refs in sync with state
  useEffect(() => {
    guessedRef.current = sessionGuessed;
    correctRef.current = sessionCorrect;
    xpRef.current = sessionXP;
  }, [sessionGuessed, sessionCorrect, sessionXP]);
  
  // Check for day change
  useEffect(() => {
    const interval = setInterval(() => {
      const current = getISTDate();
      if (current !== todayStr) {
        setTodayStr(current);
      }
    }, 60000);
    
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const current = getISTDate();
        if (current !== todayStr) {
          setTodayStr(current);
        }
      }
    });
    
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [todayStr]);
  
  // Initialize game with shuffled countries, excluding already guessed
  useEffect(() => {
    if (progress && shuffledCountries.length === 0) {
      const alreadyGuessed = progress.guessedToday || [];
      const remaining = COUNTRIES.filter(c => !alreadyGuessed.includes(c.id));
      setShuffledCountries(shuffleCountries(remaining));
      
      // Restore session stats if resuming
      if (alreadyGuessed.length > 0) {
        setSessionGuessed(alreadyGuessed);
        setSessionCorrect(progress.correctToday);
        setSessionXP(progress.dailyXP);
        lastSyncedRef.current = {
          guessed: alreadyGuessed,
          correct: progress.correctToday,
          xp: progress.dailyXP,
        };
      }
    }
  }, [progress, shuffledCountries.length]);
  
  // Reset state when current country changes
  useEffect(() => {
    if (shuffledCountries.length > 0 && currentIndex < shuffledCountries.length) {
      setUserAnswer('');
      setShowHint(false);
      setUsedHint(false);
      setHintReveals([]);
      setShowFeedback(false);
      setWasSkipped(false);
      // Focus input after a short delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [shuffledCountries, currentIndex]);
  
  // Stable sync function (like practice mode)
  const syncToConvex = useCallback(() => {
    if (!token || !syncMutationRef.current) return;
    
    const unsynced = {
      newGuessed: guessedRef.current.filter(id => !lastSyncedRef.current.guessed.includes(id)),
      newCorrect: correctRef.current - lastSyncedRef.current.correct,
      newXP: xpRef.current - lastSyncedRef.current.xp,
    };
    
    if (unsynced.newGuessed.length > 0) {
      // Just fire and forget sync, response handled by callback/effect if needed
      // But for coins, we might want to capture result if it's the final sync?
      // Since this is throttled/background, we can't easily show animation for every sync.
      // We'll show animation only at the END of the game or rely on CoinBalance updating.
      // Actually, syncMutationRef returns a Promise.
      
      syncMutationRef.current({
        token,
        newGuessed: unsynced.newGuessed,
        newCorrect: unsynced.newCorrect,
        newXP: unsynced.newXP,
        isGameComplete: guessedRef.current.length >= TOTAL_COUNTRIES,
      }).then((result) => {
          if (result && result.coinsEarned > 0) {
              // Only simple toast or just let CoinBalance update?
              // The user asked for "animation at some point". 
              // If we are playing, maybe we shouldn't show full screen animation.
              // But if it's game complete, we should.
              if (result.isComplete) {
                  setEarnedCoins(result.coinsEarned);
                  setShowCoinAnimation(true);
              }
          }
      });

      lastSyncedRef.current = {
        guessed: [...guessedRef.current],
        correct: correctRef.current,
        xp: xpRef.current,
      };
    }
  }, [token]);
  
  // Sync every 5 minutes
  useEffect(() => {
    const interval = setInterval(syncToConvex, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [syncToConvex]);
  
  // Sync on unmount
  useEffect(() => {
    return () => {
      if (!token || !syncMutationRef.current) return;
      const unsynced = {
        newGuessed: guessedRef.current.filter(id => !lastSyncedRef.current.guessed.includes(id)),
        newCorrect: correctRef.current - lastSyncedRef.current.correct,
        newXP: xpRef.current - lastSyncedRef.current.xp,
      };
      if (unsynced.newGuessed.length > 0 && syncMutationRef.current) {
        syncMutationRef.current({
          token,
          newGuessed: unsynced.newGuessed,
          newCorrect: unsynced.newCorrect,
          newXP: unsynced.newXP,
          isGameComplete: guessedRef.current.length >= TOTAL_COUNTRIES,
        });
      }
    };
  }, [token]);
  
  // Sync when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        syncToConvex();
      }
    });
    return () => subscription.remove();
  }, [syncToConvex]);
  
  const currentCountry = shuffledCountries[currentIndex];
  
  // Check answer
  const checkAnswer = useCallback(() => {
    if (!currentCountry) return;
    
    Keyboard.dismiss();
    
    const isCorrect = userAnswer.trim().toUpperCase() === currentCountry.name.toUpperCase();
    
    setWasCorrect(isCorrect);
    setShowFeedback(true);
    
    // Calculate XP
    let xpEarned = FC_XP_WRONG;
    if (isCorrect) {
      xpEarned = usedHint ? FC_XP_HINT : FC_XP_CORRECT;
      playCorrect();
    } else {
      playWrong();
    }
    
    // Update session stats
    setSessionGuessed(prev => [...prev, currentCountry.id]);
    if (isCorrect) {
      setSessionCorrect(prev => prev + 1);
    }
    setSessionXP(prev => prev + xpEarned);
  }, [currentCountry, userAnswer, usedHint, playCorrect, playWrong]);
  
  // Handle skip - show country name first, then next button
  const handleSkip = useCallback(() => {
    if (!currentCountry) return;
    
    Keyboard.dismiss();
    triggerTap('light');
    
    // Add to guessed but no points
    setSessionGuessed(prev => [...prev, currentCountry.id]);
    
    // Show feedback with skip state
    setWasSkipped(true);
    setWasCorrect(false);
    setShowFeedback(true);
  }, [currentCountry, triggerTap]);
  
  // Handle continue
  const handleContinue = useCallback(() => {
    triggerTap('medium');
    
    if (currentIndex < shuffledCountries.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setGameComplete(true);
      syncToConvex();
      playWin();
    }
  }, [currentIndex, shuffledCountries.length, syncToConvex, playWin, triggerTap]);
  
  // Handle hint - reveals some letters AND shows fact
  const handleHint = useCallback(() => {
    if (!currentCountry) return;
    
    triggerTap('medium');
    setShowHint(true);
    setUsedHint(true);
    // Generate which letters to reveal
    setHintReveals(generateHintReveals(currentCountry.name));
  }, [triggerTap, currentCountry]);
  
  // Back handler
  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    triggerTap('medium');
    syncToConvex();
    safeBack();
  }, [triggerTap, syncToConvex, safeBack]);
  
  // Focus input when tapping blanks area
  const handleBlanksPress = useCallback(() => {
    inputRef.current?.focus();
  }, []);
  
  // Loading state
  if (!progress) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading progress...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Already completed today
  if (progress.isCompletedToday && !gameComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>Flag Champs</Text>
          <CoinBalance />
        </View>
        
        <View style={styles.completedContainer}>
          <Mascot mascotType={mascot} size="large" />
          <Text style={styles.completedTitle}>🏆 Daily Challenge Done!</Text>
          <Text style={styles.completedText}>
            You've completed all 195 flags today!
          </Text>
          <View style={styles.statsBox}>
            <Text style={styles.statsLabel}>Today's Score</Text>
            <Text style={styles.statsValue}>{progress.correctToday}/{TOTAL_COUNTRIES}</Text>
            <Text style={styles.statsXP}>+{progress.dailyXP} XP earned</Text>
          </View>
          <View style={styles.bestScoreBox}>
            <Ionicons name="trophy" size={20} color={COLORS.accentGold} />
            <Text style={styles.bestScoreText}>Best: {progress.bestScore}/{TOTAL_COUNTRIES}</Text>
          </View>
          <Text style={styles.completedHint}>Come back tomorrow for more!</Text>
          
          <Pressable style={styles.backToGamesButton} onPress={handleBack}>
            <Text style={styles.backToGamesText}>Back to Games</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  
  // Loading countries
  if (shuffledCountries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MotiView
            from={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'timing', duration: 800, loop: true }}
          >
            <Text style={{ fontSize: 48 }}>🏳️</Text>
          </MotiView>
          <Text style={[styles.loadingText, { marginTop: SPACING.lg }]}>
            Getting flags ready...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Game complete screen
  if (gameComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 200 }}
          >
            <Text style={styles.resultEmoji}>🏆</Text>
            <Text style={styles.resultTitle}>Challenge Complete!</Text>
            
            <View style={styles.resultStats}>
              <View style={styles.resultStatItem}>
                <Text style={styles.resultStatValue}>{sessionCorrect + progress.correctToday}</Text>
                <Text style={styles.resultStatLabel}>Correct</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatItem}>
                <Text style={styles.resultStatValue}>{TOTAL_COUNTRIES}</Text>
                <Text style={styles.resultStatLabel}>Total</Text>
              </View>
              <View style={styles.resultStatDivider} />
              <View style={styles.resultStatItem}>
                <Text style={[styles.resultStatValue, { color: COLORS.accentGold }]}>
                  +{sessionXP + progress.dailyXP}
                </Text>
                <Text style={styles.resultStatLabel}>XP</Text>
              </View>
            </View>
            
            <View style={styles.bestScoreBox}>
              <Ionicons name="trophy" size={20} color={COLORS.accentGold} />
              <Text style={styles.bestScoreText}>
                Best: {Math.max(sessionCorrect + progress.correctToday, progress.bestScore)}/{TOTAL_COUNTRIES}
              </Text>
            </View>
            
            <Pressable style={styles.resultButton} onPress={handleBack}>
              <Text style={styles.resultButtonText}>Done</Text>
            </Pressable>
          </MotiView>
        </View>
      </SafeAreaView>
    );
  }
  
  // Main game screen
  const uniqueProgress = new Set([...(progress.guessedToday || []), ...sessionGuessed]).size;
  
  // Create the blanks display (all blanks, unless hint reveals some)
  // Dynamic sizing for long country names
  const createBlanksDisplay = () => {
    if (!currentCountry) return null;
    
    const letters = currentCountry.name.toUpperCase().split('');
    const letterCount = letters.filter(c => c !== ' ').length;
    
    // Dynamic sizing: smaller boxes for longer names
    // Standard: 24x32, Medium (15-20 letters): 20x28, Small (21+ letters): 16x24
    const isLong = letterCount > 20;
    const isMedium = letterCount > 14 && letterCount <= 20;
    
    const boxStyle = isLong 
      ? styles.letterBoxSmall 
      : isMedium 
        ? styles.letterBoxMedium 
        : styles.letterBox;
    
    const textStyle = isLong
      ? styles.letterTextSmall
      : isMedium
        ? styles.letterTextMedium
        : styles.letterText;
    
    const spaceStyle = isLong
      ? styles.spaceBoxSmall
      : isMedium
        ? styles.spaceBoxMedium
        : styles.spaceBox;
    
    return letters.map((char, i) => {
      // Is this letter revealed by hint?
      const isRevealed = showHint && hintReveals.includes(i);
      
      if (char === ' ') {
        return <View key={i} style={spaceStyle} />;
      }
      
      return (
        <View key={i} style={[boxStyle, isRevealed && styles.revealedBox]}>
          <Text style={textStyle}>
            {isRevealed ? char : '_'}
          </Text>
        </View>
      );
    });
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.gameHeader}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
            
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {uniqueProgress} / {TOTAL_COUNTRIES}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(uniqueProgress / TOTAL_COUNTRIES) * 100}%` }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.scoreContainer}>
              <Ionicons name="star" size={16} color={COLORS.accentGold} />
              <Text style={styles.scoreText}>{sessionXP + progress.dailyXP}</Text>
            </View>
          </View>
          
          {/* Flag Image */}
          <View style={styles.flagContainer}>
            <MotiView
              key={currentIndex}
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <Image
                source={{ uri: currentCountry?.flagUrl }}
                style={styles.flagImage}
                resizeMode="contain"
              />
            </MotiView>
          </View>
          
          {/* Country Name with ALL Blanks (or revealed on hint) */}
          <Pressable style={styles.wordContainer} onPress={handleBlanksPress}>
            <Text style={styles.questionLabel}>What country is this?</Text>
            <View style={styles.lettersRow}>
              {createBlanksDisplay()}
            </View>
          </Pressable>
          
          {/* Hint Display - shows fact text when hint is used */}
          {showHint && currentCountry && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.hintContainer}
            >
              <Ionicons name="bulb" size={18} color={COLORS.accentGold} />
              <Text style={styles.hintText}>{currentCountry.fact}</Text>
            </MotiView>
          )}
          
          {/* Answer Input */}
          {!showFeedback && (
            <View style={styles.inputSection}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={userAnswer}
                onChangeText={setUserAnswer}
                placeholder="Type country name..."
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => userAnswer.trim() && checkAnswer()}
              />
              
              <View style={styles.actionButtons}>
                <Pressable 
                  style={[styles.hintButtonLarge, usedHint && styles.hintButtonUsed]} 
                  onPress={handleHint} 
                  disabled={usedHint}
                >
                  <Ionicons name="bulb-outline" size={20} color={usedHint ? COLORS.textMuted : COLORS.accentGold} />
                  <Text style={[styles.hintButtonText, usedHint && styles.hintButtonTextUsed]}>
                    {usedHint ? 'Hint Used' : 'Get Hint'}
                  </Text>
                </Pressable>
                
                <Pressable 
                  style={[styles.submitButton, !userAnswer.trim() && styles.submitButtonDisabled]} 
                  onPress={checkAnswer}
                  disabled={!userAnswer.trim()}
                >
                  <Text style={styles.submitButtonText}>Submit</Text>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.text} />
                </Pressable>
              </View>
              
              <Pressable style={styles.skipButton} onPress={handleSkip}>
                <Ionicons name="play-skip-forward" size={18} color={COLORS.textMuted} />
                <Text style={styles.skipButtonText}>Skip</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
        
        {/* Feedback Modal */}
        {showFeedback && (
          <MotiView
            from={{ opacity: 0, translateY: 100 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring' }}
            style={styles.feedbackContainer}
          >
            <LinearGradient
              colors={wasCorrect ? [COLORS.success, '#15803d'] : wasSkipped ? [COLORS.surface, COLORS.backgroundCard] : [COLORS.error, '#b91c1c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.feedbackCard}
            >
              <View style={styles.feedbackHeader}>
                <View style={styles.feedbackIconBg}>
                  <Text style={styles.feedbackEmoji}>
                    {wasCorrect ? '🎉' : wasSkipped ? '⏭️' : '🤔'}
                  </Text>
                </View>
                <View style={styles.feedbackTextContainer}>
                  <Text style={[styles.feedbackTitle, wasSkipped && styles.feedbackTitleSkipped]}>
                    {wasCorrect ? 'Correct!' : wasSkipped ? 'Skipped' : 'Not quite!'}
                  </Text>
                  <Text style={[styles.feedbackSubtitle, wasSkipped && styles.feedbackSubtitleSkipped]}>
                    {currentCountry?.name}
                  </Text>
                </View>
              </View>
              
              {!wasSkipped && (
                <View style={styles.xpPill}>
                  <Ionicons name="star" size={16} color={COLORS.accentGold} />
                  <Text style={styles.xpPillText}>
                    +{wasCorrect ? (usedHint ? FC_XP_HINT : FC_XP_CORRECT) : FC_XP_WRONG} XP
                  </Text>
                </View>
              )}
              
              <Pressable style={styles.feedbackButton} onPress={handleContinue}>
                <Text style={styles.feedbackButtonText}>
                  {currentIndex < shuffledCountries.length - 1 ? 'Next Flag' : 'Finish'}
                </Text>
                <Ionicons name="arrow-forward-circle" size={24} color={wasCorrect ? COLORS.success : wasSkipped ? COLORS.textMuted : COLORS.error} />
              </Pressable>
            </LinearGradient>
          </MotiView>
        )}

        {/* Coin Animation Overlay */}
        {showCoinAnimation && (
            <CoinRewardAnimation 
                coinsEarned={earnedCoins}
                onComplete={() => setShowCoinAnimation(false)}
            />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // Game header
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  progressContainer: {
    flex: 1,
    gap: SPACING.xs,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accentGold,
  },
  
  // Flag
  flagContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  flagImage: {
    width: 200,
    height: 130,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.md,
  },
  
  // Word
  wordContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  questionLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  lettersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  letterBox: {
    width: 24,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    margin: 2,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  // Medium size for 15-20 letter names
  letterBoxMedium: {
    width: 20,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    margin: 1,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  // Small size for 21+ letter names
  letterBoxSmall: {
    width: 16,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    margin: 1,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  revealedBox: {
    backgroundColor: COLORS.primary + '30',
    borderBottomColor: COLORS.success,
  },
  spaceBox: {
    width: 12,
    height: 32,
  },
  spaceBoxMedium: {
    width: 10,
    height: 28,
  },
  spaceBoxSmall: {
    width: 8,
    height: 24,
  },
  letterText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  letterTextMedium: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  letterTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // Hint
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  
  // Input section
  inputSection: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary + '50',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  hintButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accentGold + '50',
  },
  hintButtonUsed: {
    opacity: 0.5,
    borderColor: COLORS.textMuted,
  },
  hintButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accentGold,
  },
  hintButtonTextUsed: {
    color: COLORS.textMuted,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  skipButtonText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  
  // Completed
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  completedText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  statsBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statsLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  statsXP: {
    fontSize: 16,
    color: COLORS.accentGold,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  bestScoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.lg,
  },
  bestScoreText: {
    fontSize: 14,
    color: COLORS.accentGold,
    fontWeight: '600',
  },
  completedHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl,
  },
  backToGamesButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  backToGamesText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Result
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  resultEmoji: {
    fontSize: 72,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  resultStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  resultStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  resultStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  resultStatDivider: {
    width: 1,
    backgroundColor: COLORS.textMuted,
    marginHorizontal: SPACING.md,
  },
  resultButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl * 2,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
  },
  resultButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Feedback
  feedbackContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  feedbackCard: {
    borderRadius: BORDER_RADIUS.xl + 4,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  feedbackIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackEmoji: {
    fontSize: 28,
  },
  feedbackTextContainer: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  feedbackSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  feedbackTitleSkipped: {
    color: COLORS.text,
  },
  feedbackSubtitleSkipped: {
    color: COLORS.textSecondary,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  xpPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  feedbackButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
});
