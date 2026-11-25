import { collection, onSnapshot, orderBy, query, where, type Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/SessionProvider';
import type { UnlockDecision } from '@/features/chat/types';
import { db } from '@/lib/firebase';

export type MatchStage = 'awaiting_first_voice' | 'voice' | 'deciding' | 'text_unlocked' | 'expired';

export type Match = {
  id: string;
  members: string[];
  people: Record<string, { firstName: string; photoUrl: string | null }>;
  /** Date vs Friends — Connections filters to the active profile mode. */
  mode?: 'date' | 'friends';
  firstSenderId: string;
  stage: MatchStage;
  status: 'active' | 'unmatched' | 'blocked' | 'expired';
  voice?: { qualifiedCount: number; perUser: Record<string, number>; totalDurationMs?: number };
  unlock?: {
    votes?: Record<string, UnlockDecision>;
    nextPromptAtCount?: number | null;
  };
  unread?: Record<string, number>;
  lastMessage?: { senderId: string; type: 'voice' | 'text' | 'photo'; durationMs?: number; text?: string } | null;
  lastMessageAt: Timestamp | null;
  createdAt: Timestamp | null;
  expiresAt: Timestamp | null;
};

export function useMatches() {
  const { user } = useSession();
  const uid = user?.uid;
  const [state, setState] = useState<{ uid: string; matches: Match[] } | null>(null);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'matches'),
      where('members', 'array-contains', uid),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(
      q,
      (snap) => setState({ uid, matches: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) })) }),
      (error) => {
        console.warn('Matches query failed', error);
        setState({ uid, matches: [] });
      },
    );
  }, [uid]);

  const current = state && state.uid === uid ? state.matches : null;
  return { matches: current ?? [], loading: current === null };
}
