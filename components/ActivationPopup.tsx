// Subscription Activation Popup Component
// Shows when a child account is not activated (non-blocking)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useUserStore } from '../stores/user-store';

const { width } = Dimensions.get('window');

interface ActivationPopupProps {
  onDismiss?: () => void;
}

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
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isSubscriptionActive, onboardingComplete]);
  
  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisible(false);
    onDismiss?.();
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
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
              <Ionicons name="alert-circle" size={32} color="#FFF" />
            </LinearGradient>
          </View>
          
          {/* Title */}
          <Text style={styles.title}>Account Not Activated</Text>
          
          {/* Message */}
          <Text style={styles.message}>
            Please ask your parent to activate this account through the parent dashboard 
            to unlock all features and track your progress.
          </Text>
          
          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>
              You can still explore the app, but some features may be limited.
            </Text>
          </View>
          
          {/* Dismiss Button */}
          <Pressable 
            style={styles.dismissButton}
            onPress={handleDismiss}
          >
            <Text style={styles.dismissButtonText}>I Understand</Text>
          </Pressable>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    width: width - SPACING.lg * 2,
    maxWidth: 340,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    width: '100%',
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primary,
    lineHeight: 18,
  },
  dismissButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
