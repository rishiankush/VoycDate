import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { ageFromBirthDate, db, requireUid } from './shared';

export const DEFAULT_DAILY_LIKES = 25;
export const DEFAULT_WEEKLY_SPARKS = 5;
export const DEFAULT_WEEKLY_BOOSTS = 1;
export const BOOST_DURATION_MS = 30 * 60 * 1000;

/** Calendar day in India (VOYC Date’s primary market). */
export function likesDayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** ISO week key (YYYY-Www) in India — Sparks refresh each week. */
export function sparksWeekKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function isPremium(user: FirebaseFirestore.DocumentData | undefined) {
  const premium = user?.premium;
  if (!premium?.active) return false;
  if (premium.expiresAt?.toMillis?.() && premium.expiresAt.toMillis() < Date.now()) return false;
  return true;
}

export async function readDailyLikeLimit() {
  const snap = await db().doc('config/limits').get();
  const value = snap.data()?.dailyLikes;
  return typeof value === 'number' && value > 0 ? value : DEFAULT_DAILY_LIKES;
}

export async function readWeeklySparkLimit() {
  const snap = await db().doc('config/limits').get();
  const value = snap.data()?.weeklySparks;
  return typeof value === 'number' && value > 0 ? value : DEFAULT_WEEKLY_SPARKS;
}

export async function readWeeklyBoostLimit() {
  const snap = await db().doc('config/limits').get();
  const value = snap.data()?.weeklyBoosts;
  return typeof value === 'number' && value > 0 ? value : DEFAULT_WEEKLY_BOOSTS;
}

export type BoostStatus = {
  premium: boolean;
  weeklyLimit: number;
  usedThisWeek: number;
  remaining: number;
  active: boolean;
  boostedUntil: number | null;
  weekKey: string;
};

export async function readBoostStatus(uid: string): Promise<BoostStatus> {
  const firestore = db();
  const [userSnap, discoverySnap, limit] = await Promise.all([
    firestore.doc(`users/${uid}`).get(),
    firestore.doc(`discovery/${uid}`).get(),
    readWeeklyBoostLimit(),
  ]);
  const user = userSnap.data() ?? {};
  const premium = isPremium(user);
  const weekKey = sparksWeekKey();
  const quota = user.boostQuota;
  const usedThisWeek = quota?.weekKey === weekKey ? Number(quota.count) || 0 : 0;
  const boostedUntilMs = discoverySnap.data()?.boostedUntil?.toMillis?.() ?? null;
  const active = Boolean(boostedUntilMs && boostedUntilMs > Date.now());
  return {
    premium,
    weeklyLimit: limit,
    usedThisWeek,
    remaining: premium ? Math.max(0, limit - usedThisWeek) : 0,
    active,
    boostedUntil: active ? boostedUntilMs : null,
    weekKey,
  };
}

