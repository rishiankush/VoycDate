import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { annotateImages, isUnsafe } from './moderation/vision';
import { db, requireUid } from './shared';

export const VOICE_MIN_MS = 3_000;
export const VOICE_MAX_MS = 30_000;
export const UNLOCK_THRESHOLD = 3;
export const REPROMPT_EVERY = 5;
const WAVEFORM_BARS = 40;
const TEXT_MAX = 2000;

type UnlockVote = 'yes' | 'keep_voice';

function requireActiveMember(match: DocumentData | undefined, uid: string) {
  if (!match || !match.members?.includes(uid)) throw new HttpsError('permission-denied', 'You are not in this match.');
  if (match.status !== 'active') throw new HttpsError('failed-precondition', 'This match is no longer active.');
  return match;
}

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
    const match = requireActiveMember(matchSnap.data(), uid);
    if (existing.exists) return { ok: true, duplicate: true };

    const other = match.members.find((m: string) => m !== uid);
    if (match.stage === 'awaiting_first_voice') {
      if (match.firstSenderId !== uid) {
        throw new HttpsError('failed-precondition', 'Your match sends the first voice note.');
      }
      if (match.expiresAt && match.expiresAt.toMillis() < Date.now()) {
        throw new HttpsError('failed-precondition', 'This match has expired.');
      }
    }
    if (match.stage === 'expired') {
      throw new HttpsError('failed-precondition', 'This match has expired.');
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
    if (stage === 'voice' && qualifiedCount >= UNLOCK_THRESHOLD && bothSpoke) {
      const nextPromptAt = match.unlock?.nextPromptAtCount as number | undefined;
      if (nextPromptAt == null || qualifiedCount >= nextPromptAt) stage = 'deciding';
    }

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

export const submitUnlockDecision = onCall(async (request) => {
  const uid = requireUid(request);
  const { matchId, decision } = request.data ?? {};
  if (typeof matchId !== 'string') throw new HttpsError('invalid-argument', 'Invalid match.');
  if (decision !== 'yes' && decision !== 'keep_voice') {
    throw new HttpsError('invalid-argument', 'Choose yes or keep_voice.');
  }

  const firestore = db();
  const matchRef = firestore.doc(`matches/${matchId}`);

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(matchRef);
    const match = requireActiveMember(snap.data(), uid);
    if (match.stage !== 'deciding') {
      throw new HttpsError('failed-precondition', 'This match is not ready to decide on text yet.');
    }

    const votes: Record<string, UnlockVote> = { ...(match.unlock?.votes ?? {}) };
    if (votes[uid]) return { ok: true, stage: match.stage, alreadyVoted: true };
    votes[uid] = decision;

    const other = match.members.find((m: string) => m !== uid) as string;
    const myVote = votes[uid];
    const theirVote = votes[other];

    if (!theirVote) {
      tx.update(matchRef, {
        'unlock.votes': votes,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { ok: true, stage: 'deciding', waiting: true };
    }

    const bothYes = myVote === 'yes' && theirVote === 'yes';
    if (bothYes) {
      tx.update(matchRef, {
        stage: 'text_unlocked',
        'unlock.votes': votes,
        'unlock.decidedAt': FieldValue.serverTimestamp(),
        'unlock.nextPromptAtCount': FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { ok: true, stage: 'text_unlocked' };
    }

    const qualifiedCount = match.voice?.qualifiedCount ?? 0;
    tx.update(matchRef, {
      stage: 'voice',
      'unlock.votes': {},
      'unlock.decidedAt': FieldValue.serverTimestamp(),
      'unlock.nextPromptAtCount': qualifiedCount + REPROMPT_EVERY,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, stage: 'voice', keepVoice: true };
  });
});

export const sendTextMessage = onCall(async (request) => {
  const uid = requireUid(request);
  const { matchId, messageId, text } = request.data ?? {};
  if (typeof matchId !== 'string' || typeof messageId !== 'string' || !/^[\w-]{6,64}$/.test(messageId)) {
    throw new HttpsError('invalid-argument', 'Invalid message.');
  }
  if (typeof text !== 'string') throw new HttpsError('invalid-argument', 'Missing text.');
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > TEXT_MAX) {
    throw new HttpsError('invalid-argument', `Messages can be up to ${TEXT_MAX} characters.`);
  }

  const firestore = db();
  const matchRef = firestore.doc(`matches/${matchId}`);
  const messageRef = matchRef.collection('messages').doc(messageId);

  return firestore.runTransaction(async (tx) => {
    const [matchSnap, existing] = await tx.getAll(matchRef, messageRef);
    const match = requireActiveMember(matchSnap.data(), uid);
    if (existing.exists) return { ok: true, duplicate: true };
    if (match.stage !== 'text_unlocked') {
      throw new HttpsError('failed-precondition', 'Text chat is still locked.');
    }

    const other = match.members.find((m: string) => m !== uid);
    tx.set(messageRef, {
      senderId: uid,
      type: 'text',
      text: trimmed,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(matchRef, {
      lastMessage: { senderId: uid, type: 'text', text: trimmed.slice(0, 80) },
      lastMessageAt: FieldValue.serverTimestamp(),
      [`unread.${other}`]: FieldValue.increment(1),
    });
    return { ok: true };
  });
});

export const sendPhotoMessage = onCall(
  { memory: '512MiB', timeoutSeconds: 60 },
  async (request) => {
    const uid = requireUid(request);
    const { matchId, messageId, path, url, width, height } = request.data ?? {};
    if (typeof matchId !== 'string' || typeof messageId !== 'string' || !/^[\w-]{6,64}$/.test(messageId)) {
      throw new HttpsError('invalid-argument', 'Invalid message.');
    }
    if (typeof path !== 'string' || !path.startsWith(`matches/${matchId}/photos/`) || typeof url !== 'string') {
      throw new HttpsError('invalid-argument', 'Invalid photo.');
    }

    const firestore = db();
    const matchRef = firestore.doc(`matches/${matchId}`);
    const messageRef = matchRef.collection('messages').doc(messageId);
    const matchSnap = await matchRef.get();
    const match = requireActiveMember(matchSnap.data(), uid);
    if (match.stage !== 'text_unlocked') {
      throw new HttpsError('failed-precondition', 'Photo sharing unlocks with text chat.');
    }
    if ((await messageRef.get()).exists) return { ok: true, duplicate: true };

    const bucket = getStorage().bucket().name;
    try {
      const [annotation] = await annotateImages(
        [{ source: { gcsImageUri: `gs://${bucket}/${path}` } }],
        ['SAFE_SEARCH_DETECTION'],
      );
      if (isUnsafe(annotation.safeSearchAnnotation)) {
        await getStorage().bucket().file(path).delete({ ignoreNotFound: true });
        throw new HttpsError('failed-precondition', 'That photo doesn’t meet our community guidelines.');
      }
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'We couldn’t check that photo. Please try again.');
    }

    const other = match.members.find((m: string) => m !== uid);
    await messageRef.set({
      senderId: uid,
      type: 'photo',
      photoPath: path,
      photoUrl: url,
      width: typeof width === 'number' ? width : null,
      height: typeof height === 'number' ? height : null,
      createdAt: FieldValue.serverTimestamp(),
    });
    await matchRef.update({
      lastMessage: { senderId: uid, type: 'photo' },
      lastMessageAt: FieldValue.serverTimestamp(),
      [`unread.${other}`]: FieldValue.increment(1),
    });
    return { ok: true };
  },
);

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
