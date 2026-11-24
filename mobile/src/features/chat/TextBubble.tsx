import { AlertCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, shadows, spacing } from '@/theme';

import type { ChatMessage } from './types';

type TextBubbleProps = {
  message: ChatMessage;
  mine: boolean;
  onRetry?: () => void;
};

export function TextBubble({ message, mine, onRetry }: TextBubbleProps) {
  const failed = message.local?.status === 'failed';
  const sending = message.local?.status === 'sending';

  return (
    <View style={[styles.wrapper, mine ? styles.mineWrapper : styles.theirsWrapper]}>
      <Pressable
        accessibilityRole={failed ? 'button' : undefined}
        onPress={failed ? onRetry : undefined}
        style={[styles.bubble, mine ? styles.mine : styles.theirs, failed && styles.failed]}>
        {failed ? <AlertCircle size={16} color={colors.danger} /> : null}
        <AppText variant="body" color={mine ? 'white' : 'text'} style={styles.text}>
          {message.text}
        </AppText>
      </Pressable>
      {sending ? (
        <AppText variant="caption" color="textMuted">
          Sending…
        </AppText>
      ) : null}
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
    maxWidth: '82%',
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
  bubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    ...shadows.card,
  },
  mine: {
    backgroundColor: colors.plum,
    borderBottomRightRadius: spacing.xxs,
  },
  theirs: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: spacing.xxs,
  },
  failed: {
    opacity: 0.9,
  },
  text: {
    flexShrink: 1,
  },
});
