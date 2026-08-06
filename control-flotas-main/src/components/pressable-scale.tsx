import { useRef } from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion, useTheme } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
};

/**
 * `Pressable` con feedback de escala al presionar (DISENO_DIRECCION §7: feedback
 * en TODO lo tocable). Se encoge a `motion.pressedScale` al mantener y vuelve al
 * soltar. Respeta "reducir movimiento". Para tarjetas y filas de lista tocables.
 */
export function PressableScale({ style, onPressIn, onPressOut, children, ...rest }: PressableScaleProps) {
  const reduced = useReducedMotion();
  const { motion } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value: number) {
    if (reduced) return;
    Animated.timing(scale, {
      toValue: value,
      duration: motion.durations.micro,
      easing: motion.easing.standard,
      useNativeDriver: true,
    }).start();
  }

  return (
    <AnimatedPressable
      onPressIn={(e: GestureResponderEvent) => {
        animateTo(motion.pressedScale);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        animateTo(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
}
