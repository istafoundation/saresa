// Artifacts & Weapons Collection Screen - Updated with Pack Opening
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useUserStore } from '../../stores/user-store';
import { ARTIFACTS } from '../../data/artifacts';
import { WEAPONS, type Rarity, type Weapon } from '../../data/weapons';
import { getLevelForXP } from '../../constants/levels';
import WeaponPackOpening from '../../components/animations/WeaponPackOpening';

type TabType = 'artifacts' | 'weapons';

const RARITY_COLORS: Record<Rarity, string> = {
  common: COLORS.rarityCommon,
  rare: COLORS.rarityRare,
  epic: COLORS.rarityEpic,
};

export default function ArtifactsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('artifacts');
  const [showPackOpening, setShowPackOpening] = useState(false);
  const { unlockedArtifacts, unlockedWeapons, xp, unlockWeapon } = useUserStore();
  const currentLevel = getLevelForXP(xp).level;
  
  const handleTabChange = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleOpenPack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPackOpening(true);
  };

  const handlePackComplete = (weapon: Weapon) => {
    unlockWeapon(weapon.id);
    setShowPackOpening(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Collection</Text>
        <Text style={styles.subtitle}>Your discovered treasures</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <Pressable 
          style={[styles.tab, activeTab === 'artifacts' && styles.tabActive]}
          onPress={() => handleTabChange('artifacts')}
        >
          <Text style={[styles.tabText, activeTab === 'artifacts' && styles.tabTextActive]}>
            ✨ Artifacts
          </Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, activeTab === 'weapons' && styles.tabActive]}
          onPress={() => handleTabChange('weapons')}
        >
          <Text style={[styles.tabText, activeTab === 'weapons' && styles.tabTextActive]}>
            ⚔️ Weapons
          </Text>
        </Pressable>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'artifacts' ? (
          <ArtifactsGrid 
            unlockedArtifacts={unlockedArtifacts} 
            currentLevel={currentLevel}
          />
        ) : (
          <>
            {/* Open Pack Button */}
            <Pressable style={styles.openPackButton} onPress={handleOpenPack}>
              <LinearGradient
                colors={[COLORS.accentGold, COLORS.accent]}
                style={styles.openPackGradient}
              >
                <Text style={styles.openPackIcon}>🎴</Text>
                <View style={styles.openPackText}>
                  <Text style={styles.openPackTitle}>Open Weapon Pack</Text>
                  <Text style={styles.openPackDesc}>Discover a random weapon!</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={COLORS.background} />
              </LinearGradient>
            </Pressable>

            {/* Stats */}
            <View style={styles.collectionStats}>
              <View style={styles.statBadge}>
                <Text style={styles.statBadgeValue}>{unlockedWeapons.length}</Text>
                <Text style={styles.statBadgeLabel}>/ {WEAPONS.length}</Text>
              </View>
              <Text style={styles.statBadgeTitle}>Weapons Collected</Text>
            </View>

            <WeaponsGrid unlockedWeapons={unlockedWeapons} />
          </>
        )}
      </ScrollView>

      {/* Pack Opening Overlay */}
      {showPackOpening && (
        <WeaponPackOpening
          onComplete={handlePackComplete}
          onCancel={() => setShowPackOpening(false)}
        />
      )}
    </SafeAreaView>
  );
}

function ArtifactsGrid({ 
  unlockedArtifacts, 
  currentLevel 
}: { 
  unlockedArtifacts: string[];
  currentLevel: number;
}) {
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);

  return (
    <View style={styles.grid}>
      {ARTIFACTS.map((artifact, index) => {
        const isUnlocked = unlockedArtifacts.includes(artifact.id);
        const canUnlock = currentLevel >= artifact.unlockLevel;
        
        return (
          <MotiView
            key={artifact.id}
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: index * 50 }}
          >
            <Pressable
              style={[
                styles.artifactCard,
                isUnlocked && styles.artifactCardUnlocked,
              ]}
              onPress={() => isUnlocked && setSelectedArtifact(
                selectedArtifact === artifact.id ? null : artifact.id
              )}
            >
              {isUnlocked ? (
                <>
                  <Text style={styles.artifactIcon}>{artifact.icon}</Text>
                  <Text style={styles.artifactTitle}>{artifact.title}</Text>
                  <Text style={styles.artifactSubtitle}>{artifact.subtitle}</Text>
                </>
              ) : (
                <>
                  <View style={styles.lockedOverlay}>
                    <Ionicons 
                      name="lock-closed" 
                      size={32} 
                      color={canUnlock ? COLORS.accentGold : COLORS.textMuted} 
                    />
                  </View>
                  <Text style={styles.lockedText}>
                    {canUnlock ? 'Level up to unlock!' : `Level ${artifact.unlockLevel}`}
                  </Text>
                </>
              )}
            </Pressable>
            
            {/* Expanded Story */}
            {selectedArtifact === artifact.id && isUnlocked && (
              <MotiView
                from={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={styles.storyCard}
              >
                <Text style={styles.storyText}>{artifact.story}</Text>
                <View style={styles.funFactBox}>
                  <Ionicons name="bulb" size={16} color={COLORS.accentGold} />
                  <Text style={styles.funFactText}>{artifact.funFact}</Text>
                </View>
              </MotiView>
            )}
          </MotiView>
        );
      })}
    </View>
  );
}

