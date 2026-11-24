import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight, Eye, PauseCircle, Pencil, Settings } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, SelectTile } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { placeLabel, readDeviceLocation } from '@/features/location/deviceLocation';
import { TabScreen } from '@/features/navigation/TabScreen';
import { MODES } from '@/features/onboarding/options';
import type { Mode } from '@/features/onboarding/types';
import { profileCompleteness } from '@/features/profile/completeness';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, radii, spacing } from '@/theme';

function Row({
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
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
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
      <View style={styles.card}>
        {photo ? <Image source={{ uri: photo.url }} style={styles.photo} contentFit="cover" /> : null}
        <AppText variant="title">{profile.firstName}</AppText>
        {profile.location ? (
          <AppText variant="body" align="center">
            {placeLabel(profile.location)}
          </AppText>
        ) : null}
        {record?.birthDate ? (
          <AppText variant="caption" color="textMuted">
            Age only · birthday stays private
          </AppText>
        ) : null}
        {paused ? (
          <View style={styles.pauseBadge}>
            <PauseCircle size={14} color={colors.plum} />
            <AppText variant="label" color="plum">
              Profile paused
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.completeness}>
        <View style={styles.completenessRow}>
          <AppText variant="bodyStrong">Profile strength</AppText>
          <AppText variant="label" color="plum">
            {percent}%
          </AppText>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${percent}%` }]} />
        </View>
        <AppText variant="caption" color="textMuted">
          {done} of {total} sections filled — stronger profiles get more likes.
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="label">I’m here to</AppText>
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
        <AppText variant="caption" color="textMuted">
          You’ll only see people in the same mode.
        </AppText>
      </View>

      <View style={styles.menu}>
        <Row
          icon={<Pencil size={18} color={colors.plum} />}
          title="Edit profile"
          subtitle="Bio, prompts, interests and more"
          onPress={() => router.push('/(app)/edit-profile')}
        />
        <Row
          icon={<Eye size={18} color={colors.plum} />}
          title="Preview"
          subtitle="See how others see you"
          onPress={() => router.push('/(app)/preview-profile')}
        />
        <Row
          icon={<PauseCircle size={18} color={colors.plum} />}
          title={paused ? 'Resume profile' : 'Pause profile'}
          subtitle={paused ? 'You’re hidden from Discover' : 'Hide from Discover, keep matches'}
          onPress={togglePause}
        />
        <Row
          icon={<Settings size={18} color={colors.plum} />}
          title="Settings"
          subtitle="Privacy, blocked users, account"
          onPress={() => router.push('/(app)/settings')}
        />
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
  completeness: {
    gap: spacing.xs,
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
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.plum,
    borderRadius: 4,
  },
  section: {
    gap: spacing.sm,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  menu: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
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
