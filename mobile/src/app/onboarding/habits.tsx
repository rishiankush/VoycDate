import { useState } from 'react';

import { HABITS } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { hasAnyAnswer, SingleChoiceGroups } from '@/features/onboarding/SingleChoiceGroups';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';

const STEP = '3.4';

export default function HabitsStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [habits, setHabits] = useState(profile.habits ?? {});

  return (
    <OnboardingScreen
      stepId={STEP}
      title="Your habits"
      subtitle="Share as much or as little as you like."
      canContinue={hasAnyAnswer(habits)}
      onContinue={() => complete({ profile: { habits } })}
      busy={saving}>
      <SingleChoiceGroups groups={HABITS} value={habits} onChange={setHabits} />
    </OnboardingScreen>
  );
}
