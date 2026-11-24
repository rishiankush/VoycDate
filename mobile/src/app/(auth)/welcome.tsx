import { router } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { OrbitIllustration } from '@/features/auth/OrbitIllustration';
import { colors, spacing } from '@/theme';

export default function WelcomeScreen() {
  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button
            title="Continue with phone number"
            icon={<Phone size={18} color={colors.white} />}
            onPress={() => router.push('/phone')}
          />
          <AppText variant="caption" align="center">
            New here or coming back, we’ll verify your number with a code.
          </AppText>
        </View>
      }>
      <OrbitIllustration />
      <View style={styles.copy}>
        <AppText variant="eyebrow">Talk. Understand. Nurture. Grow.</AppText>
        <AppText variant="display">{'Hear the spark.\nFeel the connection.'}</AppText>
        <AppText variant="bodyLarge">
          Meet through short voice notes. Unlock text chat only when you both feel it.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
});
