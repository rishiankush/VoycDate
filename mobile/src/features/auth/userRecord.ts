import type { User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc, type Timestamp } from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type AccountStatus = 'active' | 'suspended' | 'banned';
export type OnboardingStatus = 'in_progress' | 'completed';

export const FIRST_ONBOARDING_STEP = '1.1';

export type UserRecord = {
  phoneNumber: string;
  status: AccountStatus;
  onboarding: {
    status: OnboardingStatus;
    currentStep: string;
    completedSteps: string[];
    updatedAt: Timestamp | null;
  };
  birthDate?: string;
  email?: string;
  /** Hidden from Discover while keeping existing matches. */
  paused?: boolean;
  notificationsPermission?: 'granted' | 'denied' | 'undetermined';
  communityPromiseAcceptedAt?: Timestamp | null;
  /** Server-managed Premium entitlement (RevenueCat later). */
  premium?: { active?: boolean; source?: string; expiresAt?: Timestamp | null };
  likesQuota?: { dayKey?: string; count?: number };
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export const userDoc = (uid: string) => doc(db, 'users', uid);

export function createUserRecord(user: User) {
  return setDoc(userDoc(user.uid), {
    phoneNumber: user.phoneNumber ?? '',
    status: 'active',
    onboarding: {
      status: 'in_progress',
      currentStep: FIRST_ONBOARDING_STEP,
      completedSteps: [],
      updatedAt: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
