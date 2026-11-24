import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { auth, db } from '@/lib/firebase';

import { createUserRecord, userDoc, type UserRecord } from './userRecord';

export type SessionStatus = 'loading' | 'signedOut' | 'onboarding' | 'active' | 'suspended' | 'error';

type SessionValue = {
  status: SessionStatus;
  user: User | null;
  record: UserRecord | null;
  retry: () => void;
  signOut: () => Promise<void>;
};

type RecordSnapshot = { uid: string; record: UserRecord | null; failed: boolean };
/** null = profile not loaded yet; Discover stays locked until an approved face intro exists. */
type VideoGate = boolean | null;

const SessionContext = createContext<SessionValue | null>(null);

function deriveStatus(
  user: User | null | undefined,
  snapshot: RecordSnapshot | null,
  videoApproved: VideoGate,
): SessionStatus {
  if (user === undefined) return 'loading';
  if (user === null) return 'signedOut';
  if (!snapshot) return 'loading';
  if (snapshot.failed) return 'error';
  if (!snapshot.record) return 'loading';
  if (snapshot.record.status !== 'active') return 'suspended';
  if (snapshot.record.onboarding?.status !== 'completed') return 'onboarding';
  // Completed the form but still missing an approved face video → stay in onboarding.
  if (videoApproved === null) return 'loading';
  return videoApproved ? 'active' : 'onboarding';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [snapshot, setSnapshot] = useState<RecordSnapshot | null>(null);
  const [videoApproved, setVideoApproved] = useState<VideoGate>(null);
  const [attempt, setAttempt] = useState(0);
  const creatingFor = useRef<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) {
      setVideoApproved(null);
      return;
    }
    const uid = user.uid;
    return onSnapshot(
      userDoc(uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setSnapshot({ uid, record: docSnap.data() as UserRecord, failed: false });
          return;
        }
        if (creatingFor.current === uid) return;
        creatingFor.current = uid;
        createUserRecord(user).catch(() => {
          creatingFor.current = null;
          setSnapshot({ uid, record: null, failed: true });
        });
      },
      () => setSnapshot({ uid, record: null, failed: true }),
    );
  }, [user, attempt]);

  useEffect(() => {
    if (!user) {
      setVideoApproved(null);
      return;
    }
    return onSnapshot(doc(db, 'profiles', user.uid), (snap) => {
      setVideoApproved(snap.data()?.videoIntro?.status === 'approved');
    });
  }, [user]);

  const current = user && snapshot?.uid === user.uid ? snapshot : null;
  const status = deriveStatus(user, current, videoApproved);
  const record = current?.record ?? null;

  const retry = useCallback(() => {
    setSnapshot(null);
    setAttempt((n) => n + 1);
  }, []);
  const signOut = useCallback(() => firebaseSignOut(auth), []);

  const value = useMemo(
    () => ({ status, user: user ?? null, record, retry, signOut }),
    [status, user, record, retry, signOut],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
