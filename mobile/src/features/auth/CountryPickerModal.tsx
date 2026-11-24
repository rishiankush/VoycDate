import type { CountryCode } from 'libphonenumber-js';
import { Check, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, IconButton, TextField } from '@/components/ui';
import { colors, layout, spacing } from '@/theme';

import { COUNTRIES, type Country } from './countries';
import { flagEmoji } from './flag';

type CountryPickerModalProps = {
  visible: boolean;
  selected: CountryCode;
  onSelect: (country: Country) => void;
  onClose: () => void;
};

export function CountryPickerModal({ visible, selected, onSelect, onClose }: CountryPickerModalProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '');
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.startsWith(q) || c.iso.toLowerCase() === q,
    );
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <AppText variant="heading">Choose your country</AppText>
          <IconButton
            accessibilityLabel="Close"
            onPress={onClose}
            size={40}
            icon={<X size={20} color={colors.plum} />}
          />
        </View>
        <View style={styles.search}>
          <TextField
            placeholder="Search country or code"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            leading={<Search size={18} color={colors.placeholder} />}
          />
        </View>
        <FlatList
          data={results}
          keyExtractor={(item) => item.iso}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          renderItem={({ item }) => {
            const isSelected = item.iso === selected;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, plus ${item.dialCode}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onSelect(item);
                  setQuery('');
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                <AppText style={styles.flag}>{flagEmoji(item.iso)}</AppText>
                <AppText variant="bodyLarge" color="text" style={styles.name} numberOfLines={1}>
                  {item.name}
                </AppText>
                <AppText variant="bodyLarge" color="textMuted">
                  +{item.dialCode}
                </AppText>
                {isSelected ? <Check size={18} color={colors.plum} /> : <View style={styles.checkSpacer} />}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
  },
  search: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.pinkTint,
  },
  flag: {
    fontSize: 22,
  },
  name: {
    flex: 1,
  },
  checkSpacer: {
    width: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.pinkBorder,
    marginLeft: layout.screenPadding,
  },
});
