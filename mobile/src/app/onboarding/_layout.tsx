import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { GlowBackground } from '@/components/ui';
import { OnboardingProvider, useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { colors } from '@/theme';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <WhenReady>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }} />
      </WhenReady>
    </OnboardingProvider>
  );
}

function WhenReady({ children }: { children: ReactNode }) {
  const { ready } = useOnboarding();
  if (ready) return children;
  return (
    <View style={styles.loading}>
      <GlowBackground />
      <ActivityIndicator color={colors.plum} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
