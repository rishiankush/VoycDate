import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { MAX_PHOTOS, MIN_PHOTOS } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PhotoGrid } from '@/features/onboarding/PhotoGrid';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';
import { spacing } from '@/theme';

const STEP = '4.1';

const TIPS = [
  'Use clear, recent photos where your face is easy to see.',
  'Show what you love: a hobby, a trip, your pet.',
  'Tap a photo to make it your main photo or remove it.',
];

export default function PhotosStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const count = profile.photos?.length ?? 0;

  return (
    <OnboardingScreen
      stepId={STEP}
      title="Show us the real you."
      subtitle={`Add at least ${MIN_PHOTOS} photos, up to ${MAX_PHOTOS}. Your first photo is your main one.`}
      canContinue={count >= MIN_PHOTOS}
      onContinue={() => complete()}
      busy={saving}>
      <PhotoGrid />
      <View style={styles.tips}>
        {TIPS.map((tip) => (
          <AppText key={tip} variant="caption">
            • {tip}
          </AppText>
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  tips: {
    gap: spacing.xxs,
  },
});
