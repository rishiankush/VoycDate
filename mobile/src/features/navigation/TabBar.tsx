import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Compass, Heart, MessagesSquare, User } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, fontFamily, radii, shadows, spacing } from '@/theme';

const ICONS: Record<string, ComponentType<{ size: number; color: string; strokeWidth?: number }>> = {
  discover: Compass,
  likes: Heart,
  connections: MessagesSquare,
  profile: User,
};

export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const Icon = ICONS[route.name] ?? Compass;
          const badge = options.tabBarBadge;

          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? `${label}, ${badge} new` : label}
              onPress={onPress}
              style={[styles.item, focused && styles.itemActive]}>
              <View>
                <Icon size={22} color={colors.plum} strokeWidth={focused ? 2.4 : 1.8} />
                {badge ? (
                  <View style={styles.badge}>
                    <AppText style={styles.badgeText}>{String(badge)}</AppText>
                  </View>
                ) : null}
              </View>
              <AppText variant="caption" color="plum" style={focused && styles.labelActive}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radii.lg + 4,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
  },
  itemActive: {
    backgroundColor: colors.pinkTint,
  },
  labelActive: {
    fontFamily: fontFamily.sansBold,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    color: colors.white,
  },
});
