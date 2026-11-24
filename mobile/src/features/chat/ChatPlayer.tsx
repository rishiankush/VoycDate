import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

type ChatPlayerValue = {
  currentId: string | null;
  playing: boolean;
  progress: number;
  toggle: (id: string, uri: string) => void;
};

const ChatPlayerContext = createContext<ChatPlayerValue | null>(null);

/** One player per chat so only a single voice note plays at a time. */
export function ChatPlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const toggle = useCallback(
    (id: string, uri: string) => {
      if (id === currentId) {
        if (status.playing) {
          player.pause();
          return;
        }
        if (status.didJustFinish || (status.duration && status.currentTime >= status.duration)) player.seekTo(0);
        player.play();
        return;
      }
      player.replace({ uri });
      setCurrentId(id);
      player.play();
    },
    [currentId, player, status.playing, status.didJustFinish, status.duration, status.currentTime],
  );

  const value = useMemo(
    () => ({
      currentId,
      playing: status.playing,
      progress: status.duration ? status.currentTime / status.duration : 0,
      toggle,
    }),
    [currentId, status.playing, status.duration, status.currentTime, toggle],
  );

  return <ChatPlayerContext value={value}>{children}</ChatPlayerContext>;
}

export function useChatPlayer() {
  const value = use(ChatPlayerContext);
  if (!value) throw new Error('useChatPlayer must be used inside ChatPlayerProvider');
  return value;
}
