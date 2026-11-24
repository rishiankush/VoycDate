import { Stack } from 'expo-router';

import { DiscoveryProvider } from '@/features/discover/DiscoveryProvider';
import { useRefreshDeviceLocation } from '@/features/location/useRefreshDeviceLocation';
import { useStartupPermissions } from '@/features/permissions/useStartupPermissions';
import { MyProfileProvider } from '@/features/profile/MyProfileProvider';
import { colors } from '@/theme';

function AppShell() {
  useStartupPermissions(true);
  useRefreshDeviceLocation();

  return (
    <DiscoveryProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="person/[uid]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="preview-profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="blocked" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="match" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
    </DiscoveryProvider>
  );
}

export default function AppLayout() {
  return (
    <MyProfileProvider>
      <AppShell />
    </MyProfileProvider>
  );
}
