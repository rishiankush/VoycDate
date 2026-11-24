import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { matchIdFor } from './swipe';
import { db, requireUid } from './shared';

const MEDIA_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const REPORT_REASONS = [
  'inappropriate_messages',
  'fake_profile',
  'harassment',
  'spam',
  'underage',
  'other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

async function setMatchEnded(
  matchId: string,
  uid: string,
  status: 'unmatched' | 'blocked',
  by: string,
) {
  const ref = db().doc(`matches/${matchId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Match not found.');
  const match = snap.data()!;
  if (!Array.isArray(match.members) || !match.members.includes(uid)) {
    throw new HttpsError('permission-denied', 'You are not in this match.');
  }
  if (match.status !== 'active') return { ok: true as const, alreadyEnded: true };

  await ref.update({
    status,
    endedAt: FieldValue.serverTimestamp(),
    endedBy: by,
    endReason: status,
    mediaRetentionUntil: Timestamp.fromMillis(Date.now() + MEDIA_RETENTION_MS),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true as const, alreadyEnded: false };
}

export const unmatch = onCall(async (request) => {
  const uid = requireUid(request);
  const matchId = request.data?.matchId;
  if (typeof matchId !== 'string' || !matchId) {
    throw new HttpsError('invalid-argument', 'Choose a conversation to unmatch.');
  }
  return setMatchEnded(matchId, uid, 'unmatched', uid);
});

export const blockUser = onCall(async (request) => {
  const uid = requireUid(request);
  const targetId = request.data?.targetId;
  const matchId = typeof request.data?.matchId === 'string' ? request.data.matchId : null;
  if (typeof targetId !== 'string' || !targetId || targetId === uid) {
    throw new HttpsError('invalid-argument', 'Choose someone to block.');
  }

  const firestore = db();
  const batch = firestore.batch();
  batch.set(firestore.doc(`blocks/${uid}/blocked/${targetId}`), {
    createdAt: FieldValue.serverTimestamp(),
  });
  // Mutual hide: the other person also stops seeing this user in Discover.
  batch.set(firestore.doc(`blocks/${targetId}/blocked/${uid}`), {
    createdAt: FieldValue.serverTimestamp(),
    mirroredFrom: uid,
  });
  await batch.commit();

  const id = matchId ?? matchIdFor(uid, targetId);
  const matchRef = firestore.doc(`matches/${id}`);
  const matchSnap = await matchRef.get();
  if (matchSnap.exists && matchSnap.data()?.members?.includes(uid) && matchSnap.data()?.status === 'active') {
    await setMatchEnded(id, uid, 'blocked', uid);
  }

  return { ok: true };
});

export const unblockUser = onCall(async (request) => {
  const uid = requireUid(request);
  const targetId = request.data?.targetId;
  if (typeof targetId !== 'string' || !targetId) {
    throw new HttpsError('invalid-argument', 'Choose someone to unblock.');
  }

  const firestore = db();
  const mine = firestore.doc(`blocks/${uid}/blocked/${targetId}`);
  const snap = await mine.get();
  if (!snap.exists) return { ok: true };

  await mine.delete();
  // Only remove the mirrored hide we created; keep a block they placed themselves.
  const theirs = firestore.doc(`blocks/${targetId}/blocked/${uid}`);
  const theirSnap = await theirs.get();
  if (theirSnap.exists && theirSnap.data()?.mirroredFrom === uid) {
    await theirs.delete();
  }
  return { ok: true };
});

export const reportUser = onCall(async (request) => {
  const uid = requireUid(request);
  const targetId = request.data?.targetId;
  const reason = request.data?.reason as ReportReason;
  const details = typeof request.data?.details === 'string' ? request.data.details.trim().slice(0, 1000) : '';
  const matchId = typeof request.data?.matchId === 'string' ? request.data.matchId : null;
  const messageId = typeof request.data?.messageId === 'string' ? request.data.messageId : null;

  if (typeof targetId !== 'string' || !targetId || targetId === uid) {
    throw new HttpsError('invalid-argument', 'Choose someone to report.');
  }
  if (!REPORT_REASONS.includes(reason)) {
    throw new HttpsError('invalid-argument', 'Pick a report reason.');
  }

  const firestore = db();
  const reportRef = firestore.collection('reports').doc();
  await reportRef.set({
    reporterId: uid,
    targetId,
    reason,
    details: details || null,
    matchId,
    messageId,
    status: 'open',
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, reportId: reportRef.id };
});

/** Blocked user ids for the signed-in account (for Settings → Blocked). */
export const listBlockedUsers = onCall(async (request) => {
  const uid = requireUid(request);
  const snap = await db().collection(`blocks/${uid}/blocked`).orderBy('createdAt', 'desc').limit(100).get();
  const ids = snap.docs.map((d) => d.id);
  if (!ids.length) return { users: [] };

  const profiles = await db().getAll(...ids.map((id) => db().doc(`profiles/${id}`)));
  const users = profiles.map((p, i) => {
    const data = p.data() ?? {};
    return {
      uid: ids[i],
      firstName: data.firstName ?? 'Member',
      photoUrl: data.photos?.[0]?.url ?? data.videoIntro?.posterUrl ?? null,
    };
  });
  return { users };
});
