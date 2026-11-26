import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { BadgeCheck, Check, Crown, Eye, PauseCircle, Settings, ShieldCheck, Zap } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  GlowBackground,
  IconButton,
  MessageSheet,
  PinkGradient,
  type MessageSheetState,
} from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { useDiscovery } from '@/features/discover/DiscoveryProvider';
import { placeLabel } from '@/features/location/deviceLocation';
import type { Mode } from '@/features/onboarding/types';
import { activateBoost, fetchBoostStatus, type BoostStatus } from '@/features/premium/premium';
import { ageFromBirthDate } from '@/features/profile/age';
import { profileCompleteness } from '@/features/profile/completeness';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, layout, radii, shadows, spacing } from '@/theme';

function boostCaption(status: BoostStatus | null) {
  if (!status) return 'Get seen first on Discover';
  if (status.active && status.boostedUntil) {
    const mins = Math.max(1, Math.round((status.boostedUntil - Date.now()) / 60_000));
    return `Live · about ${mins} min left`;
  }
  if (!status.premium) return 'Premium · 30 minutes at the top';
  if (status.remaining <= 0) return 'Used this week · refreshes Monday';
  return `${status.remaining} left this week · 30 minutes`;
}

const PREMIUM_PERKS = [
  { label: 'See who liked you', free: false },
  { label: 'Unlimited likes', free: false },
  { label: '5 Sparks every week', free: false },
  { label: 'Advanced filters', free: false },
  { label: 'Weekly boost', free: false },
];

export default function ProfileScreen() {
  const { record } = useSession();
  const { profile, paused, setPaused, setMode } = useMyProfile();
  const { load } = useDiscovery();
  const [pausing, setPausing] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [boost, setBoost] = useState<BoostStatus | null>(null);
  const [boosting, setBoosting] = useState(false);
  const [notice, setNotice] = useState<MessageSheetState>(null);
  const photo = profile.photos?.[0];
  const { percent } = profileCompleteness(profile);
  const age = record?.birthDate ? ageFromBirthDate(record.birthDate) : null;
  const isPremium = Boolean(record?.premium?.active);
  const verification = profile.verification?.status ?? 'none';
  const isVerified = verification === 'approved';
  const mode: Mode = profile.mode === 'friends' ? 'friends' : 'date';

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fetchBoostStatus()
        .then((status) => {
          if (alive) setBoost(status);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  const onBoost = async () => {
    if (!isPremium) {
      setNotice({
        title: 'Boost with Premium',
        body: 'One boost a week puts you near the top of Discover for about 30 minutes.',
        primary: { label: 'Explore Premium', onPress: () => router.push('/(app)/paywall') },
        secondary: { label: 'Not now', onPress: () => {}, variant: 'secondary' },
      });
      return;
    }
    if (boost?.active) {
      setNotice({
        title: 'You’re already boosted',
        body: boostCaption(boost),
      });
      return;
    }
    if (boost && boost.remaining <= 0) {
      setNotice({
        title: 'Boost used this week',
        body: 'Your weekly boost refreshes with Sparks — come back next week.',
      });
      return;
    }

    setBoosting(true);
    try {
      const result = await activateBoost();
      const next = await fetchBoostStatus().catch(() => null);
      if (next) setBoost(next);
      else {
        setBoost((prev) =>
          prev
            ? {
                ...prev,
                active: true,
                boostedUntil: result.boostedUntil,
                remaining: result.remaining,
                usedThisWeek: prev.weeklyLimit - result.remaining,
              }
            : prev,
        );
      }
      setNotice({
        title: 'You’re boosted',
        body: 'For the next 30 minutes you’ll show near the top of Discover for people nearby.',
      });
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      const message =
        code.includes('resource-exhausted')
          ? 'You’ve used this week’s boost. Come back next week.'
          : code.includes('already-exists')
            ? 'Your profile is already boosted.'
            : code.includes('permission-denied')
              ? 'Boosts are a Premium perk.'
              : 'Check your connection and try again.';
      setNotice({ title: 'Couldn’t boost', body: message });
    } finally {
      setBoosting(false);
    }
  };

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

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: boosting }}
            disabled={boosting}
            onPress={onBoost}
            style={styles.verifyRow}>
            <Zap size={18} color={colors.plum} fill={boost?.active ? colors.pink : 'transparent'} />
            <View style={styles.verifyText}>
              <AppText variant="bodyStrong">{boost?.active ? 'Boosted' : 'Boost profile'}</AppText>
              <AppText variant="caption" color="textMuted">
                {boosting ? 'Starting boost…' : boostCaption(boost)}
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
      <MessageSheet notice={notice} onClose={() => setNotice(null)} />
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
    backgroundColor: colors.white,
  },
  modeChipActive: {
    // Figma selected chips: plum fill, white label.
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
