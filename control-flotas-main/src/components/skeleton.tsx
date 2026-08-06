import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotion, useTheme } from '@/theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bloque "esqueleto" de carga: una superficie tenue que late suavemente, para
 * usar en vez de spinners en listas y paneles (DISENO_DIRECCION §7). Respeta
 * "reducir movimiento" (queda fijo y atenuado).
 */
export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const reduced = useReducedMotion();
  const { colors, colorScheme, radii } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;
  // En claro el esqueleto es un "hueco" (sunken sobre tarjeta blanca); en
  // oscuro necesita ser una placa más clara para verse sobre el fondo.
  const tono = colorScheme === 'dark' ? colors.surfaceElevated : colors.surfaceSunken;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? radii.sm,
          backgroundColor: tono,
          opacity: reduced ? 0.8 : opacity,
        },
        style,
      ]}
    />
  );
}
