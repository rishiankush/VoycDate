import { useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { colors } from '@/theme';

type SliderProps = {
  min: number;
  max: number;
  step?: number;
  /** One value for a single thumb, two for a range. */
  value: number[];
  onChange: (value: number[]) => void;
  accessibilityLabel: string;
  formatValue?: (value: number) => string;
};

const THUMB = 28;

export function Slider({ min, max, step = 1, value, onChange, accessibilityLabel, formatValue }: SliderProps) {
  const [width, setWidth] = useState(0);
  const drag = useRef<{ thumb: number; startX: number; startValue: number } | null>(null);
  const span = max - min;
  const isRange = value.length === 2;

  const toPosition = (v: number) => (width ? ((v - min) / span) * width : 0);

  const clampFor = (thumb: number, v: number) => {
    const lower = isRange && thumb === 1 ? value[0] + step : min;
    const upper = isRange && thumb === 0 ? value[1] - step : max;
    return Math.min(upper, Math.max(lower, Math.round(v / step) * step));
  };

  const setThumb = (thumb: number, next: number) => {
    if (next === value[thumb]) return;
    const updated = [...value];
    updated[thumb] = next;
    onChange(updated);
  };

  const onMove = (e: GestureResponderEvent) => {
    const d = drag.current;
    if (!d || !width) return;
    const dx = e.nativeEvent.pageX - d.startX;
    setThumb(d.thumb, clampFor(d.thumb, d.startValue + (dx / width) * span));
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - THUMB);

  const start = isRange ? toPosition(value[0]) : 0;
  const end = toPosition(value[value.length - 1]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.track} />
      <View style={[styles.activeTrack, { left: THUMB / 2 + start, width: Math.max(end - start, 0) }]} />
      {value.map((v, thumb) => (
        <View
          key={thumb}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            drag.current = { thumb, startX: e.nativeEvent.pageX, startValue: v };
          }}
          onResponderMove={onMove}
          onResponderRelease={() => {
            drag.current = null;
          }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={isRange ? `${accessibilityLabel} ${thumb === 0 ? 'minimum' : 'maximum'}` : accessibilityLabel}
          accessibilityValue={{ text: formatValue ? formatValue(v) : String(v) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) =>
            setThumb(thumb, clampFor(thumb, v + (e.nativeEvent.actionName === 'increment' ? step : -step)))
          }
          hitSlop={12}
          style={[styles.thumb, { left: toPosition(v) }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: THUMB + 8,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: THUMB / 2,
    right: THUMB / 2,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.pinkBorder,
  },
  activeTrack: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.plum,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    borderColor: colors.plum,
    backgroundColor: colors.white,
  },
});
