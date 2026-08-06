/**
 * Tipos del sistema de temas.
 *
 * Se definen aquí, sin importar `tokens.ts`, para evitar dependencias
 * circulares: los tokens importan estos tipos, no al revés.
 */

import type { ImageSourcePropType, TextStyle, ViewStyle } from 'react-native';

/** Esquema de color resuelto que realmente se pinta en pantalla. */
export type ColorScheme = 'light' | 'dark';

/**
 * Preferencia de modo del usuario.
 * - `system`: sigue el modo claro/oscuro del dispositivo.
 * - `light` / `dark`: forzado manualmente.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Paleta de color de un esquema (claro u oscuro).
 *
 * Todo color que use una pantalla debe salir de aquí. Está agrupada en:
 * neutros/superficie, texto, bordes, acento de marca y semánticos.
 */
export interface ColorTokens {
  // --- Neutros / superficie ---
  /** Fondo base de la pantalla. */
  background: string;
  /** Superficie de tarjetas y bloques sobre el fondo. */
  surface: string;
  /** Superficie elevada (modales, menús, elementos destacados). */
  surfaceElevated: string;
  /**
   * Superficie HUNDIDA (T9): pistas, tiles de ícono, chips inactivos y todo
   * inset que vive DENTRO de una tarjeta. Da la tercera capa que al modo claro
   * le faltaba (tarjeta blanca sobre lienzo tenue, inset más hundido).
   */
  surfaceSunken: string;

  // --- Texto ---
  /** Texto principal. */
  text: string;
  /** Texto secundario (subtítulos, descripciones). */
  textSecondary: string;
  /** Texto tenue (placeholders, metadatos). */
  textMuted: string;
  /** Texto sobre fondos invertidos respecto al esquema actual. */
  textInverted: string;

  // --- Bordes ---
  /** Borde sutil por defecto. */
  border: string;
  /** Borde marcado (separadores fuertes, foco). */
  borderStrong: string;

  // --- Acento de marca ---
  /** Color de acento. Lo re-pinta la marca de la empresa activa. */
  primary: string;
  /** Texto/icono legible sobre `primary`. Se calcula por contraste. */
  onPrimary: string;

  // --- Semánticos (semáforo del conductor + alertas) ---
  /** Verde: estado bueno / éxito. */
  success: string;
  onSuccess: string;
  /** Fondo suave de éxito (chips, banners). */
  successSurface: string;

  /** Amarillo: advertencia / atención. */
  warning: string;
  onWarning: string;
  warningSurface: string;

  /** Rojo: peligro / falla / score malo. */
  danger: string;
  onDanger: string;
  dangerSurface: string;

  /** Azul: información neutra. */
  info: string;
  onInfo: string;
  infoSurface: string;
}

/** Escala de espaciado (margins, paddings, gaps) en píxeles. */
export interface SpacingScale {
  none: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

/** Escala de radios de borde en píxeles. */
export interface RadiiScale {
  none: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  /** Píldora / círculo. */
  pill: number;
}

/** Opacidades de estado (T6): atenúan sin inventar valores por pantalla. */
export interface OpacityScale {
  /** Elemento deshabilitado (texto debe seguir legible; ver DoD). */
  disabled: number;
  /** Velo sutil de superficie al presionar una fila/tarjeta. */
  pressedSurface: number;
}

/** Anchos de borde (T7): centraliza hairline, borde fino y realce de foco. */
export interface BorderWidths {
  /** Línea de un pixel físico (separadores por defecto). */
  hairline: number;
  /** Borde fino visible. */
  thin: number;
  /** Realce de foco en inputs. */
  focus: number;
}

/** Familias tipográficas por rol. */
export interface FontFamilies {
  sans: string;
  mono: string;
}

/** Tamaños de fuente en píxeles. */
export interface FontSizeScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  display: number;
}

/** Pesos de fuente (compatibles con `TextStyle['fontWeight']`). */
export interface FontWeightScale {
  regular: TextStyle['fontWeight'];
  medium: TextStyle['fontWeight'];
  semibold: TextStyle['fontWeight'];
  bold: TextStyle['fontWeight'];
}

