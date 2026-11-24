import { Text, type TextProps } from 'react-native';

import { colors, typography, type ColorName, type TypographyVariant } from '@/theme';

const defaultColor: Record<TypographyVariant, ColorName> = {
  display: 'plum',
  title: 'plum',
  heading: 'plum',
  eyebrow: 'eyebrow',
  bodyLarge: 'textMuted',
  body: 'textMuted',
  bodyStrong: 'text',
  label: 'text',
  button: 'white',
  caption: 'textMuted',
};

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ColorName;
  align?: 'left' | 'center' | 'right';
};

export function AppText({ variant = 'body', color, align, style, ...rest }: AppTextProps) {
  return (
    <Text
      style={[
        typography[variant],
        { color: colors[color ?? defaultColor[variant]] },
        align && { textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}
