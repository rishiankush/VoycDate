import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Heart, Bookmark } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useDiscovery } from '@/features/discover/DiscoveryProvider';
import { EmptyCard, TabScreen } from '@/features/navigation/TabScreen';
import { fetchLikesTab, type LikeTile, type LikesTabData } from '@/features/premium/premium';
import { colors, radii, spacing } from '@/theme';

function Tile({
  person,
  onPress,
  cta,
}: {
  person: LikeTile;
  onPress: () => void;
  cta?: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.tile}>
      <View style={styles.photoWrap}>
        {person.photoUrl ? (
          <Image source={{ uri: person.photoUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]} />
        )}
        {person.blurred ? (
          <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.blurOverlay}>
              <Heart size={22} color={colors.white} fill={colors.pink} />
            </View>
          </BlurView>
        ) : null}
      </View>
      <AppText variant="bodyStrong" numberOfLines={1}>
        {person.firstName}
        {person.age != null ? `, ${person.age}` : ''}
      </AppText>
      {person.city ? (
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {person.city}
        </AppText>
      ) : null}
      {cta ? (
        <AppText variant="label" color="plum" style={styles.cta}>
          {cta}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export default function LikesScreen() {
  const { swipe } = useDiscovery();
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

  const likeBack = async (person: LikeTile) => {
    if (person.blurred) {
      router.push('/(app)/paywall');
      return;
    }
    setBusyId(person.uid);
    try {
      // DiscoveryProvider.swipe expects a DiscoverCard; for like-back we call swipe callable via a minimal card.
      swipe(
        {
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
        },
        'like',
      );
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) {
    return (
      <TabScreen title="Likes">
        <ActivityIndicator color={colors.plum} />
      </TabScreen>
    );
  }

  const likedYou = data?.likedYou ?? [];
  const saved = data?.saved ?? [];
  const premium = data?.premium ?? false;
  const remaining = data?.likesRemaining;

  return (
    <TabScreen title="Likes">
      {!premium ? (
        <View style={styles.banner}>
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
        </View>
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
              cta={person.blurred ? 'Reveal' : busyId === person.uid ? '…' : 'Like back'}
              onPress={() => likeBack(person)}
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
              cta={busyId === person.uid ? '…' : 'Like'}
              onPress={() => likeBack(person)}
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
    backgroundColor: colors.pinkTint,
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
    backgroundColor: colors.plum,
  },
  blurOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,52,63,0.25)',
  },
  cta: {
    marginTop: 2,
  },
});
