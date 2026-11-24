import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useOnboarding, type StepData } from './OnboardingProvider';
import { previousStep, sectionProgress, stepById } from './steps';

export function useOnboardingStep(stepId: string) {
  const { profile, completeStep } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const step = stepById(stepId);
  const previous = previousStep(stepId, profile.mode);

  const complete = async (data?: StepData) => {
    if (saving) return;
    setSaving(true);
    try {
      const next = await completeStep(stepId, data);
      if (next) router.push(next.route);
    } catch {
      Alert.alert('Couldn’t save', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const back = previous
    ? () => {
        if (router.canGoBack()) router.back();
        else router.replace(previous.route);
      }
    : undefined;

  return {
    step,
    saving,
    complete,
    skip: () => complete(),
    back,
    progress: sectionProgress(stepId, profile.mode),
  };
}
