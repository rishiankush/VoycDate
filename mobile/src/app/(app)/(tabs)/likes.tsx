import { Heart } from 'lucide-react-native';

import { EmptyCard, TabScreen } from '@/features/navigation/TabScreen';
import { colors } from '@/theme';

export default function LikesScreen() {
  return (
    <TabScreen title="Likes">
      <EmptyCard
        icon={<Heart size={36} color={colors.pinkBorderStrong} />}
        title="See who likes you"
        body="People who like your profile will show up here, along with the profiles you saved."
      />
    </TabScreen>
  );
}
