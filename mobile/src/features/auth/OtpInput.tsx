import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, fontFamily, radii, spacing } from '@/theme';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
  autoFocus?: boolean;
};

export function OtpInput({ value, onChange, length = 6, error = false, autoFocus = true }: OtpInputProps) {
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityLabel="Verification code"
      onPress={() => inputRef.current?.focus()}
      style={styles.row}>
      {Array.from({ length }, (_, i) => {
        const active = focused && i === Math.min(value.length, length - 1);
        return (
          <View
            key={i}
            style={[styles.box, active && styles.boxActive, error && styles.boxError]}>
            <AppText style={styles.digit}>{value[i] ?? ''}</AppText>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  box: {
    flex: 1,
    maxWidth: 52,
    aspectRatio: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: colors.plum,
    borderWidth: 1.5,
  },
  boxError: {
    borderColor: colors.danger,
  },
  digit: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 22,
    color: colors.plum,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.01,
    color: 'transparent',
  },
});
