import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

import { isPremium, likesDayKey, readDailyLikeLimit } from './premium';
import { notifyUser } from './push';
import { db, requireUid, type Mode } from './shared';

const ACTIONS = ['like', 'pass', 'save'] as const;
type SwipeAction = (typeof ACTIONS)[number];

export const MATCH_EXPIRY_MS = 48 * 60 * 60 * 1000;

export function normalizeMode(value: unknown): Mode {
  return value === 'friends' ? 'friends' : 'date';
}

/** Date and Friends matches are separate even for the same pair. */
export const matchIdFor = (a: string, b: string, mode: Mode = 'date') =>
  `${[a, b].sort().join('_')}_${normalizeMode(mode)}`;

/** Legacy undated match ids (pre–Friends mode) plus both modes. */
export function matchIdsForPair(a: string, b: string) {
  const base = [a, b].sort().join('_');
  return [`${base}_date`, `${base}_friends`, base];
}

export const swipeDocId = (targetId: string, mode: Mode) => `${targetId}_${normalizeMode(mode)}`;

export const swipe = onCall(async (request) => {
  const uid = requireUid(request);
  const targetId = request.data?.targetId;
  const action = request.data?.action as SwipeAction;
  if (typeof targetId !== 'string' || !targetId || targetId === uid) {
    throw new HttpsError('invalid-argument', 'Choose someone to swipe on.');
  }
  if (!ACTIONS.includes(action)) throw new HttpsError('invalid-argument', 'Unknown swipe action.');

  const firestore = db();
  // Mode is read inside the transaction from discovery; keys are resolved after the first read.
  const userRef = firestore.doc(`users/${uid}`);
  const dailyLimit = action === 'like' ? await readDailyLikeLimit() : 0;

  const result = await firestore.runTransaction(async (tx) => {
    const [target, me, userSnap] = await tx.getAll(
      firestore.doc(`discovery/${targetId}`),
      firestore.doc(`discovery/${uid}`),
      userRef,
    );
    if (!target.exists || !target.data()?.active) throw new HttpsError('not-found', 'This profile is no longer available.');

    const mode = normalizeMode(me.data()?.mode);
    const theirMode = normalizeMode(target.data()?.mode);
    if (mode !== theirMode) {
      throw new HttpsError('failed-precondition', 'You’re in different modes. Switch to match.');
    }

    const outgoing = firestore.doc(`swipes/${uid}/outgoing/${swipeDocId(targetId, mode)}`);
    const theirs = firestore.doc(`swipes/${targetId}/outgoing/${swipeDocId(uid, mode)}`);
    const matchId = matchIdFor(uid, targetId, mode);
    const matchRef = firestore.doc(`matches/${matchId}`);

    const [theirSwipe, existingMatch, existingOutgoing, legacyOutgoing, legacyTheirs] = await tx.getAll(
      theirs,
      matchRef,
      outgoing,
      // Pre-Friends docs used bare targetId; only block date-mode retries on those.
      firestore.doc(`swipes/${uid}/outgoing/${targetId}`),
      firestore.doc(`swipes/${targetId}/outgoing/${uid}`),
    );

    if (existingOutgoing.exists || (mode === 'date' && legacyOutgoing.exists)) {
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

    tx.set(outgoing, { action, mode, targetId, createdAt: FieldValue.serverTimestamp() });

    if (action !== 'like') return { matched: false as const };

    tx.set(firestore.doc(`likesReceived/${targetId}/from/${swipeDocId(uid, mode)}`), {
      uid,
      mode,
      createdAt: FieldValue.serverTimestamp(),
    });

    const mutual =
      (theirSwipe.exists && theirSwipe.data()?.action === 'like') ||
      (mode === 'date' && legacyTheirs.exists && legacyTheirs.data()?.action === 'like');
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
    const { firstSenderId, meName, otherName, matchId } = result;
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
