import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, GlowBackground } from '@/components/ui';
import { layout, spacing } from '@/theme';

export function TabScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.root}>
      <GlowBackground />
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <AppText variant="heading">{title}</AppText>
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function EmptyCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <View style={styles.empty}>
      {icon}
      <AppText variant="bodyStrong" color="plum" align="center">
        {title}
      </AppText>
      <AppText variant="body" align="center">
        {body}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
});
