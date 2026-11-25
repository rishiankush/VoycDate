import { Image } from 'expo-image';
import { router } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { MessagesSquare, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText, MessageSheet, type MessageSheetState } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { useMatches, type Match } from '@/features/matches/useMatches';
import { EmptyCard, TabScreen } from '@/features/navigation/TabScreen';
import { clock } from '@/features/discover/labels';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { functions } from '@/lib/firebase';
import { colors, fontFamily, radii, shadows, spacing } from '@/theme';

const respondToSpark = httpsCallable<{ matchId: string; accept: boolean }, { accepted: boolean; matchId?: string }>(
  functions,
  'respondToSpark',
);

function hoursLeft(match: Match) {
  if (!match.expiresAt) return null;
  return Math.max(0, Math.round((match.expiresAt.toMillis() - Date.now()) / 3_600_000));
}

function stageLine(match: Match, uid: string) {
  const other = match.people[match.members.find((m) => m !== uid) ?? '']?.firstName ?? 'them';
  if (match.stage === 'spark_pending') {
    return match.sparkedBy === uid
      ? `Spark sent · waiting for ${other} to start a conversation`
      : `${other} Sparks you · Start a conversation?`;
  }
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
  const { profile } = useMyProfile();
  const { matches, loading } = useMatches();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<MessageSheetState>(null);
  const mode = profile.mode === 'friends' ? 'friends' : 'date';
  const visible = matches.filter((m) => (m.mode ?? 'date') === mode);

  const onSparkRespond = async (match: Match, accept: boolean) => {
    setBusyId(match.id);
    try {
      const { data } = await respondToSpark({ matchId: match.id, accept });
      if (accept && data.accepted) {
        router.push({ pathname: '/chat/[matchId]', params: { matchId: match.id } });
      }
    } catch {
      setNotice({
        title: 'Couldn’t update',
        body: 'Check your connection and try again.',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <TabScreen title="Connections">
      <AppText variant="caption" color="textMuted">
        {mode === 'friends' ? 'Friends mode' : 'Date mode'}
      </AppText>
      {!loading && visible.length === 0 ? (
        <EmptyCard
          icon={<MessagesSquare size={36} color={colors.pinkBorderStrong} />}
          title={mode === 'friends' ? 'No friend matches yet' : 'No matches yet'}
          body={
            mode === 'friends'
              ? 'Mutual likes and Sparks in Friends mode show up here.'
              : 'Mutual likes and Sparks show up here — accept a Spark to start chatting.'
          }
        />
      ) : null}
      {visible.map((match) => {
        const otherId = match.members.find((m) => m !== uid) ?? '';
        const other = match.people[otherId];
        const sparkIncoming = match.stage === 'spark_pending' && match.sparkedBy !== uid;
        const sparkOutgoing = match.stage === 'spark_pending' && match.sparkedBy === uid;
        const yourTurn = match.stage === 'awaiting_first_voice' && match.firstSenderId === uid;
        const unread = match.unread?.[uid] ?? 0;
        const busy = busyId === match.id;
        return (
          <View key={match.id} style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${other?.firstName ?? 'Match'}. ${stageLine(match, uid)}${unread ? `. ${unread} new` : ''}`}
              onPress={() =>
                match.stage === 'spark_pending'
                  ? otherId
                    ? router.push({ pathname: '/person/[uid]', params: { uid: otherId, matchId: match.id } })
                    : undefined
                  : router.push({ pathname: '/chat/[matchId]', params: { matchId: match.id } })
              }
              style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${other?.firstName ?? 'match'}’s profile`}
                onPress={() =>
                  otherId
                    ? router.push({ pathname: '/person/[uid]', params: { uid: otherId, matchId: match.id } })
                    : undefined
                }
                hitSlop={4}>
                {other?.photoUrl ? (
                  <Image source={{ uri: other.photoUrl }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={styles.avatar} />
                )}
              </Pressable>
              <View style={styles.text}>
                <View style={styles.nameRow}>
                  <AppText variant="bodyStrong">{other?.firstName ?? 'Match'}</AppText>
                  {match.stage === 'spark_pending' ? <Sparkles size={14} color={colors.plum} /> : null}
                </View>
                <AppText
                  variant="caption"
                  color={yourTurn || unread || sparkIncoming ? 'plum' : 'textMuted'}
                  numberOfLines={2}>
                  {stageLine(match, uid)}
                </AppText>
              </View>
              {unread && !sparkIncoming ? (
                <View style={styles.badge}>
                  <AppText style={styles.badgeText}>{unread}</AppText>
                </View>
              ) : yourTurn || sparkOutgoing ? (
                <View style={styles.dot} />
              ) : null}
            </Pressable>
            {sparkIncoming ? (
              <View style={styles.sparkActions}>
                {busy ? (
                  <ActivityIndicator color={colors.plum} />
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Pass on Spark from ${other?.firstName ?? 'them'}`}
                      onPress={() => void onSparkRespond(match, false)}
                      style={({ pressed }) => [styles.sparkBtn, styles.declineBtn, pressed && styles.rowPressed]}>
                      <AppText variant="label" color="plum">
                        Pass
                      </AppText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Start conversation with ${other?.firstName ?? 'them'}`}
                      onPress={() => void onSparkRespond(match, true)}
                      style={({ pressed }) => [styles.sparkBtn, styles.acceptBtn, pressed && styles.rowPressed]}>
                      <AppText variant="label" color="white">
                        Start chat
                      </AppText>
                    </Pressable>
                  </>
                )}
              </View>
            ) : null}
          </View>
        );
      })}
      <MessageSheet notice={notice} onClose={() => setNotice(null)} />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadows.card,
    overflow: 'hidden',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
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
  sparkActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sparkBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  declineBtn: {
    backgroundColor: colors.pinkTint,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
  },
  acceptBtn: {
    backgroundColor: colors.plum,
  },
});
