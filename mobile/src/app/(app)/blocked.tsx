import { Image } from 'expo-image';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, Screen } from '@/components/ui';
import { listBlockedUsers, unblockUser, type BlockedUser } from '@/features/safety/safety';
import { colors, radii, spacing } from '@/theme';

export default function BlockedUsersScreen() {
  const [users, setUsers] = useState<BlockedUser[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await listBlockedUsers());
    } catch {
      setUsers([]);
      Alert.alert('Couldn’t load blocked users', 'Check your connection and try again.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unblock = async (user: BlockedUser) => {
    setBusyId(user.uid);
    try {
      await unblockUser(user.uid);
      setUsers((current) => (current ?? []).filter((u) => u.uid !== user.uid));
    } catch {
      Alert.alert('Couldn’t unblock', 'Check your connection and try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen
      scroll={false}
      header={
        <View style={styles.header}>
          <AppText variant="heading">Blocked</AppText>
          <IconButton accessibilityLabel="Close" onPress={router.back} icon={<X size={20} color={colors.plum} />} />
        </View>
      }>
      {users === null ? (
        <AppText variant="body" color="textMuted">
          Loading…
        </AppText>
      ) : users.length === 0 ? (
        <AppText variant="body" color="textMuted" align="center" style={styles.empty}>
          You haven’t blocked anyone.
        </AppText>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatar} />
              )}
              <AppText variant="bodyStrong" style={styles.name}>
                {item.firstName}
              </AppText>
              <Button
                title="Unblock"
                variant="secondary"
                onPress={() => unblock(item)}
                loading={busyId === item.uid}
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  empty: {
    marginTop: spacing.xxl,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    backgroundColor: colors.white,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.pinkTint,
  },
  name: {
    flex: 1,
  },
});
