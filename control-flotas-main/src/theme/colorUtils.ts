/**
 * Utilidades de color pequeñas y sin dependencias.
 */

/** Convierte un hex (`#RGB` o `#RRGGBB`) a sus componentes 0-255. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let value = hex.replace('#', '').trim();

  // Expande la forma corta `#abc` -> `#aabbcc`.
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (value.length !== 6) return null;

  const num = Number.parseInt(value, 16);
  if (Number.isNaN(num)) return null;

  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

/** Convierte componentes 0-255 a `#RRGGBB`. */
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Oscurece un color hex una fracción `amount` (0–1). Sirve para el tono "un
 * poco más oscuro" al presionar botones (DISENO_DIRECCION §5), con cualquier
 * color de marca.
 */
export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = 1 - amount;
  return rgbToHex(rgb.r * f, rgb.g * f, rgb.b * f);
}

/**
 * Devuelve un color de texto legible (claro u oscuro) sobre el `background`
 * dado, usando luminancia percibida. Sirve para que cualquier color de marca
 * tenga siempre un texto encima con buen contraste.
 */
export function getContrastingTextColor(
  background: string,
  options: { dark?: string; light?: string } = {},
): string {
  const darkText = options.dark ?? '#0B0B0C';
  const lightText = options.light ?? '#FFFFFF';

  const rgb = hexToRgb(background);
  if (!rgb) return lightText; // fallback seguro si el formato no es hex

  // Luminancia percibida (coeficientes ITU-R BT.601), normalizada 0-1.
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? darkText : lightText;
}
