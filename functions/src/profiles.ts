import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { ageFromBirthDate, db, requireUid } from './shared';

/** Full Discover-style card for someone you’re already matched with. */
export const getMatchProfile = onCall(async (request) => {
  const uid = requireUid(request);
  const matchId = request.data?.matchId;
  const targetId = request.data?.targetId;
  if (typeof matchId !== 'string' || !matchId) {
    throw new HttpsError('invalid-argument', 'Choose a conversation.');
  }
  if (typeof targetId !== 'string' || !targetId || targetId === uid) {
    throw new HttpsError('invalid-argument', 'Choose a profile.');
  }

  const firestore = db();
  const matchSnap = await firestore.doc(`matches/${matchId}`).get();
  const match = matchSnap.data();
  if (!matchSnap.exists || !Array.isArray(match?.members) || !match.members.includes(uid) || !match.members.includes(targetId)) {
    throw new HttpsError('permission-denied', 'You can only view profiles for your matches.');
  }

  const discovery = await firestore.doc(`discovery/${targetId}`).get();
  if (!discovery.exists) throw new HttpsError('not-found', 'This profile is no longer available.');
  const data = discovery.data()!;
  const card = data.card ?? {};
  const age = data.birthDate ? ageFromBirthDate(data.birthDate) : null;

  return {
    card: {
      uid: targetId,
      firstName: card.firstName ?? 'Match',
      age,
      distanceKm: null,
      gender: card.gender ?? null,
      intent: card.intent ?? null,
      heightCm: card.heightCm ?? null,
      interests: card.interests ?? [],
      values: card.values ?? [],
      habits: card.habits ?? {},
      family: card.family ?? {},
      beliefs: card.beliefs ?? {},
      photos: card.photos ?? [],
      video: card.video ?? null,
      prompts: card.prompts ?? [],
      bio: card.bio ?? '',
      city: card.city ?? '',
      region: card.region ?? null,
      countryCode: card.countryCode ?? null,
      verified: Boolean(card.verified),
      mode: card.mode === 'friends' ? 'friends' : 'date',
    },
  };
});
