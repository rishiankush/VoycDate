import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { TabScreen } from '@/features/navigation/TabScreen';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, radii, spacing } from '@/theme';

export default function ProfileScreen() {
  const { signOut } = useSession();
  const { profile } = useMyProfile();
  const photo = profile.photos?.[0];

  return (
    <TabScreen title="Profile">
      <View style={styles.card}>
        {photo ? <Image source={{ uri: photo.url }} style={styles.photo} contentFit="cover" /> : null}
        <AppText variant="title">{profile.firstName}</AppText>
        {profile.location?.city ? <AppText variant="body">{profile.location.city}</AppText> : null}
      </View>
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
