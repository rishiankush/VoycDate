import { Image } from 'expo-image';
import { Sparkles, X } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, IconButton } from '@/components/ui';
import { colors, radii, shadows, spacing } from '@/theme';

type SparkUpsellSheetProps = {
  visible: boolean;
  firstName: string;
  photoUrl: string | null;
  onClose: () => void;
  onUnlock: () => void;
};

/** Bumble-style bottom sheet when a free user taps Spark. */
export function SparkUpsellSheet({ visible, firstName, photoUrl, onClose, onUnlock }: SparkUpsellSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Dismiss" style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.sheetHeader}>
            <View style={styles.avatarWrap}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarEmpty]} />
              )}
              <View style={styles.sparkBadge}>
                <Sparkles size={14} color={colors.white} strokeWidth={2.4} />
              </View>
            </View>
            <IconButton accessibilityLabel="Close" onPress={onClose} icon={<X size={20} color={colors.plum} />} />
          </View>

          <AppText variant="title" style={styles.title}>
            Stand out with Sparks
          </AppText>
          <AppText variant="body" color="textMuted" style={styles.body}>
            Show {firstName} you’re serious — send a connect request they have to accept. Premium includes 5 Sparks every
            week.
          </AppText>

          <View style={styles.perkCard}>
            <View style={styles.perkIcon}>
              <Sparkles size={22} color={colors.plum} />
            </View>
            <View style={styles.perkText}>
              <AppText variant="bodyStrong">5 Sparks / week</AppText>
              <AppText variant="caption" color="textMuted">
                Included with VOYC Premium
              </AppText>
            </View>
          </View>

          <Button title="Unlock Sparks with Premium" onPress={onUnlock} />
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.later}>
            <AppText variant="label" color="textMuted" align="center">
              Not now
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42, 11, 43, 0.45)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  avatarWrap: {
    width: 72,
    height: 72,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.pinkTint,
  },
  avatarEmpty: {
    borderWidth: 1,
    borderColor: colors.pinkBorder,
  },
  sparkBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.plum,
    borderWidth: 2,
    borderColor: colors.white,
  },
  title: {
    marginTop: spacing.xs,
  },
  body: {
    marginBottom: spacing.sm,
  },
  perkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.pinkTint,
    borderWidth: 1,
    borderColor: colors.pink,
    marginBottom: spacing.sm,
  },
  perkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  perkText: {
    flex: 1,
    gap: 2,
  },
  later: {
    paddingVertical: spacing.sm,
  },
});
