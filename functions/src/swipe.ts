import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

import { isPremium, likesDayKey, readDailyLikeLimit } from './premium';
import { notifyUser } from './push';
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
  const userRef = firestore.doc(`users/${uid}`);
  const dailyLimit = action === 'like' ? await readDailyLikeLimit() : 0;

  const result = await firestore.runTransaction(async (tx) => {
    const [theirSwipe, existingMatch, target, me, userSnap, existingOutgoing] = await tx.getAll(
      theirs,
      matchRef,
      firestore.doc(`discovery/${targetId}`),
      firestore.doc(`discovery/${uid}`),
      userRef,
      outgoing,
    );
    if (!target.exists || !target.data()?.active) throw new HttpsError('not-found', 'This profile is no longer available.');

    // Already decided on this person — treat as idempotent success (no extra quota).
    if (existingOutgoing.exists) {
      return { matched: false as const, alreadySwiped: true as const };
    }

    const user = userSnap.data() ?? {};
    if (action === 'like' && !isPremium(user)) {
      const dayKey = likesDayKey();
      const quota = user.likesQuota;
      const used = quota?.dayKey === dayKey ? Number(quota.count) || 0 : 0;
      if (used >= dailyLimit) {
        throw new HttpsError(
          'resource-exhausted',
          `You’ve used your ${dailyLimit} free likes for today. Upgrade for unlimited likes.`,
        );
      }
      tx.set(
        userRef,
        {
          likesQuota: { dayKey, count: used + 1 },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    const mode = me.data()?.mode ?? 'date';
    tx.set(outgoing, { action, mode, createdAt: FieldValue.serverTimestamp() });

    if (action !== 'like') return { matched: false as const };

    tx.set(firestore.doc(`likesReceived/${targetId}/from/${uid}`), { mode, createdAt: FieldValue.serverTimestamp() });

    const mutual = theirSwipe.exists && theirSwipe.data()?.action === 'like';
    if (!mutual) return { matched: false as const };

    const summary = (card: FirebaseFirestore.DocumentData | undefined) => ({
      firstName: card?.firstName ?? '',
      photoUrl: card?.photos?.[0]?.url ?? card?.video?.posterUrl ?? null,
    });

    const existing = existingMatch.data();
    const firstSenderId = existing?.firstSenderId ?? targetId;
    const mySummary = summary(me.data()?.card);
    const theirSummary = summary(target.data()?.card);
    // Revive expired/unmatched chats so a fresh mutual like shows up in Connections again.
    if (!existingMatch.exists || existing?.status !== 'active') {
      tx.set(
        matchRef,
        {
          members: [uid, targetId].sort(),
          people: { [uid]: mySummary, [targetId]: theirSummary },
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
      matched: true as const,
      matchId,
      firstSenderId,
      other: { uid: targetId, ...theirSummary },
      meName: mySummary.firstName || 'Someone',
      otherName: theirSummary.firstName || 'Someone',
      isNew: !existingMatch.exists || existing?.status !== 'active',
    };
  });

  if (result.matched && result.isNew) {
    const { firstSenderId, meName, otherName } = result;
    await Promise.all([
      notifyUser(uid, {
        kind: 'newMatch',
        title: 'It’s a match!',
        body:
          firstSenderId === uid
            ? `It’s a match with ${otherName}! You liked first, so send the first voice note.`
            : `It’s a match with ${otherName}! Their first voice note is on its way.`,
        data: { type: 'match', matchId },
      }).catch((error) => logger.warn('match push to swiper failed', error)),
      notifyUser(targetId, {
        kind: 'newMatch',
        title: 'It’s a match!',
        body:
          firstSenderId === targetId
            ? `It’s a match with ${meName}! You liked first, so send the first voice note.`
            : `It’s a match with ${meName}! Their first voice note is on its way.`,
        data: { type: 'match', matchId },
      }).catch((error) => logger.warn('match push to target failed', error)),
    ]);
  }

  if (!result.matched) return { matched: false };
  return {
    matched: true,
    matchId: result.matchId,
    firstSenderId: result.firstSenderId,
    other: result.other,
  };
});
