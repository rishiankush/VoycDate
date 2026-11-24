import { useState } from 'react';
import { Alert } from 'react-native';

import { TextField } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { ageFromBirthDate, formatBirthDateInput, parseBirthDateInput, toDisplayBirthDate } from '@/features/onboarding/birthDate';
import { AGE_MIN } from '@/features/onboarding/options';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';

const STEP = '1.2';

export default function BirthdayStep() {
  const { record } = useSession();
  const saved = record?.birthDate;
  const { complete, saving } = useOnboardingStep(STEP);
  const [input, setInput] = useState(saved ? toDisplayBirthDate(saved) : '');

  const isoDate = parseBirthDateInput(input);
  const age = isoDate ? ageFromBirthDate(isoDate) : null;
  const tooYoung = age !== null && age < AGE_MIN;
  const error =
    input.length === 10 && !isoDate
      ? 'Enter a real date as MM/DD/YYYY.'
      : tooYoung
        ? `You must be ${AGE_MIN} or older to use VOYC.`
        : undefined;
  const valid = Boolean(isoDate) && !tooYoung && age !== null && age <= 100;

  const onContinue = () => {
    if (!valid || !isoDate) return;
    if (saved === isoDate) {
      complete();
      return;
    }
    Alert.alert(`You’re ${age}`, 'Is that right? You can’t change your birthday later.', [
      { text: 'Edit', style: 'cancel' },
      { text: 'Confirm', onPress: () => complete({ user: { birthDate: isoDate } }) },
    ]);
  };

  return (
    <OnboardingScreen
      stepId={STEP}
      title="When’s your birthday?"
      subtitle="We only show your age, not your birthday."
      canContinue={valid}
      onContinue={onContinue}
      busy={saving}>
      <TextField
        label="Birthday"
        placeholder="MM/DD/YYYY"
        value={input}
        onChangeText={(text) => setInput(formatBirthDateInput(text))}
        keyboardType="number-pad"
        autoFocus={!saved}
        editable={!saved}
        maxLength={10}
        error={error}
        helperText={saved ? 'Your birthday is saved and can’t be changed.' : undefined}
      />
    </OnboardingScreen>
  );
}
