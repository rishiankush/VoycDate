import {
  arrayUnion,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type FieldValue,
} from 'firebase/firestore';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/features/auth/SessionProvider';
import { userDoc } from '@/features/auth/userRecord';
import { db } from '@/lib/firebase';

import { nextStep } from './steps';
import type { Preferences, Profile } from './types';

export type StepData = {
  profile?: Partial<Profile>;
  preferences?: Partial<Preferences>;
  user?: Record<string, unknown>;
};

type OnboardingValue = {
  uid: string;
  ready: boolean;
  profile: Profile;
  preferences: Preferences;
  /** Saves the step's answers and the resume position in one write. Returns the next step. */
  completeStep: (stepId: string, data?: StepData) => Promise<ReturnType<typeof nextStep>>;
  /** Saves profile fields immediately (used for uploads that should survive an app restart). */
  saveProfile: (fields: Partial<Profile> | Record<string, FieldValue>) => Promise<void>;
  finish: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingValue | null>(null);

export const profileDoc = (uid: string) => doc(db, 'profiles', uid);
export const preferencesDoc = (uid: string) => doc(db, 'preferences', uid);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const uid = user?.uid ?? '';
  const [profile, setProfile] = useState<{ uid: string; data: Profile } | null>(null);
  const [preferences, setPreferences] = useState<{ uid: string; data: Preferences } | null>(null);

  useEffect(() => {
    if (!uid) return;
    const offProfile = onSnapshot(profileDoc(uid), (snap) =>
      setProfile({ uid, data: (snap.data() as Profile | undefined) ?? {} }),
    );
    const offPreferences = onSnapshot(preferencesDoc(uid), (snap) =>
      setPreferences({ uid, data: (snap.data() as Preferences | undefined) ?? {} }),
    );
    return () => {
      offProfile();
      offPreferences();
    };
  }, [uid]);

  const currentProfile = profile?.uid === uid ? profile.data : null;
  const currentPreferences = preferences?.uid === uid ? preferences.data : null;
  const ready = Boolean(uid && currentProfile && currentPreferences);

  const completeStep = useCallback(
    async (stepId: string, data: StepData = {}) => {
      const mode = data.profile?.mode ?? currentProfile?.mode;
      const next = nextStep(stepId, mode);
      const batch = writeBatch(db);
      if (data.profile) {
        batch.set(profileDoc(uid), { ...data.profile, updatedAt: serverTimestamp() }, { merge: true });
      }
      if (data.preferences) {
        batch.set(preferencesDoc(uid), { ...data.preferences, updatedAt: serverTimestamp() }, { merge: true });
      }
      batch.update(userDoc(uid), {
        ...data.user,
        'onboarding.currentStep': next?.id ?? stepId,
        'onboarding.completedSteps': arrayUnion(stepId),
        'onboarding.updatedAt': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return next;
    },
    [uid, currentProfile?.mode],
  );

  const saveProfile = useCallback(
    (fields: Partial<Profile> | Record<string, FieldValue>) =>
      setDoc(profileDoc(uid), { ...fields, updatedAt: serverTimestamp() }, { merge: true }),
    [uid],
  );

  const finish = useCallback(async () => {
    const batch = writeBatch(db);
    batch.update(userDoc(uid), {
      'onboarding.status': 'completed',
      'onboarding.completedSteps': arrayUnion('5.6'),
      'onboarding.updatedAt': serverTimestamp(),
      onboardingCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  }, [uid]);

  const value = useMemo(
    () => ({
      uid,
      ready,
      profile: currentProfile ?? {},
      preferences: currentPreferences ?? {},
      completeStep,
      saveProfile,
      finish,
    }),
    [uid, ready, currentProfile, currentPreferences, completeStep, saveProfile, finish],
  );

  return <OnboardingContext value={value}>{children}</OnboardingContext>;
}

export function useOnboarding() {
  const value = use(OnboardingContext);
  if (!value) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return value;
}
