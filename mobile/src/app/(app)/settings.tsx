import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { ChevronRight, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText, Button, IconButton, Screen } from '@/components/ui';
import { deleteAccount, requestDataExport } from '@/features/account/account';
import { useSession } from '@/features/auth/SessionProvider';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, radii, spacing } from '@/theme';

function Row({
  title,
  subtitle,
  onPress,
  danger,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong" color={danger ? 'danger' : 'text'}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textMuted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {onPress ? <ChevronRight size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color="textMuted">
          {subtitle}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.plum, false: colors.pinkBorder }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.pinkBorder}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { signOut } = useSession();
  const { preferences, paused, savePreferences, setPaused } = useMyProfile();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showAge = preferences.showAge !== false;
  const showDistance = preferences.showDistance !== false;

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await requestDataExport();
      const path = `${cacheDirectory}voyc-date-export.json`;
      await writeAsStringAsync(path, JSON.stringify(data, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Your VOYC Date data' });
      } else {
        Alert.alert('Export ready', 'Your data file was saved on this device.');
      }
    } catch {
      Alert.alert('Couldn’t export', 'Check your connection and try again.');
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your profile, matches and media. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Are you sure?', 'Type confirmation by tapping Delete forever.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete forever',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await deleteAccount();
                    await signOut();
                  } catch {
                    Alert.alert('Couldn’t delete account', 'Try again or contact support.');
                    setDeleting(false);
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  };

  return (
    <Screen
      header={
        <View style={styles.header}>
          <AppText variant="heading">Settings</AppText>
          <IconButton accessibilityLabel="Close" onPress={router.back} icon={<X size={20} color={colors.plum} />} />
        </View>
      }>
      <AppText variant="label" style={styles.sectionLabel}>
        Discovery
      </AppText>
      <View style={styles.group}>
        <Row title="Filters" subtitle="Age, distance and who you see" onPress={() => router.push('/(app)/filters')} />
        <ToggleRow
          title="Pause profile"
          subtitle="Hidden from Discover · matches stay open"
          value={paused}
          onChange={(next) => setPaused(next).catch(() => Alert.alert('Couldn’t update pause'))}
        />
      </View>

      <AppText variant="label" style={styles.sectionLabel}>
        Privacy
      </AppText>
      <View style={styles.group}>
        <ToggleRow
          title="Show my age"
          subtitle="Others see your age on Discover"
          value={showAge}
          onChange={(next) => savePreferences({ showAge: next })}
        />
        <ToggleRow
          title="Show my distance"
          subtitle="Others see how far away you are"
          value={showDistance}
          onChange={(next) => savePreferences({ showDistance: next })}
        />
        <Row title="Blocked users" onPress={() => router.push('/(app)/blocked')} />
      </View>

      <AppText variant="label" style={styles.sectionLabel}>
        Support & legal
      </AppText>
      <View style={styles.group}>
        <Row title="Help & support" onPress={() => Linking.openURL('mailto:hello@voyc.date?subject=VOYC%20Date%20help')} />
        <Row title="Community guidelines" onPress={() => Linking.openURL('https://voyc.date/guidelines')} />
        <Row title="Privacy policy" onPress={() => Linking.openURL('https://voyc.date/privacy')} />
        <Row title="Terms of use" onPress={() => Linking.openURL('https://voyc.date/terms')} />
      </View>

      <AppText variant="label" style={styles.sectionLabel}>
        Account
      </AppText>
      <View style={styles.group}>
        <Row title="Download my data" subtitle="JSON export of your account" onPress={exportData} />
        <Row title="Sign out" onPress={signOut} />
        <Row title="Delete account" danger onPress={confirmDelete} />
      </View>

      {(exporting || deleting) && (
        <Button title={deleting ? 'Deleting…' : 'Exporting…'} loading disabled />
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
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  group: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.pinkBorder,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
