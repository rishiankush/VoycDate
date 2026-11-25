import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ellipsis, X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, IconButton } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { useDiscovery } from '@/features/discover/DiscoveryProvider';
import { intentLabel, nameAgeLine, placeLine } from '@/features/discover/labels';
import { SparkUpsellSheet } from '@/features/discover/SparkUpsellSheet';
import { SwipeActions } from '@/features/discover/SwipeActions';
import type { DiscoverCard, SwipeAction } from '@/features/discover/types';
import { formatHeight } from '@/features/onboarding/units';
import { fetchMatchProfile } from '@/features/premium/premium';
import { SafetyActions } from '@/features/safety/SafetyActions';
import { VideoCover } from '@/features/video/VideoCover';
import { colors, layout, radii, spacing } from '@/theme';

function isPremiumActive(expiresAt: { toMillis?: () => number } | null | undefined, active?: boolean) {
  if (!active) return false;
  if (expiresAt?.toMillis && expiresAt.toMillis() < Date.now()) return false;
  return true;
}

function basics(card: DiscoverCard) {
  return [
    card.heightCm ? formatHeight(card.heightCm) : null,
    card.gender,
    card.habits.drinking && `Drinks: ${card.habits.drinking}`,
    card.habits.smoking && `Smokes: ${card.habits.smoking}`,
    card.habits.exercise && `Exercise: ${card.habits.exercise}`,
    card.family.haveKids,
    card.family.wantKids,
    card.beliefs.religion,
    card.beliefs.politics,
  ].filter((x): x is string => Boolean(x) && x !== 'Prefer not to say');
}

export default function PersonScreen() {
  const { uid, matchId } = useLocalSearchParams<{ uid: string; matchId?: string }>();
  const { record } = useSession();
  const { findCard, swipe } = useDiscovery();
  const fromMatch = Boolean(matchId);
  const discoveryCard = fromMatch ? undefined : findCard(uid);
  const [matchCard, setMatchCard] = useState<DiscoverCard | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(fromMatch);
  const [loadError, setLoadError] = useState(false);
  const [sparkUpsell, setSparkUpsell] = useState(false);
  const premium = isPremiumActive(record?.premium?.expiresAt ?? null, record?.premium?.active);

  useEffect(() => {
    if (!fromMatch || !matchId || !uid) return;
    let cancelled = false;
    setLoadingMatch(true);
    setLoadError(false);
    fetchMatchProfile(matchId, uid)
      .then((card) => {
        if (!cancelled) setMatchCard(card);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingMatch(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromMatch, matchId, uid]);

  if (fromMatch && loadingMatch) {
    return (
      <SafeAreaView style={styles.missing}>
        <ActivityIndicator color={colors.plum} />
      </SafeAreaView>
    );
  }

  const card = fromMatch ? matchCard : discoveryCard;

  if (!card || loadError) {
    return (
      <SafeAreaView style={styles.missing}>
        <AppText variant="bodyLarge">This profile is no longer available.</AppText>
      </SafeAreaView>
    );
  }

  const act = (action: SwipeAction) => {
    if (action === 'spark' && !premium) {
      setSparkUpsell(true);
      return;
    }
    router.back();
    swipe(card, action);
  };

  const isFriends = card.mode === 'friends';
  const intent = isFriends ? null : intentLabel(card.intent);
  const photos = card.photos;
  const info = basics(card);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, fromMatch && styles.contentMatch]}
        showsVerticalScrollIndicator={false}>
        {card.video ? (
          <VideoCover
            url={card.video.url}
            posterUrl={card.video.posterUrl ?? photos[0]?.url ?? null}
            style={styles.hero}
          />
        ) : null}
        {!card.video && photos[0] ? <Image source={{ uri: photos[0].url }} style={styles.hero} contentFit="cover" /> : null}

        <View style={styles.section}>
          <AppText variant="title">{nameAgeLine(card)}</AppText>
          <AppText variant="body">{placeLine(card)}</AppText>
          {card.video?.transcript ? (
            <AppText variant="body" color="textMuted" style={styles.transcript}>
              “{card.video.transcript}”
            </AppText>
          ) : null}
        </View>

        {isFriends ? <Tags title="Here for" items={['Friends']} highlight /> : null}
        {intent ? <Tags title="Here for" items={[intent]} highlight /> : null}
        {card.bio ? (
          <Block title="About me">
            <AppText variant="bodyLarge" color="text">
              {card.bio}
            </AppText>
          </Block>
        ) : null}

        {card.prompts.map((prompt, i) => (
          <View key={prompt.question}>
            <Block title={prompt.question}>
              <AppText variant="bodyLarge" color="text">
                {prompt.answer}
              </AppText>
            </Block>
            {photos[i] ? <Image source={{ uri: photos[i].url }} style={styles.photo} contentFit="cover" /> : null}
          </View>
        ))}

        {info.length ? <Tags title="Basics" items={info} /> : null}
        {card.interests.length ? <Tags title="Interests" items={card.interests} /> : null}
        {card.values.length ? <Tags title="Values" items={card.values} /> : null}

        {photos.slice(Math.max(card.prompts.length, card.video ? 0 : 1)).map((photo) => (
          <Image key={photo.url} source={{ uri: photo.url }} style={styles.photo} contentFit="cover" />
        ))}
      </ScrollView>

      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <SafetyActions
          targetId={card.uid}
          targetName={card.firstName}
          matchId={matchId}
          canUnmatch={fromMatch}>
          {(open) => (
            <IconButton
              accessibilityLabel="More options"
              onPress={open}
              icon={<Ellipsis size={20} color={colors.plum} />}
            />
          )}
        </SafetyActions>
        <IconButton accessibilityLabel="Close" onPress={router.back} icon={<X size={20} color={colors.plum} />} />
      </SafeAreaView>

      {!fromMatch ? (
        <SafeAreaView edges={['bottom']} style={styles.actions}>
          <AppText variant="caption" color="textMuted" align="center" style={styles.actionHint}>
            Spark sends a Premium connect request — they accept to match
          </AppText>
          <SwipeActions name={card.firstName} onAction={act} />
        </SafeAreaView>
      ) : null}

      <SparkUpsellSheet
        visible={sparkUpsell}
        firstName={card.firstName}
        photoUrl={card.video?.posterUrl ?? card.photos[0]?.url ?? null}
        onClose={() => setSparkUpsell(false)}
        onUnlock={() => {
          setSparkUpsell(false);
          router.push('/paywall');
        }}
      />
    </View>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color="textMuted">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Tags({ title, items, highlight = false }: { title: string; items: string[]; highlight?: boolean }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color="textMuted">
        {title}
      </AppText>
      <View style={styles.chips}>
        {items.map((item) => (
          <View key={item} style={[styles.chip, highlight && styles.chipHighlight]}>
            <AppText variant="label" color={highlight ? 'plum' : 'text'}>
              {item}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenPadding,
  },
  content: {
    // Clear the floating Pass / Like / Spark bar + home indicator.
    paddingBottom: 220,
  },
  contentMatch: {
    paddingBottom: spacing.xxl,
  },
  hero: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: colors.pinkTint,
    overflow: 'hidden',
  },
  section: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  transcript: {
    fontStyle: 'italic',
  },
  photo: {
    width: '100%',
    aspectRatio: 0.8,
    marginTop: spacing.md,
    backgroundColor: colors.pinkTint,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
  },
  chipHighlight: {
    backgroundColor: colors.pinkTint,
    borderColor: colors.pink,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  actionHint: {
    paddingHorizontal: layout.screenPadding,
  },
});
