import { Image } from 'expo-image';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, GlowBackground, IconButton } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { intentLabel } from '@/features/discover/labels';
import { PhotoGradient } from '@/features/discover/PhotoGradient';
import { placeLabel } from '@/features/location/deviceLocation';
import { formatHeight } from '@/features/onboarding/units';
import { ageFromBirthDate } from '@/features/profile/age';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { VideoCover } from '@/features/video/VideoCover';
import { colors, layout, radii, shadows, spacing } from '@/theme';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.block}>
      <AppText variant="label" color="textMuted">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Tags({ title, items, highlight }: { title: string; items: string[]; highlight?: boolean }) {
  return (
    <View style={styles.block}>
      <AppText variant="label" color="textMuted">
        {title}
      </AppText>
      <View style={styles.tags}>
        {items.map((item) => (
          <View key={item} style={[styles.tag, highlight && styles.tagHighlight]}>
            <AppText variant="label" color={highlight ? 'plum' : 'text'}>
              {item}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PreviewProfileScreen() {
  const { record } = useSession();
  const { profile, preferences } = useMyProfile();
  const age = record?.birthDate ? ageFromBirthDate(record.birthDate) : null;
  const showAge = preferences.showAge !== false;
  const photo = profile.photos?.[0];
  const intent = intentLabel(profile.intent ?? null);
  const basics = [
    profile.heightCm ? formatHeight(profile.heightCm) : null,
    profile.gender?.showOnProfile ? profile.gender.identity : null,
    profile.habits?.drinking && `Drinks: ${profile.habits.drinking}`,
    profile.habits?.smoking && `Smokes: ${profile.habits.smoking}`,
    profile.habits?.exercise && `Exercise: ${profile.habits.exercise}`,
  ].filter((x): x is string => Boolean(x) && x !== 'Prefer not to say');

  const nameLine =
    showAge && age != null ? `${profile.firstName ?? 'You'}, ${age}` : (profile.firstName ?? 'You');
  const hasVideo = profile.videoIntro?.status === 'approved' && Boolean(profile.videoIntro.url);

  return (
    <View style={styles.root}>
      <GlowBackground />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="heading">Preview</AppText>
            <AppText variant="caption" color="textMuted">
              How you appear on Discover
            </AppText>
          </View>
          <IconButton accessibilityLabel="Close" onPress={router.back} icon={<X size={20} color={colors.plum} />} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {hasVideo ? (
              <VideoCover
                url={profile.videoIntro!.url!}
                posterUrl={profile.videoIntro?.posterUrl ?? photo?.url ?? null}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            {!hasVideo && photo ? <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            {!hasVideo && !photo ? <View style={[StyleSheet.absoluteFill, styles.heroEmpty]} /> : null}
            <PhotoGradient />
            {hasVideo ? (
              <View style={styles.introBadge}>
                <AppText variant="label" color="plum">
                  Intro video
                </AppText>
              </View>
            ) : null}
            <View style={styles.cardInfo}>
              <AppText variant="title" color="white" style={styles.name}>
                {nameLine}
              </AppText>
              {profile.location ? (
                <AppText variant="body" color="white">
                  {placeLabel(profile.location)}
                </AppText>
              ) : null}
            </View>
          </View>

          {intent && profile.mode === 'date' ? <Tags title="Here for" items={[intent]} highlight /> : null}
          {profile.bio ? (
            <Block title="About me">
              <AppText variant="bodyLarge" color="text">
                {profile.bio}
              </AppText>
            </Block>
          ) : null}
          {(profile.prompts ?? []).map((prompt) => (
            <Block key={prompt.id} title={prompt.question}>
              <AppText variant="bodyLarge" color="text">
                {prompt.answer}
              </AppText>
            </Block>
          ))}
          {basics.length ? <Tags title="Basics" items={basics} /> : null}
          {(profile.interests?.length ?? 0) > 0 ? <Tags title="Interests" items={profile.interests!} /> : null}
          {(profile.values?.length ?? 0) > 0 ? <Tags title="Values" items={profile.values!} /> : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  content: { paddingBottom: spacing.xxl, paddingHorizontal: layout.screenPadding, gap: spacing.md },
  card: {
    height: 460,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.plumDeep,
    ...shadows.card,
  },
  heroEmpty: { backgroundColor: colors.plum },
  introBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.pink,
  },
  cardInfo: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    gap: spacing.xxs,
  },
  name: { fontSize: 28 },
  block: { gap: spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.pinkTint,
  },
  tagHighlight: { backgroundColor: colors.pink },
});
