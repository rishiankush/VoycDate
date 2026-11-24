export const colors = {
  plum: '#471448',
  plumDeep: '#2A0B2B',
  plumGradientTop: '#672868',
  plumGlow: '#8A3E86',
  eyebrow: '#7A2F73',

  pink: '#F1A0D9',
  pinkSoft: '#F6BDE8',
  pinkBorderStrong: '#D77AC8',
  pinkBorder: '#E6C4E1',
  pinkTint: '#F7EAF5',
  pinkGlow: '#F9DAF0',

  text: '#28202D',
  textMuted: '#5E4A63',
  textSubtle: '#6B5A6E',
  placeholder: '#7C6A82',

  white: '#FFFFFF',
  black: '#000000',
  danger: '#C2334D',
  success: '#2E8B57',

  onDark: '#FFFFFF',
  onDarkMuted: 'rgba(255,255,255,0.78)',
  onDarkBorder: 'rgba(255,255,255,0.45)',
  onDarkTint: 'rgba(255,255,255,0.14)',
} as const;

export type ColorName = keyof typeof colors;
