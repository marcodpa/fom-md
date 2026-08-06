import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

type ErrorStateProps = {
  /** Título breve y humano. */
  title?: string;
  /** Qué pasó y qué puede hacer el usuario. */
  description?: string;
  /** Si se pasa, muestra el botón "Reintentar". */
  onRetry?: () => void;
};

/** Triángulo de alerta (mismo lenguaje que "reportar falla"). */
function WarningGlyph({ color }: { color: string }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.6 L21.5 20 H2.5 Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M12 9.5 V14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 17.2 h0.01" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Estado de ERROR de una carga (lo alimenta `useAsyncData`). Mensaje claro y
 * humano + acción de reintento — nunca una pantalla en blanco ni un loader
 * infinito (auditoría A2, DIRECCION_VISUAL_v2 §8). Todo sale del tema.
 */
export function ErrorState({
  title = 'No pudimos cargar esto',
  description = 'Revisa tu conexión e inténtalo de nuevo.',
  onRetry,
}: ErrorStateProps) {
  const { colors, spacing } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.wrap, { padding: spacing.xl, gap: spacing.md }]}>
      <View style={[styles.icon, { backgroundColor: colors.dangerSurface }]}>
        <WarningGlyph color={colors.danger} />
      </View>
      <View style={[styles.text, { gap: spacing.xs }]}>
        <ThemedText variant="subtitle" style={styles.center}>
          {title}
        </ThemedText>
        <ThemedText variant="body" color="textSecondary" style={styles.center}>
          {description}
        </ThemedText>
      </View>
      {onRetry ? (
        <View style={styles.action}>
          <Button label="Reintentar" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  text: { alignItems: 'center', maxWidth: 320 },
  center: { textAlign: 'center' },
  action: { alignSelf: 'stretch', maxWidth: 260, width: '100%' },
});
