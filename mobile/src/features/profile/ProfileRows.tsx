import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading" style={styles.sectionTitle}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" color="textMuted">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

export function AttributeRow({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon?: ReactNode;
  label: string;
  value?: string | null;
  onPress: () => void;
  last?: boolean;
}) {
  const empty = !value;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${value ?? 'Add'}`}
      onPress={onPress}
      style={({ pressed }) => [styles.attrRow, last && styles.attrLast, pressed && styles.pressed]}>
      {icon ? <View style={styles.attrIcon}>{icon}</View> : null}
      <AppText variant="body" color="text" style={styles.attrLabel}>
        {label}
      </AppText>
      <AppText variant="body" color={empty ? 'textMuted' : 'text'} numberOfLines={1} style={styles.attrValue}>
        {value || 'Add'}
      </AppText>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export function EditCard({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardBody}>{children}</View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <AppText variant="label" color="text">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    gap: 4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 22,
  },
  attrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.pinkBorder,
  },
  attrLast: {
    borderBottomWidth: 0,
  },
  attrIcon: {
    width: 28,
    alignItems: 'center',
  },
  attrLabel: {
    flexShrink: 0,
  },
  attrValue: {
    flex: 1,
    textAlign: 'right',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    backgroundColor: colors.white,
  },
  cardBody: {
    flex: 1,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.pinkBorderStrong,
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.75,
  },
});
