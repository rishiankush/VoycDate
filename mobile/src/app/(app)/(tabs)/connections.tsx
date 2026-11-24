import { Image } from 'expo-image';
import { router } from 'expo-router';
import { MessagesSquare } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { useMatches, type Match } from '@/features/matches/useMatches';
import { EmptyCard, TabScreen } from '@/features/navigation/TabScreen';
import { clock } from '@/features/discover/labels';
import { colors, fontFamily, radii, shadows, spacing } from '@/theme';

function hoursLeft(match: Match) {
  if (!match.expiresAt) return null;
  return Math.max(0, Math.round((match.expiresAt.toMillis() - Date.now()) / 3_600_000));
}

function stageLine(match: Match, uid: string) {
  const other = match.people[match.members.find((m) => m !== uid) ?? '']?.firstName ?? 'them';
  if (match.stage === 'awaiting_first_voice') {
    const left = hoursLeft(match);
    const expiry = left !== null ? ` · ${left}h left` : '';
    return match.firstSenderId === uid
      ? `Your turn: send the first voice note${expiry}`
      : `Waiting for ${other}’s first voice note${expiry}`;
  }
  const last = match.lastMessage;
  const you = last?.senderId === uid ? 'You: ' : '';
  const preview = !last
    ? 'Say hello'
    : last.type === 'text'
      ? `${you}${last.text ?? 'Message'}`
      : last.type === 'photo'
        ? `${you}Photo`
        : `${you}Voice note · ${clock(last.durationMs ?? 0)}`;
  if (match.stage === 'deciding') return `${preview} · Decide on text`;
  if (match.stage === 'text_unlocked') return `${preview} · Text unlocked`;
  return `${preview} · Voice ${Math.min(match.voice?.qualifiedCount ?? 0, 3)} of 3`;
}

export default function ConnectionsScreen() {
  const { user } = useSession();
  const uid = user?.uid ?? '';
  const { matches, loading } = useMatches();

  return (
    <TabScreen title="Connections">
      {!loading && matches.length === 0 ? (
        <EmptyCard
          icon={<MessagesSquare size={36} color={colors.pinkBorderStrong} />}
          title="No matches yet"
          body="When you and someone both like each other, you’ll find them here."
        />
      ) : null}
      {matches.map((match) => {
        const otherId = match.members.find((m) => m !== uid) ?? '';
        const other = match.people[otherId];
        const yourTurn = match.stage === 'awaiting_first_voice' && match.firstSenderId === uid;
        const unread = match.unread?.[uid] ?? 0;
        return (
          <Pressable
            key={match.id}
            accessibilityRole="button"
            accessibilityLabel={`${other?.firstName ?? 'Match'}. ${stageLine(match, uid)}${unread ? `. ${unread} new` : ''}`}
            onPress={() => router.push({ pathname: '/chat/[matchId]', params: { matchId: match.id } })}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            {other?.photoUrl ? (
              <Image source={{ uri: other.photoUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatar} />
            )}
            <View style={styles.text}>
              <AppText variant="bodyStrong">{other?.firstName ?? 'Match'}</AppText>
              <AppText variant="caption" color={yourTurn || unread ? 'plum' : 'textMuted'} numberOfLines={1}>
                {stageLine(match, uid)}
              </AppText>
            </View>
            {unread ? (
              <View style={styles.badge}>
                <AppText style={styles.badgeText}>{unread}</AppText>
              </View>
            ) : yourTurn ? (
              <View style={styles.dot} />
            ) : null}
          </Pressable>
        );
      })}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.pinkTint,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  rowPressed: {
    opacity: 0.85,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.plum,
  },
  badgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 12,
    color: colors.white,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.pinkBorderStrong,
  },
});
