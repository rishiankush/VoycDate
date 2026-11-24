import { Tabs } from 'expo-router/js-tabs';

import { useSession } from '@/features/auth/SessionProvider';
import { useMatches } from '@/features/matches/useMatches';
import { TabBar } from '@/features/navigation/TabBar';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { user } = useSession();
  const { matches } = useMatches();
  const uid = user?.uid ?? '';
  const newMatches = matches.filter((m) => !m.lastMessageAt || (m.unread?.[uid] ?? 0) > 0).length;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.white } }}>
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="likes" options={{ title: 'Likes' }} />
      <Tabs.Screen
        name="connections"
        options={{ title: 'Connections', tabBarBadge: newMatches > 0 ? newMatches : undefined }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
