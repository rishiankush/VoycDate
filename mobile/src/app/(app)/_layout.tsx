import { Stack } from 'expo-router';

import { DiscoveryProvider } from '@/features/discover/DiscoveryProvider';
import { MyProfileProvider } from '@/features/profile/MyProfileProvider';
import { colors } from '@/theme';

export default function AppLayout() {
  return (
    <MyProfileProvider>
      <DiscoveryProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="person/[uid]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="match" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        </Stack>
      </DiscoveryProvider>
    </MyProfileProvider>
  );
}
