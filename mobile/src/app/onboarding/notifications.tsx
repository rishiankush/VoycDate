import * as Notifications from 'expo-notifications';
import { Bell, Heart, Mic, Unlock } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { registerPushToken } from '@/features/notifications/pushToken';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';
import { colors, radii, spacing } from '@/theme';

const STEP = '5.2';

const REASONS: { icon: ReactNode; text: string }[] = [
  { icon: <Heart size={18} color={colors.plum} />, text: 'When you get a new match' },
  { icon: <Mic size={18} color={colors.plum} />, text: 'When someone sends you a voice note' },
  { icon: <Unlock size={18} color={colors.plum} />, text: 'When text chat unlocks' },
];

export default function NotificationsStep() {
  const { user } = useSession();
  const { complete, saving } = useOnboardingStep(STEP);

  const enable = async () => {
    let status: Notifications.PermissionStatus = Notifications.PermissionStatus.UNDETERMINED;
    try {
      ({ status } = await Notifications.requestPermissionsAsync());
      if (status === Notifications.PermissionStatus.GRANTED && user?.uid) {
        await registerPushToken(user.uid);
      }
    } catch {
      // Permission prompts can be unavailable (e.g. some emulators); continue onboarding regardless.
    }
    complete({ user: { notificationsPermission: status } });
  };

  return (
    <OnboardingScreen
      stepId={STEP}
      title="Turn on notifications"
      subtitle="So you never miss a match or a voice note."
      canContinue
      onContinue={enable}
      continueLabel="Turn on notifications"
      busy={saving}
      skipLabel="Not now">
      <View style={styles.bell}>
        <Bell size={36} color={colors.plum} />
      </View>
      <View style={styles.reasons}>
        {REASONS.map((reason) => (
          <View key={reason.text} style={styles.reason}>
            <View style={styles.reasonIcon}>{reason.icon}</View>
            <AppText variant="bodyLarge" color="text" style={styles.reasonText}>
              {reason.text}
            </AppText>
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  bell: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.pinkTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasons: {
    gap: spacing.sm,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reasonIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: {
    flex: 1,
  },
});
