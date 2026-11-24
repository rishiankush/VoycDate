import { router } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { functions } from '@/lib/firebase';

import type { DiscoverCard, MatchResult, SwipeAction } from './types';

const REFILL_BELOW = 4;

const fetchFeed = httpsCallable<{ exclude: string[] }, { cards: DiscoverCard[] }>(functions, 'getDiscoveryFeed');
const sendSwipe = httpsCallable<
  { targetId: string; action: SwipeAction },
  ({ matched: true } & MatchResult) | { matched: false }
>(functions, 'swipe');

type FeedStatus = 'idle' | 'loading' | 'ready' | 'error';

function feedErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === 'functions/failed-precondition' && error instanceof Error) return error.message;
  if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') {
    return 'Check your connection and try again.';
  }
  return 'Discover isn’t available right now. Please try again in a moment.';
}

type DiscoveryValue = {
  status: FeedStatus;
  error: string | null;
  /** Undecided profiles only — free to scroll until Like / Pass / Save. */
  cards: DiscoverCard[];
  exhausted: boolean;
  lastMatch: MatchResult | null;
  load: (options?: { reset?: boolean }) => Promise<void>;
  swipe: (card: DiscoverCard, action: SwipeAction) => void;
  findCard: (uid: string) => DiscoverCard | undefined;
};

const DiscoveryContext = createContext<DiscoveryValue | null>(null);

export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<FeedStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [exhausted, setExhausted] = useState(false);
  const [lastMatch, setLastMatch] = useState<MatchResult | null>(null);
  const decided = useRef(new Set<string>());
  const loading = useRef(false);

  const load = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      if (loading.current) return;
      loading.current = true;
      setStatus('loading');
      setError(null);
      try {
        if (reset) decided.current.clear();
        const known = reset ? [] : cards.map((c) => c.uid);
        const exclude = [...decided.current, ...known];
        const { data } = await fetchFeed({ exclude });
        const fresh = data.cards.filter((c) => !exclude.includes(c.uid));
        setCards((prev) => {
          const base = reset ? [] : prev;
          const seen = new Set(base.map((c) => c.uid));
          return [...base, ...fresh.filter((c) => !seen.has(c.uid))];
        });
        setExhausted(fresh.length === 0);
        setStatus('ready');
      } catch (e) {
        setError(feedErrorMessage(e));
        setStatus('error');
      } finally {
        loading.current = false;
      }
    },
    [cards],
  );

  const swipe = useCallback(
    (card: DiscoverCard, action: SwipeAction) => {
      if (decided.current.has(card.uid)) return;
      decided.current.add(card.uid);
      const remaining = cards.filter((c) => c.uid !== card.uid);
      setCards(remaining);
      if (remaining.length < REFILL_BELOW) load();

      sendSwipe({ targetId: card.uid, action })
        .then(({ data }) => {
          if (data.matched) {
            setLastMatch(data);
            router.push('/match');
          }
        })
        .catch(() => {
          decided.current.delete(card.uid);
          setCards((prev) => [card, ...prev.filter((c) => c.uid !== card.uid)]);
          Alert.alert('Couldn’t save that', 'Check your connection and try again.');
        });
    },
    [cards, load],
  );

  const findCard = useCallback((uid: string) => cards.find((c) => c.uid === uid), [cards]);

  const value = useMemo(
    () => ({ status, error, cards, exhausted, lastMatch, load, swipe, findCard }),
    [status, error, cards, exhausted, lastMatch, load, swipe, findCard],
  );

  return <DiscoveryContext value={value}>{children}</DiscoveryContext>;
}

export function useDiscovery() {
  const value = use(DiscoveryContext);
  if (!value) throw new Error('useDiscovery must be used inside DiscoveryProvider');
  return value;
}
