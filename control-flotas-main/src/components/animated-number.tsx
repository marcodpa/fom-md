import { useEffect, useRef, useState } from 'react';
import { Animated, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText, type TextVariant } from '@/components/themed-text';
import { useReducedMotion, useTheme, type ColorTokens } from '@/theme';

type AnimatedNumberProps = {
  /** Valor final. Cuenta desde 0 hasta aquí al aparecer / cambiar. */
  value: number;
  variant?: TextVariant;
  color?: keyof ColorTokens;
  /** Duración del conteo (ms). */
  duration?: number;
  /** Formatea el número mostrado (ej. moneda "$1.234"). */
  format?: (n: number) => string;
  style?: StyleProp<TextStyle>;
};

/**
 * Número que cuenta desde 0 hasta `value` al aparecer (para datos hero:
 * velocidad, score, KPIs). Cifras tabulares para que no "baile". Respeta
 * "reducir movimiento" (muestra el valor de una).
 */
export function AnimatedNumber({ value, variant = 'display', color, duration = 900, format, style }: AnimatedNumberProps) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const a = useRef(new Animated.Value(reduced ? value : 0)).current;
  const [shown, setShown] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    a.setValue(0);
    const id = a.addListener(({ value: v }) => setShown(Math.round(v)));
    const anim = Animated.timing(a, { toValue: value, duration, easing: motion.easing.standard, useNativeDriver: false });
    anim.start();
    return () => {
      anim.stop();
      a.removeListener(id);
    };
  }, [value, reduced, a, duration, motion.easing.standard]);

  return (
    <ThemedText variant={variant} color={color} tabular style={style}>
      {format ? format(shown) : shown}
    </ThemedText>
  );
}
