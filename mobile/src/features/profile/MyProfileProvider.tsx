import { onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/features/auth/SessionProvider';
import { preferencesDoc, profileDoc } from '@/features/onboarding/OnboardingProvider';
import type { Preferences, Profile, ProfileLocation } from '@/features/onboarding/types';

type MyProfileValue = {
  uid: string;
  profile: Profile;
  preferences: Preferences;
  savePreferences: (fields: Partial<Preferences>) => Promise<void>;
  saveLocation: (location: ProfileLocation) => Promise<void>;
};

const MyProfileContext = createContext<MyProfileValue | null>(null);

export function MyProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const uid = user?.uid ?? '';
  const [profile, setProfile] = useState<{ uid: string; data: Profile } | null>(null);
  const [preferences, setPreferences] = useState<{ uid: string; data: Preferences } | null>(null);

  useEffect(() => {
    if (!uid) return;
    const offProfile = onSnapshot(profileDoc(uid), (snap) => setProfile({ uid, data: (snap.data() as Profile) ?? {} }));
    const offPrefs = onSnapshot(preferencesDoc(uid), (snap) =>
      setPreferences({ uid, data: (snap.data() as Preferences) ?? {} }),
    );
    return () => {
      offProfile();
      offPrefs();
    };
  }, [uid]);

  const savePreferences = useCallback(
    (fields: Partial<Preferences>) =>
      setDoc(preferencesDoc(uid), { ...fields, updatedAt: serverTimestamp() }, { merge: true }),
    [uid],
  );

  const saveLocation = useCallback(
    (location: ProfileLocation) =>
      setDoc(profileDoc(uid), { location, updatedAt: serverTimestamp() }, { merge: true }),
    [uid],
  );

  const value = useMemo(
    () => ({
      uid,
      profile: profile?.uid === uid ? profile.data : {},
      preferences: preferences?.uid === uid ? preferences.data : {},
      savePreferences,
      saveLocation,
    }),
    [uid, profile, preferences, savePreferences, saveLocation],
  );

  return <MyProfileContext value={value}>{children}</MyProfileContext>;
}

export function useMyProfile() {
  const value = use(MyProfileContext);
  if (!value) throw new Error('useMyProfile must be used inside MyProfileProvider');
  return value;
}
