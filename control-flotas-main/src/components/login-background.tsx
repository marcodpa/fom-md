import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useReducedMotion, useTheme } from '@/theme';

/** Un "orbe" de luz difusa (glow) que deriva lentamente por el fondo. */
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
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const id = `orb-${cfg.left}-${cfg.top}`;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        { left: cfg.left, top: cfg.top, width: cfg.size, height: cfg.size, opacity: cfg.opacity, transform: [{ translateX }, { translateY }, { scale }] },
      ]}>
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
 * Fondo animado del login: un lavado de marca en degradado (SVG) con varios
 * "orbes" de luz que derivan suavemente. Todo sale del tema (funciona en claro y
 * oscuro) y es autocontenido (sin librerías de gradiente ni blur).
 */
export function LoginBackground() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const animate = !useReducedMotion();

  const orbs: OrbConfig[] = [
    { size: 340, left: -80, top: -60, color: colors.primary, opacity: 0.5, dx: 40, dy: 30, dur: 6000, delay: 0 },
    { size: 300, left: width - 200, top: height * 0.12, color: colors.primary, opacity: 0.35, dx: -34, dy: 40, dur: 7200, delay: 400 },
    { size: 260, left: width * 0.5 - 130, top: height * 0.62, color: colors.success, opacity: 0.28, dx: 26, dy: -30, dur: 8000, delay: 800 },
    { size: 200, left: -40, top: height * 0.55, color: colors.primary, opacity: 0.3, dx: 30, dy: -24, dur: 6800, delay: 1200 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Lavado vertical de marca (más intenso arriba). */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="wash" cx="50%" cy="0%" r="90%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.16} />
            <Stop offset="60%" stopColor={colors.primary} stopOpacity={0.04} />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#wash)" />
      </Svg>

      {orbs.map((cfg) => (
        <Orb key={`${cfg.left}-${cfg.top}`} cfg={cfg} animate={animate} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute' },
});