export const getLikesTab = onCall(async (request) => {
  const uid = requireUid(request);
  const firestore = db();
  const [userSnap, likesSnap, savedSnap, profileSnap, limit] = await Promise.all([
    firestore.doc(`users/${uid}`).get(),
    firestore.collection(`likesReceived/${uid}/from`).orderBy('createdAt', 'desc').limit(80).get(),
    firestore.collection(`swipes/${uid}/outgoing`).where('action', '==', 'save').limit(80).get(),
    firestore.doc(`profiles/${uid}`).get(),
    readDailyLikeLimit(),
  ]);

  const user = userSnap.data() ?? {};
  const premium = isPremium(user);
  const dayKey = likesDayKey();
  const quota = user.likesQuota;
  const usedToday = quota?.dayKey === dayKey ? Number(quota.count) || 0 : 0;
  const mode = profileSnap.data()?.mode === 'friends' ? 'friends' : 'date';

  const resolveLikerId = (d: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = d.data();
    if (typeof data.uid === 'string' && data.uid) return data.uid;
    return d.id.replace(/_(date|friends)$/, '');
  };

  // Mode-scoped + legacy docs can both exist for the same person — keep one tile.
  const rawLikerIds = [
    ...new Set(
      likesSnap.docs
        .filter((d) => (d.data().mode ?? 'date') === mode)
        .map(resolveLikerId)
        .filter((id): id is string => Boolean(id) && id !== uid),
    ),
  ];
  const savedIds = [
    ...new Set(
      savedSnap.docs
        .filter((d) => (d.data().mode ?? 'date') === mode)
        .map((d) =>
          typeof d.data().targetId === 'string' && d.data().targetId
            ? d.data().targetId
            : d.id.replace(/_(date|friends)$/, ''),
        )
        .filter((id): id is string => Boolean(id) && id !== uid),
    ),
  ];

  // Drop anyone you've already liked / passed / Sparks, or already matched with.
  const decisionRefs = rawLikerIds.flatMap((id) => [
    firestore.doc(`swipes/${uid}/outgoing/${id}_${mode}`),
    firestore.doc(`swipes/${uid}/outgoing/${id}`),
    firestore.doc(`matches/${[uid, id].sort().join('_')}_${mode}`),
  ]);
  const decisionSnaps: FirebaseFirestore.DocumentSnapshot[] = [];
  for (let i = 0; i < decisionRefs.length; i += 80) {
    decisionSnaps.push(...(await firestore.getAll(...decisionRefs.slice(i, i + 80))));
  }
  const decidedAway = new Set<string>();
  rawLikerIds.forEach((id, i) => {
    const outgoing = decisionSnaps[i * 3];
    const legacy = decisionSnaps[i * 3 + 1];
    const match = decisionSnaps[i * 3 + 2];
    const prior = outgoing.exists ? outgoing.data()?.action : legacy.exists ? legacy.data()?.action : null;
    if (prior === 'like' || prior === 'pass' || prior === 'spark') decidedAway.add(id);
    if (match.exists && match.data()?.status === 'active') decidedAway.add(id);
  });
  const likerIds = rawLikerIds.filter((id) => !decidedAway.has(id));

  const discoveryIds = [...new Set([...likerIds, ...(premium || savedIds.length ? savedIds : [])])];
  const discoverySnaps =
    discoveryIds.length > 0
      ? await firestore.getAll(...discoveryIds.map((id) => firestore.doc(`discovery/${id}`)))
      : [];
  const discoveryById = new Map(discoverySnaps.map((snap, i) => [discoveryIds[i], snap.data()]));

  const likedYou = likerIds.flatMap((id) => {
    const doc = discoveryById.get(id);
    const card = doc?.card;
    // Skip ghost likes (no discovery / empty card) — these showed up as blank "Someone" tiles.
    if (!doc?.active || !card?.firstName) return [];
    const photoUrl = card.photos?.[0]?.url ?? card.video?.posterUrl ?? null;
    // Free users still get a photo URL so the client can show a real blur (not a solid block).
    if (!premium) {
      return [
        {
          uid: id,
          firstName: `${String(card.firstName).slice(0, 1)}.`,
          photoUrl,
          blurred: true,
          city: null,
          age: null,
        },
      ];
    }
    const birthDate = doc.birthDate as string | undefined;
    return [
      {
        uid: id,
        firstName: card.firstName,
        photoUrl,
        blurred: false,
        city: card.city ?? null,
        age: birthDate ? ageFromBirthDate(birthDate) : null,
      },
    ];
  });

  const saved = savedIds.flatMap((id) => {
    const doc = discoveryById.get(id);
    const card = doc?.card;
    if (!doc?.active || !card?.firstName) return [];
    const birthDate = doc.birthDate as string | undefined;
    return [
      {
        uid: id,
        firstName: card.firstName,
        photoUrl: card.photos?.[0]?.url ?? card.video?.posterUrl ?? null,
        blurred: false,
        city: card.city ?? null,
        age: birthDate ? ageFromBirthDate(birthDate) : null,
      },
    ];
  });

  return {
    premium,
    dailyLimit: limit,
    likesUsedToday: usedToday,
    likesRemaining: premium ? null : Math.max(0, limit - usedToday),
    likedYouCount: likedYou.length,
    likedYou,
    saved,
  };
});

/** Self-serve premium for VoycDate until RevenueCat / store billing is wired. */
export const setPremiumStatus = onCall(async (request) => {
  const uid = requireUid(request);
  const active = Boolean(request.data?.active);
  await db()
    .doc(`users/${uid}`)
    .set(
      {
        premium: active
          ? {
              active: true,
              source: 'manual',
              activatedAt: FieldValue.serverTimestamp(),
              expiresAt: null,
            }
          : { active: false, source: 'manual', deactivatedAt: FieldValue.serverTimestamp() },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  return { ok: true, premium: active };
});

export const getBoostStatus = onCall(async (request) => {
  const uid = requireUid(request);
  return readBoostStatus(uid);
});

/** Premium: 1 boost / week → ~30 minutes near the top of Discover. */
export const activateBoost = onCall(async (request) => {
  const uid = requireUid(request);
  const firestore = db();
  const userRef = firestore.doc(`users/${uid}`);
  const discoveryRef = firestore.doc(`discovery/${uid}`);
  const limit = await readWeeklyBoostLimit();

  return firestore.runTransaction(async (tx) => {
    const [userSnap, discoverySnap] = await Promise.all([tx.get(userRef), tx.get(discoveryRef)]);
    const user = userSnap.data() ?? {};
    if (!isPremium(user)) {
      throw new HttpsError('permission-denied', 'Boosts are a Premium perk.');
    }
    if (!discoverySnap.exists || !discoverySnap.data()?.active) {
      throw new HttpsError('failed-precondition', 'Finish your profile before boosting.');
    }

    const boostedUntilMs = discoverySnap.data()?.boostedUntil?.toMillis?.() ?? 0;
    if (boostedUntilMs > Date.now()) {
      throw new HttpsError('already-exists', 'Your profile is already boosted.');
    }

    const weekKey = sparksWeekKey();
    const quota = user.boostQuota;
    const used = quota?.weekKey === weekKey ? Number(quota.count) || 0 : 0;
    if (used >= limit) {
      throw new HttpsError('resource-exhausted', 'You’ve used this week’s boost. Come back next week.');
    }

    const until = Timestamp.fromMillis(Date.now() + BOOST_DURATION_MS);
    tx.set(
      userRef,
      {
        boostQuota: { weekKey, count: used + 1 },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    tx.set(
      discoveryRef,
      {
        boostedUntil: until,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return {
      ok: true as const,
      boostedUntil: until.toMillis(),
      remaining: Math.max(0, limit - (used + 1)),
      weeklyLimit: limit,
      weekKey,
    };
  });
});
