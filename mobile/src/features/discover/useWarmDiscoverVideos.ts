import { Image } from 'expo-image';
import { createVideoPlayer, type VideoPlayer } from 'expo-video';
import { useEffect } from 'react';

import type { DiscoverCard } from './types';

/** Lean buffer so intros start sooner (≤10s clips don’t need a long forward buffer). */
export const FAST_INTRO_BUFFER = {
  preferredForwardBufferDuration: 1.5,
  minBufferForPlayback: 0.5,
  waitsToMinimizeStalling: false,
  prioritizeTimeOverSizeThreshold: true,
} as const;

export function videoSource(url: string) {
  return { uri: url, useCaching: true as const };
}

/**
 * Prefetch posters + quietly buffer the next few intro videos so a swipe
 * hits a warm cache instead of a cold Firebase download.
 */
export function useWarmDiscoverVideos(cards: DiscoverCard[]) {
  // Warm the upcoming cards only — the top card already has an active player.
  const urlKey = cards
    .slice(1, 4)
    .map((c) => c.video?.url)
    .filter(Boolean)
    .join('|');
  const posterKey = cards
    .slice(0, 4)
    .map((c) => c.video?.posterUrl ?? c.photos[0]?.url)
    .filter(Boolean)
    .join('|');

  useEffect(() => {
    if (!posterKey) return;
    for (const url of posterKey.split('|')) {
      void Image.prefetch(url);
    }
  }, [posterKey]);

  useEffect(() => {
    if (!urlKey) return;
    const urls = urlKey.split('|');

    const players: VideoPlayer[] = [];
    const removeListeners: Array<() => void> = [];

    for (const url of urls) {
      try {
        const player = createVideoPlayer(videoSource(url));
        player.loop = true;
        player.muted = true;
        player.bufferOptions = { ...FAST_INTRO_BUFFER };
        const sub = player.addListener('statusChange', ({ status }) => {
          if (status === 'readyToPlay') {
            player.pause();
            player.currentTime = 0;
          }
        });
        removeListeners.push(() => sub.remove());
        // Kick the download/decode without showing a view.
        player.play();
        players.push(player);
      } catch {
        // Expo Go / missing native module — Discover still works without warmup.
      }
    }

    return () => {
      for (const remove of removeListeners) remove();
      for (const player of players) {
        try {
          player.pause();
          player.release();
        } catch {
          // already released
        }
      }
    };
  }, [urlKey]);
}
