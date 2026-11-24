import { setAudioModeAsync } from 'expo-audio';
import { router, useFocusEffect } from 'expo-router';
import { Bell, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, GlowBackground, IconButton } from '@/components/ui';
import { useDiscovery } from '@/features/discover/DiscoveryProvider';
import { ProfileCard } from '@/features/discover/ProfileCard';
import { SwipeActions } from '@/features/discover/SwipeActions';
import type { DiscoverCard, SwipeAction } from '@/features/discover/types';
import { useFeedMuted } from '@/features/discover/useFeedMuted';
import { DISTANCE_DEFAULT_KM } from '@/features/onboarding/options';
import { formatDistance } from '@/features/onboarding/units';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, layout, spacing } from '@/theme';

const REFILL_WHEN_LEFT = 4;

/** Bumble-style Discover: one profile card at a time, swipe or tap to like / pass. */
export default function DiscoverScreen() {
  return <CardDeck />;
}

function CardDeck() {
  const { profile, preferences } = useMyProfile();
  const { status, error, cards, exhausted, load, swipe } = useDiscovery();
  const [muted, toggleMute] = useFeedMuted();
  const [focused, setFocused] = useState(true);
  const [deckKey, setDeckKey] = useState(0);

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

  useEffect(() => {
    if (status === 'ready' && !exhausted && cards.length > 0 && cards.length <= REFILL_WHEN_LEFT) load();
  }, [status, exhausted, cards.length, load]);

  const top = cards[0];
  const next = cards[1];

  const act = (card: DiscoverCard, action: SwipeAction) => {
    swipe(card, action);
    // Remount the next card so pan shared values reset cleanly.
    setDeckKey((k) => k + 1);
  };

  if (!top) {
    return (
      <DiscoverShell place={profile.location?.city} distanceKm={preferences.maxDistanceKm}>
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

  return (
    <View style={styles.root}>
      <GlowBackground />
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="heading">Discover</AppText>
            <AppText variant="caption" color="textMuted">
              {profile.location?.city ?? 'Near you'} · within{' '}
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
            key={`${top.uid}-${deckKey}`}
            card={top}
            active={focused}
            muted={muted}
            onToggleMute={toggleMute}
            onAction={(action) => act(top, action)}
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
    </View>
  );
}

function DiscoverShell({
  place,
  distanceKm,
  children,
}: {
  place?: string;
  distanceKm?: number;
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
              {place ?? 'Near you'} · within {formatDistance(distanceKm ?? DISTANCE_DEFAULT_KM)}
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
