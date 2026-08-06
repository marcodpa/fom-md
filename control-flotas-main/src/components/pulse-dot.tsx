import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '@/theme';

type PulseDotProps = {
  /** Color del punto (un color resuelto del tema). */
  color: string;
  size?: number;
  /** Si late o no (un punto "en vivo" late; uno inactivo es fijo). */
  active?: boolean;
};

/**
 * Punto de estado que, cuando está activo, emite un halo suave que late
 * (DISENO_DIRECCION §6). Respeta "reducir movimiento": si está activo el ajuste
 * de accesibilidad, el punto queda fijo sin halo.
 */
export function PulseDot({ color, size = 8, active = true }: PulseDotProps) {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const animar = active && !reduced;

  useEffect(() => {
    if (!animar) return;
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [animar, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {animar ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: size / 2, backgroundColor: color, transform: [{ scale }], opacity },
          ]}
        />
      ) : null}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
