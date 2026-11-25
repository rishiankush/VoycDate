import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

import {
  isPremium,
  likesDayKey,
  readDailyLikeLimit,
  readWeeklySparkLimit,
  sparksWeekKey,
} from './premium';
import { notifyUser } from './push';
import { db, requireUid, type Mode } from './shared';

const ACTIONS = ['like', 'pass', 'save', 'spark'] as const;
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

function personSummary(card: FirebaseFirestore.DocumentData | undefined) {
  return {
    firstName: card?.firstName ?? '',
    photoUrl: card?.photos?.[0]?.url ?? card?.video?.posterUrl ?? null,
  };
}

export const swipe = onCall(async (request) => {
  const uid = requireUid(request);
  const targetId = request.data?.targetId;
  const action = request.data?.action as SwipeAction;
  if (typeof targetId !== 'string' || !targetId || targetId === uid) {
    throw new HttpsError('invalid-argument', 'Choose someone to swipe on.');
  }
  if (!ACTIONS.includes(action)) throw new HttpsError('invalid-argument', 'Unknown swipe action.');

  const firestore = db();
  const userRef = firestore.doc(`users/${uid}`);
  const dailyLimit = action === 'like' ? await readDailyLikeLimit() : 0;
  const weeklySparks = action === 'spark' ? await readWeeklySparkLimit() : 0;

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

    if (action === 'spark') {
      if (!isPremium(user)) {
        throw new HttpsError('permission-denied', 'Spark is a Premium perk.');
      }
      const weekKey = sparksWeekKey();
      const quota = user.sparkQuota;
      const used = quota?.weekKey === weekKey ? Number(quota.count) || 0 : 0;
      if (used >= weeklySparks) {
        throw new HttpsError(
          'resource-exhausted',
          `You’ve used your ${weeklySparks} Sparks for this week.`,
        );
      }
      tx.set(
        userRef,
        {
          sparkQuota: { weekKey, count: used + 1 },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    tx.set(outgoing, { action, mode, targetId, createdAt: FieldValue.serverTimestamp() });

    if (action === 'pass' || action === 'save') return { matched: false as const };

    const mySummary = personSummary(me.data()?.card);
    const theirSummary = personSummary(target.data()?.card);
    const existing = existingMatch.data();

    // Spark: open a connect request (or full match if they already liked you).
    if (action === 'spark') {
      const theyLiked =
        (theirSwipe.exists && theirSwipe.data()?.action === 'like') ||
        (mode === 'date' && legacyTheirs.exists && legacyTheirs.data()?.action === 'like');

      tx.set(firestore.doc(`likesReceived/${targetId}/from/${swipeDocId(uid, mode)}`), {
        uid,
        mode,
        kind: 'spark',
        createdAt: FieldValue.serverTimestamp(),
      });

      if (theyLiked) {
        if (!existingMatch.exists || existing?.status !== 'active' || existing?.stage === 'spark_pending') {
          tx.set(
            matchRef,
            {
              members: [uid, targetId].sort(),
              people: { [uid]: mySummary, [targetId]: theirSummary },
              mode,
              firstSenderId: uid,
              sparkedBy: uid,
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
          firstSenderId: uid,
          other: { uid: targetId, ...theirSummary },
          meName: mySummary.firstName || 'Someone',
          otherName: theirSummary.firstName || 'Someone',
          isNew: true as const,
        };
      }

      tx.set(
        matchRef,
        {
          members: [uid, targetId].sort(),
          people: { [uid]: mySummary, [targetId]: theirSummary },
          mode,
          firstSenderId: uid,
          sparkedBy: uid,
          stage: 'spark_pending',
          status: 'active',
          voice: { qualifiedCount: 0, perUser: {} },
          unread: {},
          lastMessageAt: null,
          lastMessage: null,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: null,
          rematchedAt: null,
        },
        { merge: true },
      );

      return {
        matched: false as const,
        sparked: true as const,
        matchId,
        otherName: theirSummary.firstName || 'Someone',
        meName: mySummary.firstName || 'Someone',
      };
    }

    // Regular like path.
    tx.set(firestore.doc(`likesReceived/${targetId}/from/${swipeDocId(uid, mode)}`), {
      uid,
      mode,
      createdAt: FieldValue.serverTimestamp(),
    });

    const mutual =
      (theirSwipe.exists && (theirSwipe.data()?.action === 'like' || theirSwipe.data()?.action === 'spark')) ||
      (mode === 'date' &&
        legacyTheirs.exists &&
        (legacyTheirs.data()?.action === 'like' || legacyTheirs.data()?.action === 'spark'));
    if (!mutual) return { matched: false as const };

    const firstSenderId =
      theirSwipe.data()?.action === 'spark' || legacyTheirs.data()?.action === 'spark'
        ? targetId
        : (existing?.firstSenderId ?? targetId);

    // Accept a pending Spark by liking back, or create / revive a mutual match.
    if (!existingMatch.exists || existing?.status !== 'active' || existing?.stage === 'spark_pending') {
      tx.set(
        matchRef,
        {
          members: [uid, targetId].sort(),
          people: { [uid]: mySummary, [targetId]: theirSummary },
          mode,
          firstSenderId,
          sparkedBy: existing?.sparkedBy ?? (theirSwipe.data()?.action === 'spark' ? targetId : null),
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
      isNew: !existingMatch.exists || existing?.status !== 'active' || existing?.stage === 'spark_pending',
    };
  });

  if ('sparked' in result && result.sparked) {
    await notifyUser(targetId, {
      kind: 'newMatch',
      title: 'Someone sent you a Spark',
      body: `${result.meName} wants to connect. Accept in Connections to match.`,
      data: { type: 'spark', matchId: result.matchId },
    }).catch((error) => logger.warn('spark push failed', error));
    return { matched: false, sparked: true };
  }

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

/** Accept or decline a pending Spark connect request. */
export const respondToSpark = onCall(async (request) => {
  const uid = requireUid(request);
  const matchId = request.data?.matchId;
  const accept = Boolean(request.data?.accept);
  if (typeof matchId !== 'string' || !matchId) {
    throw new HttpsError('invalid-argument', 'Choose a Spark to respond to.');
  }

  const firestore = db();
  const matchRef = firestore.doc(`matches/${matchId}`);

  const result = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(matchRef);
    const match = snap.data();
    if (!snap.exists || !match?.members?.includes(uid)) {
      throw new HttpsError('not-found', 'This Spark isn’t available.');
    }
    if (match.stage !== 'spark_pending' || match.status !== 'active') {
      throw new HttpsError('failed-precondition', 'This Spark was already decided.');
    }
    const sparkedBy = match.sparkedBy as string | undefined;
    if (!sparkedBy || sparkedBy === uid) {
      throw new HttpsError('failed-precondition', 'Only the person who received the Spark can respond.');
    }

    if (!accept) {
      tx.set(
        matchRef,
        {
          status: 'unmatched',
          stage: 'expired',
          unmatchedBy: uid,
          unmatchedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return { accepted: false as const, otherId: sparkedBy };
    }

    const mode = normalizeMode(match.mode);
    tx.set(
      firestore.doc(`swipes/${uid}/outgoing/${swipeDocId(sparkedBy, mode)}`),
      { action: 'like', mode, targetId: sparkedBy, createdAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    tx.set(
      matchRef,
      {
        stage: 'awaiting_first_voice',
        firstSenderId: sparkedBy,
        expiresAt: Timestamp.fromMillis(Date.now() + MATCH_EXPIRY_MS),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return {
      accepted: true as const,
      otherId: sparkedBy,
      matchId,
      firstSenderId: sparkedBy,
      otherName: match.people?.[sparkedBy]?.firstName ?? 'Someone',
      meName: match.people?.[uid]?.firstName ?? 'Someone',
    };
  });

  if (result.accepted) {
    await Promise.all([
      notifyUser(result.otherId, {
        kind: 'newMatch',
        title: 'It’s a match!',
        body: `${result.meName} accepted your Spark! Send the first voice note.`,
        data: { type: 'match', matchId: result.matchId },
      }).catch((error) => logger.warn('spark accept push failed', error)),
      notifyUser(uid, {
        kind: 'newMatch',
        title: 'It’s a match!',
        body: `You matched with ${result.otherName}. Their first voice note is on its way.`,
        data: { type: 'match', matchId: result.matchId },
      }).catch((error) => logger.warn('spark accept self push failed', error)),
    ]);
    return { accepted: true, matchId: result.matchId, firstSenderId: result.firstSenderId };
  }

  await notifyUser(result.otherId, {
    kind: 'newMatch',
    title: 'Spark declined',
    body: 'Your Spark wasn’t accepted this time.',
    data: { type: 'spark_declined', matchId },
  }).catch((error) => logger.warn('spark decline push failed', error));

  return { accepted: false };
});
