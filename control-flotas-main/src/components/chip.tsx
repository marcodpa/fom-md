import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme, type ColorTokens } from '@/theme';

type ChipProps = {
  /** Color semántico del tema (success/warning/danger/info/primary/textMuted…). */
  tone: keyof ColorTokens;
  label: string;
};

/**
 * Píldora de estado con TINTE del color (fondo del color al ~14% + texto en el
 * color pleno). Sirve para cualquier tono sin necesitar un token de superficie
 * dedicado. Lenguaje de estado consistente en toda la app (documentos, planes,
 * severidades, vigencias…). Todo del tema.
 */
export function Chip({ tone, label }: ChipProps) {
  const { colors, radii } = useTheme();
  return (
    <View style={[styles.chip, { borderRadius: radii.pill }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors[tone], opacity: 0.14, borderRadius: radii.pill }]} />
      <ThemedText variant="overline" color={tone}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden', alignSelf: 'flex-start' },
});
