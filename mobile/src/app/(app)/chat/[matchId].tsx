import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Info, Lock } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, GlowBackground, IconButton } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { ChatPlayerProvider } from '@/features/chat/ChatPlayer';
import { RecordButton } from '@/features/chat/RecordButton';
import { CONVERSATION_STARTERS } from '@/features/chat/starters';
import type { ChatMessage } from '@/features/chat/types';
import { useCaptionsPreference } from '@/features/chat/useCaptionsPreference';
import { markMatchRead, useMatch, useMessages, useVoiceSender } from '@/features/chat/useChat';
import { VoiceBubble } from '@/features/chat/VoiceBubble';
import { VoiceExchangeCard } from '@/features/chat/VoiceExchangeCard';
import type { Match } from '@/features/matches/useMatches';
import { colors, fontFamily, layout, radii, shadows, spacing } from '@/theme';

const THRESHOLD = 3;

type Row = { kind: 'day'; id: string; label: string } | { kind: 'message'; id: string; message: ChatMessage };

function dayLabel(date: Date, now: Date) {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function buildRows(messages: ChatMessage[], now: Date): Row[] {
  const rows: Row[] = [];
  let lastLabel = '';
  for (const message of messages) {
    const label = dayLabel(message.createdAt?.toDate() ?? now, now);
    if (label !== lastLabel) {
      rows.push({ kind: 'day', id: `day-${label}-${message.id}`, label });
      lastLabel = label;
    }
    rows.push({ kind: 'message', id: message.id, message });
  }
  return rows;
}

function matchedLabel(match: Match, now: Date) {
  const created = match.createdAt?.toDate();
  const day = created ? dayLabel(created, now) : 'Today';
  const when = day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : `on ${day}`;
  const mode = match.stage === 'text_unlocked' ? 'Text unlocked' : 'Voice only';
  return `Matched ${when} · ${mode}`;
}

function helperText(match: Match, uid: string, otherId: string, otherName: string) {
  if (match.stage !== 'voice') return null;
  const perUser = match.voice?.perUser ?? {};
  const remaining = Math.max(0, THRESHOLD - (match.voice?.qualifiedCount ?? 0));
  if (remaining === 0 && !perUser[uid]) return 'Send one voice note of your own to finish the exchange';
  if (remaining === 0 && !perUser[otherId]) return `Waiting for ${otherName}’s voice note`;
  const count = remaining === 1 ? 'One more message to go' : `${remaining} more messages to go`;
  return `${count} · under 3 seconds doesn’t count`;
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { user } = useSession();
  const uid = user?.uid ?? '';
  const { match, loading } = useMatch(matchId);
  const messages = useMessages(matchId);
  const { pending, send, retry } = useVoiceSender(matchId, uid);
  const [captionsOn, setCaptionsOn] = useCaptionsPreference();
  const [starter, setStarter] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const unread = match?.unread?.[uid] ?? 0;
  useEffect(() => {
    if (unread > 0) markMatchRead(matchId);
  }, [unread, matchId]);

  const rows = useMemo(
    () => buildRows([...messages, ...pending.filter((p) => !messages.some((m) => m.id === p.id))], new Date(now)),
    [messages, pending, now],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.plum} />
      </View>
    );
  }

  if (!match || !match.members.includes(uid)) {
    return (
      <SafeAreaView style={styles.centered}>
        <AppText variant="bodyLarge">This conversation isn’t available.</AppText>
      </SafeAreaView>
    );
  }

  const otherId = match.members.find((m) => m !== uid) ?? '';
  const other = match.people?.[otherId] ?? { firstName: 'Your match', photoUrl: null };
  const expired = match.status === 'expired' || match.stage === 'expired';
  const waitingForThem = match.stage === 'awaiting_first_voice' && match.firstSenderId !== uid;
  const canRecord = match.status === 'active' && !expired && !waitingForThem;
  const helper = helperText(match, uid, otherId, other.firstName);

  return (
    <ChatPlayerProvider>
      <View style={styles.root}>
        <GlowBackground />
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <IconButton accessibilityLabel="Back" onPress={router.back} icon={<ChevronLeft size={22} color={colors.plum} />} />
            {other.photoUrl ? (
              <Image source={{ uri: other.photoUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatar} />
            )}
            <View style={styles.headerText}>
              <AppText variant="bodyStrong" style={styles.name}>
                {other.firstName}
              </AppText>
              <AppText variant="caption">{matchedLabel(match, new Date(now))}</AppText>
            </View>
          </View>

          <FlatList
            data={rows}
            keyExtractor={(row) => row.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <VoiceExchangeCard match={match} uid={uid} otherName={other.firstName} now={now} />
            }
            renderItem={({ item }) =>
              item.kind === 'day' ? (
                <AppText variant="label" color="textMuted" align="center" style={styles.day}>
                  {item.label}
                </AppText>
              ) : (
                <VoiceBubble
                  message={item.message}
                  mine={item.message.senderId === uid}
                  captionsOn={captionsOn}
                  onRetry={() => retry(item.message)}
                />
              )
            }
            ListFooterComponent={
              canRecord ? (
                <View style={styles.footer}>
                  {helper ? (
                    <View style={styles.helper}>
                      <Info size={14} color={colors.plum} />
                      <AppText variant="label" color="plum" style={styles.helperText}>
                        {helper}
                      </AppText>
                    </View>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityHint="Shows another conversation idea"
                    onPress={() => setStarter((i) => (i + 1) % CONVERSATION_STARTERS.length)}
                    style={styles.starter}>
                    <AppText variant="label" color="plum">
                      Try: {CONVERSATION_STARTERS[starter]}
                    </AppText>
                  </Pressable>
                </View>
              ) : undefined
            }
          />

          <View style={styles.composer}>
            {canRecord ? (
              <>
                <View style={styles.side}>
                  <Switch
                    value={captionsOn}
                    onValueChange={setCaptionsOn}
                    trackColor={{ true: colors.plum, false: colors.pinkBorder }}
                    thumbColor={colors.white}
                    ios_backgroundColor={colors.pinkBorder}
                    accessibilityLabel="Captions"
                  />
                  <AppText variant="caption" color="text">
                    Captions {captionsOn ? 'on' : 'off'}
                  </AppText>
                </View>
                <RecordButton onRecorded={send} />
                <View style={styles.side}>
                  <View style={styles.lock}>
                    <Lock size={18} color={colors.textMuted} />
                  </View>
                  <AppText variant="caption" color="text">
                    Text locked
                  </AppText>
                </View>
              </>
            ) : (
              <AppText variant="bodyStrong" color="textMuted" align="center" style={styles.blocked}>
                {expired
                  ? 'This match has expired.'
                  : `Waiting for ${other.firstName}’s first voice note. We’ll let you know when it arrives.`}
              </AppText>
            )}
          </View>
        </SafeAreaView>
      </View>
    </ChatPlayerProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xs,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.pinkSoft,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 18,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  day: {
    marginVertical: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  helper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  helperText: {
    fontFamily: fontFamily.sansBold,
  },
  starter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.pink,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: layout.screenPadding,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.lg + 4,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  side: {
    width: 84,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  lock: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pinkTint,
  },
  blocked: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
});
