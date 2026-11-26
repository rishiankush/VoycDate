import { httpsCallable } from 'firebase/functions';

import type { DiscoverCard } from '@/features/discover/types';
import { functions } from '@/lib/firebase';

export type LikeTile = {
  uid: string;
  firstName: string;
  photoUrl: string | null;
  blurred: boolean;
  city: string | null;
  age: number | null;
};

export type LikesTabData = {
  premium: boolean;
  dailyLimit: number;
  likesUsedToday: number;
  likesRemaining: number | null;
  likedYouCount: number;
  likedYou: LikeTile[];
  saved: LikeTile[];
};

export type BoostStatus = {
  premium: boolean;
  weeklyLimit: number;
  usedThisWeek: number;
  remaining: number;
  active: boolean;
  boostedUntil: number | null;
  weekKey: string;
};

const getLikesTabFn = httpsCallable<Record<string, never>, LikesTabData>(functions, 'getLikesTab');
const setPremiumStatusFn = httpsCallable<{ active: boolean }, { ok: boolean; premium: boolean }>(
  functions,
  'setPremiumStatus',
);
const getMatchProfileFn = httpsCallable<{ matchId: string; targetId: string }, { card: DiscoverCard }>(
  functions,
  'getMatchProfile',
);
const getBoostStatusFn = httpsCallable<Record<string, never>, BoostStatus>(functions, 'getBoostStatus');
const activateBoostFn = httpsCallable<
  Record<string, never>,
  { ok: true; boostedUntil: number; remaining: number; weeklyLimit: number; weekKey: string }
>(functions, 'activateBoost');

export const fetchLikesTab = async () => (await getLikesTabFn({})).data;
export const setPremiumStatus = async (active: boolean) => (await setPremiumStatusFn({ active })).data;
export const fetchMatchProfile = async (matchId: string, targetId: string) =>
  (await getMatchProfileFn({ matchId, targetId })).data.card;
export const fetchBoostStatus = async () => (await getBoostStatusFn({})).data;
export const activateBoost = async () => (await activateBoostFn({})).data;

export const PLANS = [
  { id: 'weekly', label: '1 week', price: '₹499', per: 'per week', badge: null },
  { id: 'monthly', label: '1 month', price: '₹999', per: 'per month', badge: 'Popular' },
  { id: 'quarterly', label: '3 months', price: '₹1,999', per: 'per 3 months', badge: 'Best value' },
] as const;
