import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  ChevronRight,
  Eye,
  PauseCircle,
  Pencil,
  Settings,
  MapPin,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, SelectTile } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { placeLabel, readDeviceLocation } from '@/features/location/deviceLocation';
import { TabScreen } from '@/features/navigation/TabScreen';
import { MODES } from '@/features/onboarding/options';
import type { Mode } from '@/features/onboarding/types';
import { ageFromBirthDate } from '@/features/profile/age';
import { profileCompleteness } from '@/features/profile/completeness';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, radii, shadows, spacing } from '@/theme';

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="textMuted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { signOut, record } = useSession();
  const { profile, paused, setMode, setPaused, saveLocation } = useMyProfile();
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const photo = profile.photos?.[0];
  const { percent, done, total } = profileCompleteness(profile);
  const mode = profile.mode ?? 'date';
  const age = record?.birthDate ? ageFromBirthDate(record.birthDate) : null;

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

  const switchMode = async (next: Mode) => {
    if (next === mode || switchingMode) return;
    setSwitchingMode(true);
    try {
      await setMode(next);
    } catch {
      Alert.alert('Couldn’t switch mode', 'Check your connection and try again.');
    } finally {
      setSwitchingMode(false);
    }
  };

  const togglePause = async () => {
    try {
      await setPaused(!paused);
    } catch {
      Alert.alert('Couldn’t update', 'Check your connection and try again.');
    }
  };

  return (
    <TabScreen title="Profile">
      <View style={styles.hero}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Preview how others see you"
          onPress={() => router.push('/(app)/preview-profile')}
          style={styles.photoWrap}>
          {photo ? (
            <Image source={{ uri: photo.url }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={[styles.photo, styles.photoEmpty]} />
          )}
          <View style={styles.percentBadge}>
            <AppText variant="label" color="white">
              {percent}%
            </AppText>
          </View>
        </Pressable>

        <AppText variant="title" align="center">
          {profile.firstName}
          {age != null ? `, ${age}` : ''}
        </AppText>
        {profile.location ? (
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.textMuted} />
            <AppText variant="body" color="textMuted">
              {placeLabel(profile.location)}
            </AppText>
          </View>
        ) : null}
        {paused ? (
          <View style={styles.pauseBadge}>
            <PauseCircle size={14} color={colors.plum} />
            <AppText variant="label" color="plum">
              Hidden from Discover
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.completenessRow}>
          <AppText variant="bodyStrong">Complete your profile</AppText>
          <AppText variant="label" color="plum">
            {done}/{total}
          </AppText>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${percent}%` }]} />
        </View>
        <AppText variant="caption" color="textMuted">
          Profiles with a video intro and full bio get more likes.
        </AppText>
        <Button title="Edit profile" onPress={() => router.push('/(app)/edit-profile')} style={styles.editBtn} />
      </View>

      <View style={styles.section}>
        <AppText variant="label" color="textMuted">
          I’m here to
        </AppText>
        <View style={styles.tiles}>
          {MODES.map((option) => (
            <SelectTile
              key={option.value}
              label={option.label}
              selected={mode === option.value}
              onPress={() => switchMode(option.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <MenuRow
          icon={<Eye size={18} color={colors.plum} />}
          title="Preview"
          subtitle="See how you appear on Discover"
          onPress={() => router.push('/(app)/preview-profile')}
        />
        <MenuRow
          icon={<Pencil size={18} color={colors.plum} />}
          title="Edit profile"
          subtitle="Photos, bio, prompts, interests"
          onPress={() => router.push('/(app)/edit-profile')}
        />
        <MenuRow
          icon={<PauseCircle size={18} color={colors.plum} />}
          title={paused ? 'Resume my profile' : 'Pause my profile'}
          subtitle={paused ? 'Show me on Discover again' : 'Hide from Discover · keep matches'}
          onPress={togglePause}
        />
        <MenuRow
          icon={<Settings size={18} color={colors.plum} />}
          title="Settings"
          subtitle="Privacy, blocked users, account"
          onPress={() => router.push('/(app)/settings')}
        />
        <MenuRow
          icon={<MapPin size={18} color={colors.plum} />}
          title="Update location"
          subtitle={profile.location ? placeLabel(profile.location) : 'Add where you are'}
          onPress={updateLocation}
        />
      </View>

      <Button title="Sign out" variant="secondary" onPress={signOut} />
      {updatingLocation ? (
        <AppText variant="caption" color="textMuted" align="center">
          Updating location…
        </AppText>
      ) : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  photoWrap: {
    marginBottom: spacing.sm,
  },
  photo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.pinkTint,
    borderWidth: 3,
    borderColor: colors.pink,
  },
  photoEmpty: {
    borderColor: colors.pinkBorder,
  },
  percentBadge: {
    position: 'absolute',
    right: -2,
    bottom: 6,
    minWidth: 40,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.plum,
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pauseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.pinkTint,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.card,
  },
  completenessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.pinkTint,
    overflow: 'hidden',
    marginVertical: spacing.xxs,
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.plum,
    borderRadius: 4,
  },
  editBtn: {
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.pinkBorder,
  },
  pressed: {
    opacity: 0.7,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pinkTint,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
