import { setAudioModeAsync } from 'expo-audio';
import { router, useFocusEffect } from 'expo-router';
import { Bell, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, GlowBackground, IconButton } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { useDiscovery } from '@/features/discover/DiscoveryProvider';
import { ProfileCard, type ProfileCardHandle } from '@/features/discover/ProfileCard';
import { SparkUpsellSheet } from '@/features/discover/SparkUpsellSheet';
import { SwipeActions } from '@/features/discover/SwipeActions';
import type { DiscoverCard, SwipeAction } from '@/features/discover/types';
import { useFeedMuted } from '@/features/discover/useFeedMuted';
import { useWarmDiscoverVideos } from '@/features/discover/useWarmDiscoverVideos';
import { DISTANCE_DEFAULT_KM } from '@/features/onboarding/options';
import { formatDistance } from '@/features/onboarding/units';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, layout, spacing } from '@/theme';

const REFILL_WHEN_LEFT = 4;

function isPremiumActive(expiresAt: { toMillis?: () => number } | null | undefined, active?: boolean) {
  if (!active) return false;
  if (expiresAt?.toMillis && expiresAt.toMillis() < Date.now()) return false;
  return true;
}

/** Bumble-style Discover: one profile card at a time, swipe or tap to like / pass. */
export default function DiscoverScreen() {
  return <CardDeck />;
}

function CardDeck() {
  const { record } = useSession();
  const { profile, preferences } = useMyProfile();
  const { status, error, cards, exhausted, load, swipe } = useDiscovery();
  const [muted, toggleMute] = useFeedMuted();
  const [focused, setFocused] = useState(true);
  const [deckKey, setDeckKey] = useState(0);
  const [upsell, setUpsell] = useState<DiscoverCard | null>(null);
  const cardRef = useRef<ProfileCardHandle>(null);
  const animating = useRef(false);
  const mode = profile.mode === 'friends' ? 'friends' : 'date';
  const premium = isPremiumActive(record?.premium?.expiresAt ?? null, record?.premium?.active);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    if (status === 'idle') load({ reset: true });
  }, [status, load]);

  // Switching Date ↔ Friends rebuilds the deck for that mode only.
  useEffect(() => {
    if (status === 'idle') return;
    void load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when mode changes
  }, [mode]);

  useEffect(() => {
    if (status === 'ready' && !exhausted && cards.length > 0 && cards.length <= REFILL_WHEN_LEFT) load();
  }, [status, exhausted, cards.length, load]);

  const top = cards[0];
  const next = cards[1];
  // Buffer the next intros (and posters) before they become the top card.
  useWarmDiscoverVideos(cards);

  const commitAction = (card: DiscoverCard, action: SwipeAction) => {
    animating.current = false;
    swipe(card, action);
    setDeckKey((k) => k + 1);
  };

  const act = (card: DiscoverCard, action: SwipeAction) => {
    if (animating.current) return;
    // Free users never send a Spark — show the Bumble-style upsell first.
    if (action === 'spark' && !premium) {
      setUpsell(card);
      return;
    }
    animating.current = true;
    cardRef.current?.animateAction(action);
  };

  if (!top) {
    return (
      <DiscoverShell place={profile.location?.city} distanceKm={preferences.maxDistanceKm} mode={mode}>
        {status === 'loading' || status === 'idle' ? (
          <ActivityIndicator color={colors.plum} />
        ) : status === 'error' ? (
          <EmptyState
            title="We couldn’t load profiles"
            body={error ?? 'Check your connection and try again.'}
            action="Try again"
            onAction={() => load({ reset: true })}
          />
        ) : (
          <EmptyState
            title="You’ve seen everyone nearby"
            body="Widen your distance or age range to meet more people, or check back later."
            action="Adjust filters"
            onAction={() => router.push('/filters')}
            secondary="Check again"
            onSecondary={() => load({ reset: true })}
          />
        )}
      </DiscoverShell>
    );
  }

  const upsellPhoto = upsell?.video?.posterUrl ?? upsell?.photos[0]?.url ?? null;

  return (
    <View style={styles.root}>
      <GlowBackground />
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="heading">Discover</AppText>
            <AppText variant="caption" color="textMuted">
              {mode === 'friends' ? 'Friends' : 'Date'} · {profile.location?.city ?? 'Near you'} · within{' '}
              {formatDistance(preferences.maxDistanceKm ?? DISTANCE_DEFAULT_KM)}
            </AppText>
          </View>
          <IconButton
            accessibilityLabel="Filters"
            onPress={() => router.push('/filters')}
            icon={<SlidersHorizontal size={20} color={colors.plum} />}
          />
          <IconButton
            accessibilityLabel="Notifications"
            onPress={() => router.push('/notifications')}
            icon={<Bell size={20} color={colors.plum} />}
          />
        </View>

        <View style={styles.deck}>
          {next ? (
            <ProfileCard
              key={`behind-${next.uid}`}
              card={next}
              active={false}
              behind
              muted
              onToggleMute={toggleMute}
              onAction={() => {}}
              onOpenProfile={() => {}}
            />
          ) : null}
          <ProfileCard
            ref={cardRef}
            key={`${top.uid}-${deckKey}`}
            card={top}
            active={focused}
            muted={muted}
            onToggleMute={toggleMute}
            onAction={(action) => commitAction(top, action)}
            onOpenProfile={() => router.push({ pathname: '/person/[uid]', params: { uid: top.uid } })}
          />
        </View>

        <AppText variant="caption" color="textMuted" align="center" style={styles.hint}>
          Like is for their profile — not the video
        </AppText>

        <View style={styles.actions}>
          <SwipeActions name={top.firstName} onAction={(action) => act(top, action)} />
        </View>
      </SafeAreaView>

      <SparkUpsellSheet
        visible={Boolean(upsell)}
        firstName={upsell?.firstName ?? 'them'}
        photoUrl={upsellPhoto}
        onClose={() => setUpsell(null)}
        onUnlock={() => {
          setUpsell(null);
          router.push('/paywall');
        }}
      />
    </View>
  );
}

