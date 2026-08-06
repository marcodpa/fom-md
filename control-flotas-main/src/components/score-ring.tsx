import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useReducedMotion, useTheme, type ColorTokens } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ScoreRingProps = {
  /** Valor 0–100. */
  value: number;
  /** Token de color del tema para el progreso (ej. success/warning/danger). */
  color: keyof ColorTokens;
  /** Diámetro del anillo en px. */
  size?: number;
  /** Grosor del trazo. */
  strokeWidth?: number;
};

/**
 * Anillo de progreso del score (estilo "driver score"). Dibuja una pista de
 * fondo y un arco de progreso proporcional al valor, con el número al centro.
 * El arco se LLENA con una animación suave al aparecer (DISENO_DIRECCION §5),
 * respetando "reducir movimiento".
 */
export function ScoreRing({ value, color, size = 132, strokeWidth = 12 }: ScoreRingProps) {
  const { colors, motion } = useTheme();
  const reduced = useReducedMotion();

  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Progreso animado 0 → valor (controla el dash del arco y el número al centro).
  const progress = useRef(new Animated.Value(reduced ? clamped : 0)).current;
  const [shown, setShown] = useState(reduced ? clamped : 0);

  useEffect(() => {
    if (reduced) {
      progress.setValue(clamped);
      setShown(clamped);
      return;
    }
    const id = progress.addListener(({ value }) => setShown(Math.round(value)));
    const anim = Animated.timing(progress, {
      toValue: clamped,
      duration: motion.durations.slow,
      useNativeDriver: false, // strokeDashoffset no es animable con native driver
    });
    anim.start();
    return () => {
      anim.stop();
      progress.removeListener(id);
    };
  }, [clamped, reduced, progress, motion.durations.slow]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Pista de fondo */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.surfaceSunken}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progreso (empieza arriba, gira en sentido horario) */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors[color]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Número al centro (cifras tabulares para que no "baile"). */}
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <ThemedText variant="title" color={color} tabular>
          {shown}
        </ThemedText>
        <ThemedText variant="caption" color="textMuted">
          / 100
        </ThemedText>
      </View>
    </View>
  );
}
