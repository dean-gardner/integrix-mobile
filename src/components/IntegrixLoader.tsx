import React, { useEffect, useMemo, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

const ROTATION_DURATION_MS = 1080;
const SEGMENT_COUNT = 12;
const SEGMENT_COLORS = [
  '#2136A1',
  '#f8fbfe',
  '#e8f1fd',
  '#d4e5fb',
  '#bed7f9',
  '#a6c8f7',
  '#8eb9f5',
  '#74a9f2',
  '#5b99f0',
  '#428aee',
  '#2b7cec',
  '#166fea',
] as const;

type IntegrixLoaderProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function IntegrixLoader({ size = 44, style }: IntegrixLoaderProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((current) => (current + 1) % SEGMENT_COUNT);
    }, Math.floor(ROTATION_DURATION_MS / SEGMENT_COUNT));

    return () => {
      clearInterval(interval);
    };
  }, []);

  const segmentWidth = Math.max(3, Math.round(size * 0.11));
  const segmentHeight = Math.max(8, Math.round(size * 0.28));
  const segmentRadius = Math.round(size * 0.33);

  const segments = useMemo(
    () =>
      Array.from({ length: SEGMENT_COUNT }, (_, index) => ({
        key: `segment-${index}`,
        color: SEGMENT_COLORS[index],
        angle: `${index * 30}deg`,
      })),
    []
  );

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      <View
        style={[
          styles.spinner,
          { width: size, height: size, transform: [{ rotate: `${step * 30}deg` }] },
        ]}
      >
        {segments.map((segment) => (
          <View
            key={segment.key}
            style={[
              styles.segment,
              {
                width: segmentWidth,
                height: segmentHeight,
                borderRadius: Math.ceil(segmentWidth / 2),
                left: size / 2 - segmentWidth / 2,
                top: size / 2 - segmentHeight / 2,
                backgroundColor: segment.color,
                transform: [{ rotate: segment.angle }, { translateY: -segmentRadius }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    position: 'absolute',
  },
});
