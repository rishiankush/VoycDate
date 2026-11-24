import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import {
  Ban,
  ChevronRight,
  Download,
  FileText,
  HelpCircle,
  LogOut,
  Shield,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText, Button, IconButton, Screen } from '@/components/ui';
import { deleteAccount, requestDataExport } from '@/features/account/account';
import { useSession } from '@/features/auth/SessionProvider';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, radii, spacing } from '@/theme';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color="textMuted" style={styles.sectionLabel}>
        {title}
      </AppText>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  last,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && onPress && styles.pressed]}>
      {icon ? <View style={styles.rowIcon}>{icon}</View> : null}
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
  last,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (next: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
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
            Alert.alert('Are you sure?', 'Tap Delete forever to confirm.', [
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
      <Section title="Discovery">
        <Row
          icon={<SlidersHorizontal size={18} color={colors.plum} />}
          title="Filters"
          subtitle="Age, distance and who you see"
          onPress={() => router.push('/(app)/filters')}
        />
        <ToggleRow
          title="Pause my profile"
          subtitle="Hidden on Discover · matches stay open"
          value={paused}
          onChange={(next) => setPaused(next).catch(() => Alert.alert('Couldn’t update pause'))}
          last
        />
      </Section>

      <Section title="Privacy">
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
        <Row
          icon={<Ban size={18} color={colors.plum} />}
          title="Blocked users"
          onPress={() => router.push('/(app)/blocked')}
          last
        />
      </Section>

      <Section title="Support">
        <Row
          icon={<HelpCircle size={18} color={colors.plum} />}
          title="Help & support"
          onPress={() => Linking.openURL('mailto:hello@voyc.date?subject=VOYC%20Date%20help')}
        />
        <Row
          icon={<Shield size={18} color={colors.plum} />}
          title="Community guidelines"
          onPress={() => Linking.openURL('https://voyc.date/guidelines')}
        />
        <Row
          icon={<FileText size={18} color={colors.plum} />}
          title="Privacy policy"
          onPress={() => Linking.openURL('https://voyc.date/privacy')}
        />
        <Row
          icon={<FileText size={18} color={colors.plum} />}
          title="Terms of use"
          onPress={() => Linking.openURL('https://voyc.date/terms')}
          last
        />
      </Section>

      <Section title="Account">
        <Row
          icon={<Download size={18} color={colors.plum} />}
          title="Download my data"
          subtitle="JSON export of your account"
          onPress={exportData}
        />
        <Row icon={<LogOut size={18} color={colors.plum} />} title="Sign out" onPress={signOut} />
        <Row
          icon={<Trash2 size={18} color={colors.danger} />}
          title="Delete account"
          danger
          onPress={confirmDelete}
          last
        />
      </Section>

      {exporting || deleting ? (
        <Button title={deleting ? 'Deleting…' : 'Exporting…'} loading disabled />
      ) : null}
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
    marginBottom: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
  rowLast: {
    borderBottomWidth: 0,
  },
  pressed: {
    backgroundColor: colors.pinkTint,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pinkTint,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
