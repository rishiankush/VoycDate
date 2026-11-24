import { Image } from 'expo-image';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { BadgeCheck, Bookmark, ChevronRight, Heart, Volume2, VolumeX, X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

import { intentLabel, nameAgeLine, placeLine } from './labels';
import { PhotoGradient } from './PhotoGradient';
import type { DiscoverCard, SwipeAction } from './types';

function setMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}

function syncPlayback(player: VideoPlayer, active: boolean) {
  if (active) {
    player.play();
    return;
  }
  player.pause();
  player.currentTime = 0;
}

type VideoFeedItemProps = {
  card: DiscoverCard;
  height: number;
  isActive: boolean;
  shouldLoad: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onAction: (action: SwipeAction) => void;
  onOpenProfile: () => void;
};

/** Full-bleed TikTok-style Discover card. Video autoplays; photos live on the profile screen. */
export function VideoFeedItem({
  card,
  height,
  isActive,
  shouldLoad,
  muted,
  onToggleMute,
  onAction,
  onOpenProfile,
}: VideoFeedItemProps) {
  const video = card.video;
  const [showCover, setShowCover] = useState(true);
  const [progress, setProgress] = useState(0);
  const player = useVideoPlayer(shouldLoad && video ? video.url : null, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    setShowCover(true);
    setProgress(0);
  }, [card.uid, video?.url]);

  useEffect(() => setMuted(player, muted), [player, muted]);
  useEffect(() => syncPlayback(player, isActive), [player, isActive]);

  useEffect(() => {
    if (!isActive || !video) return;
    const timer = setTimeout(() => setShowCover(false), 900);
    return () => clearTimeout(timer);
  }, [isActive, video, card.uid]);

  useEffect(() => {
    if (!isActive || !video) return;
    const duration = Math.max((video.durationMs || 0) / 1000, player.duration || 0, 0.1);
    const id = setInterval(() => {
      setProgress(Math.min(1, (player.currentTime || 0) / duration));
    }, 100);
    return () => clearInterval(id);
  }, [isActive, video, player, card.uid]);

  const cover = video?.posterUrl ?? null;
  const intent = intentLabel(card.intent);

  return (
    <View style={[styles.item, { height }]}>
      {shouldLoad && video ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          onFirstFrameRender={() => setShowCover(false)}
        />
      ) : null}

      {showCover && cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      {!video && card.photos[0] ? (
        <Image source={{ uri: card.photos[0].url }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}

      <PhotoGradient />

      {video ? (
        <View style={styles.progressTrack} pointerEvents="none">
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      ) : null}

      <View style={styles.actions}>
        <ActionButton label={muted ? 'Unmute' : 'Mute'} onPress={onToggleMute}>
          {muted ? <VolumeX size={22} color={colors.white} /> : <Volume2 size={22} color={colors.white} />}
        </ActionButton>
        <ActionButton label={`Save ${card.firstName}`} onPress={() => onAction('save')}>
          <Bookmark size={22} color={colors.white} />
        </ActionButton>
        <ActionButton label={`Pass on ${card.firstName}`} onPress={() => onAction('pass')}>
          <X size={24} color={colors.white} strokeWidth={2.5} />
        </ActionButton>
        <ActionButton label={`Like ${card.firstName}`} onPress={() => onAction('like')} primary>
          <Heart size={28} color={colors.white} />
        </ActionButton>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${nameAgeLine(card)}. ${placeLine(card)}. View profile`}
        onPress={onOpenProfile}
        style={styles.info}>
        <View style={styles.nameRow}>
          <AppText variant="title" color="white">
            {nameAgeLine(card)}
          </AppText>
          {card.verified ? <BadgeCheck size={24} color={colors.white} fill={colors.pink} /> : null}
          <ChevronRight size={22} color={colors.white} />
        </View>
        <AppText variant="body" color="white">
          {placeLine(card)}
        </AppText>
        {muted && video?.transcript ? (
          <AppText variant="body" color="white" style={styles.caption} numberOfLines={3}>
            “{video.transcript}”
          </AppText>
        ) : null}
        <View style={styles.chips}>
          {intent ? (
            <View style={[styles.chip, styles.intentChip]}>
              <AppText variant="label" color="plum">
                {intent}
              </AppText>
            </View>
          ) : null}
          {card.interests.slice(0, 3).map((interest) => (
            <View key={interest} style={styles.chip}>
              <AppText variant="label" color="white">
                {interest}
              </AppText>
            </View>
          ))}
        </View>
      </Pressable>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  children,
  primary = false,
  active = false,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  primary?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.actionButton,
        primary && styles.actionPrimary,
        active && styles.actionActive,
        pressed && styles.pressed,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.plumDeep,
  },
  progressTrack: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.white,
  },
  actions: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  actionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 11, 43, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  actionPrimary: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.plum,
    borderColor: colors.pink,
  },
  actionActive: {
    backgroundColor: colors.pinkBorderStrong,
  },
  pressed: {
    transform: [{ scale: 0.92 }],
  },
  info: {
    position: 'absolute',
    left: spacing.md,
    right: 96,
    bottom: spacing.xl,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  caption: {
    fontStyle: 'italic',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  intentChip: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
});
