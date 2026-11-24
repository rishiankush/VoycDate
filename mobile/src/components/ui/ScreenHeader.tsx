import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { AppText } from './AppText';
import { IconButton } from './IconButton';

type ScreenHeaderProps = {
  onBack?: () => void;
  title?: string;
  rightLabel?: string;
  onDark?: boolean;
};

export function ScreenHeader({ onBack, title, rightLabel, onDark = false }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {onBack ? (
          <IconButton
            accessibilityLabel="Back"
            onPress={onBack}
            onDark={onDark}
            icon={<ChevronLeft size={22} color={onDark ? colors.white : colors.plum} />}
          />
        ) : null}
      </View>
      {title ? (
        <AppText variant="eyebrow" color={onDark ? 'onDark' : 'plum'} style={styles.title}>
          {title}
        </AppText>
      ) : null}
      <View style={[styles.side, styles.right]}>
        {rightLabel ? (
          <AppText variant="label" color={onDark ? 'onDarkMuted' : 'textMuted'}>
            {rightLabel}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  side: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
  },
  title: {
    letterSpacing: 3,
    fontSize: 14,
  },
});
