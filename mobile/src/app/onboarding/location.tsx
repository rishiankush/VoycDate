import * as Location from 'expo-location';
import { LocateFixed, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Slider, TextField } from '@/components/ui';
import { placeLabel, readDeviceLocation, toProfileLocation } from '@/features/location/deviceLocation';
import { DISTANCE_DEFAULT_KM, DISTANCE_MAX_KM, DISTANCE_MIN_KM } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import type { ProfileLocation } from '@/features/onboarding/types';
import { formatDistance } from '@/features/onboarding/units';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';
import { colors, radii, shadows, spacing } from '@/theme';

const STEP = '5.1';

export default function LocationStep() {
  const { profile, preferences } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [location, setLocation] = useState<ProfileLocation | undefined>(profile.location);
  const [distanceKm, setDistanceKm] = useState(preferences.maxDistanceKm ?? DISTANCE_DEFAULT_KM);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string>();

  const locateDevice = async () => {
    setError(undefined);
    setLocating(true);
    try {
      setLocation(await readDeviceLocation());
    } catch {
      setDenied(true);
      setError('We couldn’t get your location. Try again or enter your city.');
    } finally {
      setLocating(false);
    }
  };

  const findCity = async () => {
    const city = query.trim();
    if (!city) return;
    setError(undefined);
    setLocating(true);
    try {
      const [match] = await Location.geocodeAsync(city);
      if (!match) {
        setError('We couldn’t find that place. Try adding the country.');
        return;
      }
      const [place] = await Location.reverseGeocodeAsync(match);
      setLocation(toProfileLocation(match, place, 'manual', city));
    } catch {
      setError('We couldn’t find that place. Try adding the country.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <OnboardingScreen
      stepId={STEP}
      title="Where should we look?"
      subtitle="We use your location to show people nearby. We never show your exact spot."
      canContinue={Boolean(location)}
      onContinue={() =>
        location && complete({ profile: { location }, preferences: { maxDistanceKm: distanceKm } })
      }
      busy={saving}>
      {location ? (
        <View style={styles.placeCard}>
          <View style={styles.placeIcon}>
            <MapPin size={22} color={colors.plum} />
          </View>
          <View style={styles.placeText}>
            <AppText variant="bodyStrong" color="plum">
              {placeLabel(location)}
            </AppText>
            <AppText variant="caption">
              {location.source === 'device' ? 'Based on your device location' : 'Entered manually'}
            </AppText>
          </View>
        </View>
      ) : null}

      <Button
        title={location?.source === 'device' ? 'Update location' : 'Allow location access'}
        variant="secondary"
        icon={<LocateFixed size={18} color={colors.plum} />}
        onPress={locateDevice}
        loading={locating && !denied}
      />

      {denied ? (
        <View style={styles.manual}>
          <TextField
            label="Or enter your city"
            placeholder="e.g. Mohali, India"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="words"
            returnKeyType="search"
            onSubmitEditing={findCity}
          />
          <Button title="Find city" variant="secondary" onPress={findCity} disabled={!query.trim()} loading={locating} />
        </View>
      ) : null}

      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}

      <View style={styles.distance}>
        <View style={styles.distanceHeader}>
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
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  placeIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeText: {
    flex: 1,
    gap: 2,
  },
  manual: {
    gap: spacing.sm,
  },
  distance: {
    gap: spacing.sm,
  },
  distanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
