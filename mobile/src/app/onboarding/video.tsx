import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';
import { VideoIntroCapture } from '@/features/video/VideoIntroCapture';

const STEP = '4.2';

export default function VideoStep() {
  const { uid, profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const status = profile.videoIntro?.status;

  return (
    <OnboardingScreen
      stepId={STEP}
      title="Record your video intro"
      subtitle="Up to 10 seconds of you — a real face on camera. This autoplays first in the Discover feed."
      // Face check must pass before leaving this step; Discover never records video.
      canContinue={status === 'approved'}
      continueLabel={status === 'pending' ? 'Checking your face…' : 'Continue'}
      onContinue={() => complete()}
      busy={saving || status === 'pending'}>
      <VideoIntroCapture uid={uid} videoIntro={profile.videoIntro} />
    </OnboardingScreen>
  );
}
