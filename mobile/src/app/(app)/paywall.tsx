import { router } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, Screen } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { PLANS, setPremiumStatus } from '@/features/premium/premium';
import { colors, radii, spacing } from '@/theme';

const PERKS = [
  { label: 'See who liked you', premium: true },
  { label: 'Unlimited likes', premium: true },
  { label: 'Advanced filters', premium: true },
  { label: 'Weekly profile boost', premium: true },
];

export default function PaywallScreen() {
  const { record } = useSession();
  const isPremium = Boolean(record?.premium?.active);
  const [plan, setPlan] = useState<(typeof PLANS)[number]['id']>('monthly');
  const [busy, setBusy] = useState(false);

  const unlock = async () => {
    setBusy(true);
    try {
      await setPremiumStatus(true);
      Alert.alert('You’re Premium', 'Unlimited likes and full Likes tab are unlocked.', [
        { text: 'Nice', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Couldn’t unlock', 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      await setPremiumStatus(false);
      router.back();
    } catch {
      Alert.alert('Couldn’t update', 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={
        <View style={styles.header}>
          <AppText variant="heading">Premium</AppText>
          <IconButton accessibilityLabel="Close" onPress={router.back} icon={<X size={20} color={colors.plum} />} />
        </View>
      }
      footer={
        isPremium ? (
          <Button title="Turn off Premium" variant="secondary" onPress={turnOff} loading={busy} />
        ) : (
          <Button
            title={`Explore Premium · ${PLANS.find((p) => p.id === plan)?.price ?? ''}`}
            onPress={unlock}
            loading={busy}
          />
        )
      }>
      <View style={styles.hero}>
        <View style={styles.badge}>
          <AppText variant="label" color="white">
            VOYC PREMIUM
          </AppText>
        </View>
        <AppText variant="title" color="plum">
          {isPremium ? 'You’re getting the VIP treatment' : 'Get the VIP treatment'}
        </AppText>
        <AppText variant="body" color="text">
          Better ways to connect — see who’s interested and like without daily limits.
        </AppText>
      </View>

      {!isPremium ? (
        <View style={styles.plans}>
          {PLANS.map((option) => {
            const selected = plan === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setPlan(option.id)}
                style={[styles.plan, selected && styles.planSelected]}>
                {option.badge ? (
                  <View style={styles.planBadge}>
                    <AppText variant="label" color="white">
                      {option.badge}
                    </AppText>
                  </View>
                ) : null}
                <AppText variant="bodyStrong">{option.label}</AppText>
                <AppText variant="title" color="plum">
                  {option.price}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {option.per}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.compareHead}>
        <AppText variant="label" color="textMuted" style={styles.flex}>
          What you get
        </AppText>
        <AppText variant="label" color="plum">
          Premium
        </AppText>
        <AppText variant="label" color="textMuted">
          Free
        </AppText>
      </View>
      {PERKS.map((perk) => (
        <View key={perk.label} style={styles.compareRow}>
          <AppText variant="body" color="text" style={styles.flex}>
            {perk.label}
          </AppText>
          <Check size={16} color={colors.plum} />
          <View style={styles.dash} />
        </View>
      ))}

      <AppText variant="caption" color="textMuted" align="center" style={styles.note}>
        App Store / Play billing via RevenueCat comes next. For now this unlocks Premium on your account.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hero: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.pink,
    marginBottom: spacing.lg,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.plum,
  },
  plans: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  plan: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.pinkBorder,
    backgroundColor: colors.white,
    gap: 2,
  },
  planSelected: {
    borderColor: colors.plum,
    backgroundColor: colors.pinkTint,
  },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.plum,
    marginBottom: spacing.xs,
  },
  compareHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  dash: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.pinkBorder,
  },
  note: {
    marginTop: spacing.lg,
  },
});
