/**
 * Hooks de acceso al tema.
 *
 * - `useTheme()`        -> tokens del tema activo (lo que usan las pantallas).
 * - `useThemeController()` -> controles de modo y marca (toggle, setBrand...).
 */

import { useContext } from 'react';

import { ThemeContext, type ThemeContextValue } from './ThemeProvider';
import type { Theme } from './types';

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>.');
  }
  return ctx;
}

/**
 * Devuelve el tema activo (colors, spacing, radii, typography, brand).
 * Es la vía por la que toda pantalla obtiene sus colores: nada hardcodeado.
 */
export function useTheme(): Theme {
  return useThemeContext().theme;
}

/**
 * Devuelve los controles del tema (modo claro/oscuro y marca de empresa).
 * Para componentes que cambian la apariencia, no solo la consumen.
 */
export function useThemeController(): ThemeContextValue {
  return useThemeContext();
}
