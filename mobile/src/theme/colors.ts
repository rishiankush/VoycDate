export const colors = {
  plum: '#0F4C5C',
  plumDeep: '#08343F',
  plumGradientTop: '#1A6B7C',
  plumGlow: '#2A8FA0',
  eyebrow: '#1F6A78',

  pink: '#5EC8C0',
  pinkSoft: '#9DDED8',
  pinkBorderStrong: '#3AAEA5',
  pinkBorder: '#B5E4DF',
  pinkTint: '#E8F7F5',
  pinkGlow: '#D0F0EC',

  text: '#1A2A2E',
  textMuted: '#4A5E63',
  textSubtle: '#5A6E73',
  placeholder: '#6B7F84',

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
