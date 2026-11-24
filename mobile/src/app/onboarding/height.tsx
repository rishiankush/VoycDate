import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Slider } from '@/components/ui';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { formatHeight } from '@/features/onboarding/units';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';
import { spacing } from '@/theme';

const STEP = '3.1';
const MIN_CM = 140;
const MAX_CM = 215;

export default function HeightStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [height, setHeight] = useState(profile.heightCm ?? 170);

  return (
    <OnboardingScreen
      stepId={STEP}
      title="How tall are you?"
      subtitle="Shown on your profile. You can hide it later."
      canContinue
      onContinue={() => complete({ profile: { heightCm: height } })}
      busy={saving}>
      <View style={styles.display}>
        <AppText variant="display" align="center">
          {formatHeight(height)}
        </AppText>
      </View>
      <Slider
        min={MIN_CM}
        max={MAX_CM}
        value={[height]}
        onChange={([cm]) => setHeight(cm)}
        accessibilityLabel="Height"
        formatValue={(cm) => formatHeight(cm)}
      />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  display: {
    paddingVertical: spacing.xl,
  },
});
