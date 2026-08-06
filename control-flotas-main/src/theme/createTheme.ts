/**
 * Construcción del tema activo.
 *
 * Tema activo = tokens base del esquema  +  overlay de la marca de la empresa.
 * Así el acento se re-pinta por empresa sin tocar ninguna pantalla.
 */

import { getContrastingTextColor } from './colorUtils';
import { borderWidths, buildShadows, colorSchemes, motion, opacity, radii, spacing, typography } from './tokens';
import type { ColorScheme, CompanyBrand, Theme } from './types';

/**
 * Combina los tokens del esquema (claro/oscuro) con la marca de la empresa.
 *
 * Solo el acento depende de la marca: `primary` toma el color de la empresa y
 * `onPrimary` se recalcula por contraste para que el texto encima siga siendo
 * legible con cualquier color de marca.
 */
export function createTheme(scheme: ColorScheme, brand: CompanyBrand): Theme {
  const base = colorSchemes[scheme];

  return {
    colorScheme: scheme,
    colors: {
      ...base,
      primary: brand.primaryColor,
      onPrimary: getContrastingTextColor(brand.primaryColor),
    },
    spacing,
    radii,
    typography,
    shadows: buildShadows(scheme),
    motion,
    opacity,
    borderWidths,
    brand,
  };
}
