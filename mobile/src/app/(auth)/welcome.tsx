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
        <AppText variant="eyebrow">Video. Openness. You. Connection.</AppText>
        <AppText variant="display">{'See the person.\nFeel the spark.'}</AppText>
        <AppText variant="bodyLarge">
          Meet through short video intros. Unlock text chat only when you both feel it.
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
