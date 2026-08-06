import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { useReducedMotion, useTheme } from '@/theme';

type ProgressBarProps = {
  /** Valor 0–100. */
  value: number;
  /** Color del relleno (un color resuelto del tema). */
  color: string;
  height?: number;
};

/**
 * Barra de progreso temática (DISENO_DIRECCION §6): pista tenue, relleno en
 * color, extremos redondeados. El relleno crece con una animación suave al
 * aparecer, respetando "reducir movimiento".
 */
export function ProgressBar({ value, color, height = 8 }: ProgressBarProps) {
  const reduced = useReducedMotion();
  const { colors, radii, motion } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  const progress = useRef(new Animated.Value(reduced ? clamped : 0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(clamped);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: clamped,
      duration: motion.durations.slow,
      useNativeDriver: false, // el ancho no es animable con native driver
    });
    anim.start();
    return () => anim.stop();
  }, [clamped, reduced, progress, motion.durations.slow]);

  const width = progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View
      style={{
        height,
        backgroundColor: colors.surfaceSunken,
        borderRadius: radii.pill,
        overflow: 'hidden',
      }}>
      <Animated.View style={{ height, width, backgroundColor: color, borderRadius: radii.pill }} />
    </View>
  );
}
