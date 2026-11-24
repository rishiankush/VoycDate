import { useState } from 'react';

import { BELIEFS } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { hasAnyAnswer, SingleChoiceGroups } from '@/features/onboarding/SingleChoiceGroups';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';

const STEP = '3.6';

export default function BeliefsStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [beliefs, setBeliefs] = useState(profile.beliefs ?? {});

  return (
    <OnboardingScreen
      stepId={STEP}
      title="Beliefs"
      subtitle="Only if it matters to you. You can choose “Prefer not to say”."
      canContinue={hasAnyAnswer(beliefs)}
      onContinue={() => complete({ profile: { beliefs } })}
      busy={saving}>
      <SingleChoiceGroups groups={BELIEFS} value={beliefs} onChange={setBeliefs} />
    </OnboardingScreen>
  );
}
