// Tab layout with custom animated tab bar ✨ Kids-Friendly
import { Tabs } from 'expo-router';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue,
  withSequence,
} from 'react-native-reanimated';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useSoundEffects } from '../../utils/sound-manager';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Custom animated tab bar
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { playTap } = useSoundEffects();
  
  return (
    <View style={styles.tabBarContainer}>
      <LinearGradient
        colors={['transparent', COLORS.backgroundLight]}
        style={styles.gradient}
      />
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const iconName = 
            route.name === 'index' ? (isFocused ? 'home' : 'home-outline') :
            route.name === 'fun' ? (isFocused ? 'game-controller' : 'game-controller-outline') :
            route.name === 'artifacts' ? (isFocused ? 'sparkles' : 'sparkles-outline') :
            (isFocused ? 'person' : 'person-outline');

          const onPress = () => {
            playTap();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <TabBarButton
              key={route.key}
              isFocused={isFocused}
              iconName={iconName as keyof typeof Ionicons.glyphMap}
              label={options.title || route.name}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

interface TabBarButtonProps {
  isFocused: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function TabBarButton({ isFocused, iconName, label, onPress }: TabBarButtonProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, { damping: 15 });
  };

  const handlePressOut = () => {
    // Bounce effect: scale up past 1, then settle to 1
    scale.value = withSequence(
      withSpring(1.1, { damping: 12 }),
      withSpring(1, { damping: 15 })
    );
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tabButton, animatedStyle]}
    >
      <Animated.View 
        style={[
          styles.iconContainer, 
          isFocused && styles.iconContainerFocused
        ]}
      >
        <Ionicons
          name={iconName}
          size={24}
          color={isFocused ? COLORS.primary : COLORS.textMuted}
        />
      </Animated.View>
      <Text 
        style={[
          styles.tabLabel, 
          isFocused && styles.tabLabelFocused
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="fun"
        options={{
          title: 'Games',
        }}
      />
      <Tabs.Screen
        name="artifacts"
        options={{
          title: 'Collection',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
    paddingHorizontal: SPACING.md,
  },
  gradient: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 60,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
  },
  iconContainer: {
    width: 48,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    marginBottom: 2,
  },
  iconContainerFocused: {
    backgroundColor: COLORS.primaryLight + '50',
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  tabLabelFocused: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
