import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

export type GlowVariant = 'light' | 'dark';

export function GlowBackground({ variant = 'light' }: { variant?: GlowVariant }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="darkBase" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.plumGradientTop} />
            <Stop offset="0.55" stopColor={colors.plum} />
            <Stop offset="1" stopColor={colors.plumDeep} />
          </LinearGradient>
          <RadialGradient id="glowTopRight" cx="100%" cy="0%" r="65%">
            <Stop offset="0" stopColor={variant === 'light' ? colors.pinkGlow : colors.plumGlow} stopOpacity={0.95} />
            <Stop offset="1" stopColor={variant === 'light' ? colors.pinkGlow : colors.plumGlow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glowBottomLeft" cx="0%" cy="78%" r="45%">
            <Stop offset="0" stopColor={variant === 'light' ? colors.pinkGlow : colors.plumGlow} stopOpacity={0.8} />
            <Stop offset="1" stopColor={variant === 'light' ? colors.pinkGlow : colors.plumGlow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={variant === 'light' ? colors.white : 'url(#darkBase)'} />
        <Rect width="100%" height="100%" fill="url(#glowTopRight)" />
        <Rect width="100%" height="100%" fill="url(#glowBottomLeft)" />
      </Svg>
    </View>
  );
}
