import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme, type ColorTokens } from '@/theme';
import type { OdtEstado } from '@/types';

/** Etiqueta legible de cada estado de ODT (FOM-02 §3.3). */
export const ODT_ESTADO_LABEL: Record<OdtEstado, string> = {
  abierta: 'Abierta',
  en_revision: 'En revisión',
  cerrada: 'Cerrada',
};

/** Color semántico del tema para cada estado de ODT (FOM-02 §3.3). */
export function otStatusColor(estado: OdtEstado): keyof ColorTokens {
  if (estado === 'cerrada') return 'success';
  if (estado === 'en_revision') return 'warning';
  return 'info'; // abierta: recién llegada, aún sin gestionar.
}

/** Badge con el estado de una ODT, pintado con el color del tema. */
export function OTStatusBadge({ estado }: { estado: OdtEstado }) {
  const { colors, radii, spacing } = useTheme();
  const tone = otStatusColor(estado);
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors[`${tone}Surface` as keyof ColorTokens],
          borderRadius: radii.pill,
          paddingHorizontal: spacing.sm,
        },
      ]}>
      <ThemedText variant="overline" color={tone}>
        {ODT_ESTADO_LABEL[estado]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingVertical: 2, justifyContent: 'center', alignSelf: 'flex-start' },
});
