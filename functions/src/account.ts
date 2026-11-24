import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

import { db, requireUid } from './shared';

async function deleteQuery(path: string, field: string, value: string) {
  const firestore = db();
  // Bounded batches keep deleteAccount under the callable timeout.
  for (;;) {
    const snap = await firestore.collection(path).where(field, '==', value).limit(200).get();
    if (snap.empty) return;
    const batch = firestore.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < 200) return;
  }
}

async function deleteSubcollection(parentPath: string, sub: string) {
  const firestore = db();
  for (;;) {
    const snap = await firestore.collection(`${parentPath}/${sub}`).limit(200).get();
    if (snap.empty) return;
    const batch = firestore.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < 200) return;
  }
}

async function deleteStoragePrefix(uid: string) {
  const bucket = getStorage().bucket();
  try {
    await bucket.deleteFiles({ prefix: `users/${uid}/` });
  } catch (error) {
    logger.warn('Storage cleanup failed during account delete', { uid, error });
  }
}

export const requestDataExport = onCall({ timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
  const uid = requireUid(request);
  const firestore = db();

  const [user, profile, preferences, discovery, blocks, matches] = await Promise.all([
    firestore.doc(`users/${uid}`).get(),
    firestore.doc(`profiles/${uid}`).get(),
    firestore.doc(`preferences/${uid}`).get(),
    firestore.doc(`discovery/${uid}`).get(),
    firestore.collection(`blocks/${uid}/blocked`).get(),
    firestore.collection('matches').where('members', 'array-contains', uid).limit(100).get(),
  ]);

  const matchPayload = await Promise.all(
    matches.docs.map(async (m) => {
      const messages = await m.ref.collection('messages').orderBy('createdAt', 'asc').limit(500).get();
      return {
        id: m.id,
        ...m.data(),
        messages: messages.docs.map((msg) => ({ id: msg.id, ...msg.data() })),
      };
    }),
  );

  const exportDoc = {
    exportedAt: new Date().toISOString(),
    userId: uid,
    user: user.data() ?? null,
    profile: profile.data() ?? null,
    preferences: preferences.data() ?? null,
    discovery: discovery.data() ?? null,
    blockedUserIds: blocks.docs.map((d) => d.id),
    matches: matchPayload,
  };

  // Strip server timestamps to plain JSON-safe values for the client download.
  return { export: JSON.parse(JSON.stringify(exportDoc)) };
});

export const deleteAccount = onCall({ timeoutSeconds: 120, memory: '512MiB' }, async (request) => {
  const uid = requireUid(request);
  const firestore = db();

  // End active matches so the other person no longer sees an open chat.
  const activeMatches = await firestore
    .collection('matches')
    .where('members', 'array-contains', uid)
    .where('status', '==', 'active')
    .limit(100)
    .get();
  if (!activeMatches.empty) {
    const batch = firestore.batch();
    activeMatches.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'unmatched',
        endedAt: FieldValue.serverTimestamp(),
        endedBy: uid,
        endReason: 'account_deleted',
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  await deleteSubcollection(`swipes/${uid}`, 'outgoing');
  await deleteSubcollection(`blocks/${uid}`, 'blocked');
  await deleteSubcollection(`likesReceived/${uid}`, 'from');
  await deleteSubcollection(`users/${uid}`, 'inbox');
  await deleteQuery('reports', 'reporterId', uid);

  await Promise.all([
    firestore.doc(`users/${uid}`).delete().catch(() => undefined),
    firestore.doc(`profiles/${uid}`).delete().catch(() => undefined),
    firestore.doc(`preferences/${uid}`).delete().catch(() => undefined),
    firestore.doc(`discovery/${uid}`).delete().catch(() => undefined),
  ]);

  await deleteStoragePrefix(uid);

  try {
    await getAuth().deleteUser(uid);
  } catch (error) {
    logger.error('Auth user delete failed', { uid, error });
    throw new HttpsError('internal', 'Account data was cleared but sign-in removal failed. Contact support.');
  }

  return { ok: true };
});
