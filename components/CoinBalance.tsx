// CoinBalance Component - Displays coin count in header
// Shows current coin balance with animated updates
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useUserStore } from '../stores/user-store';

interface CoinBalanceProps {
  style?: any;
  size?: 'small' | 'medium';
}

export default function CoinBalance({ style, size = 'medium' }: CoinBalanceProps) {
  const coins = useUserStore((state) => state.coins) ?? 0;
  const prevCoinsRef = useRef(coins);
  const hasIncreased = coins > prevCoinsRef.current;
  
  useEffect(() => {
    prevCoinsRef.current = coins;
  }, [coins]);
  
  const isSmall = size === 'small';
  
  return (
    <MotiView
      animate={{
        scale: hasIncreased ? [1, 1.15, 1] : 1,
      }}
      transition={{
        type: 'timing',
        duration: 250,
      }}
      style={[styles.container, isSmall && styles.containerSmall, style]}
    >
      <View style={[styles.iconContainer, isSmall && styles.iconContainerSmall]}>
        <Text style={[styles.coinIcon, isSmall && styles.coinIconSmall]}>🪙</Text>
      </View>
      <MotiView
        key={coins} // Force re-render on change
        from={{ opacity: 0.5, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        <Text style={[styles.coinText, isSmall && styles.coinTextSmall]}>
          {coins.toLocaleString()}
        </Text>
      </MotiView>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentGold + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderColor: COLORS.accentGold + '40',
  },
  containerSmall: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSmall: {
    width: 18,
    height: 18,
  },
  coinIcon: {
    fontSize: 18,
  },
  coinIconSmall: {
    fontSize: 14,
  },
  coinText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.accentGold,
  },
  coinTextSmall: {
    fontSize: 13,
    fontWeight: '700',
  },
});
