import { StyleSheet, View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

type BarraSeleccionProps = {
  cantidad: number;
  onEliminar: () => void;
  onCancelar: () => void;
  ocupado?: boolean;
  /** Verbo de la acción (por defecto "Eliminar"). */
  etiqueta?: string;
};

/**
 * Barra inferior de acciones cuando hay filas tildadas: cuántas van, cancelar,
 * y ejecutar el borrado masivo. La usa cada lista con selección múltiple.
 */
export function BarraSeleccion({ cantidad, onEliminar, onCancelar, ocupado, etiqueta = 'Eliminar' }: BarraSeleccionProps) {
  const { colors, spacing, borderWidths } = useTheme();
  return (
    <View
      style={[
        styles.bar,
        {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.border,
          borderTopWidth: borderWidths.hairline,
        },
      ]}>
      <ThemedText variant="button" style={styles.flex1}>
        {`${cantidad} seleccionado${cantidad === 1 ? '' : 's'}`}
      </ThemedText>
      <PillButton label="Cancelar" onPress={onCancelar} />
      <PillButton
        label={ocupado ? 'Eliminando…' : `${etiqueta} (${cantidad})`}
        tone="danger"
        onPress={ocupado ? () => {} : onEliminar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
