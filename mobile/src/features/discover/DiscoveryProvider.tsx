import { router } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { MessageSheet, type MessageSheetState } from '@/components/ui';
import { functions } from '@/lib/firebase';

import type { DiscoverCard, MatchResult, SwipeAction } from './types';

const REFILL_BELOW = 4;

const fetchFeed = httpsCallable<{ exclude: string[] }, { cards: DiscoverCard[] }>(functions, 'getDiscoveryFeed');
const sendSwipe = httpsCallable<
  { targetId: string; action: SwipeAction },
  ({ matched: true } & MatchResult) | { matched: false; sparked?: boolean }
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
  /** Undecided profiles for the Discover card deck. */
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
  const [notice, setNotice] = useState<MessageSheetState>(null);
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
            return;
          }
          if (action === 'spark' && 'sparked' in data && data.sparked) {
            setNotice({
              title: 'Spark sent',
              body: `${card.firstName} will see your Spark in Connections and can start a conversation with you.`,
              primary: {
                label: 'View Connections',
                onPress: () => router.push('/(app)/(tabs)/connections'),
              },
              secondary: { label: 'OK', onPress: () => {}, variant: 'secondary' },
            });
            return;
          }
          if (action === 'spark') {
            setNotice({
              title: 'Already decided',
              body: `You’ve already passed on or Sparks ${card.firstName}. Check Connections if a request is waiting.`,
              primary: {
                label: 'Connections',
                onPress: () => router.push('/(app)/(tabs)/connections'),
              },
              secondary: { label: 'OK', onPress: () => {}, variant: 'secondary' },
            });
          }
        })
        .catch((error: unknown) => {
          decided.current.delete(card.uid);
          setCards((prev) => [card, ...prev.filter((c) => c.uid !== card.uid)]);
          const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
          if (code === 'functions/permission-denied' && action === 'spark') {
            setNotice({
              title: 'Spark is a Premium perk',
              body: 'Get 5 Sparks every week to send a connect request that stands out.',
              primary: { label: 'Upgrade', onPress: () => router.push('/paywall') },
              secondary: { label: 'Not now', onPress: () => {}, variant: 'secondary' },
            });
            return;
          }
          if (code === 'functions/resource-exhausted') {
            if (action === 'spark') {
              setNotice({
                title: 'No Sparks left this week',
                body: 'Premium includes 5 Sparks each week. They refresh next week.',
              });
              return;
            }
            if (action === 'like') {
              setNotice({
                title: 'Out of likes for today',
                body: 'Upgrade to Premium for unlimited likes.',
                primary: { label: 'Upgrade', onPress: () => router.push('/paywall') },
                secondary: { label: 'Not now', onPress: () => {}, variant: 'secondary' },
              });
              return;
            }
          }
          setNotice({
            title: 'Couldn’t send that',
            body: 'Check your connection and try again.',
          });
        });
    },
    [cards, load],
  );

  const findCard = useCallback((uid: string) => cards.find((c) => c.uid === uid), [cards]);

  const value = useMemo(
    () => ({ status, error, cards, exhausted, lastMatch, load, swipe, findCard }),
    [status, error, cards, exhausted, lastMatch, load, swipe, findCard],
  );

  return (
    <DiscoveryContext value={value}>
      {children}
      <MessageSheet notice={notice} onClose={() => setNotice(null)} />
    </DiscoveryContext>
  );
}

export function useDiscovery() {
  const value = use(DiscoveryContext);
  if (!value) throw new Error('useDiscovery must be used inside DiscoveryProvider');
  return value;
}
