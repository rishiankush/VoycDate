import { Heart, Sparkles, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, fontFamily, shadows, spacing } from '@/theme';

import type { SwipeAction } from './types';

type SwipeActionsProps = {
  onAction: (action: SwipeAction) => void;
  disabled?: boolean;
  name?: string;
};

export function SwipeActions({ onAction, disabled = false, name = '' }: SwipeActionsProps) {
  return (
    <View style={styles.row}>
      <ActionButton
        label="Pass"
        a11y={`Pass on ${name}’s profile`}
        onPress={() => onAction('pass')}
        disabled={disabled}
        icon={<X size={26} color={colors.plum} strokeWidth={2.5} />}
      />
      <ActionButton
        label="Like"
        a11y={`Like ${name}’s profile`}
        onPress={() => onAction('like')}
        disabled={disabled}
        primary
        icon={<Heart size={30} color={colors.white} fill={colors.white} />}
      />
      <ActionButton
        label="Spark"
        a11y={`Send ${name} a Spark connect request`}
        onPress={() => onAction('spark')}
        disabled={disabled}
        accent
        icon={<Sparkles size={22} color={colors.plum} strokeWidth={2.2} />}
      />
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  a11y: string;
  icon: ReactNode;
  onPress: () => void;
  disabled: boolean;
  primary?: boolean;
  accent?: boolean;
};

function ActionButton({ label, a11y, icon, onPress, disabled, primary = false, accent = false }: ActionButtonProps) {
  return (
    <View style={styles.item}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.circle,
          primary ? styles.primary : accent ? styles.accent : styles.secondary,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}>
        {icon}
      </Pressable>
      <AppText
        variant="label"
        color={primary || accent ? 'plum' : 'textMuted'}
        style={(primary || accent) && styles.emphasisLabel}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  item: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  secondary: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.white,
  },
  accent: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.pinkTint,
    borderWidth: 1.5,
    borderColor: colors.pink,
  },
  primary: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.plum,
    ...shadows.button,
  },
  emphasisLabel: {
    fontFamily: fontFamily.sansBold,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
});
