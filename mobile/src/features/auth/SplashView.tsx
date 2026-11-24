import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { AppText, GlowBackground } from '@/components/ui';
import { fontFamily, spacing } from '@/theme';

export function SplashView() {
  return (
    <View style={styles.container} accessibilityLabel="TUNG is loading">
      <StatusBar style="light" />
      <GlowBackground variant="dark" />
      <AppText style={styles.wordmark} color="onDark">
        TUNG
      </AppText>
      <AppText variant="eyebrow" color="onDarkMuted" style={styles.tagline}>
        Talk. Understand. Nurture. Grow.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: 84,
    lineHeight: 92,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 11,
    letterSpacing: 2.2,
    marginTop: spacing.xs,
  },
});
