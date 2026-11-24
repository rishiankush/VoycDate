import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, SelectTile, Slider } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { ageFromBirthDate } from '@/features/onboarding/birthDate';
import { AGE_MAX, AGE_MIN, SHOW_ME } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import type { ShowMe } from '@/features/onboarding/types';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';
import { spacing } from '@/theme';

const STEP = '2.1';

function defaultRange(birthDate: string | undefined): number[] {
  const age = birthDate ? ageFromBirthDate(birthDate) : 28;
  return [Math.max(AGE_MIN, age - 4), Math.min(AGE_MAX, age + 5)];
}

const ageLabel = (age: number) => (age >= AGE_MAX ? `${AGE_MAX}+` : String(age));

export default function MeetStep() {
  const { record } = useSession();
  const { preferences } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [showMe, setShowMe] = useState<ShowMe | undefined>(preferences.showMe);
  const [range, setRange] = useState<number[]>(() =>
    preferences.ageRange ? [preferences.ageRange.min, preferences.ageRange.max] : defaultRange(record?.birthDate),
  );

  return (
    <OnboardingScreen
      stepId={STEP}
      title="Who would you like to meet?"
      subtitle="This way we can know you more."
      canContinue={Boolean(showMe)}
      onContinue={() =>
        showMe && complete({ preferences: { showMe, ageRange: { min: range[0], max: range[1] } } })
      }
      busy={saving}>
      <View style={styles.section}>
        <AppText variant="label">Show me</AppText>
        <View style={styles.tiles}>
          {SHOW_ME.map((option) => (
            <SelectTile
              key={option.value}
              label={option.label}
              selected={showMe === option.value}
              onPress={() => setShowMe(option.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.rangeHeader}>
          <AppText variant="label">Age range</AppText>
          <AppText variant="label" color="plum">
            {ageLabel(range[0])} to {ageLabel(range[1])}
          </AppText>
        </View>
        <Slider
          min={AGE_MIN}
          max={AGE_MAX}
          value={range}
          onChange={setRange}
          accessibilityLabel="Age range"
          formatValue={ageLabel}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
