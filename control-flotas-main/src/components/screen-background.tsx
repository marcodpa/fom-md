import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useReducedMotion, useTheme } from '@/theme';

type OrbConfig = {
  size: number;
  left: number;
  top: number;
  color: string;
  opacity: number;
  dx: number;
  dy: number;
  dur: number;
  delay: number;
};

/** Orbe de luz difusa que deriva muy lento (adorno de fondo, no distrae). */
function Orb({ cfg, animate }: { cfg: OrbConfig; animate: boolean }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: cfg.dur, delay: cfg.delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: cfg.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [t, cfg.dur, cfg.delay, animate]);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.dx] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.dy] });
  const id = `sb-${cfg.left}-${cfg.top}`;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.orb, { left: cfg.left, top: cfg.top, width: cfg.size, height: cfg.size, opacity: cfg.opacity, transform: [{ translateX }, { translateY }] }]}>
      <Svg width={cfg.size} height={cfg.size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={cfg.color} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={cfg.size / 2} cy={cfg.size / 2} r={cfg.size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Fondo ambiental sutil para las pantallas de la app: un lavado de marca suave
 * (SVG) con un par de orbes que derivan lento. Es la versión calmada del fondo
 * del login, para dar el mismo aire fresco sin restar legibilidad a las
 * tarjetas. Sale del tema (claro/oscuro) y no captura toques.
 */
export function ScreenBackground() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();

  const orbs: OrbConfig[] = [
    { size: 300, left: width - 190, top: -70, color: colors.primary, opacity: 0.14, dx: -26, dy: 30, dur: 9000, delay: 0 },
    { size: 240, left: -90, top: height * 0.28, color: colors.primary, opacity: 0.1, dx: 24, dy: -22, dur: 10500, delay: 600 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="sb-wash" cx="50%" cy="0%" r="80%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.08} />
            <Stop offset="55%" stopColor={colors.primary} stopOpacity={0.02} />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#sb-wash)" />
      </Svg>
      {orbs.map((cfg) => (
        <Orb key={`${cfg.left}-${cfg.top}`} cfg={cfg} animate={!reduced} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute' },
});
