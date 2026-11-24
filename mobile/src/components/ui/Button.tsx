import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, layout, radii, shadows, spacing, type ColorName } from '@/theme';

import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outlineOnDark';

const variantStyles: Record<
  ButtonVariant,
  { container: ViewStyle; text: ColorName; spinner: string; shadow?: ViewStyle }
> = {
  primary: {
    container: { backgroundColor: colors.plum },
    text: 'white',
    spinner: colors.white,
    shadow: shadows.button,
  },
  secondary: {
    container: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.pinkBorder },
    text: 'plum',
    spinner: colors.plum,
  },
  accent: {
    container: { backgroundColor: colors.pink },
    text: 'plum',
    spinner: colors.plum,
    shadow: shadows.button,
  },
  outlineOnDark: {
    container: { borderWidth: 1, borderColor: colors.onDarkBorder },
    text: 'onDark',
    spinner: colors.white,
  },
};

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  accessibilityHint?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  accessibilityHint,
}: ButtonProps) {
  const v = variantStyles[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        v.container,
        !inactive && v.shadow,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <View style={styles.content}>
          {icon}
          <AppText variant="button" color={v.text}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: layout.buttonHeight,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
