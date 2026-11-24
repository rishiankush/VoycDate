import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { db, requireUid } from './shared';

const ACTIONS = ['like', 'pass', 'save'] as const;
type SwipeAction = (typeof ACTIONS)[number];

export const MATCH_EXPIRY_MS = 48 * 60 * 60 * 1000;

export const matchIdFor = (a: string, b: string) => [a, b].sort().join('_');

export const swipe = onCall(async (request) => {
  const uid = requireUid(request);
  const targetId = request.data?.targetId;
  const action = request.data?.action as SwipeAction;
  if (typeof targetId !== 'string' || !targetId || targetId === uid) {
    throw new HttpsError('invalid-argument', 'Choose someone to swipe on.');
  }
  if (!ACTIONS.includes(action)) throw new HttpsError('invalid-argument', 'Unknown swipe action.');

  const firestore = db();
  const outgoing = firestore.doc(`swipes/${uid}/outgoing/${targetId}`);
  const theirs = firestore.doc(`swipes/${targetId}/outgoing/${uid}`);
  const matchId = matchIdFor(uid, targetId);
  const matchRef = firestore.doc(`matches/${matchId}`);

  return firestore.runTransaction(async (tx) => {
    const [theirSwipe, existingMatch, target, me] = await tx.getAll(
      theirs,
      matchRef,
      firestore.doc(`discovery/${targetId}`),
      firestore.doc(`discovery/${uid}`),
    );
    if (!target.exists || !target.data()?.active) throw new HttpsError('not-found', 'This profile is no longer available.');

    const mode = me.data()?.mode ?? 'date';
    tx.set(outgoing, { action, mode, createdAt: FieldValue.serverTimestamp() });

    if (action !== 'like') return { matched: false };

    tx.set(firestore.doc(`likesReceived/${targetId}/from/${uid}`), { mode, createdAt: FieldValue.serverTimestamp() });

    const mutual = theirSwipe.exists && theirSwipe.data()?.action === 'like';
    if (!mutual) return { matched: false };

    const summary = (card: FirebaseFirestore.DocumentData | undefined) => ({
      firstName: card?.firstName ?? '',
      photoUrl: card?.photos?.[0]?.url ?? card?.video?.posterUrl ?? null,
    });

    const existing = existingMatch.data();
    const firstSenderId = existing?.firstSenderId ?? targetId;
    // Revive expired/unmatched chats so a fresh mutual like shows up in Connections again.
    if (!existingMatch.exists || existing?.status !== 'active') {
      tx.set(
        matchRef,
        {
          members: [uid, targetId].sort(),
          people: { [uid]: summary(me.data()?.card), [targetId]: summary(target.data()?.card) },
          mode,
          firstSenderId,
          stage: 'awaiting_first_voice',
          status: 'active',
          voice: { qualifiedCount: 0, perUser: {} },
          unread: {},
          lastMessageAt: null,
          lastMessage: null,
          createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(Date.now() + MATCH_EXPIRY_MS),
          rematchedAt: existingMatch.exists ? FieldValue.serverTimestamp() : null,
        },
        { merge: true },
      );
    }

    return {
      matched: true,
      matchId,
      firstSenderId,
      other: { uid: targetId, ...summary(target.data()?.card) },
    };
  });
});
