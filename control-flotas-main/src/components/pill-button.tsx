import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

type Tone = 'default' | 'primary' | 'danger';

type PillButtonProps = {
  label: string;
  onPress: () => void;
  /** Color del texto: neutro, marca o peligro (ej. "Salir"). */
  tone?: Tone;
  /** Muestra un chevron "‹" al inicio (para "Volver"/"Atrás"). */
  back?: boolean;
};

/**
 * Botón-chip para acciones de encabezado (Volver, Salir, Panel…). En vez de solo
 * texto de color, es una píldora con superficie, borde sutil y feedback al tocar
 * (DISEÑO §5). Todo el color sale del tema.
 */
export function PillButton({ label, onPress, tone = 'default', back = false }: PillButtonProps) {
  const { colors, radii, borderWidths } = useTheme();
  const color = tone === 'danger' ? colors.danger : tone === 'primary' ? colors.primary : colors.text;

  return (
    <PressableScale onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            borderRadius: radii.pill,
            borderWidth: borderWidths.hairline,
          },
        ]}>
        {back ? (
          <ThemedText variant="button" style={[styles.chevron, { color }]}>
            ‹
          </ThemedText>
        ) : null}
        <ThemedText variant="button" style={{ color }}>
          {label}
        </ThemedText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chevron: { marginTop: -2, fontSize: 18 },
});
