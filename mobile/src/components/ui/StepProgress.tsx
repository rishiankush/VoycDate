import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

type StepProgressProps = {
  /** 1-based index of the current section. */
  step: number;
  total?: number;
  /** How far through the current section the user is, from 0 to 1. */
  stepProgress?: number;
};

export function StepProgress({ step, total = 5, stepProgress = 1 }: StepProgressProps) {
  const clamped = Math.min(Math.max(stepProgress, 0), 1);

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: step - 1 + clamped }}>
      {Array.from({ length: total }, (_, i) => {
        const index = i + 1;
        const fill = index < step ? 1 : index === step ? clamped : 0;
        return (
          <View key={index} style={styles.track}>
            <View style={[styles.fill, { width: `${fill * 100}%` }]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.pinkBorder,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.plum,
  },
});
