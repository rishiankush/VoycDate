import { serverTimestamp } from 'firebase/firestore';
import { HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';
import { colors, radii, spacing } from '@/theme';

const STEP = '5.5';

const PROMISES: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <HeartHandshake size={22} color={colors.plum} />,
    title: 'Be kind',
    text: 'Treat everyone with respect, in every voice note and message.',
  },
  {
    icon: <Sparkles size={22} color={colors.plum} />,
    title: 'Be real',
    text: 'Use your own photos and your own voice. No fake profiles.',
  },
  {
    icon: <ShieldCheck size={22} color={colors.plum} />,
    title: 'Be safe',
    text: 'Keep personal details private until you’re ready, and report anything that feels wrong.',
  },
];

export default function PromiseStep() {
  const { complete, saving } = useOnboardingStep(STEP);

  return (
    <OnboardingScreen
      stepId={STEP}
      title="Our community promise"
      subtitle="VOYC works because everyone here agrees to a few simple things."
      canContinue
      onContinue={() => complete({ user: { communityPromiseAcceptedAt: serverTimestamp() } })}
      continueLabel="I agree"
      busy={saving}>
      {PROMISES.map((item) => (
        <View key={item.title} style={styles.item}>
          <View style={styles.icon}>{item.icon}</View>
          <View style={styles.text}>
            <AppText variant="bodyStrong" color="plum">
              {item.title}
            </AppText>
            <AppText variant="body">{item.text}</AppText>
          </View>
        </View>
      ))}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
