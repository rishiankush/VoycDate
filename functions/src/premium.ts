import { FieldValue } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';

import { ageFromBirthDate, db, requireUid } from './shared';

export const DEFAULT_DAILY_LIKES = 25;

/** Calendar day in India (VOYC Date’s primary market). */
export function likesDayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
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

export const getLikesTab = onCall(async (request) => {
  const uid = requireUid(request);
  const firestore = db();
  const [userSnap, likesSnap, savedSnap, limit] = await Promise.all([
    firestore.doc(`users/${uid}`).get(),
    firestore.collection(`likesReceived/${uid}/from`).orderBy('createdAt', 'desc').limit(50).get(),
    firestore.collection(`swipes/${uid}/outgoing`).where('action', '==', 'save').limit(50).get(),
    readDailyLikeLimit(),
  ]);

  const user = userSnap.data() ?? {};
  const premium = isPremium(user);
  const dayKey = likesDayKey();
  const quota = user.likesQuota;
  const usedToday = quota?.dayKey === dayKey ? Number(quota.count) || 0 : 0;

  const likerIds = likesSnap.docs.map((d) => d.id);
  const savedIds = savedSnap.docs.map((d) => d.id);

  const discoveryIds = [...new Set([...likerIds, ...(premium || savedIds.length ? savedIds : [])])];
  const discoverySnaps =
    discoveryIds.length > 0
      ? await firestore.getAll(...discoveryIds.map((id) => firestore.doc(`discovery/${id}`)))
      : [];
  const discoveryById = new Map(discoverySnaps.map((snap, i) => [discoveryIds[i], snap.data()]));

  const likedYou = likerIds.map((id) => {
    const card = discoveryById.get(id)?.card;
    if (!premium) {
      return {
        uid: id,
        firstName: card?.firstName ? `${String(card.firstName).slice(0, 1)}.` : 'Someone',
        photoUrl: null,
        blurred: true,
        city: null,
        age: null,
      };
    }
    const birthDate = discoveryById.get(id)?.birthDate as string | undefined;
    return {
      uid: id,
      firstName: card?.firstName ?? 'Someone',
      photoUrl: card?.photos?.[0]?.url ?? card?.video?.posterUrl ?? null,
      blurred: false,
      city: card?.city ?? null,
      age: birthDate ? ageFromBirthDate(birthDate) : null,
    };
  });

  const saved = savedIds.map((id) => {
    const card = discoveryById.get(id)?.card;
    const birthDate = discoveryById.get(id)?.birthDate as string | undefined;
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
