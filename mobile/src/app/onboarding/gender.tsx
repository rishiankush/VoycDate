import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText, ChipGroup, OptionCard } from '@/components/ui';
import { GENDERS, MORE_GENDERS } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';
import { colors, radii, spacing } from '@/theme';

const STEP = '1.3';
const ALL = [...GENDERS, ...MORE_GENDERS];

export default function GenderStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [identity, setIdentity] = useState(profile.gender?.identity);
  const [showOnProfile, setShowOnProfile] = useState(profile.gender?.showOnProfile ?? true);
  const [showMore, setShowMore] = useState(() => MORE_GENDERS.some((g) => g.value === profile.gender?.identity));

  const selected = ALL.find((g) => g.value === identity);

  const onContinue = () => {
    if (!selected) return;
    complete({ profile: { gender: { identity: selected.value, group: selected.group, showOnProfile } } });
  };

  return (
    <OnboardingScreen
      stepId={STEP}
      title="What’s your gender?"
      subtitle="You can always update this later."
      canContinue={Boolean(selected)}
      onContinue={onContinue}
      busy={saving}>
      <View style={styles.options}>
        {GENDERS.map((g) => (
          <OptionCard
            key={g.value}
            title={g.label}
            selected={identity === g.value}
            onPress={() => setIdentity(g.value)}
          />
        ))}
      </View>

      {showMore ? (
        <ChipGroup
          label="More options"
          options={MORE_GENDERS.map((g) => g.label)}
          selected={MORE_GENDERS.filter((g) => g.value === identity).map((g) => g.label)}
          onChange={(labels) => setIdentity(MORE_GENDERS.find((g) => g.label === labels[0])?.value)}
        />
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setShowMore(true)} hitSlop={8}>
          <AppText variant="label" color="plum" style={styles.link}>
            More options
          </AppText>
        </Pressable>
      )}

      <View style={styles.toggleRow}>
        <AppText variant="bodyStrong" style={styles.toggleLabel}>
          Show my gender on my profile
        </AppText>
        <Switch
          value={showOnProfile}
          onValueChange={setShowOnProfile}
          trackColor={{ true: colors.plum, false: colors.pinkBorder }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.pinkBorder}
          accessibilityLabel="Show my gender on my profile"
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.sm,
  },
  link: {
    textDecorationLine: 'underline',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.pinkTint,
  },
  toggleLabel: {
    flex: 1,
  },
});
