import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

export function PhotoGradient() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="cardFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.45" stopColor={colors.plumDeep} stopOpacity={0} />
            <Stop offset="0.78" stopColor={colors.plum} stopOpacity={0.75} />
            <Stop offset="1" stopColor={colors.plumDeep} stopOpacity={0.95} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#cardFade)" />
      </Svg>
    </View>
  );
}
