import { AlertCircle, Pause, Play } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { clock } from '@/features/discover/labels';
import { colors, fontFamily, radii, shadows, spacing } from '@/theme';

import { useChatPlayer } from './ChatPlayer';
import type { ChatMessage } from './types';

const DEFAULT_WAVE = [0.3, 0.5, 0.4, 0.7, 0.5, 0.9, 0.6, 0.4, 0.8, 0.5, 0.35, 0.7, 0.45, 0.8, 0.4, 0.6, 0.3, 0.5];
const BAR_COUNT = 24;

function bars(waveform: number[]) {
  const source = waveform.length ? waveform : DEFAULT_WAVE;
  return Array.from({ length: BAR_COUNT }, (_, i) => source[Math.floor((i / BAR_COUNT) * source.length)] ?? 0.3);
}

type VoiceBubbleProps = {
  message: ChatMessage;
  mine: boolean;
  captionsOn: boolean;
  onRetry?: () => void;
};

export function VoiceBubble({ message, mine, captionsOn, onRetry }: VoiceBubbleProps) {
  const player = useChatPlayer();
  const [showCaption, setShowCaption] = useState<boolean | null>(null);
  const isCurrent = player.currentId === message.id;
  const playing = isCurrent && player.playing;
  const progress = isCurrent ? player.progress : 0;
  const sending = message.local?.status === 'sending';
  const failed = message.local?.status === 'failed';
  const uri = message.local?.uri ?? message.audioUrl ?? '';

  const transcript = message.transcript?.status === 'done' ? message.transcript.text : null;
  const captionVisible = transcript ? (showCaption ?? captionsOn) : false;
  const transcribing = captionsOn && !message.local && message.transcript?.status === 'pending';
  const captionFailed = captionsOn && message.transcript?.status === 'failed';

  return (
    <View style={[styles.wrapper, mine ? styles.mineWrapper : styles.theirsWrapper]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${playing ? 'Pause' : 'Play'} ${mine ? 'your' : 'their'} voice message, ${clock(message.durationMs ?? 0)}`}
        onPress={() => (failed ? onRetry?.() : uri ? player.toggle(message.id, uri) : undefined)}
        style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <View style={[styles.play, mine ? styles.playMine : styles.playTheirs]}>
          {sending ? (
            <ActivityIndicator size="small" color={mine ? colors.plum : colors.white} />
          ) : failed ? (
            <AlertCircle size={18} color={colors.danger} />
          ) : playing ? (
            <Pause size={16} color={mine ? colors.plum : colors.white} fill={mine ? colors.plum : colors.white} />
          ) : (
            <Play size={16} color={mine ? colors.plum : colors.white} fill={mine ? colors.plum : colors.white} style={styles.playIcon} />
          )}
        </View>
        <View style={styles.wave}>
          {bars(message.waveform ?? []).map((h, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                { height: 4 + h * 22 },
                mine ? styles.barMine : styles.barTheirs,
                i / BAR_COUNT < progress && (mine ? styles.barMinePlayed : styles.barTheirsPlayed),
              ]}
            />
          ))}
        </View>
        <AppText variant="label" color={mine ? 'white' : 'plum'} style={styles.duration}>
          {clock(message.durationMs ?? 0)}
        </AppText>
      </Pressable>

      {failed ? (
        <AppText variant="caption" color="danger">
          Not sent. Tap to retry.
        </AppText>
      ) : null}

      {transcribing ? (
        <AppText variant="caption" color="textMuted">
          Transcribing…
        </AppText>
      ) : captionFailed ? (
        <AppText variant="caption" color="textMuted">
          Captions unavailable
        </AppText>
      ) : null}

      {transcript ? (
        captionVisible ? (
          <Pressable onPress={() => setShowCaption(false)} style={styles.caption} accessibilityRole="button">
            <AppText variant="body" color="text">
              <AppText variant="body" color="text" style={styles.captionLabel}>
                Captions ·{' '}
              </AppText>
              {transcript}
            </AppText>
          </Pressable>
        ) : (
          <Pressable onPress={() => setShowCaption(true)} hitSlop={6} accessibilityRole="button">
            <AppText variant="label" color="plum" style={styles.showCaptions}>
              Show captions
            </AppText>
          </Pressable>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    maxWidth: '86%',
    gap: spacing.xxs,
  },
  mineWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirsWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
  },
  mine: {
    backgroundColor: colors.plum,
  },
  theirs: {
    backgroundColor: colors.white,
    ...shadows.card,
  },
  play: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playMine: {
    backgroundColor: colors.white,
  },
  playTheirs: {
    backgroundColor: colors.plum,
  },
  playIcon: {
    marginLeft: 2,
  },
  wave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 28,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
  barMine: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  barMinePlayed: {
    backgroundColor: colors.white,
  },
  barTheirs: {
    backgroundColor: colors.pinkBorderStrong,
  },
  barTheirsPlayed: {
    backgroundColor: colors.plum,
  },
  duration: {
    minWidth: 32,
    fontFamily: fontFamily.sansBold,
  },
  caption: {
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.pinkBorderStrong,
    backgroundColor: colors.white,
  },
  captionLabel: {
    fontFamily: fontFamily.sansBold,
  },
  showCaptions: {
    textDecorationLine: 'underline',
  },
});
