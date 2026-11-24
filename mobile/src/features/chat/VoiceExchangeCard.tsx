import { Check } from 'lucide-react-native';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import type { Match } from '@/features/matches/useMatches';
import { colors, radii, shadows, spacing } from '@/theme';

const THRESHOLD = 3;

function hoursLeft(match: Match, now: number) {
  return match.expiresAt ? Math.max(0, Math.ceil((match.expiresAt.toMillis() - now) / 3_600_000)) : null;
}

type VoiceExchangeCardProps = {
  match: Match;
  uid: string;
  otherName: string;
  now: number;
};

export function VoiceExchangeCard({ match, uid, otherName, now }: VoiceExchangeCardProps) {
  const done = Math.min(match.voice?.qualifiedCount ?? 0, THRESHOLD);
  const left = hoursLeft(match, now);

  let body: string;
  if (match.stage === 'awaiting_first_voice') {
    body =
      match.firstSenderId === uid
        ? `You liked ${otherName} first, so you send the first voice note${left !== null ? `. ${left}h left before this match expires.` : '.'}`
        : `${otherName} liked you first, so they send the first voice note${left !== null ? `. They have ${left}h.` : '.'}`;
  } else if (match.stage === 'deciding') {
    body = 'You’ve exchanged enough voice notes. Decide privately whether to unlock text chat.';
  } else if (match.stage === 'text_unlocked') {
    body = 'Text chat is unlocked. You can still send voice notes anytime.';
  } else if (match.stage === 'expired') {
    body = 'This match expired because no voice note was sent in time.';
  } else {
    body =
      'Send 3 voice messages of 3–30 seconds, with at least one from each of you. Then you’ll each privately decide whether to unlock text chat.';
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText variant="bodyStrong">Voice exchange</AppText>
        <AppText variant="bodyStrong" color="plum">
          {done} of {THRESHOLD}
        </AppText>
      </View>
      <View style={styles.track} accessibilityLabel={`${done} of ${THRESHOLD} voice messages exchanged`}>
        {Array.from({ length: THRESHOLD }, (_, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={[styles.line, i <= done && styles.lineDone]} /> : null}
            <View style={[styles.dot, i < done ? styles.dotDone : styles.dotTodo]}>
              {i < done ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}
            </View>
          </Fragment>
        ))}
      </View>
      <AppText variant="caption" color="textMuted">
        {body}
      </AppText>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flex: 1,
    height: 4,
    backgroundColor: colors.pinkBorder,
  },
  lineDone: {
    backgroundColor: colors.plum,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: colors.plum,
  },
  dotTodo: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.pinkBorderStrong,
    backgroundColor: colors.white,
  },
});
