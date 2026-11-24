import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { AppText } from './AppText';
import { Chip } from './Chip';

type ChipGroupProps = {
  label?: string;
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** 1 behaves like a radio group; larger values allow multiple selections up to the limit. */
  max?: number;
};

export function ChipGroup({ label, options, selected, onChange, max = 1 }: ChipGroupProps) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else if (max === 1) {
      onChange([option]);
    } else if (selected.length < max) {
      onChange([...selected, option]);
    }
  };

  return (
    <View style={styles.group}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View style={styles.wrap}>
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <Chip
              key={option}
              label={option}
              selected={isSelected}
              disabled={!isSelected && max > 1 && selected.length >= max}
              onPress={() => toggle(option)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
