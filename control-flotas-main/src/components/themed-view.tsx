import { View, type ViewProps } from 'react-native';

import { ScreenBackground } from '@/components/screen-background';
import { useTheme, type ColorTokens } from '@/theme';

/** Tokens de fondo válidos para una superficie. */
type SurfaceToken = Extract<keyof ColorTokens, 'background' | 'surface' | 'surfaceElevated'>;

export type ThemedViewProps = ViewProps & {
  /** Token de fondo del tema. Por defecto, el fondo base de la pantalla. */
  background?: SurfaceToken;
  /**
   * Añade el fondo ambiental fresco (lavado de marca + orbes) detrás del
   * contenido. Para las pantallas raíz que quieren el "toque del login".
   */
  ambient?: boolean;
};

/** `View` con el color de fondo tomado del tema (nunca hardcodeado). */
export function ThemedView({ style, background = 'background', ambient = false, children, ...rest }: ThemedViewProps) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors[background] }, style]} {...rest}>
      {ambient ? <ScreenBackground /> : null}
      {children}
    </View>
  );
}
