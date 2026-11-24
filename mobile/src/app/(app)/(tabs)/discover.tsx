import { setAudioModeAsync } from 'expo-audio';
import { router, useFocusEffect } from 'expo-router';
import { Bell, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View, type ListViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, GlowBackground, IconButton } from '@/components/ui';
import { useDiscovery } from '@/features/discover/DiscoveryProvider';
import type { DiscoverCard, SwipeAction } from '@/features/discover/types';
import { useFeedMuted } from '@/features/discover/useFeedMuted';
import { VideoFeedItem } from '@/features/discover/VideoFeedItem';
import { DISTANCE_DEFAULT_KM } from '@/features/onboarding/options';
import { formatDistance } from '@/features/onboarding/units';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, layout, spacing } from '@/theme';

const PRELOAD_AHEAD = 1;
const REFILL_WHEN_LEFT = 4;
const VIEWABILITY = { itemVisiblePercentThreshold: 80 };

/** TikTok-style Discover: vertical paging, free scroll until Like / Pass / Save. */
export default function DiscoverScreen() {
  return <VideoFeed />;
}

function VideoFeed() {
  const { profile, preferences } = useMyProfile();
  const { status, error, cards, exhausted, load, swipe } = useDiscovery();
  const [muted, toggleMute] = useFeedMuted();
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(true);
  const list = useRef<FlatList<DiscoverCard>>(null);

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
    if (status === 'ready' && !exhausted && active >= cards.length - REFILL_WHEN_LEFT) load();
  }, [status, exhausted, active, cards.length, load]);

  // Keep the active index valid after a Like / Pass / Save removes a card.
  useEffect(() => {
    if (active >= cards.length && cards.length > 0) setActive(cards.length - 1);
  }, [active, cards.length]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const next = viewableItems[0]?.index;
    if (next == null) return;
    setActive(next);
  }, []);

  const act = (card: DiscoverCard, action: SwipeAction) => swipe(card, action);

  if (!cards.length) {
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
    <View style={styles.feed} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 ? (
        <FlatList
          ref={list}
          data={cards}
          keyExtractor={(card) => card.uid}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          renderItem={({ item, index }) => (
            <VideoFeedItem
              card={item}
              height={height}
              isActive={focused && index === active}
              shouldLoad={index >= active - 1 && index <= active + PRELOAD_AHEAD}
              muted={muted}
              onToggleMute={toggleMute}
              onAction={(action) => act(item, action)}
              onOpenProfile={() => router.push({ pathname: '/person/[uid]', params: { uid: item.uid } })}
            />
          )}
          ListFooterComponent={
            exhausted && status === 'ready' ? (
              <View style={[styles.footer, { height }]}>
                <EmptyState
                  title="You’ve seen everyone nearby"
                  body="Widen your filters or check back later for new people."
                  action="Adjust filters"
                  onAction={() => router.push('/filters')}
                  secondary="Check again"
                  onSecondary={() => load({ reset: true })}
                />
              </View>
            ) : undefined
          }
        />
      ) : null}
      <SafeAreaView edges={['top']} style={styles.headerOverlay} pointerEvents="box-none">
        <FeedHeader place={profile.location?.city} distanceKm={preferences.maxDistanceKm} />
      </SafeAreaView>
    </View>
  );
}

function FeedHeader({ place, distanceKm }: { place?: string; distanceKm?: number }) {
  return (
    <View style={styles.header} pointerEvents="box-none">
      <View style={styles.headerText}>
        <AppText variant="heading" color="white">
          Discover
        </AppText>
        <AppText variant="caption" color="white">
          {place ?? 'Near you'} · within {formatDistance(distanceKm ?? DISTANCE_DEFAULT_KM)}
        </AppText>
      </View>
      <IconButton
        accessibilityLabel="Filters"
        onPress={() => router.push('/filters')}
        onDark
        icon={<SlidersHorizontal size={20} color={colors.white} />}
      />
      <IconButton
        accessibilityLabel="Notifications"
        onPress={() => router.push('/notifications')}
        onDark
        icon={<Bell size={20} color={colors.white} />}
      />
    </View>
  );
}

function DiscoverShell({ place, distanceKm, children }: { place?: string; distanceKm?: number; children: ReactNode }) {
  return (
    <View style={styles.feed}>
      <GlowBackground />
      <SafeAreaView edges={['top']} style={styles.feed}>
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
  feed: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    backgroundColor: colors.white,
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