/** Alturas de línea en píxeles, alineadas con `FontSizeScale`. */
export interface LineHeightScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  display: number;
}

/**
 * Tracking (espaciado entre letras) en píxeles (T1). Negativo aprieta los
 * títulos grandes; amplio abre los eyebrows en mayúsculas. DISENO_DIRECCION §3.
 */
export interface LetterSpacingScale {
  /** Títulos/hero: ligeramente negativo. */
  tight: number;
  /** Cuerpo/UI: neutro. */
  normal: number;
  /** Eyebrows/overline en mayúsculas: amplio. */
  wide: number;
}

/** Tokens tipográficos completos. */
export interface Typography {
  fontFamily: FontFamilies;
  fontSize: FontSizeScale;
  fontWeight: FontWeightScale;
  lineHeight: LineHeightScale;
  letterSpacing: LetterSpacingScale;
}

/** Sombras/elevación, dependientes del esquema (se ven distinto en claro/oscuro). */
export interface ThemeShadows {
  /** Sombra suave para tarjetas (nivel E1). */
  card: ViewStyle;
  /** Sombra de elementos flotantes: FAB, SOS, píldoras sobre mapa, popovers (E3, T5). */
  floating: ViewStyle;
  /** Sombra marcada para la hoja (sheet) que sube sobre el mapa (E4). */
  sheet: ViewStyle;
}

/** Curva de easing (compatible con `Animated.timing` y reanimated `withTiming`). */
export type EasingCurve = (value: number) => number;

/**
 * Tokens de movimiento (animación), centralizados para que toda la app use las
 * mismas duraciones, curvas y el mismo feedback al presionar. Ver
 * DISENO_DIRECCION §7 y DIRECCION_VISUAL_v2 §7 (restraint).
 */
export interface MotionTokens {
  /** Duraciones en milisegundos. */
  durations: {
    /** Micro-feedback al presionar (T4). */
    micro: number;
    /** Feedback inmediato / transición corta. */
    fast: number;
    /** Transición estándar (aparecer, llenar, deslizar). */
    base: number;
    /** Transición pausada (énfasis suave). */
    slow: number;
  };
  /** Curvas centralizadas (T2): entradas decelerate; énfasis in-out. */
  easing: {
    /** Decelerate (ease-out): el elemento llega y se asienta. */
    standard: EasingCurve;
    /** In-out para énfasis suave. */
    emphasized: EasingCurve;
  };
  /** Config única de resorte de interacción (T3), sin rebote excesivo. */
  spring: {
    damping: number;
    stiffness: number;
    mass: number;
  };
  /** Escala del elemento al presionar (≈0.97–0.98). */
  pressedScale: number;
}

/**
 * Marca de una empresa. Es el "overlay" que re-pinta el acento del tema
 * sin tocar las pantallas (pilar del proyecto).
 */
export interface CompanyBrand {
  /** Nombre visible de la empresa. */
  name: string;
  /** Color de acento; sustituye `primary` en el tema activo. */
  primaryColor: string;
  /** Logo de la empresa: asset local o URL remota. Opcional. */
  logo?: ImageSourcePropType | null;
}

/**
 * Tema activo que consumen las pantallas vía `useTheme()`.
 * Es: tokens base del esquema + overlay de la marca de la empresa.
 */
export interface Theme {
  /** Esquema resuelto que se está pintando. */
  colorScheme: ColorScheme;
  /** Colores ya combinados con la marca. */
  colors: ColorTokens;
  spacing: SpacingScale;
  radii: RadiiScale;
  typography: Typography;
  shadows: ThemeShadows;
  /** Tokens de movimiento (duraciones + curvas + resorte + feedback al presionar). */
  motion: MotionTokens;
  /** Opacidades de estado (T6). */
  opacity: OpacityScale;
  /** Anchos de borde (T7). */
  borderWidths: BorderWidths;
  /** Marca de la empresa que produjo el acento actual. */
  brand: CompanyBrand;
}
