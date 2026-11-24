import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

export const db = () => getFirestore();

export type GenderGroup = 'woman' | 'man' | 'nonbinary';
export type ShowMe = 'women' | 'men' | 'everyone';
export type Mode = 'date' | 'friends';

export function requireUid(request: CallableRequest) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return uid;
}

/** Admins are listed in `admins/{uid}` (seed with scripts/make-admin.mjs). */
export async function requireAdmin(request: CallableRequest) {
  const uid = requireUid(request);
  const snap = await db().doc(`admins/${uid}`).get();
  if (!snap.exists) throw new HttpsError('permission-denied', 'Admins only.');
  return { uid, role: (snap.data()?.role as string) ?? 'admin' };
}

export function ageFromBirthDate(iso: string, today = new Date()) {
  const [year, month, day] = iso.split('-').map(Number);
  let age = today.getUTCFullYear() - year;
  const beforeBirthday =
    today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

export function wantsToSee(showMe: ShowMe | undefined, group: GenderGroup | null | undefined) {
  if (!showMe || showMe === 'everyone') return true;
  if (showMe === 'women') return group === 'woman';
  return group === 'man';
}
