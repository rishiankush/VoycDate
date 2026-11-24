import { useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors, radii } from '@/theme';

type PinkGradientProps = {
  style?: ViewStyle;
  /** Soft wash for banners / premium cards. */
  variant?: 'banner' | 'hero' | 'chip';
  children?: ReactNode;
};

const STOPS = {
  banner: [
    { offset: '0%', color: colors.pinkGlow },
    { offset: '55%', color: colors.pink },
    { offset: '100%', color: colors.pinkSoft },
  ],
  hero: [
    { offset: '0%', color: colors.pinkSoft },
    { offset: '45%', color: colors.pink },
    { offset: '100%', color: colors.pinkGlow },
  ],
  chip: [
    { offset: '0%', color: colors.pinkTint },
    { offset: '100%', color: colors.pinkGlow },
  ],
} as const;

const FALLBACK: Record<keyof typeof STOPS, string> = {
  banner: colors.pinkGlow,
  hero: colors.pinkSoft,
  chip: colors.pinkTint,
};

/**
 * Soft pink linear wash for Premium / upgrade surfaces.
 * Sizes the SVG from onLayout — percentage SVG rects clip mid-card on RN.
 */
export function PinkGradient({ style, variant = 'banner', children }: PinkGradientProps) {
  const stops = STOPS[variant];
  const gradId = `pink-${variant}-${useId().replace(/:/g, '')}`;
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  return (
    <View style={[styles.base, { backgroundColor: FALLBACK[variant] }, style]} onLayout={onLayout}>
      {size.w > 0 && size.h > 0 ? (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              {stops.map((stop) => (
                <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill={`url(#${gradId})`} />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderRadius: radii.md,
  },
});
