import { useState } from 'react';

import { FAMILY } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { hasAnyAnswer, SingleChoiceGroups } from '@/features/onboarding/SingleChoiceGroups';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';

const STEP = '3.5';

export default function FamilyStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [family, setFamily] = useState(profile.family ?? {});

  return (
    <OnboardingScreen
      stepId={STEP}
      title="Family plans"
      subtitle="It helps to be on the same page early."
      canContinue={hasAnyAnswer(family)}
      onContinue={() => complete({ profile: { family } })}
      busy={saving}>
      <SingleChoiceGroups groups={FAMILY} value={family} onChange={setFamily} />
    </OnboardingScreen>
  );
}
