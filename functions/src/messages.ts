import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { db, requireUid } from './shared';

export const VOICE_MIN_MS = 3_000;
export const VOICE_MAX_MS = 30_000;
export const UNLOCK_THRESHOLD = 3;
const WAVEFORM_BARS = 40;

export const sendVoiceMessage = onCall(async (request) => {
  const uid = requireUid(request);
  const { matchId, messageId, path, url, durationMs, waveform } = request.data ?? {};

  if (typeof matchId !== 'string' || typeof messageId !== 'string' || !/^[\w-]{6,64}$/.test(messageId)) {
    throw new HttpsError('invalid-argument', 'Invalid message.');
  }
  if (typeof path !== 'string' || !path.startsWith(`matches/${matchId}/voice/`) || typeof url !== 'string') {
    throw new HttpsError('invalid-argument', 'Invalid audio file.');
  }
  if (typeof durationMs !== 'number' || durationMs > VOICE_MAX_MS + 1_000) {
    throw new HttpsError('invalid-argument', 'Voice notes can be up to 30 seconds.');
  }
  const bars = Array.isArray(waveform)
    ? waveform.slice(0, WAVEFORM_BARS).map((n) => Math.min(1, Math.max(0, Number(n) || 0)))
    : [];

  const firestore = db();
  const matchRef = firestore.doc(`matches/${matchId}`);
  const messageRef = matchRef.collection('messages').doc(messageId);

  return firestore.runTransaction(async (tx) => {
    const [matchSnap, existing] = await tx.getAll(matchRef, messageRef);
    const match = matchSnap.data();
    if (!match || !match.members?.includes(uid)) throw new HttpsError('permission-denied', 'You are not in this match.');
    if (existing.exists) return { ok: true, duplicate: true };
    if (match.status !== 'active') throw new HttpsError('failed-precondition', 'This match is no longer active.');

    const other = match.members.find((m: string) => m !== uid);
    if (match.stage === 'awaiting_first_voice') {
      if (match.firstSenderId !== uid) {
        throw new HttpsError('failed-precondition', 'Your match sends the first voice note.');
      }
      if (match.expiresAt && match.expiresAt.toMillis() < Date.now()) {
        throw new HttpsError('failed-precondition', 'This match has expired.');
      }
    }

    const counts = durationMs >= VOICE_MIN_MS;
    const perUser: Record<string, number> = { ...(match.voice?.perUser ?? {}) };
    let qualifiedCount: number = match.voice?.qualifiedCount ?? 0;
    if (counts) {
      perUser[uid] = (perUser[uid] ?? 0) + 1;
      qualifiedCount += 1;
    }

    let stage = match.stage === 'awaiting_first_voice' ? 'voice' : match.stage;
    const bothSpoke = (perUser[uid] ?? 0) > 0 && (perUser[other] ?? 0) > 0;
    if (stage === 'voice' && qualifiedCount >= UNLOCK_THRESHOLD && bothSpoke) stage = 'deciding';

    tx.set(messageRef, {
      senderId: uid,
      type: 'voice',
      audioPath: path,
      audioUrl: url,
      durationMs: Math.round(durationMs),
      waveform: bars,
      counts,
      transcript: { status: 'pending' },
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.update(matchRef, {
      stage,
      expiresAt: stage === 'awaiting_first_voice' ? match.expiresAt : null,
      'voice.perUser': perUser,
      'voice.qualifiedCount': qualifiedCount,
      'voice.totalDurationMs': FieldValue.increment(Math.round(durationMs)),
      lastMessage: { senderId: uid, type: 'voice', durationMs: Math.round(durationMs) },
      lastMessageAt: FieldValue.serverTimestamp(),
      [`unread.${other}`]: FieldValue.increment(1),
    });

    return { ok: true, stage, counts };
  });
});

export const markMatchRead = onCall(async (request) => {
  const uid = requireUid(request);
  const matchId = request.data?.matchId;
  if (typeof matchId !== 'string') throw new HttpsError('invalid-argument', 'Invalid match.');

  const matchRef = db().doc(`matches/${matchId}`);
  const snap = await matchRef.get();
  if (!snap.data()?.members?.includes(uid)) throw new HttpsError('permission-denied', 'You are not in this match.');
  await matchRef.update({ [`unread.${uid}`]: 0 });
  return { ok: true };
});
