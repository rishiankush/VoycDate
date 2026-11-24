import { StyleSheet, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { spacing } from '@/theme';

type SessionErrorViewProps = {
  onRetry: () => void;
  onSignOut: () => void;
};

export function SessionErrorView({ onRetry, onSignOut }: SessionErrorViewProps) {
  return (
    <Screen
      scroll={false}
      footer={
        <View style={styles.actions}>
          <Button title="Try again" onPress={onRetry} />
          <Button title="Sign out" variant="secondary" onPress={onSignOut} />
        </View>
      }>
      <View style={styles.body}>
        <AppText variant="title">We can’t reach TUNG right now</AppText>
        <AppText variant="bodyLarge">Check your internet connection and try again.</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});
