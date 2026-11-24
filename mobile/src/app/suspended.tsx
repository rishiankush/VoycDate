import { StatusBar } from 'expo-status-bar';
import { ShieldAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { colors, spacing } from '@/theme';

export default function SuspendedScreen() {
  const { signOut } = useSession();

  return (
    <Screen
      variant="dark"
      scroll={false}
      footer={<Button title="Sign out" variant="outlineOnDark" onPress={signOut} />}>
      <StatusBar style="light" />
      <View style={styles.body}>
        <ShieldAlert size={40} color={colors.pink} />
        <AppText variant="title" color="onDark" align="center">
          Your account is suspended
        </AppText>
        <AppText variant="bodyLarge" color="onDarkMuted" align="center">
          Your account has been suspended for breaking our community guidelines. Contact TUNG support if
          you think this is a mistake.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
