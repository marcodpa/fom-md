/**
 * Punto de entrada del sistema de temas.
 *
 * Todo lo que necesiten las pantallas se importa desde `@/theme`:
 *
 *   import { useTheme, useThemeController, ThemeProvider } from '@/theme';
 */

export { ThemeProvider, ThemeContext, type ThemeContextValue } from './ThemeProvider';
export { useTheme, useThemeController } from './useTheme';
export { useReducedMotion } from './useReducedMotion';
export { createTheme } from './createTheme';
export { getContrastingTextColor, darken } from './colorUtils';
export { DEFAULT_BRAND } from './brand';
export { borderWidths, colorSchemes, motion, opacity, radii, spacing, typography } from './tokens';
export type {
  BorderWidths,
  ColorScheme,
  ColorTokens,
  CompanyBrand,
  EasingCurve,
  LetterSpacingScale,
  MotionTokens,
  OpacityScale,
  RadiiScale,
  SpacingScale,
  Theme,
  ThemeMode,
  Typography,
} from './types';
