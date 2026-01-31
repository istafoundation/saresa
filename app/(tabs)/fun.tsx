// Games Hub - Redesigned with Candy/Pink Layout
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useSafeNavigation } from '../../utils/useSafeNavigation';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useUserStore } from '../../stores/user-store';
import { useTapFeedback } from '../../utils/useTapFeedback';
import Mascot from '../../components/Mascot';
import { CandyBackground } from '../../components/animations/SparkleBackground';

const { width } = Dimensions.get('window');
const GAP = SPACING.md;
const CARD_WIDTH = (width - SPACING.lg * 2 - GAP) / 2;

// --- Components ---

const SectionHeader = ({ title, icon }: { title: string, icon: string }) => (
  <View style={styles.sectionHeader}>
      <View style={styles.sectionIconContainer}>
        <Text style={styles.sectionIcon}>{icon}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

interface GameCardProps {
  title: string;
  emoji: string;
  color: string;
  route: string;
  enabled?: boolean;
  subtitle?: string;
  isWide?: boolean;
  badgeText?: string;
  lockedMessage?: string;
  onPress: (route: string) => void;
  isLoading?: boolean;
}

const GameCard = ({
  title,
  emoji,
  color,
  route,
  enabled = true,
  subtitle,
  isWide = false,
  badgeText,
  lockedMessage = "Locked",
  onPress,
  isLoading
}: GameCardProps) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.gameCard,
        { 
          backgroundColor: color,
          width: isWide ? '100%' : CARD_WIDTH,
          // Fixed height for consistency, or auto for wide
          height: isWide ? 100 : 180, 
          transform: [{ scale: pressed && enabled ? 0.96 : 1 }]
        },
        !enabled && styles.disabledCard
      ]}
      onPress={() => enabled && onPress(route)}
      disabled={!enabled}
    >
        {/* Loading Overlay */}
        {isLoading && (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#FFF" />
            </View>
        )}

        {/* XP/Status Badge */}
        {badgeText && enabled && (
            <View style={styles.badgeContainer}>
                <View style={styles.badgeIcon}>
                   <Ionicons name="star" size={10} color="#FFF" />
                </View>
                <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
        )}

        {/* Content */}
        <View style={[styles.cardContent, isWide && styles.cardContentWide]}>
            <View style={[styles.emojiContainer, isWide && { marginBottom: 0, marginRight: 12 }]}>
                <Text style={styles.gameEmoji}>{emoji}</Text>
            </View>
            
            <View style={[styles.textContainer, isWide && { alignItems: 'flex-start' }]}>
                <Text style={styles.gameTitle} numberOfLines={2}>{title}</Text>
                {subtitle && (
                    <Text style={[styles.gameSubtitle, isWide && { textAlign: 'left' }]} numberOfLines={2}>
                        {subtitle}
                    </Text>
                )}
            </View>
        </View>

        {/* Lock Overlay */}
        {!enabled && (
             <View style={styles.lockOverlay}>
                <View style={[styles.lockBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <Ionicons name="lock-closed" size={16} color="#FFF" />
                    <Text style={styles.lockText}>{lockedMessage}</Text>
                </View>
             </View>
        )}
    </Pressable>
  );
};


