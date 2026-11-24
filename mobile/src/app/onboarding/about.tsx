import { useState } from 'react';

import { TextField } from '@/components/ui';
import { BIO_MAX } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';

const STEP = '4.4';

export default function AboutStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [bio, setBio] = useState(profile.bio ?? '');
  const trimmed = bio.trim();

  return (
    <OnboardingScreen
      stepId={STEP}
      title="About me"
      subtitle="A few lines about you: what you love, what you’re looking for, a fun fact."
      canContinue={trimmed.length > 0}
      onContinue={() => complete({ profile: { bio: trimmed } })}
      busy={saving}>
      <TextField
        placeholder="Write something about yourself"
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={BIO_MAX}
        helperText={`${bio.length}/${BIO_MAX}`}
      />
    </OnboardingScreen>
  );
}
