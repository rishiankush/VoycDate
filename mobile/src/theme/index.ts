import type { ViewStyle } from 'react-native';

import { colors } from './colors';

export { colors } from './colors';
export { fontFamily, typography } from './typography';
export type { ColorName } from './colors';
export type { TypographyVariant } from './typography';

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const layout = {
  screenPadding: 16,
  buttonHeight: 56,
  inputHeight: 56,
} as const;

export const shadows = {
  button: {
    shadowColor: colors.plum,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  card: {
    shadowColor: colors.plum,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
} satisfies Record<string, ViewStyle>;
