import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { layout, spacing } from '@/theme';

import { GlowBackground, type GlowVariant } from './GlowBackground';

type ScreenProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  variant?: GlowVariant;
  scroll?: boolean;
};

export function Screen({ children, header, footer, variant = 'light', scroll = true }: ScreenProps) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.scrollContent, styles.fill]}>{children}</View>
  );

  return (
    <View style={styles.fill}>
      <GlowBackground variant={variant} />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {header ? <View style={styles.header}>{header}</View> : null}
          {body}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
});
