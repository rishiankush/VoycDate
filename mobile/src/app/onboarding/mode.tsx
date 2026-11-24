import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OptionCard } from '@/components/ui';
import { MODES } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import type { Mode } from '@/features/onboarding/types';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';
import { spacing } from '@/theme';

const STEP = '1.4';

export default function ModeStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [mode, setMode] = useState<Mode | undefined>(profile.mode);

  return (
    <OnboardingScreen
      stepId={STEP}
      title="What brings you to TUNG?"
      subtitle="You’ll only be shown to people in the same mode. You can switch later."
      canContinue={Boolean(mode)}
      onContinue={() => mode && complete({ profile: { mode } })}
      busy={saving}>
      <View style={styles.options}>
        {MODES.map((m) => (
          <OptionCard
            key={m.value}
            title={m.label}
            subtitle={m.description}
            selected={mode === m.value}
            onPress={() => setMode(m.value)}
          />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.sm,
  },
});
