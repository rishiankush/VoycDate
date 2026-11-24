import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { db, requireUid } from './shared';

const ACTIONS = [
  'Say the code out loud, then turn your head slowly left and right.',
  'Say the code out loud, then smile and nod twice.',
  'Say the code out loud, then look up and back at the camera.',
  'Say the code out loud, then wave with your right hand.',
] as const;

const MAX_ATTEMPTS_PER_WEEK = 3;
const CHALLENGE_TTL_MS = 30 * 60 * 1000;

function randomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function weekStart(now = new Date()) {
  const d = new Date(now);
  const day = d.getUTCDay();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

/** Start a face+code challenge the user must record on-device. */
export const prepareVerification = onCall(async (request) => {
  const uid = requireUid(request);
  const firestore = db();
  const profileRef = firestore.doc(`profiles/${uid}`);
  const profile = (await profileRef.get()).data() ?? {};

  if (profile.verification?.status === 'approved') {
    throw new HttpsError('failed-precondition', 'You’re already verified.');
  }
  if (profile.verification?.status === 'pending') {
    throw new HttpsError('failed-precondition', 'Your video is already under review.');
  }

  const since = Timestamp.fromDate(weekStart());
  const recent = await firestore
    .collection('verifications')
    .where('uid', '==', uid)
    .where('submittedAt', '>=', since)
    .get();
  if (recent.size >= MAX_ATTEMPTS_PER_WEEK) {
    throw new HttpsError('resource-exhausted', 'You can try verification up to 3 times per week.');
  }

  const challengeId = firestore.collection('verifications').doc().id;
  const code = randomCode();
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  const expiresAt = Timestamp.fromMillis(Date.now() + CHALLENGE_TTL_MS);

  // Server-only doc — clients cannot rewrite the expected code.
  await firestore.doc(`verificationChallenges/${uid}`).set({
    challengeId,
    code,
    action,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { challengeId, code, action, expiresAtMs: expiresAt.toMillis() };
});

/** After the client uploads the video to Storage, attach it as a pending review. */
export const submitVerification = onCall(async (request) => {
  const uid = requireUid(request);
  const challengeId = request.data?.challengeId;
  const path = request.data?.path;
  const durationMs = Number(request.data?.durationMs);
  if (typeof challengeId !== 'string' || !challengeId) {
    throw new HttpsError('invalid-argument', 'Missing challenge.');
  }
  if (typeof path !== 'string' || !path.startsWith(`verifications/${uid}/`)) {
    throw new HttpsError('invalid-argument', 'Upload the video in the app first.');
  }
  if (!Number.isFinite(durationMs) || durationMs < 4_000 || durationMs > 16_000) {
    throw new HttpsError('invalid-argument', 'Keep the video between 5 and 15 seconds.');
  }

  const firestore = db();
  const challengeRef = firestore.doc(`verificationChallenges/${uid}`);
  const profileRef = firestore.doc(`profiles/${uid}`);

  await firestore.runTransaction(async (tx) => {
    const [challengeSnap, profileSnap] = await Promise.all([tx.get(challengeRef), tx.get(profileRef)]);
    const challenge = challengeSnap.data();
    if (!challenge || challenge.challengeId !== challengeId) {
      throw new HttpsError('failed-precondition', 'Start verification again to get a new code.');
    }
    if (challenge.expiresAt?.toMillis?.() < Date.now()) {
      throw new HttpsError('deadline-exceeded', 'That code expired. Start again.');
    }
    if (profileSnap.data()?.verification?.status === 'approved') {
      throw new HttpsError('failed-precondition', 'You’re already verified.');
    }

    const requestRef = firestore.doc(`verifications/${challengeId}`);
    tx.set(requestRef, {
      uid,
      code: challenge.code,
      action: challenge.action,
      path,
      durationMs,
      status: 'pending',
      rejectionReason: null,
      reviewerId: null,
      submittedAt: FieldValue.serverTimestamp(),
      decidedAt: null,
    });
    tx.set(
      profileRef,
      {
        verification: {
          status: 'pending',
          requestId: challengeId,
          rejectionReason: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
    tx.delete(challengeRef);
  });

  return { ok: true, requestId: challengeId };
});
