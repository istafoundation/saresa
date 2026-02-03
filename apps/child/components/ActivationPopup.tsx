// Subscription Activation Popup Component
// Shows when a child account is not activated (BLOCKING - user cannot dismiss)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, Linking, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useUserStore } from '../stores/user-store';

const { width, height } = Dimensions.get('window');

interface ActivationPopupProps {
  onDismiss?: () => void;
}

const ACTIVATION_URL = 'https://app.istafoundation.in';

export function ActivationPopup({ onDismiss }: ActivationPopupProps) {
  const [visible, setVisible] = useState(false);
  const { isSubscriptionActive, onboardingComplete } = useUserStore();
  
  useEffect(() => {
    // Show popup if user is logged in but not activated
    if (onboardingComplete && !isSubscriptionActive) {
      // Small delay to let the app load first
      const timer = setTimeout(() => {
        setVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isSubscriptionActive, onboardingComplete]);
  
  const handleOpenLink = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Linking.openURL(ACTIVATION_URL);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      {/* Blur Background */}
      <BlurView 
        intensity={80} 
        tint="light"
        style={styles.blurContainer}
      >
        <View style={styles.overlay}>
          <MotiView
            from={{ opacity: 0, scale: 0.9, translateY: 20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.container}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.iconGradient}
              >
                <Ionicons name="lock-closed" size={36} color="#FFF" />
              </LinearGradient>
            </View>
            
            {/* Title */}
            <Text style={styles.title}>Account Not Activated</Text>
            
            {/* Message */}
            <Text style={styles.message}>
              This Account has not been activated by the Parent.
            </Text>
            
            {/* Action Box */}
            <View style={styles.actionBox}>
              <Ionicons name="globe-outline" size={24} color={COLORS.primary} />
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionLabel}>
                  Please ask your parent to visit:
                </Text>
                <Pressable onPress={handleOpenLink}>
                  <Text style={styles.linkText}>app.istafoundation.in</Text>
                </Pressable>
                <Text style={styles.actionSubtext}>
                  and activate your account.
                </Text>
              </View>
            </View>
            
            {/* Help Note */}
            <View style={styles.helpNote}>
              <Ionicons name="information-circle" size={16} color={COLORS.textMuted} />
              <Text style={styles.helpNoteText}>
                Contact your parent or guardian for help with activation.
              </Text>
            </View>
          </MotiView>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    width: width - SPACING.lg * 2,
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    width: '100%',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    textDecorationLine: 'underline',
    marginBottom: SPACING.xs,
  },
  actionSubtext: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  helpNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  helpNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
});
