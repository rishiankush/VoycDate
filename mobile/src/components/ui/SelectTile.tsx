import { Pressable, StyleSheet } from 'react-native';

import { colors, fontFamily, radii, spacing } from '@/theme';

import { AppText } from './AppText';

type SelectTileProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function SelectTile({ label, selected = false, onPress }: SelectTileProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, selected && styles.selected, pressed && styles.pressed]}>
      <AppText variant="button" color={selected ? 'plum' : 'text'} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  selected: {
    backgroundColor: colors.pinkSoft,
    borderColor: colors.pinkBorderStrong,
  },
  label: {
    fontFamily: fontFamily.sansMedium,
  },
  pressed: {
    opacity: 0.9,
  },
});
