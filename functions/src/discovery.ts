import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { onDocumentWritten, type Change, type DocumentSnapshot } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { distanceBetween, geohashQueryBounds } from 'geofire-common';

import { buildDiscoveryDoc, DEFAULT_DISTANCE_KM, stableStringify } from './discoveryDoc';
import { ageFromBirthDate, db, requireUid, wantsToSee, type ShowMe } from './shared';

const FEED_LIMIT = 20;
const CANDIDATES_PER_BOUND = 50;
const SWIPE_CHECK_CHUNK = 30;

async function rebuildDiscovery(uid: string) {
  const firestore = db();
  const ref = firestore.doc(`discovery/${uid}`);
  const [userSnap, existing] = await firestore.getAll(firestore.doc(`users/${uid}`), ref);

  if (!userSnap.exists) {
    if (existing.exists) await ref.delete();
    return;
  }
  const user = userSnap.data() ?? {};
  // Nobody can see a profile until onboarding is done, so skip the extra reads and writes until then.
  if (user.onboarding?.status !== 'completed' && !existing.exists) return;

  const [profileSnap, prefsSnap] = await firestore.getAll(
    firestore.doc(`profiles/${uid}`),
    firestore.doc(`preferences/${uid}`),
  );
  const next = buildDiscoveryDoc(uid, user, profileSnap.data() ?? {}, prefsSnap.data() ?? {});
  const { updatedAt: _updatedAt, ...current } = existing.data() ?? {};
  if (existing.exists && stableStringify(current) === stableStringify(next)) return;

  await ref.set({ ...next, updatedAt: FieldValue.serverTimestamp() });
}

function changed(change: Change<DocumentSnapshot> | undefined, pick: (data: DocumentData) => unknown) {
  if (!change) return true;
  const before = change.before.data();
  const after = change.after.data();
  if (!before || !after) return true;
  return stableStringify(pick(before)) !== stableStringify(pick(after));
}

const userFields = (u: DocumentData) => [u.status, u.onboarding?.status, u.paused ?? false, u.birthDate ?? null];
const prefFields = (p: DocumentData) => [p.showMe, p.ageRange, p.maxDistanceKm, p.showAge, p.showDistance];
const profileFields = ({ updatedAt: _updatedAt, moderation: _moderation, ...rest }: DocumentData) => rest;

async function blockedIds(uid: string) {
  const snap = await db().collection(`blocks/${uid}/blocked`).limit(500).get();
  return snap.docs.map((d) => d.id);
}

export const syncDiscoveryFromUser = onDocumentWritten('users/{uid}', async (event) => {
  if (changed(event.data, userFields)) await rebuildDiscovery(event.params.uid);
});
export const syncDiscoveryFromProfile = onDocumentWritten('profiles/{uid}', async (event) => {
  if (changed(event.data, profileFields)) await rebuildDiscovery(event.params.uid);
});
export const syncDiscoveryFromPreferences = onDocumentWritten('preferences/{uid}', async (event) => {
  if (changed(event.data, prefFields)) await rebuildDiscovery(event.params.uid);
});

export const getDiscoveryFeed = onCall(async (request) => {
  const uid = requireUid(request);
  const firestore = db();
  const exclude = new Set<string>(
    Array.isArray(request.data?.exclude)
      ? (request.data.exclude as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 200)
      : [],
  );
  exclude.add(uid);
  for (const id of await blockedIds(uid)) exclude.add(id);

  let [meSnap, prefsSnap] = await firestore.getAll(firestore.doc(`discovery/${uid}`), firestore.doc(`preferences/${uid}`));
  // Accounts created before the sync triggers existed have no discovery record yet.
  if (!meSnap.exists) {
    await rebuildDiscovery(uid);
    meSnap = await firestore.doc(`discovery/${uid}`).get();
  }
  const me = meSnap.data();
  if (!me?.active || me.lat == null || me.lng == null) {
    throw new HttpsError('failed-precondition', 'Finish your profile to start discovering.');
  }

  const prefs = prefsSnap.data() ?? {};
  const myShowMe = (prefs.showMe ?? me.showMe) as ShowMe;
  const myRange = prefs.ageRange ?? me.ageRange;
  const myDistanceKm: number = prefs.maxDistanceKm ?? me.maxDistanceKm;
  const myAge = ageFromBirthDate(me.birthDate);
  const center: [number, number] = [me.lat, me.lng];

  const snapshots = await Promise.all(
    geohashQueryBounds(center, myDistanceKm * 1000).map(([start, end]) =>
      firestore
        .collection('discovery')
        .where('mode', '==', me.mode)
        .where('active', '==', true)
        .orderBy('geohash')
        .startAt(start)
        .endAt(end)
        .limit(CANDIDATES_PER_BOUND)
        .get(),
    ),
  );

  const seen = new Set<string>();
  const candidates = [];
  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      const c = doc.data();
      if (seen.has(doc.id) || exclude.has(doc.id)) continue;
      seen.add(doc.id);
      if (c.lat == null || c.lng == null || !c.birthDate) continue;

      const distanceKm = distanceBetween(center, [c.lat, c.lng]);
      if (distanceKm > myDistanceKm || distanceKm > (c.maxDistanceKm ?? DEFAULT_DISTANCE_KM)) continue;
      if (!wantsToSee(myShowMe, c.genderGroup) || !wantsToSee(c.showMe, me.genderGroup)) continue;

      const age = ageFromBirthDate(c.birthDate);
      if (age < myRange.min || (myRange.max < 80 && age > myRange.max)) continue;
      if (myAge < c.ageRange.min || (c.ageRange.max < 80 && myAge > c.ageRange.max)) continue;

      candidates.push({
        uid: doc.id,
        age: c.showAge === false ? null : age,
        distanceKm: c.showDistance === false ? null : Math.max(1, Math.round(distanceKm)),
        ...c.card,
      });
    }
  }
  candidates.sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));

  // Check earlier swipes only for the shortlist, instead of reading the user's whole swipe history.
  const cards: (typeof candidates)[number][] = [];
  for (let i = 0; i < candidates.length && cards.length < FEED_LIMIT; i += SWIPE_CHECK_CHUNK) {
    const chunk = candidates.slice(i, i + SWIPE_CHECK_CHUNK);
    const swipes = await firestore.getAll(...chunk.map((c) => firestore.doc(`swipes/${uid}/outgoing/${c.uid}`)));
    chunk.forEach((c, j) => {
      if (!swipes[j].exists && cards.length < FEED_LIMIT) cards.push(c);
    });
  }

  return { cards };
});
