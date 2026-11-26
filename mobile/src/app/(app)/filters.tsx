import { router } from 'expo-router';
import { Check, Lock, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, ChipGroup, IconButton, Screen, SelectTile, Slider } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { useDiscovery } from '@/features/discover/DiscoveryProvider';
import {
  AGE_MAX,
  AGE_MIN,
  BELIEFS,
  DISTANCE_DEFAULT_KM,
  DISTANCE_MAX_KM,
  DISTANCE_MIN_KM,
  FAMILY,
  HABITS,
  HEIGHT_MAX_CM,
  HEIGHT_MIN_CM,
  INTENTS,
  SHOW_ME,
} from '@/features/onboarding/options';
import type { AdvancedFilters, ShowMe } from '@/features/onboarding/types';
import { formatDistance, formatHeight } from '@/features/onboarding/units';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, spacing } from '@/theme';

const ageLabel = (age: number) => (age >= AGE_MAX ? `${AGE_MAX}+` : String(age));

function isPremiumActive(expiresAt: { toMillis?: () => number } | null | undefined, active?: boolean) {
  if (!active) return false;
  if (expiresAt?.toMillis && expiresAt.toMillis() < Date.now()) return false;
  return true;
}

export default function FiltersScreen() {
  const { record } = useSession();
  const { preferences, savePreferences } = useMyProfile();
  const { load } = useDiscovery();
  const premium = isPremiumActive(record?.premium?.expiresAt ?? null, record?.premium?.active);
  const advanced = preferences.advanced ?? {};

  const [showMe, setShowMe] = useState<ShowMe>(preferences.showMe ?? 'everyone');
  const [range, setRange] = useState([preferences.ageRange?.min ?? AGE_MIN, preferences.ageRange?.max ?? AGE_MAX]);
  const [distanceKm, setDistanceKm] = useState(preferences.maxDistanceKm ?? DISTANCE_DEFAULT_KM);
  const [heightRange, setHeightRange] = useState([
    advanced.heightRange?.min ?? HEIGHT_MIN_CM,
    advanced.heightRange?.max ?? HEIGHT_MAX_CM,
  ]);
  const [useHeight, setUseHeight] = useState(Boolean(advanced.heightRange));
  const [intents, setIntents] = useState<string[]>(advanced.intents ?? []);
  const [drinking, setDrinking] = useState<string[]>(advanced.drinking ?? []);
  const [smoking, setSmoking] = useState<string[]>(advanced.smoking ?? []);
  const [exercise, setExercise] = useState<string[]>(advanced.exercise ?? []);
  const [wantKids, setWantKids] = useState<string[]>(advanced.wantKids ?? []);
  const [religions, setReligions] = useState<string[]>(advanced.religions ?? []);
  const [verifiedOnly, setVerifiedOnly] = useState(Boolean(advanced.verifiedOnly));
  const [saving, setSaving] = useState(false);

  const apply = async () => {
    setSaving(true);
    try {
      const nextAdvanced: AdvancedFilters | undefined = premium
        ? {
            ...(useHeight
              ? { heightRange: { min: heightRange[0], max: heightRange[1] } }
              : {}),
            ...(intents.length ? { intents } : {}),
            ...(drinking.length ? { drinking } : {}),
            ...(smoking.length ? { smoking } : {}),
            ...(exercise.length ? { exercise } : {}),
            ...(wantKids.length ? { wantKids } : {}),
            ...(religions.length ? { religions } : {}),
            ...(verifiedOnly ? { verifiedOnly: true } : {}),
          }
        : undefined;

      await savePreferences({
        showMe,
        ageRange: { min: range[0], max: range[1] },
        maxDistanceKm: distanceKm,
        ...(premium ? { advanced: nextAdvanced ?? {} } : {}),
      });
      router.back();
      load({ reset: true });
    } catch {
      Alert.alert('Couldn’t save', 'Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <Screen
      header={
        <View style={styles.header}>
          <AppText variant="heading">Filters</AppText>
          <IconButton accessibilityLabel="Close" onPress={router.back} icon={<X size={20} color={colors.plum} />} />
        </View>
      }
      footer={<Button title="Apply" onPress={apply} loading={saving} />}>
      <View style={styles.section}>
        <AppText variant="label">Show me</AppText>
        <View style={styles.tiles}>
          {SHOW_ME.map((option) => (
            <SelectTile
              key={option.value}
              label={option.label}
              selected={showMe === option.value}
              onPress={() => setShowMe(option.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <AppText variant="label">Age range</AppText>
          <AppText variant="label" color="plum">
            {ageLabel(range[0])} to {ageLabel(range[1])}
          </AppText>
        </View>
        <Slider min={AGE_MIN} max={AGE_MAX} value={range} onChange={setRange} accessibilityLabel="Age range" formatValue={ageLabel} />
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <AppText variant="label">Maximum distance</AppText>
          <AppText variant="label" color="plum">
            {formatDistance(distanceKm)}
          </AppText>
        </View>
        <Slider
          min={DISTANCE_MIN_KM}
          max={DISTANCE_MAX_KM}
          value={[distanceKm]}
          onChange={([km]) => setDistanceKm(km)}
          accessibilityLabel="Maximum distance"
          formatValue={(km) => formatDistance(km)}
        />
      </View>

      {premium ? (
        <>
          <View style={styles.premiumHead}>
            <AppText variant="bodyStrong">Premium filters</AppText>
            <AppText variant="caption" color="textMuted">
              Narrow Discover by height, intent, lifestyle, and more.
            </AppText>
          </View>

          <View style={styles.section}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: verifiedOnly }}
              onPress={() => setVerifiedOnly((v) => !v)}
              style={styles.checkRow}>
              <View style={[styles.checkbox, verifiedOnly && styles.checkboxOn]}>
                {verifiedOnly ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}
              </View>
              <AppText variant="body">Verified profiles only</AppText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: useHeight }}
              onPress={() => setUseHeight((v) => !v)}
              style={styles.checkRow}>
              <View style={[styles.checkbox, useHeight && styles.checkboxOn]}>
                {useHeight ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}
              </View>
              <AppText variant="body">Filter by height</AppText>
            </Pressable>
            {useHeight ? (
              <>
                <View style={styles.row}>
                  <AppText variant="label">Height</AppText>
                  <AppText variant="label" color="plum">
                    {formatHeight(heightRange[0])} – {formatHeight(heightRange[1])}
                  </AppText>
                </View>
                <Slider
                  min={HEIGHT_MIN_CM}
                  max={HEIGHT_MAX_CM}
                  value={heightRange}
                  onChange={setHeightRange}
                  accessibilityLabel="Height range"
                  formatValue={(cm) => formatHeight(cm)}
                />
              </>
            ) : null}
          </View>

          <View style={styles.section}>
            <ChipGroup
              label="Looking for"
              options={INTENTS.map((i) => i.label)}
              selected={intents.map((v) => INTENTS.find((i) => i.value === v)?.label ?? v)}
              onChange={(labels) =>
                setIntents(
                  labels
                    .map((label) => INTENTS.find((i) => i.label === label)?.value)
                    .filter((v): v is string => Boolean(v)),
                )
              }
              max={INTENTS.length}
            />
          </View>

          <View style={styles.section}>
            <ChipGroup
              label={HABITS.drinking.label}
              options={[...HABITS.drinking.options]}
              selected={drinking}
              onChange={setDrinking}
              max={HABITS.drinking.options.length}
            />
          </View>

          <View style={styles.section}>
            <ChipGroup
              label={HABITS.smoking.label}
              options={[...HABITS.smoking.options]}
              selected={smoking}
              onChange={setSmoking}
              max={HABITS.smoking.options.length}
            />
          </View>

          <View style={styles.section}>
            <ChipGroup
              label={HABITS.exercise.label}
              options={[...HABITS.exercise.options]}
              selected={exercise}
              onChange={setExercise}
              max={HABITS.exercise.options.length}
            />
          </View>

          <View style={styles.section}>
            <ChipGroup
              label={FAMILY.wantKids.label}
              options={[...FAMILY.wantKids.options]}
              selected={wantKids}
              onChange={setWantKids}
              max={FAMILY.wantKids.options.length}
            />
          </View>

          <View style={styles.section}>
            <ChipGroup
              label={BELIEFS.religion.label}
              options={[...BELIEFS.religion.options]}
              selected={religions}
              onChange={setReligions}
              max={BELIEFS.religion.options.length}
            />
          </View>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(app)/paywall')}
          style={styles.upsell}>
          <Lock size={16} color={colors.plum} />
          <View style={styles.upsellText}>
            <AppText variant="bodyStrong">Unlock advanced filters</AppText>
            <AppText variant="caption" color="textMuted">
              Height, intent, lifestyle, religion, and verified-only — with Premium.
            </AppText>
          </View>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  premiumHead: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.pinkBorderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.plum,
    borderColor: colors.plum,
  },
  upsell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.pinkTint,
    marginBottom: spacing.xl,
  },
  upsellText: {
    flex: 1,
    gap: 2,
  },
});
