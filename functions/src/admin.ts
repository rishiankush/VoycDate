import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { readDailyLikeLimit } from './premium';
import { notifyUser } from './push';
import { db, requireAdmin } from './shared';

const REJECT_REASONS = [
  'face_not_clear',
  'does_not_match_photos',
  'code_or_action_missing',
  'appears_under_18',
  'other',
] as const;

type RejectReason = (typeof REJECT_REASONS)[number];

const REJECT_LABELS: Record<RejectReason, string> = {
  face_not_clear: 'Your face wasn’t clearly visible',
  does_not_match_photos: 'The video doesn’t match your profile photos',
  code_or_action_missing: 'The code or action wasn’t completed',
  appears_under_18: 'We couldn’t confirm you’re 18+',
  other: 'We couldn’t verify this video',
};

async function signedReadUrl(path: string) {
  const file = getStorage().bucket().file(path);
  const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 60 * 60 * 1000 });
  return url;
}

export const adminGetOverview = onCall(async (request) => {
  await requireAdmin(request);
  const firestore = db();
  const weekAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [users, matches, pendingVerifications, openReports, limits] = await Promise.all([
    firestore.collection('users').count().get(),
    firestore.collection('matches').where('status', '==', 'active').count().get(),
    firestore.collection('verifications').where('status', '==', 'pending').count().get(),
    firestore.collection('reports').where('status', '==', 'open').count().get(),
    readDailyLikeLimit(),
  ]);

  const recentSignups = await firestore.collection('users').where('createdAt', '>=', weekAgo).count().get();

  return {
    users: users.data().count,
    signups7d: recentSignups.data().count,
    activeMatches: matches.data().count,
    pendingVerifications: pendingVerifications.data().count,
    openReports: openReports.data().count,
    dailyLikeLimit: limits,
  };
});

export const adminGetSettings = onCall(async (request) => {
  await requireAdmin(request);
  return { dailyLikes: await readDailyLikeLimit() };
});

export const adminUpdateSettings = onCall(async (request) => {
  const { uid } = await requireAdmin(request);
  const dailyLikes = Number(request.data?.dailyLikes);
  if (!Number.isFinite(dailyLikes) || dailyLikes < 1 || dailyLikes > 500) {
    throw new HttpsError('invalid-argument', 'Daily likes must be between 1 and 500.');
  }
  await db()
    .doc('config/limits')
    .set({ dailyLikes: Math.round(dailyLikes), updatedAt: FieldValue.serverTimestamp(), updatedBy: uid }, { merge: true });
  return { dailyLikes: Math.round(dailyLikes) };
});

export const adminListVerifications = onCall(async (request) => {
  await requireAdmin(request);
  const status = request.data?.status === 'all' ? null : (request.data?.status ?? 'pending');
  const base = db().collection('verifications');
  const snap = status
    ? await base.where('status', '==', status).orderBy('submittedAt', 'asc').limit(40).get()
    : await base.orderBy('submittedAt', 'desc').limit(40).get();
  const uids = [...new Set(snap.docs.map((d) => d.data().uid as string))];
  const profiles =
    uids.length > 0 ? await db().getAll(...uids.map((id) => db().doc(`profiles/${id}`))) : [];
  const users = uids.length > 0 ? await db().getAll(...uids.map((id) => db().doc(`users/${id}`))) : [];
  const byProfile = new Map(uids.map((id, i) => [id, profiles[i]?.data() ?? {}]));
  const byUser = new Map(uids.map((id, i) => [id, users[i]?.data() ?? {}]));

  const items = await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data();
      const profile = byProfile.get(data.uid) ?? {};
      const user = byUser.get(data.uid) ?? {};
      const submittedAtMs = data.submittedAt?.toMillis?.() ?? null;
      const ageHours = submittedAtMs ? (Date.now() - submittedAtMs) / 3_600_000 : null;
      let videoUrl: string | null = null;
      try {
        videoUrl = data.path ? await signedReadUrl(data.path) : null;
      } catch {
        videoUrl = null;
      }
      return {
        id: doc.id,
        uid: data.uid,
        code: data.code,
        action: data.action,
        status: data.status,
        rejectionReason: data.rejectionReason ?? null,
        submittedAtMs,
        ageHours,
        overdue: ageHours != null && ageHours > 48,
        warning: ageHours != null && ageHours > 24,
        firstName: profile.firstName ?? 'Member',
        birthDate: user.birthDate ?? null,
        photos: (profile.photos ?? []).slice(0, 4).map((p: { url: string }) => p.url),
        videoUrl,
      };
    }),
  );

  return { items };
});

