import { verifyBeforeUpdateEmail } from 'firebase/auth';
import { useState } from 'react';

import { TextField } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';
import { auth } from '@/lib/firebase';

const STEP = '5.4';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function EmailStep() {
  const { record } = useSession();
  const { complete, saving } = useOnboardingStep(STEP);
  const [email, setEmail] = useState(record?.email ?? '');
  const trimmed = email.trim().toLowerCase();
  const valid = EMAIL.test(trimmed);

  const onContinue = async () => {
    if (!valid) return;
    if (auth.currentUser && auth.currentUser.email !== trimmed) {
      // The confirmation link is best-effort; the address is saved for recovery either way.
      verifyBeforeUpdateEmail(auth.currentUser, trimmed).catch(() => {});
    }
    complete({ user: { email: trimmed } });
  };

  return (
    <OnboardingScreen
      stepId={STEP}
      title="Add your email"
      subtitle="For account recovery, receipts and occasional updates. We’ll send a link to confirm it."
      canContinue={valid}
      onContinue={onContinue}
      busy={saving}>
      <TextField
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={onContinue}
        error={email.length > 4 && !valid && email.includes('@') ? 'Check your email address.' : undefined}
      />
    </OnboardingScreen>
  );
}
