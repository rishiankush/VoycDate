import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BadgeCheck, Check, Crown, Eye, PauseCircle, Settings, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, GlowBackground, IconButton, PinkGradient } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { useDiscovery } from '@/features/discover/DiscoveryProvider';
import { placeLabel } from '@/features/location/deviceLocation';
import type { Mode } from '@/features/onboarding/types';
import { ageFromBirthDate } from '@/features/profile/age';
import { profileCompleteness } from '@/features/profile/completeness';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, layout, radii, shadows, spacing } from '@/theme';

const PREMIUM_PERKS = [
  { label: 'See who liked you', free: false },
  { label: 'Unlimited likes', free: false },
  { label: 'Advanced filters', free: false },
  { label: 'Weekly boost', free: false },
];

export default function ProfileScreen() {
  const { record } = useSession();
  const { profile, paused, setPaused, setMode } = useMyProfile();
  const { load } = useDiscovery();
  const [pausing, setPausing] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const photo = profile.photos?.[0];
  const { percent } = profileCompleteness(profile);
  const age = record?.birthDate ? ageFromBirthDate(record.birthDate) : null;
  const isPremium = Boolean(record?.premium?.active);
  const verification = profile.verification?.status ?? 'none';
  const isVerified = verification === 'approved';
  const mode: Mode = profile.mode === 'friends' ? 'friends' : 'date';

  const togglePause = async () => {
    setPausing(true);
    try {
      await setPaused(!paused);
    } catch {
      Alert.alert('Couldn’t update', 'Check your connection and try again.');
    } finally {
      setPausing(false);
    }
  };

  const switchMode = async (next: Mode) => {
    if (next === mode || switchingMode) return;
    setSwitchingMode(true);
    try {
      await setMode(next);
      await load({ reset: true });
    } catch {
      Alert.alert('Couldn’t switch mode', 'Check your connection and try again.');
    } finally {
      setSwitchingMode(false);
    }
  };

  return (
    <View style={styles.root}>
      <GlowBackground />
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.topBar}>
          <AppText variant="heading">Profile</AppText>
          <IconButton
            accessibilityLabel="Settings"
            onPress={() => router.push('/(app)/settings')}
            icon={<Settings size={20} color={colors.plum} />}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
          <View style={styles.identity}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              onPress={() => router.push('/(app)/edit-profile')}
              style={styles.avatarWrap}>
              {photo ? (
                <Image source={{ uri: photo.url }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarEmpty]} />
              )}
              <View style={styles.percentBadge}>
                <AppText variant="label" color="white">
                  {percent}%
                </AppText>
              </View>
            </Pressable>

            <View style={styles.identityText}>
              <View style={styles.nameRow}>
                <AppText variant="title">
                  {profile.firstName}
                  {age != null ? `, ${age}` : ''}
                </AppText>
                {isVerified ? <BadgeCheck size={22} color={colors.plum} fill={colors.pink} /> : null}
              </View>
              {profile.location ? (
                <AppText variant="caption" color="textMuted">
                  {placeLabel(profile.location)}
                </AppText>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(app)/edit-profile')}
                style={styles.completeBtn}>
                <AppText variant="label" color="white">
                  {percent >= 100 ? 'Edit profile' : 'Complete profile'}
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={styles.modeCard}>
            <AppText variant="label" color="textMuted">
              You’re browsing
            </AppText>
            <View style={styles.modeRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'date' }}
                disabled={switchingMode}
                onPress={() => switchMode('date')}
                style={[styles.modeChip, mode === 'date' && styles.modeChipActive]}>
                <AppText variant="bodyStrong" color={mode === 'date' ? 'white' : 'plum'}>
                  Date
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'friends' }}
                disabled={switchingMode}
                onPress={() => switchMode('friends')}
                style={[styles.modeChip, mode === 'friends' && styles.modeChipActive]}>
                <AppText variant="bodyStrong" color={mode === 'friends' ? 'white' : 'plum'}>
                  Friends
                </AppText>
              </Pressable>
            </View>
            <AppText variant="caption" color="textMuted">
              Matches stay separate. You’ll only see people in the same mode.
            </AppText>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(app)/verify')}
            style={styles.verifyRow}>
            <ShieldCheck size={18} color={colors.plum} />
            <View style={styles.verifyText}>
              <AppText variant="bodyStrong">
                {isVerified ? 'Verified' : verification === 'pending' ? 'Verification under review' : 'Get verified'}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {isVerified
                  ? 'Your badge is live on Discover'
                  : verification === 'pending'
                    ? 'Usually within 24–48 hours'
                    : 'Verified profiles get more visibility'}
              </AppText>
            </View>
          </Pressable>

          {paused ? (
            <Pressable onPress={togglePause} style={styles.pauseBanner} disabled={pausing}>
              <PauseCircle size={16} color={colors.plum} />
              <AppText variant="label" color="plum" style={styles.pauseText}>
                Profile paused · tap to resume
              </AppText>
            </Pressable>
          ) : null}

          <View style={styles.quickRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(app)/preview-profile')}
              style={styles.quickCard}>
              <View style={styles.quickIcon}>
                <Eye size={18} color={colors.white} />
              </View>
              <AppText variant="bodyStrong">Preview</AppText>
              <AppText variant="caption" color="textMuted">
                How you look
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(app)/paywall')}
              style={styles.quickCard}>
              <View style={styles.quickIcon}>
                <Crown size={18} color={colors.white} />
              </View>
              <AppText variant="bodyStrong">Premium</AppText>
              <AppText variant="caption" color="textMuted">
                {isPremium ? 'Active' : 'See likes'}
              </AppText>
            </Pressable>
          </View>

          <PinkGradient variant="hero" style={styles.premiumCard}>
            <View style={styles.premiumBadge}>
              <AppText variant="label" color="white">
                PREMIUM
              </AppText>
            </View>
            <AppText variant="bodyStrong" color="plum" style={styles.premiumCopy}>
              {isPremium
                ? 'You’re on Premium — unlimited likes and full Likes tab.'
                : 'Get better ways to connect: see who likes you and like without limits.'}
            </AppText>
            <Button
              title={isPremium ? 'Manage Premium' : 'Explore Premium'}
              onPress={() => router.push('/(app)/paywall')}
              style={styles.premiumCta}
            />
          </PinkGradient>

          <View style={styles.compare}>
            <View style={styles.compareHead}>
              <AppText variant="label" color="textMuted" style={styles.compareWhat}>
                What you get
              </AppText>
              <AppText variant="label" color="plum">
                Premium
              </AppText>
              <AppText variant="label" color="textMuted">
                Free
              </AppText>
            </View>
            {PREMIUM_PERKS.map((perk) => (
              <View key={perk.label} style={styles.compareRow}>
                <AppText variant="body" color="text" style={styles.compareWhat}>
                  {perk.label}
                </AppText>
                <Check size={16} color={colors.plum} />
                {perk.free ? (
                  <Check size={16} color={colors.pinkBorderStrong} />
                ) : (
                  <View style={styles.dash} />
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  scrollPad: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.pinkTint,
  },
  avatarEmpty: {
    borderWidth: 1,
    borderColor: colors.pinkBorder,
  },
  percentBadge: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -4,
    left: 18,
    right: 18,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.plum,
    alignItems: 'center',
  },
  identityText: {
    flex: 1,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modeCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    backgroundColor: colors.pinkTint,
  },
  modeChipActive: {
    backgroundColor: colors.plum,
    borderColor: colors.plum,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  verifyText: {
    flex: 1,
    gap: 2,
  },
  completeBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.plum,
  },
  pauseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.pinkTint,
  },
  pauseText: {
    flex: 1,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickCard: {
    flex: 1,
    gap: 4,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    ...shadows.card,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.plum,
    marginBottom: spacing.xxs,
  },
  premiumCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  premiumBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.plum,
  },
  premiumCopy: {
    fontSize: 16,
    lineHeight: 22,
  },
  premiumCta: {
    marginTop: spacing.xs,
  },
  compare: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  compareHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compareWhat: {
    flex: 1,
  },
  dash: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.pinkBorder,
  },
});