export default function FunScreen() {
  const { safePush: routerPush } = useSafeNavigation();
  const [loadingGame, setLoadingGame] = useState<string | null>(null);
  const { mascot, gameLimits } = useUserStore();
  const { triggerTap } = useTapFeedback();
  
  // Checking limits & Locks
  const canPlayCompetitive = gameLimits.canPlayGKCompetitive;
  const canPlayWordle = gameLimits.canPlayWordle;
  const canPlayWordFinderEasy = gameLimits.canPlayWordFinderEasy;
  const canPlayWordFinderHard = gameLimits.canPlayWordFinderHard;
  // Explorer limits
  const explorerRemaining = gameLimits.explorerRemaining;
  
  const handleGamePress = (route: string) => {
    if (loadingGame) return;
    setLoadingGame(route);
    triggerTap('medium');
    
    // Artificial delay for better perceived performance perception
    setTimeout(() => {
      routerPush(route as any);
      setTimeout(() => setLoadingGame(null), 500);
    }, 50);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CandyBackground />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        
        {/* Header Section */}
        <MotiView 
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
            style={styles.headerCard}
        >
          <LinearGradient
            colors={[COLORS.primaryLight, COLORS.candyPink]} 
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Let's Play</Text>
              <Text style={styles.headerTitle2}>Together!</Text>
              <Text style={styles.headerSubtitle}>Earn XP & Have Fun</Text>
            </View>
            <View style={styles.mascotContainer}>
                <Mascot mascotType={mascot} size="medium" />
                <View style={styles.mascotGlow} />
            </View>
          </LinearGradient>
        </MotiView>

        {/* --- English Insane Section --- */}
        <MotiView 
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            delay={100}
        >
            <SectionHeader title="English Knowledge" icon="🧠" />
            <View style={styles.gridContainer}>
                <GameCard
                    title="Practice"
                    emoji="🦄"
                    color="#FFE4E1" // Misty Rose
                    route='/games/gk/practice'
                    subtitle="Unlimited Training"
                    badgeText="Train"
                    onPress={handleGamePress}
                    isLoading={loadingGame === '/games/gk/practice'}
                />
                <GameCard
                    title="Competitive"
                    emoji="🏆"
                    color="#FFFACD" // Lemon Chiffon
                    route='/games/gk/competitive'
                    enabled={canPlayCompetitive}
                    subtitle={canPlayCompetitive ? "Daily Rank Push" : "Come back tomorrow"}
                    badgeText="Win XP"
                    lockedMessage="Played"
                    onPress={handleGamePress}
                    isLoading={loadingGame === '/games/gk/competitive'}
                />
            </View>
        </MotiView>

        {/* --- Word Games Section --- */}
        <MotiView 
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            delay={200}
            style={{ marginTop: SPACING.lg }}
        >
             <SectionHeader title="Word Games" icon="📝" />
             <View style={styles.gridContainer}>
                <GameCard
                    title="Wordle"
                    emoji="🔡"
                    color="#E0F7FA" // Light Cyan
                    route='/games/wordle'
                    enabled={canPlayWordle}
                    subtitle="Daily Guess"
                    badgeText="Daily"
                    lockedMessage="Solved"
                    onPress={handleGamePress}
                    isLoading={loadingGame === '/games/wordle'}
                />
                <GameCard
                    title="Grammar"
                    emoji="🔍"
                    color="#F3E5F5" // Purple Light
                    route='/games/grammar-detective'
                    subtitle="Grammar Detective"
                    badgeText="Rush"
                    onPress={handleGamePress}
                    isLoading={loadingGame === '/games/grammar-detective'}
                />
            </View>
        </MotiView>

        {/* --- Word Finder Section --- */}
        <MotiView 
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            delay={300}
            style={{ marginTop: SPACING.lg }}
        >
            <SectionHeader title="Word Finder" icon="🔎" />
            <View style={styles.gridContainer}>
                <GameCard
                    title="Easy Mode"
                    emoji="🧩"
                    color="#E8F5E9" // Green Light
                    route='/games/word-finder?mode=easy'
                    enabled={canPlayWordFinderEasy}
                    subtitle="Relaxed Search"
                    badgeText="50 XP"
                    lockedMessage="Done"
                    onPress={handleGamePress}
                    isLoading={loadingGame === '/games/word-finder?mode=easy'}
                />
                 <GameCard
                    title="Hard Mode"
                    emoji="⚡"
                    color="#FFF3E0" // Orange Light
                    route='/games/word-finder?mode=hard'
                    enabled={canPlayWordFinderHard}
                    subtitle="Timed Challenge"
                    badgeText="200 XP"
                    lockedMessage="Done"
                    onPress={handleGamePress}
                    isLoading={loadingGame === '/games/word-finder?mode=hard'}
                />
            </View>
        </MotiView>

        {/* --- Explorer's Heaven Section --- */}
        <MotiView 
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            delay={400}
            style={{ marginTop: SPACING.lg }}
        >
            <SectionHeader title="Explorer's World" icon="🌍" />
            
            {/* Full width card for India Explorer */}
            <View style={{ marginBottom: SPACING.md }}>
                 <GameCard
                    title="India Explorer"
                    emoji="🇮🇳"
                    color="#E1BEE7" // Purple
                    route='/games/explorer/india'
                    subtitle={`${explorerRemaining} remaining • Explore States`}
                    badgeText="Explore"
                    isWide={true}
                    onPress={handleGamePress}
                    isLoading={loadingGame === '/games/explorer/india'}
                />
            </View>

            <View style={styles.gridContainer}>
                 <GameCard
                    title="Let'em Cook"
                    emoji="🌶️"
                    color="#FFCCBC" // Deep Orange extraction
                    route='/games/let-em-cook'
                    enabled={gameLimits.canPlayLetEmCook && !gameLimits.lecCompleted}
                    subtitle="Spice Matching"
                    badgeText="300 XP"
                    lockedMessage="Cooked"
                    onPress={handleGamePress}
                    isLoading={loadingGame === '/games/let-em-cook'}
                />
                 <GameCard
                    title="Flag Champs"
                    emoji="🚩"
                    color="#B2DFDB" // Teal Light
                    route='/games/flag-champs'
                    enabled={gameLimits.canPlayFlagChamps && !gameLimits.fcCompleted}
                    subtitle="Flags Quiz"
                    badgeText="975 XP"
                    lockedMessage="Won"
                    onPress={handleGamePress}
                    isLoading={loadingGame === '/games/flag-champs'}
                />
            </View>
        </MotiView>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, 
  },
  content: {
    padding: SPACING.lg,
    zIndex: 10,
  },
  
  // Header Components
  headerCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    height: 140,
    ...SHADOWS.md,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    lineHeight: 28,
  },
  headerTitle2: {
      fontSize: 28,
      fontWeight: '900',
      color: '#FFF',
      lineHeight: 32,
      marginBottom: 6,
      textShadowColor: 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mascotContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mascotGlow: {
      position: 'absolute',
      width: 70,
      height: 70,
      backgroundColor: '#FFF',
      borderRadius: 40,
      opacity: 0.3,
      zIndex: -1,
  },

  // Section Headers
  sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
      gap: 10,
      paddingHorizontal: 4,
      marginTop: 8,
  },
  sectionIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 12,
      backgroundColor: '#FFF',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
  },
  sectionIcon: {
      fontSize: 18,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: COLORS.text,
      letterSpacing: -0.5,
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    justifyContent: 'space-between',
  },

  // Game Cards
  gameCard: {
    borderRadius: 24,
    padding: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 2,
    borderColor: '#FFF',
    overflow: 'hidden', // Clean clip for children
    justifyContent: 'center',
  },
  disabledCard: {
    opacity: 0.9, 
    backgroundColor: '#F0F0F0', 
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 8,
  },
  cardContentWide: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center', // Align vertically center
      gap: 16,
      paddingHorizontal: 8,
  },
  
  // Card Badge
  badgeContainer: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: COLORS.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      zIndex: 5,
      borderWidth: 1.5,
      borderColor: '#FFF',
  },
  badgeIcon: {
      marginTop: -1,
  },
  badgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFF',
      textTransform: 'uppercase',
  },

  // Card Content Internals
  emojiContainer: {
      marginBottom: 6,
  },
  gameEmoji: {
    fontSize: 42,
  },
  textContainer: {
      alignItems: 'center',
      width: '100%',
  },
  gameTitle: {
    fontSize: 18, // Bigger
    fontWeight: '800',
    color: '#333', // Darker text for contrast
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
  gameSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Overlays
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  lockOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(255,255,255,0.4)', // Frost effect
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
  },
  lockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.5)',
  },
  lockText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 14,
      textTransform: 'uppercase',
  }
});