function WeaponsGrid({ unlockedWeapons }: { unlockedWeapons: string[] }) {
  const [selectedWeapon, setSelectedWeapon] = useState<string | null>(null);

  // Group by rarity
  const epicWeapons = WEAPONS.filter(w => w.rarity === 'epic');
  const rareWeapons = WEAPONS.filter(w => w.rarity === 'rare');
  const commonWeapons = WEAPONS.filter(w => w.rarity === 'common');

  const renderWeaponSection = (title: string, weapons: typeof WEAPONS, rarity: Rarity) => (
    <View style={styles.weaponSection}>
      <View style={styles.weaponSectionHeader}>
        <Text style={[styles.weaponSectionTitle, { color: RARITY_COLORS[rarity] }]}>
          {title}
        </Text>
        <Text style={styles.weaponCount}>
          {weapons.filter(w => unlockedWeapons.includes(w.id)).length}/{weapons.length}
        </Text>
      </View>
      
      <View style={styles.weaponGrid}>
        {weapons.map((weapon, index) => {
          const isUnlocked = unlockedWeapons.includes(weapon.id);
          
          return (
            <MotiView
              key={weapon.id}
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: index * 30 }}
            >
              <Pressable
                style={[
                  styles.weaponCard,
                  { borderColor: isUnlocked ? RARITY_COLORS[rarity] : COLORS.surface }
                ]}
                onPress={() => isUnlocked && setSelectedWeapon(
                  selectedWeapon === weapon.id ? null : weapon.id
                )}
              >
                {isUnlocked ? (
                  <>
                    <Text style={styles.weaponIcon}>{weapon.icon}</Text>
                    <Text style={styles.weaponName}>{weapon.name}</Text>
                    <Text style={[styles.weaponRarity, { color: RARITY_COLORS[rarity] }]}>
                      {rarity.toUpperCase()}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="help" size={32} color={COLORS.textMuted} />
                    <Text style={styles.weaponUnknown}>???</Text>
                  </>
                )}
              </Pressable>
              
              {/* Expanded Backstory */}
              {selectedWeapon === weapon.id && isUnlocked && (
                <MotiView
                  from={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={[styles.storyCard, { borderColor: RARITY_COLORS[rarity] }]}
                >
                  <Text style={styles.weaponOwner}>Owner: {weapon.owner}</Text>
                  <Text style={styles.storyText}>{weapon.backstory}</Text>
                  <LinearGradient
                    colors={[RARITY_COLORS[rarity] + '30', 'transparent']}
                    style={styles.powerBox}
                  >
                    <Ionicons name="flash" size={16} color={RARITY_COLORS[rarity]} />
                    <Text style={styles.powerText}>{weapon.power}</Text>
                  </LinearGradient>
                </MotiView>
              )}
            </MotiView>
          );
        })}
      </View>
    </View>
  );

  return (
    <View>
      {renderWeaponSection('⚡ Epic', epicWeapons, 'epic')}
      {renderWeaponSection('💎 Rare', rareWeapons, 'rare')}
      {renderWeaponSection('🔹 Common', commonWeapons, 'common')}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 120,
  },
  openPackButton: {
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  openPackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  openPackIcon: {
    fontSize: 40,
  },
  openPackText: {
    flex: 1,
  },
  openPackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.background,
  },
  openPackDesc: {
    fontSize: 13,
    color: COLORS.background + 'CC',
    marginTop: 2,
  },
  collectionStats: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statBadgeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statBadgeLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  statBadgeTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  grid: {
    gap: SPACING.md,
  },
  artifactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  artifactCardUnlocked: {
    borderColor: COLORS.primary + '60',
  },
  artifactIcon: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  artifactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  artifactSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  lockedOverlay: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  lockedText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  storyCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  storyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  funFactBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.accentGold + '10',
    borderRadius: BORDER_RADIUS.md,
  },
  funFactText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.accentGold,
    fontStyle: 'italic',
  },
  weaponSection: {
    marginBottom: SPACING.xl,
  },
  weaponSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  weaponSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  weaponCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  weaponGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  weaponCard: {
    width: 100,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
  },
  weaponIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  weaponName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  weaponRarity: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  weaponUnknown: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  weaponOwner: {
    fontSize: 12,
    color: COLORS.primaryLight,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  powerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  powerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
});
