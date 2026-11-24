import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { collection, doc, limitToLast, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import type { Match } from '@/features/matches/useMatches';
import { db, functions } from '@/lib/firebase';
import { uploadFile } from '@/lib/upload';

import type { ChatMessage, RecordedClip, UnlockDecision } from './types';

const MESSAGE_LIMIT = 60;
const PHOTO_MAX_EDGE = 1280;

const sendVoiceMessageFn = httpsCallable<
  { matchId: string; messageId: string; path: string; url: string; durationMs: number; waveform: number[] },
  { ok: boolean; stage?: string }
>(functions, 'sendVoiceMessage');
const sendTextMessageFn = httpsCallable<{ matchId: string; messageId: string; text: string }, { ok: boolean }>(
  functions,
  'sendTextMessage',
);
const sendPhotoMessageFn = httpsCallable<
  { matchId: string; messageId: string; path: string; url: string; width: number; height: number },
  { ok: boolean }
>(functions, 'sendPhotoMessage');
const submitUnlockDecisionFn = httpsCallable<
  { matchId: string; decision: UnlockDecision },
  { ok: boolean; stage?: string; waiting?: boolean }
>(functions, 'submitUnlockDecision');
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
          durationMs: message.durationMs ?? 0,
          waveform: message.waveform ?? [],
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

export function useTextSender(matchId: string, uid: string) {
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      const message: ChatMessage = {
        id: newMessageId(),
        senderId: uid,
        type: 'text',
        text: trimmed,
        createdAt: null,
        local: { uri: trimmed, status: 'sending' },
      };
      setSending(true);
      setPending((list) => [...list, message]);
      try {
        await sendTextMessageFn({ matchId, messageId: message.id, text: trimmed });
        setPending((list) => list.filter((m) => m.id !== message.id));
      } catch {
        setPending((list) =>
          list.map((m) => (m.id === message.id ? { ...m, local: { uri: trimmed, status: 'failed' } } : m)),
        );
        Alert.alert('Message not sent', 'Check your connection and try again.');
      } finally {
        setSending(false);
      }
    },
    [matchId, uid, sending],
  );

  const retry = useCallback(
    async (message: ChatMessage) => {
      if (!message.text) return;
      setPending((list) =>
        list.map((m) => (m.id === message.id ? { ...m, local: { uri: message.text!, status: 'sending' } } : m)),
      );
      try {
        await sendTextMessageFn({ matchId, messageId: message.id, text: message.text });
        setPending((list) => list.filter((m) => m.id !== message.id));
      } catch {
        setPending((list) =>
          list.map((m) => (m.id === message.id ? { ...m, local: { uri: message.text!, status: 'failed' } } : m)),
        );
      }
    },
    [matchId],
  );

  return { pending, send, retry, sending };
}

export function usePhotoSender(matchId: string, uid: string) {
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const upload = useCallback(
    async (message: ChatMessage) => {
      setPending((list) => list.map((m) => (m.id === message.id ? { ...m, local: { uri: m.local!.uri, status: 'sending' } } : m)));
      try {
        const path = `matches/${matchId}/photos/${message.id}.jpg`;
        const { url } = await uploadFile(message.local!.uri, path, 'image/jpeg', {
          customMetadata: { uploaderId: uid, matchId },
        });
        await sendPhotoMessageFn({
          matchId,
          messageId: message.id,
          path,
          url,
          width: message.width ?? 0,
          height: message.height ?? 0,
        });
        setPending((list) => list.filter((m) => m.id !== message.id));
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
        const detail =
          code === 'functions/failed-precondition'
            ? 'That photo doesn’t meet our community guidelines.'
            : 'We couldn’t send that photo. Please try again.';
        Alert.alert('Photo not sent', detail);
        setPending((list) =>
          list.map((m) => (m.id === message.id ? { ...m, local: { uri: m.local!.uri, status: 'failed' } } : m)),
        );
      }
    },
    [matchId, uid],
  );

  const pickAndSend = useCallback(async () => {
    if (sending) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos permission needed', 'Allow photo access to share a picture in chat.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;

    setSending(true);
    try {
      const asset = result.assets[0];
      const context = ImageManipulator.manipulate(asset.uri);
      if (Math.max(asset.width, asset.height) > PHOTO_MAX_EDGE) {
        context.resize(asset.width >= asset.height ? { width: PHOTO_MAX_EDGE } : { height: PHOTO_MAX_EDGE });
      }
      const image = await context.renderAsync();
      const prepared = await image.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
      const message: ChatMessage = {
        id: newMessageId(),
        senderId: uid,
        type: 'photo',
        photoUrl: prepared.uri,
        width: prepared.width,
        height: prepared.height,
        createdAt: null,
        local: { uri: prepared.uri, status: 'sending' },
      };
      setPending((list) => [...list, message]);
      await upload(message);
    } finally {
      setSending(false);
    }
  }, [sending, uid, upload]);

  const retry = useCallback((message: ChatMessage) => upload(message), [upload]);

  return { pending, pickAndSend, retry, sending };
}

export function submitUnlockDecision(matchId: string, decision: UnlockDecision) {
  return submitUnlockDecisionFn({ matchId, decision });
}

export function markMatchRead(matchId: string) {
  return markMatchReadFn({ matchId }).catch(() => {});
}
