import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme, typography, type ColorTokens } from '@/theme';

/** Variantes tipográficas, derivadas de los tokens de `typography`. */
export type TextVariant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'caption'
  | 'overline'
  | 'button'
  | 'mono';

export type ThemedTextProps = TextProps & {
  /** Estilo tipográfico. Por defecto, texto de cuerpo. */
  variant?: TextVariant;
  /** Color del tema. Por defecto, el texto principal. */
  color?: keyof ColorTokens;
  /** Cifras tabulares: los números no "bailan" al cambiar en vivo (B8). */
  tabular?: boolean;
};

/** `Text` con tipografía y color tomados del tema (nunca hardcodeado). */
export function ThemedText({ style, variant = 'body', color = 'text', tabular = false, ...rest }: ThemedTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[variantStyles[variant], { color: colors[color] }, tabular && styles.tabular, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
});

// La tipografía no depende del modo claro/oscuro, así que se calcula una vez.
const variantStyles = StyleSheet.create<Record<TextVariant, TextStyle>>({
  display: {
    fontSize: typography.fontSize.display,
    lineHeight: typography.lineHeight.display,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  body: {
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.fontWeight.regular,
  },
  caption: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.fontWeight.medium,
  },
  // Etiqueta pequeña en mayúsculas para títulos de sección.
  overline: {
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  button: {
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.fontWeight.semibold,
  },
  mono: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.fontWeight.regular,
  },
});
