import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Ellipsis, ImagePlus, Info, Lock, SendHorizontal } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, GlowBackground, IconButton } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { ChatPlayerProvider } from '@/features/chat/ChatPlayer';
import { PhotoBubble } from '@/features/chat/PhotoBubble';
import { RecordButton } from '@/features/chat/RecordButton';
import { CONVERSATION_STARTERS } from '@/features/chat/starters';
import { TextBubble } from '@/features/chat/TextBubble';
import type { ChatMessage } from '@/features/chat/types';
import { UnlockCard } from '@/features/chat/UnlockCard';
import { useCaptionsPreference } from '@/features/chat/useCaptionsPreference';
import {
  markMatchRead,
  useMatch,
  useMessages,
  usePhotoSender,
  useTextSender,
  useVoiceSender,
} from '@/features/chat/useChat';
import { VoiceBubble } from '@/features/chat/VoiceBubble';
import { VoiceExchangeCard } from '@/features/chat/VoiceExchangeCard';
import type { Match } from '@/features/matches/useMatches';
import { SafetyActions } from '@/features/safety/SafetyActions';
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
    }
    lastLabel = label;
    rows.push({ kind: 'message', id: message.id, message });
  }
  return rows;
}

function matchedLabel(match: Match, now: Date, uid: string) {
  if (match.stage === 'spark_pending') {
    return match.sparkedBy === uid ? 'Spark sent · waiting for a reply' : 'Spark request · Accept in Connections';
  }
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

function MessageRow({
  message,
  mine,
  captionsOn,
  onRetryVoice,
  onRetryText,
  onRetryPhoto,
}: {
  message: ChatMessage;
  mine: boolean;
  captionsOn: boolean;
  onRetryVoice: () => void;
  onRetryText: () => void;
  onRetryPhoto: () => void;
}) {
  if (message.type === 'text') {
    return <TextBubble message={message} mine={mine} onRetry={onRetryText} />;
  }
  if (message.type === 'photo') {
    return <PhotoBubble message={message} mine={mine} onRetry={onRetryPhoto} />;
  }
  return <VoiceBubble message={message} mine={mine} captionsOn={captionsOn} onRetry={onRetryVoice} />;
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { user } = useSession();
  const uid = user?.uid ?? '';
  const { match, loading } = useMatch(matchId);
  const messages = useMessages(matchId);
  const voice = useVoiceSender(matchId, uid);
  const text = useTextSender(matchId, uid);
  const photo = usePhotoSender(matchId, uid);
  const [captionsOn, setCaptionsOn] = useCaptionsPreference();
  const [starter, setStarter] = useState(0);
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const unread = match?.unread?.[uid] ?? 0;
  useEffect(() => {
    if (unread > 0) markMatchRead(matchId);
  }, [unread, matchId]);

  const pending = [...voice.pending, ...text.pending, ...photo.pending];
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
  const sparkPending = match.stage === 'spark_pending';
  const waitingForThem = match.stage === 'awaiting_first_voice' && match.firstSenderId !== uid;
  const unlocked = match.stage === 'text_unlocked';
  const canRecord = match.status === 'active' && !expired && !waitingForThem && !sparkPending;
  const helper = helperText(match, uid, otherId, other.firstName);

  const openProfile = () => {
    if (!otherId || !matchId) return;
    router.push({ pathname: '/person/[uid]', params: { uid: otherId, matchId } });
  };

  const sendDraft = async () => {
    const value = draft;
    setDraft('');
    await text.send(value);
  };

  return (
    <ChatPlayerProvider>
      <View style={styles.root}>
        <GlowBackground />
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <IconButton accessibilityLabel="Back" onPress={router.back} icon={<ChevronLeft size={22} color={colors.plum} />} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${other.firstName}’s profile`}
              onPress={openProfile}
              hitSlop={8}>
              {other.photoUrl ? (
                <Image source={{ uri: other.photoUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatar} />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${other.firstName}’s profile`}
              onPress={openProfile}
              style={styles.headerText}>
              <AppText variant="bodyStrong" style={styles.name}>
                {other.firstName}
              </AppText>
              <AppText variant="caption">{matchedLabel(match, new Date(now), uid)}</AppText>
            </Pressable>
            {match.status === 'active' ? (
              <SafetyActions
                targetId={otherId}
                targetName={other.firstName}
                matchId={matchId}
                canUnmatch
                onViewProfile={openProfile}>
                {(open) => (
                  <IconButton
                    accessibilityLabel="Conversation options"
                    onPress={open}
                    icon={<Ellipsis size={22} color={colors.plum} />}
                  />
                )}
              </SafetyActions>
            ) : null}
          </View>

          <FlatList
            style={styles.flex}
            data={rows}
            keyExtractor={(row) => row.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.headerCards}>
                <VoiceExchangeCard match={match} uid={uid} otherName={other.firstName} now={now} />
                {match.stage === 'deciding' ? <UnlockCard match={match} uid={uid} otherName={other.firstName} /> : null}
              </View>
            }
            renderItem={({ item }) =>
              item.kind === 'day' ? (
                <AppText variant="label" color="textMuted" align="center" style={styles.day}>
                  {item.label}
                </AppText>
              ) : (
                <MessageRow
                  message={item.message}
                  mine={item.message.senderId === uid}
                  captionsOn={captionsOn}
                  onRetryVoice={() => voice.retry(item.message)}
                  onRetryText={() => text.retry(item.message)}
                  onRetryPhoto={() => photo.retry(item.message)}
                />
              )
            }
            ListFooterComponent={
              canRecord && !unlocked ? (
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
            {canRecord && unlocked ? (
              <View style={styles.unlockedComposer}>
                <View style={styles.textRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Send a photo"
                    onPress={photo.pickAndSend}
                    disabled={photo.sending}
                    style={styles.iconBtn}>
                    <ImagePlus size={22} color={colors.plum} />
                  </Pressable>
                  <TextInput
                    style={styles.input}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Say something…"
                    placeholderTextColor={colors.placeholder}
                    multiline
                    maxLength={2000}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                    onPress={sendDraft}
                    disabled={!draft.trim() || text.sending}
                    style={[styles.iconBtn, styles.sendBtn, (!draft.trim() || text.sending) && styles.sendDisabled]}>
                    <SendHorizontal size={18} color={colors.white} />
                  </Pressable>
                </View>
                <View style={styles.voiceRow}>
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
                  <RecordButton onRecorded={voice.send} />
                  <View style={styles.side}>
                    <AppText variant="caption" color="textMuted" align="center">
                      Voice still works
                    </AppText>
                  </View>
                </View>
              </View>
            ) : canRecord ? (
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
                <RecordButton onRecorded={voice.send} />
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
                  : sparkPending
                    ? match.sparkedBy === uid
                      ? `Waiting for ${other.firstName} to accept your Spark.`
                      : `Accept ${other.firstName}’s Spark in Connections to start chatting.`
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
  flex: {
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
  headerCards: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
    marginHorizontal: layout.screenPadding,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.lg + 4,
    backgroundColor: colors.white,
    ...shadows.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unlockedComposer: {
    flex: 1,
    gap: spacing.sm,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.pinkTint,
    color: colors.text,
    fontFamily: fontFamily.sansRegular,
    fontSize: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pinkTint,
  },
  sendBtn: {
    backgroundColor: colors.plum,
  },
  sendDisabled: {
    opacity: 0.45,
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
