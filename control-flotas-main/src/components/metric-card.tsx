import { type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { useTheme, type ColorTokens } from '@/theme';

type MetricCardProps = {
  /** Etiqueta de la métrica (ej. "Combustible"). */
  label: string;
  /** Valor principal ya formateado (ej. "72%"). */
  value: string;
  /** Texto de apoyo opcional bajo el valor. */
  helper?: string;
  /** Color del tema para el valor (por defecto, texto principal). */
  valueColor?: keyof ColorTokens;
  style?: StyleProp<ViewStyle>;
};

/** Tarjeta de una métrica de telemetría (etiqueta + valor + apoyo). */
export function MetricCard({ label, value, helper, valueColor = 'text', style }: MetricCardProps) {
  const { spacing } = useTheme();
  return (
    <Card style={[{ gap: spacing.xs }, style]}>
      <ThemedText variant="caption" color="textSecondary">
        {label}
      </ThemedText>
      {/* Cifras tabulares: los números no cambian de ancho entre pantallas. */}
      <ThemedText variant="subtitle" color={valueColor} tabular>
        {value}
      </ThemedText>
      {helper ? (
        <ThemedText variant="caption" color="textMuted">
          {helper}
        </ThemedText>
      ) : null}
    </Card>
  );
}
