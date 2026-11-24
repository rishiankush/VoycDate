import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { placeLabel, readDeviceLocation } from '@/features/location/deviceLocation';
import { TabScreen } from '@/features/navigation/TabScreen';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, radii, spacing } from '@/theme';

export default function ProfileScreen() {
  const { signOut } = useSession();
  const { profile, saveLocation } = useMyProfile();
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const photo = profile.photos?.[0];

  const updateLocation = async () => {
    setUpdatingLocation(true);
    try {
      const next = await readDeviceLocation();
      await saveLocation(next);
      Alert.alert('Location updated', placeLabel(next));
    } catch (error) {
      const denied = error instanceof Error && error.message === 'LOCATION_DENIED';
      Alert.alert(
        denied ? 'Location permission needed' : 'Couldn’t update location',
        denied
          ? 'Allow location access in Settings, or set a Custom Location in the Simulator (Features → Location).'
          : 'Check that the Simulator location isn’t stuck on San Francisco, then try again.',
      );
    } finally {
      setUpdatingLocation(false);
    }
  };

  return (
    <TabScreen title="Profile">
      <View style={styles.card}>
        {photo ? <Image source={{ uri: photo.url }} style={styles.photo} contentFit="cover" /> : null}
        <AppText variant="title">{profile.firstName}</AppText>
        {profile.location ? (
          <AppText variant="body" align="center">
            {placeLabel(profile.location)}
          </AppText>
        ) : null}
      </View>
      <Button title="Update location" variant="secondary" onPress={updateLocation} loading={updatingLocation} />
      <Button title="Sign out" variant="secondary" onPress={signOut} />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  photo: {
    width: 140,
    height: 140,
    borderRadius: radii.lg,
    backgroundColor: colors.pinkTint,
    marginBottom: spacing.sm,
  },
});
