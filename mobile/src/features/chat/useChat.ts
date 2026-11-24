import { collection, doc, limitToLast, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useCallback, useEffect, useState } from 'react';

import type { Match } from '@/features/matches/useMatches';
import { db, functions } from '@/lib/firebase';
import { uploadFile } from '@/lib/upload';

import type { ChatMessage, RecordedClip } from './types';

const MESSAGE_LIMIT = 60;

const sendVoiceMessageFn = httpsCallable<
  { matchId: string; messageId: string; path: string; url: string; durationMs: number; waveform: number[] },
  { ok: boolean; stage?: string }
>(functions, 'sendVoiceMessage');
const markMatchReadFn = httpsCallable<{ matchId: string }, { ok: boolean }>(functions, 'markMatchRead');

export function useMatch(matchId: string) {
  const [state, setState] = useState<{ id: string; match: Match | null } | null>(null);

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'matches', matchId),
        (snap) => setState({ id: matchId, match: snap.exists() ? ({ id: snap.id, ...snap.data() } as Match) : null }),
        () => setState({ id: matchId, match: null }),
      ),
    [matchId],
  );

  const current = state && state.id === matchId ? state : null;
  return { match: current?.match ?? null, loading: current === null };
}

export function useMessages(matchId: string) {
  const [state, setState] = useState<{ id: string; messages: ChatMessage[] } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'matches', matchId, 'messages'), orderBy('createdAt'), limitToLast(MESSAGE_LIMIT));
    return onSnapshot(q, (snap) =>
      setState({ id: matchId, messages: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, 'id'>) })) }),
    );
  }, [matchId]);

  return state && state.id === matchId ? state.messages : [];
}

const newMessageId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/** Sends voice notes with an optimistic local copy that can be retried if the upload fails. */
export function useVoiceSender(matchId: string, uid: string) {
  const [pending, setPending] = useState<ChatMessage[]>([]);

  const upload = useCallback(
    async (message: ChatMessage) => {
      setPending((list) => list.map((m) => (m.id === message.id ? { ...m, local: { uri: m.local!.uri, status: 'sending' } } : m)));
      try {
        const path = `matches/${matchId}/voice/${message.id}.m4a`;
        const { url } = await uploadFile(message.local!.uri, path, 'audio/mp4', {
          customMetadata: { uploaderId: uid, matchId },
        });
        await sendVoiceMessageFn({
          matchId,
          messageId: message.id,
          path,
          url,
          durationMs: message.durationMs,
          waveform: message.waveform,
        });
        setPending((list) => list.filter((m) => m.id !== message.id));
      } catch {
        setPending((list) =>
          list.map((m) => (m.id === message.id ? { ...m, local: { uri: m.local!.uri, status: 'failed' } } : m)),
        );
      }
    },
    [matchId, uid],
  );

  const send = useCallback(
    (clip: RecordedClip) => {
      const message: ChatMessage = {
        id: newMessageId(),
        senderId: uid,
        type: 'voice',
        audioUrl: clip.uri,
        durationMs: clip.durationMs,
        waveform: clip.waveform,
        counts: true,
        transcript: { status: 'pending' },
        createdAt: null,
        local: { uri: clip.uri, status: 'sending' },
      };
      setPending((list) => [...list, message]);
      upload(message);
    },
    [uid, upload],
  );

  const retry = useCallback((message: ChatMessage) => upload(message), [upload]);

  return { pending, send, retry };
}

export function markMatchRead(matchId: string) {
  return markMatchReadFn({ matchId }).catch(() => {});
}
