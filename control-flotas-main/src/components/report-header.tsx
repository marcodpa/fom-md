import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

type ReportHeaderProps = {
  /** Empresa(s) del reporte (opcional; en multi-empresa es el nombre de cada una). */
  empresaNombre?: string;
  /** Color de marca de la empresa (acento del encabezado). */
  empresaColor?: string;
  /** Alcance legible (ej. "Flota completa", "Grupo: Carga"). */
  alcance: string;
  /** Período cubierto (ej. "Junio 2026"). */
  periodo: string;
};

/**
 * Encabezado-resumen de un reporte: qué empresa(s), qué alcance y qué período.
 * Serio y ordenado, con el acento de la empresa a la izquierda.
 */
export function ReportHeader({ empresaNombre, empresaColor, alcance, periodo }: ReportHeaderProps) {
  const { colors, spacing, radii } = useTheme();
  const accent = empresaColor ?? colors.primary;

  return (
    <Card style={styles.card}>
      {/* Franja de color de la empresa. */}
      <View style={[styles.accent, { backgroundColor: accent, borderRadius: radii.pill }]} />
      <View style={[styles.body, { gap: spacing.xs, paddingLeft: spacing.md }]}>
        {empresaNombre ? <ThemedText variant="subtitle">{empresaNombre}</ThemedText> : null}
        <SummaryLine label="Alcance" value={alcance} />
        <SummaryLine label="Período" value={periodo} />
      </View>
    </Card>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.line, { gap: spacing.xs }]}>
      <ThemedText variant="caption" color="textMuted">
        {label}:
      </ThemedText>
      <ThemedText variant="caption" color="textSecondary" style={styles.flex1}>
        {value}
      </ThemedText>
    </View>
  );
}

/**
 * Espacio reservado para futuras gráficas del reporte. Deja el hueco pensado
 * (serio, no vacío feo) para cuando se agreguen visualizaciones.
 */
export function ChartsPlaceholder() {
  const { colors, spacing, radii } = useTheme();
  return (
    <View
      style={[
        styles.charts,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: spacing.lg,
        },
      ]}>
      <ThemedText variant="overline" color="textMuted">
        Gráficas
      </ThemedText>
      <ThemedText variant="caption" color="textMuted">
        Próximamente: tendencias del período y comparativas visuales.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'stretch' },
  accent: { width: 4 },
  body: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'baseline' },
  flex1: { flex: 1 },
  charts: {
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    gap: 4,
    minHeight: 96,
    justifyContent: 'center',
  },
});
