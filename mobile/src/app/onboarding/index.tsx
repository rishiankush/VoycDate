import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/SessionProvider';
import { FIRST_ONBOARDING_STEP } from '@/features/auth/userRecord';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { STEPS, stepById } from '@/features/onboarding/steps';

const VIDEO_STEP = '4.2';
const videoIndex = STEPS.findIndex((s) => s.id === VIDEO_STEP);

export default function OnboardingIndex() {
  const { record } = useSession();
  const { profile } = useOnboarding();
  const stepId = record?.onboarding.currentStep ?? FIRST_ONBOARDING_STEP;
  const currentIndex = STEPS.findIndex((s) => s.id === stepId);
  const reachedVideo =
    record?.onboarding.status === 'completed' ||
    (record?.onboarding.completedSteps ?? []).includes(VIDEO_STEP) ||
    currentIndex >= videoIndex;

  // Once someone reaches the video step, they stay here until a real face is approved.
  if (reachedVideo && profile.videoIntro?.status !== 'approved') {
    return <Redirect href="/onboarding/video" />;
  }

  return <Redirect href={stepById(stepId).route} />;
}
