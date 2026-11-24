import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActionSheetIOS, Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

import { blockUser, REPORT_REASONS, reportUser, unmatch, type ReportReason } from './safety';

type SafetyActionsProps = {
  targetId: string;
  targetName: string;
  matchId?: string;
  /** When true, include Unmatch (chat / matched context). */
  canUnmatch?: boolean;
  children: (open: () => void) => ReactNode;
};

export function SafetyActions({ targetId, targetName, matchId, canUnmatch = false, children }: SafetyActionsProps) {
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);

  const afterSafety = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)/connections');
  };

  const doUnmatch = () => {
    if (!matchId) return;
    Alert.alert('Unmatch?', `You’ll lose this chat with ${targetName}. You can match again later if you both like.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unmatch',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await unmatch(matchId);
            afterSafety();
          } catch {
            Alert.alert('Couldn’t unmatch', 'Check your connection and try again.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const doBlock = () => {
    Alert.alert(
      `Block ${targetName}?`,
      'You won’t see each other on Discover, and any open chat ends. You can unblock later in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await blockUser(targetId, matchId);
              afterSafety();
            } catch {
              Alert.alert('Couldn’t block', 'Check your connection and try again.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const submitReport = async (reason: ReportReason) => {
    setBusy(true);
    try {
      await reportUser({ targetId, reason, matchId });
      setReporting(false);
      Alert.alert('Thanks for reporting', 'Our team will review this. Want to block them too?', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: doBlock },
      ]);
    } catch {
      Alert.alert('Couldn’t send report', 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const open = () => {
    if (busy) return;
    const options = [
      ...(canUnmatch && matchId ? (['Unmatch'] as const) : []),
      'Block',
      'Report',
      'Cancel',
    ] as string[];
    const cancelButtonIndex = options.length - 1;
    const destructiveButtonIndex = options.indexOf('Block');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex, userInterfaceStyle: 'light' },
        (index) => {
          const label = options[index];
          if (label === 'Unmatch') doUnmatch();
          else if (label === 'Block') doBlock();
          else if (label === 'Report') setReporting(true);
        },
      );
      return;
    }

    Alert.alert(
      targetName,
      undefined,
      [
        ...(canUnmatch && matchId
          ? [{ text: 'Unmatch', style: 'destructive' as const, onPress: doUnmatch }]
          : []),
        { text: 'Block', style: 'destructive' as const, onPress: doBlock },
        { text: 'Report', onPress: () => setReporting(true) },
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  return (
    <>
      {children(open)}
      <Modal visible={reporting} animationType="slide" transparent onRequestClose={() => setReporting(false)}>
        <Pressable style={styles.backdrop} onPress={() => setReporting(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <AppText variant="heading">Report {targetName}</AppText>
            <AppText variant="body" color="textMuted">
              Reports are reviewed by our team. The other person isn’t notified.
            </AppText>
            <View style={styles.reasons}>
              {REPORT_REASONS.map((reason) => (
                <Button
                  key={reason.value}
                  title={reason.label}
                  variant="secondary"
                  onPress={() => submitReport(reason.value)}
                  disabled={busy}
                />
              ))}
            </View>
            <Button title="Cancel" variant="secondary" onPress={() => setReporting(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  reasons: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
