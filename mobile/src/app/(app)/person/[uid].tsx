import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, IconButton } from '@/components/ui';
import { useDiscovery } from '@/features/discover/DiscoveryProvider';
import { intentLabel, placeLine } from '@/features/discover/labels';
import { SwipeActions } from '@/features/discover/SwipeActions';
import type { DiscoverCard, SwipeAction } from '@/features/discover/types';
import { formatHeight } from '@/features/onboarding/units';
import { colors, layout, radii, spacing } from '@/theme';

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
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { findCard, swipe } = useDiscovery();
  const card = findCard(uid);

  if (!card) {
    return (
      <SafeAreaView style={styles.missing}>
        <AppText variant="bodyLarge">This profile is no longer available.</AppText>
      </SafeAreaView>
    );
  }

  const act = (action: SwipeAction) => {
    router.back();
    swipe(card, action);
  };

  const intent = intentLabel(card.intent);
  const photos = card.photos;
  const info = basics(card);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {card.video ? <ProfileVideo url={card.video.url} /> : null}
        {!card.video && photos[0] ? <Image source={{ uri: photos[0].url }} style={styles.hero} contentFit="cover" /> : null}

        <View style={styles.section}>
          <AppText variant="title">
            {card.firstName}, {card.age}
          </AppText>
          <AppText variant="body">{placeLine(card)}</AppText>
          {card.video?.transcript ? (
            <AppText variant="body" color="textMuted" style={styles.transcript}>
              “{card.video.transcript}”
            </AppText>
          ) : null}
        </View>

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

      <SafeAreaView edges={['top']} style={styles.closeWrap} pointerEvents="box-none">
        <IconButton accessibilityLabel="Close" onPress={router.back} icon={<X size={20} color={colors.plum} />} />
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.actions}>
        <SwipeActions name={card.firstName} onAction={act} />
      </SafeAreaView>
    </View>
  );
}

function ProfileVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  useEffect(() => {
    player.play();
  }, [player]);

  return (
    <View style={styles.hero}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
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
    paddingBottom: 140,
  },
  hero: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: colors.plumDeep,
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
  closeWrap: {
    position: 'absolute',
    top: 0,
    right: spacing.sm,
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});
