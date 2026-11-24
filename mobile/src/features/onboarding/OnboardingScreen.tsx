import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, ScreenHeader, StepProgress } from '@/components/ui';
import { spacing } from '@/theme';

import { TOTAL_SECTIONS } from './steps';
import { useOnboardingStep } from './useOnboardingStep';

type OnboardingScreenProps = {
  stepId: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  canContinue: boolean;
  onContinue: () => void;
  continueLabel?: string;
  busy?: boolean;
  /** Overrides the default skip behaviour (move on without saving) for optional steps. */
  onSkip?: () => void;
  skipLabel?: string;
};

export function OnboardingScreen({
  stepId,
  title,
  subtitle,
  children,
  canContinue,
  onContinue,
  continueLabel = 'Continue',
  busy = false,
  onSkip,
  skipLabel = 'Skip',
}: OnboardingScreenProps) {
  const { step, saving, skip, back, progress } = useOnboardingStep(stepId);
  const working = saving || busy;

  return (
    <Screen
      header={<ScreenHeader onBack={back} rightLabel={`Step ${step.section} of ${TOTAL_SECTIONS}`} />}
      footer={
        <View style={styles.footer}>
          <Button title={continueLabel} onPress={onContinue} disabled={!canContinue} loading={working} />
          {step.optional ? (
            <Pressable
              accessibilityRole="button"
              onPress={onSkip ?? skip}
              disabled={working}
              hitSlop={8}
              style={styles.skip}>
              <AppText variant="label" color="plum">
                {skipLabel}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      }>
      <StepProgress step={step.section} total={TOTAL_SECTIONS} stepProgress={progress} />
      <View style={styles.copy}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? <AppText variant="bodyLarge">{subtitle}</AppText> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  body: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  footer: {
    gap: spacing.sm,
  },
  skip: {
    alignSelf: 'center',
    paddingVertical: spacing.xxs,
  },
});
