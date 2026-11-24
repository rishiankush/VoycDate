import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { colors, spacing } from '@/theme';

export default function DoneStep() {
  const { profile, finish } = useOnboarding();
  const [finishing, setFinishing] = useState(false);
  const mainPhoto = profile.photos?.[0];

  const start = async () => {
    setFinishing(true);
    try {
      await finish();
    } catch {
      Alert.alert('Couldn’t save', 'Check your connection and try again.');
      setFinishing(false);
    }
  };

  return (
    <Screen variant="dark" scroll={false}>
      <StatusBar style="light" />
      <View style={styles.body}>
        {mainPhoto ? <Image source={{ uri: mainPhoto.url }} style={styles.photo} contentFit="cover" /> : null}
        <AppText variant="title" color="onDark" align="center">
          You’re in, {profile.firstName}.
        </AppText>
        <AppText variant="bodyLarge" color="onDarkMuted" align="center">
          Your profile is live. Now go hear someone’s voice.
        </AppText>
        <Button title="Start discovering" variant="accent" onPress={start} loading={finishing} style={styles.button} />
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
    paddingHorizontal: spacing.md,
  },
  photo: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: colors.white,
    marginBottom: spacing.md,
  },
  button: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
});
