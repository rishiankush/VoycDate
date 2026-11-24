import { router } from 'expo-router';
import { collection, onSnapshot, orderBy, query, updateDoc, doc, limit, type Timestamp } from 'firebase/firestore';
import { Bell } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Screen, ScreenHeader } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { EmptyCard } from '@/features/navigation/TabScreen';
import { db } from '@/lib/firebase';
import { colors, radii, spacing } from '@/theme';

type InboxItem = {
  id: string;
  title: string;
  body: string;
  kind: string;
  read: boolean;
  data?: { type?: string; matchId?: string };
  createdAt: Timestamp | null;
};

export default function NotificationsScreen() {
  const { user } = useSession();
  const uid = user?.uid;
  const [items, setItems] = useState<InboxItem[] | null>(null);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'inbox'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snap) =>
        setItems(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title ?? 'VOYC',
              body: data.body ?? '',
              kind: data.kind ?? '',
              read: Boolean(data.read),
              data: data.data,
              createdAt: data.createdAt ?? null,
            };
          }),
        ),
      () => setItems([]),
    );
  }, [uid]);

  const open = async (item: InboxItem) => {
    if (!uid) return;
    if (!item.read) {
      void updateDoc(doc(db, 'users', uid, 'inbox', item.id), { read: true });
    }
    const matchId = item.data?.matchId;
    if (matchId) router.push({ pathname: '/chat/[matchId]', params: { matchId } });
  };

  return (
    <Screen
      scroll={false}
      header={<ScreenHeader title="Notifications" onBack={router.back} />}>
      {items === null ? (
        <AppText variant="body" color="textMuted">
          Loading…
        </AppText>
      ) : items.length === 0 ? (
        <EmptyCard
          icon={<Bell size={36} color={colors.pinkBorderStrong} />}
          title="You’re all caught up"
          body="New matches, voice notes and unlocks will show up here."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => open(item)}
              style={({ pressed }) => [styles.row, !item.read && styles.unread, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <AppText variant="bodyStrong">{item.title}</AppText>
                <AppText variant="body" numberOfLines={2}>
                  {item.body}
                </AppText>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.xs,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    backgroundColor: colors.white,
  },
  unread: {
    backgroundColor: colors.pinkTint,
    borderColor: colors.pink,
  },
  pressed: {
    opacity: 0.85,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.plum,
  },
});
