import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/features/auth/SessionProvider';
import { userDoc } from '@/features/auth/userRecord';
import { preferencesDoc, profileDoc } from '@/features/onboarding/OnboardingProvider';
import type { Mode, Preferences, Profile, ProfileLocation } from '@/features/onboarding/types';
import { db } from '@/lib/firebase';

type MyProfileValue = {
  uid: string;
  profile: Profile;
  preferences: Preferences;
  paused: boolean;
  savePreferences: (fields: Partial<Preferences>) => Promise<void>;
  saveProfile: (fields: Partial<Profile>) => Promise<void>;
  saveLocation: (location: ProfileLocation) => Promise<void>;
  setMode: (mode: Mode) => Promise<void>;
  setPaused: (paused: boolean) => Promise<void>;
};

const MyProfileContext = createContext<MyProfileValue | null>(null);

export function MyProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const uid = user?.uid ?? '';
  const [profile, setProfile] = useState<{ uid: string; data: Profile } | null>(null);
  const [preferences, setPreferences] = useState<{ uid: string; data: Preferences } | null>(null);
  const [paused, setPausedState] = useState<{ uid: string; value: boolean } | null>(null);

  useEffect(() => {
    if (!uid) return;
    const offProfile = onSnapshot(profileDoc(uid), (snap) => setProfile({ uid, data: (snap.data() as Profile) ?? {} }));
    const offPrefs = onSnapshot(preferencesDoc(uid), (snap) =>
      setPreferences({ uid, data: (snap.data() as Preferences) ?? {} }),
    );
    const offUser = onSnapshot(userDoc(uid), (snap) => setPausedState({ uid, value: Boolean(snap.data()?.paused) }));
    return () => {
      offProfile();
      offPrefs();
      offUser();
    };
  }, [uid]);

  const savePreferences = useCallback(
    (fields: Partial<Preferences>) =>
      setDoc(preferencesDoc(uid), { ...fields, updatedAt: serverTimestamp() }, { merge: true }),
    [uid],
  );

  const saveProfile = useCallback(
    (fields: Partial<Profile>) => setDoc(profileDoc(uid), { ...fields, updatedAt: serverTimestamp() }, { merge: true }),
    [uid],
  );

  const saveLocation = useCallback(
    (location: ProfileLocation) =>
      setDoc(profileDoc(uid), { location, updatedAt: serverTimestamp() }, { merge: true }),
    [uid],
  );

  const setMode = useCallback(
    (mode: Mode) => setDoc(profileDoc(uid), { mode, updatedAt: serverTimestamp() }, { merge: true }),
    [uid],
  );

  const setPaused = useCallback(
    (next: boolean) => setDoc(doc(db, 'users', uid), { paused: next, updatedAt: serverTimestamp() }, { merge: true }),
    [uid],
  );

  const value = useMemo(
    () => ({
      uid,
      profile: profile?.uid === uid ? profile.data : {},
      preferences: preferences?.uid === uid ? preferences.data : {},
      paused: paused?.uid === uid ? paused.value : false,
      savePreferences,
      saveProfile,
      saveLocation,
      setMode,
      setPaused,
    }),
    [uid, profile, preferences, paused, savePreferences, saveProfile, saveLocation, setMode, setPaused],
  );

  return <MyProfileContext value={value}>{children}</MyProfileContext>;
}

export function useMyProfile() {
  const value = use(MyProfileContext);
  if (!value) throw new Error('useMyProfile must be used inside MyProfileProvider');
  return value;
}
