import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, shadows } from '@/theme';

type IconButtonProps = {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress?: () => void;
  onDark?: boolean;
  size?: number;
};

export function IconButton({ icon, accessibilityLabel, onPress, onDark = false, size = 44 }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        onDark ? styles.onDark : styles.onLight,
        pressed && styles.pressed,
      ]}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onLight: {
    backgroundColor: colors.white,
    ...shadows.card,
  },
  onDark: {
    backgroundColor: colors.onDarkTint,
    borderWidth: 1,
    borderColor: colors.onDarkBorder,
  },
  pressed: {
    opacity: 0.8,
  },
});