export const adminDecideVerification = onCall(async (request) => {
  const { uid: reviewerId } = await requireAdmin(request);
  const id = request.data?.id;
  const decision = request.data?.decision;
  const reason = request.data?.reason as RejectReason | undefined;

  if (typeof id !== 'string' || !id) throw new HttpsError('invalid-argument', 'Pick a request.');
  if (decision !== 'approved' && decision !== 'rejected') {
    throw new HttpsError('invalid-argument', 'Approve or reject.');
  }
  if (decision === 'rejected' && (!reason || !REJECT_REASONS.includes(reason))) {
    throw new HttpsError('invalid-argument', 'Pick a rejection reason.');
  }

  const firestore = db();
  const ref = firestore.doc(`verifications/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Request not found.');
  const data = snap.data()!;
  if (data.status !== 'pending') throw new HttpsError('failed-precondition', 'Already decided.');

  const targetUid = data.uid as string;
  const rejectionReason = decision === 'rejected' ? reason! : null;

  await firestore.runTransaction(async (tx) => {
    tx.update(ref, {
      status: decision,
      rejectionReason,
      reviewerId,
      decidedAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      firestore.doc(`profiles/${targetUid}`),
      {
        verification: {
          status: decision,
          requestId: id,
          rejectionReason: rejectionReason ? REJECT_LABELS[rejectionReason] : null,
          updatedAt: FieldValue.serverTimestamp(),
          ...(decision === 'approved' ? { approvedAt: FieldValue.serverTimestamp() } : {}),
        },
      },
      { merge: true },
    );
  });

  if (decision === 'approved') {
    await notifyUser(targetUid, {
      kind: 'verification',
      title: 'You’re verified!',
      body: 'Your profile now shows the Verified badge.',
      data: { screen: 'profile' },
    });
  } else {
    await notifyUser(targetUid, {
      kind: 'verification',
      title: 'Verification didn’t go through',
      body: `${REJECT_LABELS[rejectionReason!]}. Tap to try again.`,
      data: { screen: 'verify' },
    });
  }

  return { ok: true };
});

export const adminListReports = onCall(async (request) => {
  await requireAdmin(request);
  const status = request.data?.status === 'all' ? null : (request.data?.status ?? 'open');
  const base = db().collection('reports');
  const snap = status
    ? await base.where('status', '==', status).orderBy('createdAt', 'desc').limit(40).get()
    : await base.orderBy('createdAt', 'desc').limit(40).get();
  const ids = [...new Set(snap.docs.flatMap((d) => [d.data().reporterId, d.data().targetId].filter(Boolean)))];
  const profiles = ids.length ? await db().getAll(...ids.map((id) => db().doc(`profiles/${id}`))) : [];
  const names = new Map(ids.map((id, i) => [id, profiles[i]?.data()?.firstName ?? 'Member']));

  return {
    items: snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        reporterId: data.reporterId,
        reporterName: names.get(data.reporterId) ?? 'Member',
        targetId: data.targetId,
        targetName: names.get(data.targetId) ?? 'Member',
        reason: data.reason,
        details: data.details ?? null,
        matchId: data.matchId ?? null,
        status: data.status,
        createdAtMs: data.createdAt?.toMillis?.() ?? null,
      };
    }),
  };
});

export const adminResolveReport = onCall(async (request) => {
  const { uid } = await requireAdmin(request);
  const id = request.data?.id;
  const resolution = request.data?.resolution ?? 'dismissed';
  if (typeof id !== 'string' || !id) throw new HttpsError('invalid-argument', 'Pick a report.');
  await db()
    .doc(`reports/${id}`)
    .update({
      status: 'resolved',
      resolution,
      resolvedBy: uid,
      resolvedAt: FieldValue.serverTimestamp(),
    });
  return { ok: true };
});

export const adminSearchUsers = onCall(async (request) => {
  await requireAdmin(request);
  const q = typeof request.data?.q === 'string' ? request.data.q.trim() : '';
  if (!q || q.length < 2) throw new HttpsError('invalid-argument', 'Enter at least 2 characters.');

  const firestore = db();
  const results: {
    uid: string;
    firstName: string;
    phoneNumber: string | null;
    status: string;
    verified: boolean;
    premium: boolean;
  }[] = [];

  // Exact uid or phone match, plus first-name prefix scan (small scale).
  if (q.length >= 20) {
    const user = await firestore.doc(`users/${q}`).get();
    if (user.exists) {
      const profile = (await firestore.doc(`profiles/${q}`).get()).data() ?? {};
      const data = user.data()!;
      results.push({
        uid: q,
        firstName: profile.firstName ?? 'Member',
        phoneNumber: data.phoneNumber ?? null,
        status: data.status ?? 'active',
        verified: profile.verification?.status === 'approved',
        premium: Boolean(data.premium?.active),
      });
      return { items: results };
    }
  }

  const phoneQ = q.startsWith('+') ? q : null;
  if (phoneQ) {
    const byPhone = await firestore.collection('users').where('phoneNumber', '==', phoneQ).limit(10).get();
    for (const doc of byPhone.docs) {
      const profile = (await firestore.doc(`profiles/${doc.id}`).get()).data() ?? {};
      const data = doc.data();
      results.push({
        uid: doc.id,
        firstName: profile.firstName ?? 'Member',
        phoneNumber: data.phoneNumber ?? null,
        status: data.status ?? 'active',
        verified: profile.verification?.status === 'approved',
        premium: Boolean(data.premium?.active),
      });
    }
    return { items: results };
  }

  const nameSnap = await firestore
    .collection('profiles')
    .where('firstName', '>=', q)
    .where('firstName', '<=', q + '\uf8ff')
    .limit(20)
    .get();
  for (const doc of nameSnap.docs) {
    const user = (await firestore.doc(`users/${doc.id}`).get()).data() ?? {};
    const profile = doc.data();
    results.push({
      uid: doc.id,
      firstName: profile.firstName ?? 'Member',
      phoneNumber: user.phoneNumber ?? null,
      status: user.status ?? 'active',
      verified: profile.verification?.status === 'approved',
      premium: Boolean(user.premium?.active),
    });
  }
  return { items: results };
});

export const adminSetUserStatus = onCall(async (request) => {
  const { uid: adminId } = await requireAdmin(request);
  const targetId = request.data?.uid;
  const status = request.data?.status;
  if (typeof targetId !== 'string' || !targetId) throw new HttpsError('invalid-argument', 'Pick a user.');
  if (!['active', 'suspended', 'banned'].includes(status)) {
    throw new HttpsError('invalid-argument', 'Invalid status.');
  }
  await db()
    .doc(`users/${targetId}`)
    .set(
      {
        status,
        statusUpdatedAt: FieldValue.serverTimestamp(),
        statusUpdatedBy: adminId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  return { ok: true };
});

export const adminRevokeVerification = onCall(async (request) => {
  const { uid: adminId } = await requireAdmin(request);
  const targetId = request.data?.uid;
  if (typeof targetId !== 'string' || !targetId) throw new HttpsError('invalid-argument', 'Pick a user.');
  await db()
    .doc(`profiles/${targetId}`)
    .set(
      {
        verification: {
          status: 'rejected',
          rejectionReason: 'Please verify again — your photos may no longer match.',
          revokedBy: adminId,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
  await notifyUser(targetId, {
    kind: 'verification',
    title: 'Verification removed',
    body: 'Please submit a new verification video.',
    data: { screen: 'verify' },
  });
  return { ok: true };
});
