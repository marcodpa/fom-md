import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotion, useTheme } from '@/theme';

type AppearProps = {
  children: ReactNode;
  /** Retardo de entrada (ms) para escalonar varios elementos. */
  delay?: number;
  /** Distancia de subida al aparecer (px). */
  distance?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Envoltura de aparición: el contenido entra con un fundido + leve subida (el
 * mismo gesto del login). Escalonable con `delay` para dar vida a una pantalla.
 * Respeta "reducir movimiento": si está activo, aparece de una sin animar.
 */
export function Appear({ children, delay = 0, distance = 14, style }: AppearProps) {
  const reduced = useReducedMotion();
  const { motion } = useTheme();
  const t = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      t.setValue(1);
      return;
    }
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: motion.durations.slow,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [t, delay, reduced, motion.durations.slow]);

  return (
    <Animated.View
      style={[
        { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] },
        style,
      ]}>
      {children}
    </Animated.View>
  );
}
