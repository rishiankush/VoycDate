import { Image } from 'expo-image';
import { AlertCircle } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, shadows, spacing } from '@/theme';

import type { ChatMessage } from './types';

type PhotoBubbleProps = {
  message: ChatMessage;
  mine: boolean;
  onRetry?: () => void;
};

export function PhotoBubble({ message, mine, onRetry }: PhotoBubbleProps) {
  const uri = message.local?.uri ?? message.photoUrl;
  const failed = message.local?.status === 'failed';
  const sending = message.local?.status === 'sending';

  return (
    <View style={[styles.wrapper, mine ? styles.mineWrapper : styles.theirsWrapper]}>
      <Pressable
        accessibilityRole={failed ? 'button' : undefined}
        onPress={failed ? onRetry : undefined}
        style={styles.frame}>
        {uri ? <Image source={{ uri }} style={styles.image} contentFit="cover" /> : <View style={styles.image} />}
        {sending ? (
          <View style={styles.overlay}>
            <ActivityIndicator color={colors.white} />
          </View>
        ) : null}
        {failed ? (
          <View style={styles.overlay}>
            <AlertCircle size={22} color={colors.white} />
          </View>
        ) : null}
      </Pressable>
      {failed ? (
        <AppText variant="caption" color="danger">
          Not sent. Tap to retry.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    maxWidth: '72%',
    gap: spacing.xxs,
  },
  mineWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirsWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  frame: {
    width: 220,
    height: 280,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.pinkTint,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
