import { Image, type ImageSource } from 'expo-image';
import { MapPin, MessageSquare } from 'lucide-react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme';

// Positions are in the 393pt-wide Figma frame and scaled to the device width.
const FRAME_WIDTH = 393;
const HEIGHT = 400;
const CENTER = { x: 200, y: 200 };
const ORBIT_RADIUS = 151;

type Avatar = { source: ImageSource; x: number; y: number; size: number };

const AVATARS: Avatar[] = [
  { source: require('@/assets/images/welcome/top.png'), x: 200, y: 45, size: 49 },
  { source: require('@/assets/images/welcome/left.png'), x: 47.5, y: 184, size: 54 },
  { source: require('@/assets/images/welcome/right.png'), x: 348.5, y: 254, size: 49 },
  { source: require('@/assets/images/welcome/bottom-left.png'), x: 135, y: 355, size: 49 },
  { source: require('@/assets/images/welcome/bottom-right.png'), x: 258, y: 333, size: 40 },
];

export function OrbitIllustration() {
  const { width } = useWindowDimensions();
  const scale = Math.min(width, 430) / FRAME_WIDTH;
  const s = (n: number) => n * scale;

  const place = (x: number, y: number, size: number) => ({
    position: 'absolute' as const,
    left: s(x - size / 2),
    top: s(y - size / 2),
    width: s(size),
    height: s(size),
    borderRadius: s(size / 2),
  });

  return (
    <View style={{ width: s(FRAME_WIDTH), height: s(HEIGHT), alignSelf: 'center' }} accessible={false}>
      <Svg width={s(FRAME_WIDTH)} height={s(HEIGHT)} style={StyleSheet.absoluteFill}>
        <Circle cx={s(CENTER.x)} cy={s(CENTER.y)} r={s(98)} fill={colors.pinkTint} />
        <Circle cx={s(CENTER.x)} cy={s(CENTER.y)} r={s(65)} fill={colors.white} />
        <Circle
          cx={s(CENTER.x)}
          cy={s(CENTER.y)}
          r={s(ORBIT_RADIUS)}
          stroke={colors.pinkBorder}
          strokeWidth={1.5}
          strokeDasharray={`${s(6)} ${s(6)}`}
          fill="none"
        />
      </Svg>

      <Image
        source={require('@/assets/images/welcome/center.png')}
        style={[place(CENTER.x, CENTER.y, 90), styles.centerPhoto]}
        contentFit="cover"
      />

      {AVATARS.map((avatar, i) => (
        <Image
          key={i}
          source={avatar.source}
          style={[place(avatar.x, avatar.y, avatar.size), styles.avatar]}
          contentFit="cover"
        />
      ))}

      <View style={[place(291.5, 73.5, 30), styles.badge, { backgroundColor: colors.plum }]}>
        <MapPin size={s(15)} color={colors.white} fill={colors.white} strokeWidth={1.5} />
      </View>
      <View style={[place(71.5, 295.5, 35), styles.badge, { backgroundColor: colors.pinkBorderStrong }]}>
        <MessageSquare size={s(15)} color={colors.white} fill={colors.white} strokeWidth={1.5} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerPhoto: {
    borderWidth: 2,
    borderColor: colors.pinkSoft,
  },
  avatar: {
    borderWidth: 2,
    borderColor: colors.white,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
