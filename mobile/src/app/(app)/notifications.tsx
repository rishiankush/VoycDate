import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/ui';
import { EmptyCard } from '@/features/navigation/TabScreen';
import { colors } from '@/theme';

export default function NotificationsScreen() {
  return (
    <Screen header={<ScreenHeader title="Notifications" onBack={router.back} />}>
      <EmptyCard
        icon={<Bell size={36} color={colors.pinkBorderStrong} />}
        title="You’re all caught up"
        body="New matches, voice notes and unlocks will show up here."
      />
    </Screen>
  );
}
