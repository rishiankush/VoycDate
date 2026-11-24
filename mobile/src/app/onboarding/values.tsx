import { useState } from 'react';

import { ChipGroup } from '@/components/ui';
import { MAX_VALUES, VALUES } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';

const STEP = '3.3';

export default function ValuesStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [selected, setSelected] = useState<string[]>(profile.values ?? []);

  return (
    <OnboardingScreen
      stepId={STEP}
      title="What do you value in a person?"
      subtitle={`Choose up to ${MAX_VALUES}.`}
      canContinue={selected.length > 0}
      onContinue={() => complete({ profile: { values: selected } })}
      busy={saving}>
      <ChipGroup options={VALUES} selected={selected} onChange={setSelected} max={MAX_VALUES} />
    </OnboardingScreen>
  );
}
