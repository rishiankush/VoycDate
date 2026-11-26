import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Heart } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { useDiscovery } from '@/features/discover/DiscoveryProvider';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, spacing } from '@/theme';

export default function MatchScreen() {
  const { user } = useSession();
  const { profile } = useMyProfile();
  const { lastMatch } = useDiscovery();

  if (!lastMatch) return <Redirect href="/discover" />;

  const { other, firstSenderId, matchId } = lastMatch;
  const iSendFirst = firstSenderId === user?.uid;

  return (
    <Screen variant="dark" scroll={false}>
      <StatusBar style="light" />
      <View style={styles.body}>
        <View style={styles.photos}>
          <Avatar uri={profile.photos?.[0]?.url} />
          <View style={styles.heart}>
            <Heart size={22} color={colors.plum} fill={colors.plum} />
          </View>
          <Avatar uri={other.photoUrl} />
        </View>
        <AppText variant="display" color="onDark" align="center">
          It’s a match!
        </AppText>
        <AppText variant="bodyLarge" color="onDarkMuted" align="center">
          {iSendFirst
            ? `You liked ${other.firstName} first, so you send the first voice note. You have 48 hours.`
            : `${other.firstName} liked you first, so their first voice note is on its way. We’ll let you know when it arrives.`}
        </AppText>
      </View>
      <View style={styles.actions}>
        {iSendFirst ? (
          <Button
            title="Send the first voice note"
            variant="accent"
            onPress={() => {
              // Dismiss the match fullScreenModal first — replace-into-chat leaves an
              // invisible modal layer that swallows every touch on the chat screen.
              const openChat = () =>
                router.push({ pathname: '/chat/[matchId]', params: { matchId } });
              if (router.canDismiss()) {
                router.dismiss();
                requestAnimationFrame(openChat);
              } else {
                openChat();
              }
            }}
          />
        ) : null}
        <Button
          title="Keep discovering"
          variant={iSendFirst ? 'outlineOnDark' : 'accent'}
          onPress={() => (router.canDismiss() ? router.dismiss() : router.back())}
        />
      </View>
    </Screen>
  );
}

function Avatar({ uri }: { uri?: string | null }) {
  return uri ? <Image source={{ uri }} style={styles.avatar} contentFit="cover" /> : <View style={styles.avatar} />;
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  photos: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: colors.plumGlow,
  },
  heart: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: -16,
    zIndex: 1,
    backgroundColor: colors.pink,
    borderWidth: 3,
    borderColor: colors.plumDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
});
