import { useState } from 'react';

import { TextField } from '@/components/ui';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';

const STEP = '1.1';

export default function NameStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [name, setName] = useState(profile.firstName ?? '');
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const valid = trimmed.length >= 1 && trimmed.length <= 30 && /^[\p{L}\p{M}' .-]+$/u.test(trimmed);

  const onContinue = () => {
    if (valid) complete({ profile: { firstName: trimmed } });
  };

  return (
    <OnboardingScreen
      stepId={STEP}
      title="What’s your first name?"
      subtitle="This is how it’ll appear on your profile."
      canContinue={valid}
      onContinue={onContinue}
      busy={saving}>
      <TextField
        label="First name"
        placeholder="First name"
        value={name}
        onChangeText={setName}
        autoFocus
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={30}
        returnKeyType="done"
        onSubmitEditing={onContinue}
      />
    </OnboardingScreen>
  );
}
