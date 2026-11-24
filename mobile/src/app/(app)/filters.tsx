import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, Screen, SelectTile, Slider } from '@/components/ui';
import { useDiscovery } from '@/features/discover/DiscoveryProvider';
import {
  AGE_MAX,
  AGE_MIN,
  DISTANCE_DEFAULT_KM,
  DISTANCE_MAX_KM,
  DISTANCE_MIN_KM,
  SHOW_ME,
} from '@/features/onboarding/options';
import type { ShowMe } from '@/features/onboarding/types';
import { formatDistance } from '@/features/onboarding/units';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, spacing } from '@/theme';

const ageLabel = (age: number) => (age >= AGE_MAX ? `${AGE_MAX}+` : String(age));

export default function FiltersScreen() {
  const { preferences, savePreferences } = useMyProfile();
  const { load } = useDiscovery();
  const [showMe, setShowMe] = useState<ShowMe>(preferences.showMe ?? 'everyone');
  const [range, setRange] = useState([preferences.ageRange?.min ?? AGE_MIN, preferences.ageRange?.max ?? AGE_MAX]);
  const [distanceKm, setDistanceKm] = useState(preferences.maxDistanceKm ?? DISTANCE_DEFAULT_KM);
  const [saving, setSaving] = useState(false);

  const apply = async () => {
    setSaving(true);
    try {
      await savePreferences({ showMe, ageRange: { min: range[0], max: range[1] }, maxDistanceKm: distanceKm });
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

      <AppText variant="caption">More filters, like height, lifestyle and verified profiles, come with Premium.</AppText>
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
});
