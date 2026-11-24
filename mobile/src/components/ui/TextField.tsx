import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, layout, radii, spacing, typography } from '@/theme';

import { AppText } from './AppText';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  helperText?: string;
  error?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function TextField({
  label,
  helperText,
  error,
  leading,
  trailing,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error ? styles.fieldError : null,
        ]}>
        {leading}
        <TextInput
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.plum}
          accessibilityLabel={label}
          style={[styles.input, inputProps.multiline && styles.multiline]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {trailing}
      </View>
      {error ? (
        <AppText variant="caption" color="danger" style={styles.helper}>
          {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="caption" style={styles.helper}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    marginLeft: 2,
  },
  field: {
    minHeight: layout.inputHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  fieldFocused: {
    borderColor: colors.pinkBorderStrong,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  input: {
    ...typography.bodyLarge,
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  helper: {
    marginLeft: 2,
  },
});
