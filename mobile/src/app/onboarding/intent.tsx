import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OptionCard } from '@/components/ui';
import { INTENTS } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';
import { spacing } from '@/theme';

const STEP = '2.2';

export default function IntentStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [intent, setIntent] = useState(profile.intent);

  return (
    <OnboardingScreen
      stepId={STEP}
      title="What are you hoping to find?"
      subtitle="This shows on your profile so people know what you’re here for."
      canContinue={Boolean(intent)}
      onContinue={() => intent && complete({ profile: { intent } })}
      busy={saving}>
      <View style={styles.options}>
        {INTENTS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.label}
            subtitle={option.description}
            selected={intent === option.value}
            onPress={() => setIntent(option.value)}
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
