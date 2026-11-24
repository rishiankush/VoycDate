import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  dashed?: boolean;
  disabled?: boolean;
};

export function Chip({ label, selected = false, onPress, dashed = false, disabled = false }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        dashed && styles.dashed,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {selected ? <Check size={14} strokeWidth={2.5} color={colors.plum} /> : null}
      <AppText variant="label" color="plum">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  unselected: {
    backgroundColor: colors.white,
    borderColor: colors.pinkBorder,
  },
  selected: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  dashed: {
    borderStyle: 'dashed',
    borderColor: colors.pinkBorderStrong,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
});
