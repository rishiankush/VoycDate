import type { TextStyle } from 'react-native';

export const fontFamily = {
  serifRegular: 'LibertinusSerif_400Regular',
  serifSemiBold: 'LibertinusSerif_600SemiBold',
  serifBold: 'LibertinusSerif_700Bold',
  sansRegular: 'Manrope_400Regular',
  sansMedium: 'Manrope_500Medium',
  sansSemiBold: 'Manrope_600SemiBold',
  sansBold: 'Manrope_700Bold',
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: 44,
    lineHeight: 42,
    letterSpacing: -1.76,
  },
  title: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1.02,
  },
  heading: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.52,
  },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  bodyLarge: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 17,
    lineHeight: 24,
  },
  body: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: fontFamily.sansBold,
    fontSize: 16,
    lineHeight: 22,
  },
  label: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
    lineHeight: 16,
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
