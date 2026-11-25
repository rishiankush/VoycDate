import { Image } from 'expo-image';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { BadgeCheck, Volume2, VolumeX } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui';
import { colors, radii, shadows, spacing } from '@/theme';

import { intentLabel, nameAgeLine, placeLine } from './labels';
import { PhotoGradient } from './PhotoGradient';
import type { DiscoverCard, SwipeAction } from './types';

const SCREEN_W = Dimensions.get('window').width;
const SWIPE_X = SCREEN_W * 0.28;
const OUT_X = SCREEN_W * 1.2;

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

type ProfileCardProps = {
  card: DiscoverCard;
  active: boolean;
  /** Next card sits slightly behind for a deck peek. */
  behind?: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onAction: (action: SwipeAction) => void;
  onOpenProfile: () => void;
};

export function ProfileCard({
  card,
  active,
  behind = false,
  muted,
  onToggleMute,
  onAction,
  onOpenProfile,
}: ProfileCardProps) {
  const video = card.video;
  const [showCover, setShowCover] = useState(true);
  const player = useVideoPlayer(active && video ? video.url : null, (p) => {
    p.loop = true;
  });

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const leaving = useSharedValue(false);

  useEffect(() => {
    setShowCover(true);
  }, [card.uid, video?.url]);

  useEffect(() => setMuted(player, muted), [player, muted]);
  useEffect(() => syncPlayback(player, active && !behind), [player, active, behind]);

  // Keep poster until the first decoded frame — avoids a black flash on slow networks.
  // No timed hide: that would uncover the player before it's ready and waste a blank paint.

  const commit = (action: SwipeAction) => {
    onAction(action);
  };

  const flyOut = (action: SwipeAction) => {
    'worklet';
    leaving.value = true;
    const dir = action === 'like' ? 1 : -1;
    tx.value = withTiming(dir * OUT_X, { duration: 220 }, (done) => {
      if (done) runOnJS(commit)(action);
    });
    ty.value = withTiming(action === 'like' ? -24 : 24, { duration: 220 });
  };

  const openProfile = () => {
    onOpenProfile();
  };

  // activeOffsetX keeps a light tap from becoming a swipe, so Exclusive can fall through to Tap.
  const pan = Gesture.Pan()
    .enabled(active && !behind)
    .activeOffsetX([-16, 16])
    .onUpdate((e) => {
      if (leaving.value) return;
      tx.value = e.translationX;
      ty.value = e.translationY * 0.15;
    })
    .onEnd((e) => {
      if (leaving.value) return;
      if (e.translationX > SWIPE_X || e.velocityX > 900) {
        flyOut('like');
        return;
      }
      if (e.translationX < -SWIPE_X || e.velocityX < -900) {
        flyOut('pass');
        return;
      }
      tx.value = withSpring(0, { damping: 18, stiffness: 180 });
      ty.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const tap = Gesture.Tap()
    .enabled(active && !behind)
    .maxDistance(12)
    .onEnd(() => {
      if (leaving.value) return;
      runOnJS(openProfile)();
    });

  const gesture = Gesture.Exclusive(pan, tap);

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(tx.value, [-SCREEN_W, 0, SCREEN_W], [-12, 0, 12], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: behind ? 0 : tx.value },
        { translateY: behind ? 8 : ty.value },
        { rotate: `${behind ? 0 : rotate}deg` },
        { scale: behind ? 0.96 : 1 },
      ],
      opacity: behind ? 0.88 : 1,
    };
  });

  const likeStamp = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [24, SWIPE_X], [0, 1], Extrapolation.CLAMP),
    transform: [{ rotate: '-12deg' }, { scale: interpolate(tx.value, [24, SWIPE_X], [0.85, 1], Extrapolation.CLAMP) }],
  }));

  const passStamp = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-SWIPE_X, -24], [1, 0], Extrapolation.CLAMP),
    transform: [{ rotate: '12deg' }, { scale: interpolate(tx.value, [-SWIPE_X, -24], [1, 0.85], Extrapolation.CLAMP) }],
  }));

  const cover = video?.posterUrl ?? card.photos[0]?.url ?? null;
  const isFriends = card.mode === 'friends';
  const intent = isFriends ? null : intentLabel(card.intent);

  const content = (
    <Animated.View
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${nameAgeLine(card)}. ${placeLine(card)}. Open full profile`}
      style={[styles.card, behind && styles.cardBehind, cardStyle]}
      pointerEvents={behind ? 'none' : 'auto'}>
      {active && video ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          pointerEvents="none"
          onFirstFrameRender={() => setShowCover(false)}
        />
      ) : null}

      {(showCover || !video || behind) && cover ? (
        <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" pointerEvents="none" />
      ) : null}
      {!video && !cover ? <View style={[StyleSheet.absoluteFill, styles.fallback]} pointerEvents="none" /> : null}

      <PhotoGradient />

      {active && !behind ? (
        <>
          <Animated.View style={[styles.stamp, styles.likeStamp, likeStamp]} pointerEvents="none">
            <AppText variant="heading" color="success">
              LIKE
            </AppText>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.passStamp, passStamp]} pointerEvents="none">
            <AppText variant="heading" color="danger">
              PASS
            </AppText>
          </Animated.View>
        </>
      ) : null}

      {video ? (
        <View style={styles.introBadge} pointerEvents="none">
          <AppText variant="label" color="plum">
            Intro video
          </AppText>
        </View>
      ) : null}

      {active && video && !behind ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={muted ? 'Unmute intro' : 'Mute intro'}
          onPress={onToggleMute}
          hitSlop={8}
          style={styles.mute}>
          {muted ? <VolumeX size={18} color={colors.white} /> : <Volume2 size={18} color={colors.white} />}
        </Pressable>
      ) : null}

      <View style={styles.info} pointerEvents="none">
        <View style={styles.nameRow}>
          <AppText variant="title" color="white" style={styles.name}>
            {nameAgeLine(card)}
          </AppText>
          {card.verified ? <BadgeCheck size={22} color={colors.white} fill={colors.pink} /> : null}
        </View>
        <AppText variant="body" color="white">
          {placeLine(card)}
        </AppText>
        {isFriends ? (
          <View style={styles.intentChip}>
            <AppText variant="label" color="plum">
              Friends
            </AppText>
          </View>
        ) : null}
        {intent ? (
          <View style={styles.intentChip}>
            <AppText variant="label" color="plum">
              {intent}
            </AppText>
          </View>
        ) : null}
        <AppText variant="caption" color="onDarkMuted">
          Tap for full profile · swipe to like or pass
        </AppText>
      </View>
    </Animated.View>
  );

  if (behind) return content;
  return <GestureDetector gesture={gesture}>{content}</GestureDetector>;
}

const styles = StyleSheet.create({
  card: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.plumDeep,
    ...shadows.card,
  },
  cardBehind: {
    // Peek of the next profile under the active card.
  },
  fallback: {
    backgroundColor: colors.plum,
  },
  stamp: {
    position: 'absolute',
    top: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 3,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  likeStamp: {
    left: spacing.lg,
    borderColor: colors.success,
  },
  passStamp: {
    right: spacing.lg,
    borderColor: colors.danger,
  },
  introBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.pink,
  },
  mute: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 11, 43, 0.45)',
  },
  info: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    gap: spacing.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontSize: 28,
  },
  intentChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.pink,
  },
});