function DiscoverShell({
  place,
  distanceKm,
  mode = 'date',
  children,
}: {
  place?: string;
  distanceKm?: number;
  mode?: 'date' | 'friends';
  children: ReactNode;
}) {
  return (
    <View style={styles.root}>
      <GlowBackground />
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="heading">Discover</AppText>
            <AppText variant="caption" color="textMuted">
              {mode === 'friends' ? 'Friends' : 'Date'} · {place ?? 'Near you'} · within{' '}
              {formatDistance(distanceKm ?? DISTANCE_DEFAULT_KM)}
            </AppText>
          </View>
          <IconButton
            accessibilityLabel="Filters"
            onPress={() => router.push('/filters')}
            icon={<SlidersHorizontal size={20} color={colors.plum} />}
          />
          <IconButton
            accessibilityLabel="Notifications"
            onPress={() => router.push('/notifications')}
            icon={<Bell size={20} color={colors.plum} />}
          />
        </View>
        <View style={styles.centered}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

type EmptyStateProps = {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  secondary?: string;
  onSecondary?: () => void;
};

function EmptyState({ title, body, action, onAction, secondary, onSecondary }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText variant="body" align="center">
        {body}
      </AppText>
      <Button title={action} onPress={onAction} style={styles.emptyButton} />
      {secondary && onSecondary ? (
        <Button title={secondary} variant="secondary" onPress={onSecondary} style={styles.emptyButton} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  deck: {
    flex: 1,
    marginHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
  },
  hint: {
    marginBottom: spacing.sm,
    paddingHorizontal: layout.screenPadding,
  },
  actions: {
    paddingBottom: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyButton: {
    alignSelf: 'stretch',
  },
});
