import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Heart, Bookmark, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, PinkGradient } from '@/components/ui';
import { useDiscovery } from '@/features/discover/DiscoveryProvider';
import type { DiscoverCard, SwipeAction } from '@/features/discover/types';
import { EmptyCard, TabScreen } from '@/features/navigation/TabScreen';
import { fetchLikesTab, type LikeTile, type LikesTabData } from '@/features/premium/premium';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, radii, shadows, spacing } from '@/theme';

function toCard(person: LikeTile): DiscoverCard {
  return {
    uid: person.uid,
    firstName: person.firstName,
    age: person.age,
    distanceKm: null,
    gender: null,
    intent: null,
    heightCm: null,
    interests: [],
    values: [],
    habits: {},
    family: {},
    beliefs: {},
    photos: person.photoUrl ? [{ url: person.photoUrl, width: 0, height: 0 }] : [],
    video: null,
    prompts: [],
    bio: '',
    city: person.city ?? '',
    region: null,
    countryCode: null,
    verified: false,
    mode: undefined,
  };
}

function Tile({
  person,
  premium,
  busy,
  onReveal,
  onAction,
}: {
  person: LikeTile;
  premium: boolean;
  busy: boolean;
  onReveal: () => void;
  onAction: (action: 'like' | 'pass') => void;
}) {
  // Premium: Pass + Like on the photo. Free liked-you stays Reveal → paywall.
  const showPremiumActions = premium && !person.blurred;

  return (
    <View style={styles.tile}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          person.blurred
            ? `Reveal ${person.firstName}`
            : `${person.firstName}${person.age != null ? `, ${person.age}` : ''}`
        }
        disabled={showPremiumActions}
        onPress={person.blurred ? onReveal : undefined}
        style={styles.photoWrap}>
        {person.photoUrl ? (
          <Image source={{ uri: person.photoUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]} />
        )}
        {person.blurred ? (
          <>
            <BlurView intensity={72} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.blurOverlay} pointerEvents="none">
              <Heart size={22} color={colors.plum} fill={colors.pink} />
            </View>
          </>
        ) : null}
        {showPremiumActions ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Pass on ${person.firstName}`}
              disabled={busy}
              onPress={() => onAction('pass')}
              style={({ pressed }) => [styles.actionBtn, styles.passBtn, pressed && styles.actionPressed, busy && styles.actionBusy]}>
              <X size={18} color={colors.plum} strokeWidth={2.5} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Like ${person.firstName}`}
              disabled={busy}
              onPress={() => onAction('like')}
              style={({ pressed }) => [styles.actionBtn, styles.likeBtn, pressed && styles.actionPressed, busy && styles.actionBusy]}>
              <Heart size={18} color={colors.white} fill={colors.white} />
            </Pressable>
          </View>
        ) : null}
      </Pressable>
      <AppText variant="bodyStrong" numberOfLines={1}>
        {person.firstName}
        {person.age != null ? `, ${person.age}` : ''}
      </AppText>
      {person.city ? (
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {person.city}
        </AppText>
      ) : null}
      {person.blurred ? (
        <Pressable onPress={onReveal} hitSlop={6}>
          <AppText variant="label" color="plum" style={styles.cta}>
            Reveal
          </AppText>
        </Pressable>
      ) : null}
      {!premium && !person.blurred ? (
        <Pressable onPress={() => onAction('like')} disabled={busy} hitSlop={6}>
          <AppText variant="label" color="plum" style={styles.cta}>
            {busy ? '…' : 'Like'}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function LikesScreen() {
  const { swipe } = useDiscovery();
  const { profile } = useMyProfile();
  const mode = profile.mode === 'friends' ? 'friends' : 'date';
  const [data, setData] = useState<LikesTabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchLikesTab());
    } catch {
      setData(null);
      Alert.alert('Couldn’t load likes', 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Likes are mode-scoped on the server; refresh when Date/Friends changes.
  useEffect(() => {
    void load();
  }, [mode, load]);

  const act = (person: LikeTile, action: SwipeAction, list: 'likedYou' | 'saved') => {
    if (person.blurred) {
      router.push('/(app)/paywall');
      return;
    }
    // Pass on Liked you / Saved actions that need a clear profile are Premium-only.
    if (action === 'pass' && !data?.premium) {
      router.push('/(app)/paywall');
      return;
    }
    if (busyId) return;
    setBusyId(person.uid);
    // Optimistic remove so the grid feels instant.
    setData((prev) =>
      prev
        ? {
            ...prev,
            likedYouCount: list === 'likedYou' ? Math.max(0, prev.likedYouCount - 1) : prev.likedYouCount,
            likedYou: list === 'likedYou' ? prev.likedYou.filter((p) => p.uid !== person.uid) : prev.likedYou,
            saved: list === 'saved' ? prev.saved.filter((p) => p.uid !== person.uid) : prev.saved,
          }
        : prev,
    );
    swipe(toCard(person), action);
    setBusyId(null);
  };

  const title = mode === 'friends' ? 'Likes · Friends' : 'Likes · Date';

  if (loading && !data) {
    return (
      <TabScreen title={title}>
        <ActivityIndicator color={colors.plum} />
      </TabScreen>
    );
  }

  const likedYou = data?.likedYou ?? [];
  const saved = data?.saved ?? [];
  const premium = data?.premium ?? false;
  const remaining = data?.likesRemaining;

  return (
    <TabScreen title={title}>
      {!premium ? (
        <PinkGradient variant="banner" style={styles.banner}>
          <AppText variant="bodyStrong" color="plum">
            {data?.likedYouCount
              ? `${data.likedYouCount} ${data.likedYouCount === 1 ? 'person likes' : 'people like'} you`
              : 'See who likes you'}
          </AppText>
          <AppText variant="caption" color="textMuted">
            Upgrade to reveal profiles and get unlimited likes
            {remaining != null ? ` · ${remaining} likes left today` : ''}.
          </AppText>
          <Button title="Upgrade" onPress={() => router.push('/(app)/paywall')} style={styles.bannerBtn} />
        </PinkGradient>
      ) : remaining == null ? (
        <AppText variant="caption" color="textMuted">
          Premium · unlimited likes
        </AppText>
      ) : null}

      <AppText variant="label" color="textMuted">
        Liked you
      </AppText>
      {likedYou.length === 0 ? (
        <EmptyCard
          icon={<Heart size={36} color={colors.pinkBorderStrong} />}
          title="No likes yet"
          body="When someone likes your profile, they’ll show up here."
        />
      ) : (
        <View style={styles.grid}>
          {likedYou.map((person) => (
            <Tile
              key={person.uid}
              person={person}
              premium={premium}
              busy={busyId === person.uid}
              onReveal={() => router.push('/(app)/paywall')}
              onAction={(action) => act(person, action, 'likedYou')}
            />
          ))}
        </View>
      )}

      <AppText variant="label" color="textMuted" style={styles.section}>
        Saved
      </AppText>
      {saved.length === 0 ? (
        <EmptyCard
          icon={<Bookmark size={36} color={colors.pinkBorderStrong} />}
          title="No saved profiles"
          body="Tap Save on Discover to keep someone for later."
        />
      ) : (
        <View style={styles.grid}>
          {saved.map((person) => (
            <Tile
              key={person.uid}
              person={person}
              premium={premium}
              busy={busyId === person.uid}
              onReveal={() => router.push('/(app)/paywall')}
              onAction={(action) => act(person, action, 'saved')}
            />
          ))}
        </View>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
  },
  bannerBtn: {
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '47%',
    gap: 4,
  },
  photoWrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.pinkTint,
  },
  photo: {
    width: '100%',
    aspectRatio: 0.75,
  },
  photoEmpty: {
    backgroundColor: colors.pinkSoft,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247, 234, 245, 0.28)',
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  passBtn: {
    backgroundColor: colors.white,
  },
  likeBtn: {
    backgroundColor: colors.plum,
  },
  actionPressed: {
    transform: [{ scale: 0.94 }],
  },
  actionBusy: {
    opacity: 0.5,
  },
  cta: {
    marginTop: 2,
  },
});
