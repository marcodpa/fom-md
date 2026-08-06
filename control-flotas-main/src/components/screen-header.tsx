import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

type ScreenHeaderProps = {
  /** Título de la pantalla. */
  title?: string;
  /** Acción(es) a la derecha (opcional). */
  right?: ReactNode;
  /** Muestra el botón "volver" a la izquierda (por defecto sí, si hay a dónde volver). */
  showBack?: boolean;
};

/**
 * Encabezado ESTÁNDAR de las pantallas de pila (fuera del panel de admin, que
 * tiene su `AdminHeader`). Lleva un botón "Volver" arriba a la izquierda que
 * regresa a la vista anterior — el gesto de deslizar está desactivado en la
 * pila, así que este botón es el único regreso. Todo sale del tema.
 */
export function ScreenHeader({ title, right, showBack = true }: ScreenHeaderProps) {
  const { spacing, colors, radii, borderWidths } = useTheme();
  const router = useRouter();
  const puedeVolver = showBack && router.canGoBack();

  return (
    <View
      style={[
        styles.bar,
        {
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderBottomColor: colors.border,
          borderBottomWidth: borderWidths.hairline,
        },
      ]}>
      {puedeVolver ? (
        <PressableScale
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={[
            styles.backBtn,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radii.pill },
          ]}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </PressableScale>
      ) : null}

      {title ? (
        <ThemedText variant="subtitle" numberOfLines={1} style={styles.title}>
          {title}
        </ThemedText>
      ) : (
        <View style={styles.title} />
      )}

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, flexShrink: 0 },
  // El título ocupa el espacio libre (alineado a la izquierda) y se trunca en
  // una línea: nunca se monta sobre la acción derecha.
  title: { flex: 1, minWidth: 0 },
  right: { flexShrink: 0 },
});
