import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { getContrastingTextColor, useTheme } from '@/theme';

/** Empresa para el selector de chips (id + nombre + color de marca). */
export type ChipEmpresa = { id: string; name: string; color: string };

type EmpresaChipsProps = {
  label?: string;
  empresas: ChipEmpresa[];
  selectedIds: string[];
  /** Alterna una empresa (tilda/destilda). */
  onToggle: (id: string) => void;
};

/**
 * Selector de empresas como chips que se tildan/destildan. La chip tildada se
 * resalta con EL COLOR de su empresa (brief §8); la no tildada queda neutra.
 * Reutilizado por el comparador y el generador de reportes multi-empresa.
 */
export function EmpresaChips({ label, empresas, selectedIds, onToggle }: EmpresaChipsProps) {
  const { colors, radii, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <ThemedText variant="overline" color="textMuted">
          {label}
        </ThemedText>
      ) : null}
      <View style={[styles.wrap, { gap: spacing.sm }]}>
        {empresas.map((e) => {
          const activa = selectedIds.includes(e.id);
          const textoColor = activa ? getContrastingTextColor(e.color) : colors.text;
          return (
            <PressableScale
              key={e.id}
              onPress={() => onToggle(e.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: activa }}
              style={[
                styles.chip,
                {
                  backgroundColor: activa ? e.color : colors.surface,
                  borderColor: activa ? e.color : colors.border,
                  borderRadius: radii.pill,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  gap: spacing.xs,
                },
              ]}>
              {/* Punto con el color de la empresa cuando no está tildada. */}
              {!activa ? <View style={[styles.dot, { backgroundColor: e.color }]} /> : null}
              <ThemedText variant="button" style={{ color: textoColor }}>
                {activa ? `✓ ${e.name}` : e.name}
              </ThemedText>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
