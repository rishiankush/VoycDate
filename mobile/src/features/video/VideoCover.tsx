import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

type VideoCoverProps = {
  url: string;
  /** Still frame shown until the first video frame (avoids black flash; no extra API). */
  posterUrl?: string | null;
  muted?: boolean;
  loop?: boolean;
  /** When false, keep poster only — no player / no network for the video. */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Plays a muted looping intro with a poster overlay until ready.
 * Cost notes: uses existing posterUrl from the card; only attaches a player when `active`.
 */
export function VideoCover({
  url,
  posterUrl = null,
  muted = true,
  loop = true,
  active = true,
  style,
}: VideoCoverProps) {
  const [showCover, setShowCover] = useState(true);
  const player = useVideoPlayer(active ? url : null, (p) => {
    p.loop = loop;
    p.muted = muted;
    if (active) p.play();
  });

  useEffect(() => {
    setShowCover(true);
  }, [url]);

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (!active) {
      player.pause();
      return;
    }
    player.play();
  }, [player, active]);

  return (
    <View style={[styles.root, style]}>
      {active ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          onFirstFrameRender={() => setShowCover(false)}
        />
      ) : null}
      {showCover || !active ? (
        posterUrl ? (
          <Image source={{ uri: posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={posterUrl} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: colors.pinkTint,
  },
  placeholder: {
    backgroundColor: colors.pinkSoft,
  },
});
