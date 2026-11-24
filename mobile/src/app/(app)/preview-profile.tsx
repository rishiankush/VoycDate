import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, IconButton } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { intentLabel } from '@/features/discover/labels';
import { placeLabel } from '@/features/location/deviceLocation';
import { formatHeight } from '@/features/onboarding/units';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { ageFromBirthDate } from '@/features/profile/age';
import { colors, layout, radii, spacing } from '@/theme';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.block}>
      <AppText variant="label">{title}</AppText>
      {children}
    </View>
  );
}

function Tags({ title, items, highlight }: { title: string; items: string[]; highlight?: boolean }) {
  return (
    <View style={styles.block}>
      <AppText variant="label">{title}</AppText>
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

function PreviewVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  useEffect(() => {
    player.play();
  }, [player]);
  return <VideoView player={player} style={styles.hero} contentFit="cover" nativeControls={false} />;
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

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {profile.videoIntro?.status === 'approved' && profile.videoIntro.url ? (
          <PreviewVideo url={profile.videoIntro.url} />
        ) : photo ? (
          <Image source={{ uri: photo.url }} style={styles.hero} contentFit="cover" />
        ) : (
          <View style={[styles.hero, styles.heroEmpty]} />
        )}

        <View style={styles.section}>
          <AppText variant="title">{nameLine}</AppText>
          {profile.location ? <AppText variant="body">{placeLabel(profile.location)}</AppText> : null}
          <AppText variant="caption" color="textMuted">
            Preview · only you can see this screen
          </AppText>
        </View>

        {intent && profile.mode === 'date' ? <Tags title="Here for" items={[intent]} highlight /> : null}
        {profile.bio ? (
          <Block title="About me">
            <AppText variant="bodyLarge">{profile.bio}</AppText>
          </Block>
        ) : null}
        {(profile.prompts ?? []).map((prompt) => (
          <Block key={prompt.id} title={prompt.question}>
            <AppText variant="bodyLarge">{prompt.answer}</AppText>
          </Block>
        ))}
        {basics.length ? <Tags title="Basics" items={basics} /> : null}
        {(profile.interests?.length ?? 0) > 0 ? <Tags title="Interests" items={profile.interests!} /> : null}
        {(profile.values?.length ?? 0) > 0 ? <Tags title="Values" items={profile.values!} /> : null}
      </ScrollView>

      <SafeAreaView edges={['top']} style={styles.closeWrap} pointerEvents="box-none">
        <IconButton accessibilityLabel="Close" onPress={router.back} icon={<X size={22} color={colors.white} />} onDark />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { paddingBottom: spacing.xxl },
  hero: { width: '100%', height: 420, backgroundColor: colors.plum },
  heroEmpty: { alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg, gap: spacing.xs },
  block: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg, gap: spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.pinkTint,
  },
  tagHighlight: { backgroundColor: colors.pink },
  closeWrap: { position: 'absolute', top: 0, right: layout.screenPadding },
});
