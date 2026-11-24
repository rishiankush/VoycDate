import { useState } from 'react';

import { AppText, ChipGroup } from '@/components/ui';
import { INTEREST_CATEGORIES, MAX_INTERESTS } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';

const STEP = '3.2';

export default function InterestsStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [selected, setSelected] = useState<string[]>(profile.interests ?? []);

  // Each category renders its own group, so selections are merged across groups here.
  const updateCategory = (options: string[], next: string[]) => {
    const others = selected.filter((s) => !options.includes(s));
    setSelected([...others, ...next].slice(0, MAX_INTERESTS));
  };

  return (
    <OnboardingScreen
      stepId={STEP}
      title="What are you into?"
      subtitle={`Pick up to ${MAX_INTERESTS}. They help start conversations.`}
      canContinue={selected.length > 0}
      onContinue={() => complete({ profile: { interests: selected } })}
      busy={saving}>
      <AppText variant="label" color="plum">
        {selected.length} of {MAX_INTERESTS} selected
      </AppText>
      {INTEREST_CATEGORIES.map((category) => {
        const inCategory = selected.filter((s) => category.options.includes(s));
        return (
          <ChipGroup
            key={category.title}
            label={category.title}
            options={category.options}
            selected={inCategory}
            max={MAX_INTERESTS - (selected.length - inCategory.length)}
            onChange={(next) => updateCategory(category.options, next)}
          />
        );
      })}
    </OnboardingScreen>
  );
}
