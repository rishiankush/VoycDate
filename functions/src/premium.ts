import { FieldValue } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';

import { ageFromBirthDate, db, requireUid } from './shared';

export const DEFAULT_DAILY_LIKES = 25;
export const DEFAULT_WEEKLY_SPARKS = 5;

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

  const likerIds = likesSnap.docs
    .filter((d) => (d.data().mode ?? 'date') === mode)
    .map((d) => (typeof d.data().uid === 'string' ? d.data().uid : d.id.replace(/_(date|friends)$/, '')))
    .filter(Boolean) as string[];
  const savedIds = savedSnap.docs
    .filter((d) => (d.data().mode ?? 'date') === mode)
    .map((d) => (typeof d.data().targetId === 'string' ? d.data().targetId : d.id.replace(/_(date|friends)$/, '')))
    .filter(Boolean) as string[];

  const discoveryIds = [...new Set([...likerIds, ...(premium || savedIds.length ? savedIds : [])])];
  const discoverySnaps =
    discoveryIds.length > 0
      ? await firestore.getAll(...discoveryIds.map((id) => firestore.doc(`discovery/${id}`)))
      : [];
  const discoveryById = new Map(discoverySnaps.map((snap, i) => [discoveryIds[i], snap.data()]));

  const likedYou = likerIds.map((id) => {
    const doc = discoveryById.get(id);
    const card = doc?.card;
    const photoUrl = card?.photos?.[0]?.url ?? card?.video?.posterUrl ?? null;
    // Free users still get a photo URL so the client can show a real blur (not a solid block).
    if (!premium) {
      return {
        uid: id,
        firstName: card?.firstName ? `${String(card.firstName).slice(0, 1)}.` : 'Someone',
        photoUrl,
        blurred: true,
        city: null,
        age: null,
      };
    }
    const birthDate = doc?.birthDate as string | undefined;
    return {
      uid: id,
      firstName: card?.firstName ?? 'Someone',
      photoUrl,
      blurred: false,
      city: card?.city ?? null,
      age: birthDate ? ageFromBirthDate(birthDate) : null,
    };
  });

  const saved = savedIds.map((id) => {
    const doc = discoveryById.get(id);
    const card = doc?.card;
    const birthDate = doc?.birthDate as string | undefined;
    return {
      uid: id,
      firstName: card?.firstName ?? 'Someone',
      photoUrl: card?.photos?.[0]?.url ?? card?.video?.posterUrl ?? null,
      blurred: false,
      city: card?.city ?? null,
      age: birthDate ? ageFromBirthDate(birthDate) : null,
    };
  });

  return {
    premium,
    dailyLimit: limit,
    likesUsedToday: usedToday,
    likesRemaining: premium ? null : Math.max(0, limit - usedToday),
    likedYouCount: likerIds.length,
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
