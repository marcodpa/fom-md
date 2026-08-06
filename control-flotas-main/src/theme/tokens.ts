/**
 * Design tokens del sistema.
 *
 * Valores crudos y agnósticos de pantalla:
 *  - Escalas independientes del modo: `spacing`, `radii`, `typography`.
 *  - Paletas por esquema: `colorSchemes.light` / `colorSchemes.dark`.
 *
 * Las pantallas NUNCA usan estos valores directamente: consumen el tema ya
 * combinado (tokens + marca) mediante `useTheme()`.
 */

import { Easing, Platform, StyleSheet } from 'react-native';

import type {
  BorderWidths,
  ColorScheme,
  ColorTokens,
  MotionTokens,
  OpacityScale,
  RadiiScale,
  SpacingScale,
  ThemeShadows,
  Typography,
} from './types';

/**
 * Tokens de movimiento centralizados (DISENO_DIRECCION §7). Duraciones cortas
 * y discretas; un único punto de verdad para todas las microinteracciones.
 */
export const motion: MotionTokens = {
  // T4 · `micro` separa el feedback de presión de las transiciones.
  durations: { micro: 100, fast: 120, base: 220, slow: 360 },
  // T2 · curvas centralizadas (restraint: entradas decelerate).
  easing: {
    standard: Easing.out(Easing.cubic),
    emphasized: Easing.inOut(Easing.cubic),
  },
  // T3 · resorte único de interacción, baja oscilación.
  spring: { damping: 22, stiffness: 260, mass: 0.9 },
  pressedScale: 0.97,
};

/** Escala de espaciado. Base de 4px para alinear con rejillas comunes. */
export const spacing: SpacingScale = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

/** Escala de radios de borde. */
export const radii: RadiiScale = {
  none: 0,
  sm: 6,
  // T8 · inputs/botones a 12 (más actual; v1 §4 pedía 12–14).
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

/** T6 · Opacidades de estado (atenúan sin valores sueltos por pantalla). */
export const opacity: OpacityScale = {
  disabled: 0.5,
  pressedSurface: 0.08,
};

/** T7 · Anchos de borde centralizados (hairline, fino, realce de foco). */
export const borderWidths: BorderWidths = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  focus: 1.5,
};

/** Tokens tipográficos (tamaños, pesos, line-heights y familias). */
export const typography: Typography = {
  // Familias por plataforma. En web se apoyan en las variables CSS de global.css.
  fontFamily: Platform.select({
    ios: { sans: 'system-ui', mono: 'ui-monospace' },
    web: { sans: 'var(--font-display)', mono: 'var(--font-mono)' },
    default: { sans: 'normal', mono: 'monospace' },
  }) ?? { sans: 'normal', mono: 'monospace' },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    display: 40,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 40,
    display: 48,
  },
  // T1 · tracking: títulos ligeramente apretados, eyebrows en mayúsculas abiertos.
  letterSpacing: {
    tight: -0.4,
    normal: 0,
    wide: 0.8,
  },
};

/**
 * Paleta del esquema claro.
 *
 * `primary` aquí es solo un acento por defecto; la marca de la empresa
 * lo sobrescribe en `createTheme`.
 */
const light: ColorTokens = {
  // Neutros / superficie (T9): lienzo tenue → tarjeta blanca → flotante blanco
  // con sombra. Así el claro gana la tercera capa que ya tenía el oscuro.
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSunken: '#EEF1F4',
  // Texto
  text: '#111418',
  textSecondary: '#5A626E',
  textMuted: '#8A919E',
  textInverted: '#FFFFFF',
  // Bordes
  border: '#E2E5EA',
  borderStrong: '#C7CCD4',
  // Acento (lo re-pinta la marca)
  primary: '#208AEF',
  onPrimary: '#FFFFFF',
  // Semánticos
  success: '#1E9E5A',
  onSuccess: '#FFFFFF',
  successSurface: '#E6F6EC',
  warning: '#C98A00',
  onWarning: '#FFFFFF',
  warningSurface: '#FFF6DC',
  danger: '#E5484D',
  onDanger: '#FFFFFF',
  dangerSurface: '#FDEAEA',
  info: '#208AEF',
  onInfo: '#FFFFFF',
  infoSurface: '#E6F2FE',
};

/** Paleta del esquema oscuro. */
const dark: ColorTokens = {
  // Neutros / superficie (negros con leve tinte azul para dar profundidad)
  background: '#0A0D12',
  surface: '#141A22',
  surfaceElevated: '#1D2530',
  surfaceSunken: '#0F141B',
  // Texto
  text: '#F3F5F8',
  textSecondary: '#ABB3BF',
  textMuted: '#69727E',
  textInverted: '#0A0D12',
  // Bordes
  border: '#262E39',
  borderStrong: '#39424F',
  // Acento (lo re-pinta la marca)
  primary: '#3D9BF5',
  onPrimary: '#08121C',
  // Semánticos
  success: '#3DD68C',
  onSuccess: '#06210F',
  successSurface: '#13281D',
  warning: '#F5C242',
  onWarning: '#241B00',
  warningSurface: '#2A2410',
  danger: '#FF6369',
  onDanger: '#2A0A0B',
  dangerSurface: '#2A1416',
  info: '#3D9BF5',
  onInfo: '#08121C',
  infoSurface: '#10202E',
};

/** Paletas indexadas por esquema. */
export const colorSchemes: Record<ColorScheme, ColorTokens> = { light, dark };

/**
 * Sombras por esquema. Usa `boxShadow` (soportado cross-platform en RN 0.81+).
 * En oscuro las sombras son más marcadas para separar superficies.
 */
export function buildShadows(scheme: ColorScheme): ThemeShadows {
  const isDark = scheme === 'dark';
  return {
    card: {
      boxShadow: isDark ? '0px 2px 10px rgba(0, 0, 0, 0.40)' : '0px 2px 8px rgba(16, 24, 40, 0.06)',
    },
    // T5 · elementos flotantes (E3): más presencia que una tarjeta, menos que la hoja.
    floating: {
      boxShadow: isDark ? '0px 6px 18px rgba(0, 0, 0, 0.50)' : '0px 6px 16px rgba(16, 24, 40, 0.12)',
    },
    sheet: {
      boxShadow: isDark ? '0px -8px 24px rgba(0, 0, 0, 0.55)' : '0px -6px 20px rgba(16, 24, 40, 0.10)',
    },
  };
}
