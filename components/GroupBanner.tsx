import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS } from "../constants/theme";

interface GroupBannerProps {
  name: string;
  description?: string;
  theme?: {
    emoji?: string;
    primaryColor: string;
    secondaryColor?: string;
  };
}

export const GroupBanner = memo(function GroupBanner({ name, description, theme }: GroupBannerProps) {
  // Default to primary color if no theme provided, or if theme is incomplete
  const primaryColor = theme?.primaryColor || COLORS.primary;
  const secondaryColor = theme?.secondaryColor || COLORS.primaryLight; 
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[primaryColor, secondaryColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}
      >
        <View style={styles.content}>
          <View style={styles.leftContainer}>
            {theme?.emoji && (
              <View style={styles.emojiContainer}>
                <Text style={styles.emoji}>{theme.emoji}</Text>
              </View>
            )}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{name}</Text>
              {description && (
                <Text style={styles.description} numberOfLines={2}>
                  {description}
                </Text>
              )}
            </View>
          </View>
        </View>
        
        {/* Decorative Circles/Shine - Moved to right for balance */}
        <View style={styles.decorationCircle1} />
        <View style={styles.decorationCircle2} />
        <View style={styles.sparkle1} />
        <View style={styles.sparkle2} />
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg, // Align with list content padding usually
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    width: '100%',
    zIndex: 20,
  },
  banner: {
    width: '100%',
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.md + 4,
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.md,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 80, // Ensure enough height for description
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    width: '100%',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1, // Allow text to take available space
    paddingRight: SPACING.xl, // Avoid overlapping with decorations too much
  },
  emojiContainer: {
    width: 44, // Slightly larger
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16, // Squircle
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  emoji: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    lineHeight: 18,
  },
  decorationCircle1: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    zIndex: 1,
  },
  decorationCircle2: {
    position: 'absolute',
    bottom: -40,
    right: 20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
    zIndex: 1,
  },
  sparkle1: {
    position: 'absolute',
    top: 15,
    right: 40,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
    zIndex: 2,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 25,
    right: 80,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    zIndex: 2,
  },
});
