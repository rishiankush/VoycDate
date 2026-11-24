import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import type { Match } from '@/features/matches/useMatches';
import { colors, radii, shadows, spacing } from '@/theme';

import type { UnlockDecision } from './types';
import { submitUnlockDecision } from './useChat';

type UnlockCardProps = {
  match: Match;
  uid: string;
  otherName: string;
};

export function UnlockCard({ match, uid, otherName }: UnlockCardProps) {
  const [busy, setBusy] = useState<UnlockDecision | null>(null);
  const myVote = match.unlock?.votes?.[uid];
  const otherId = match.members.find((m) => m !== uid) ?? '';
  const theirVote = match.unlock?.votes?.[otherId];

  const decide = async (decision: UnlockDecision) => {
    if (busy || myVote) return;
    setBusy(decision);
    try {
      await submitUnlockDecision(match.id, decision);
    } catch {
      // Match snapshot will stay on deciding; user can tap again.
    } finally {
      setBusy(null);
    }
  };

  if (myVote && !theirVote) {
    return (
      <View style={styles.card}>
        <AppText variant="bodyStrong">Waiting on {otherName}</AppText>
        <AppText variant="caption" color="textMuted">
          {myVote === 'yes'
            ? `You said yes to text. We’ll unlock it when ${otherName} agrees too.`
            : `You chose to keep voice for now. ${otherName} still needs to decide.`}
        </AppText>
      </View>
    );
  }

  if (myVote) return null;

  return (
    <View style={styles.card}>
      <AppText variant="bodyStrong">Ready for text chat?</AppText>
      <AppText variant="caption" color="textMuted">
        This is private. {otherName} won’t see your choice unless you both say yes.
      </AppText>
      <View style={styles.actions}>
        <Button
          title="Yes, unlock text"
          onPress={() => decide('yes')}
          loading={busy === 'yes'}
          disabled={Boolean(busy)}
          style={styles.flex}
        />
        <Button
          title="Keep voice only"
          variant="secondary"
          onPress={() => decide('keep_voice')}
          loading={busy === 'keep_voice'}
          disabled={Boolean(busy)}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
