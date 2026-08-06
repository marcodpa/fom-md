import { StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
};

/**
 * BUSCADOR de listas: caja con lupa para filtrar en vivo (empresas, usuarios,
 * vehículos…). Todo el color sale del tema. El filtrado lo hace quien lo usa
 * (normalize + includes) para no acoplar el componente a un modelo de datos.
 */
export function SearchBar({ value, onChangeText, placeholder = 'Buscar…' }: Props) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md },
      ]}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Circle cx={11} cy={11} r={7} stroke={colors.textMuted} strokeWidth={2} />
        <Path d="m20 20-3.6-3.6" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={[styles.input, { color: colors.text }]}
      />
    </View>
  );
}

/** Normaliza para comparar sin acentos ni mayúsculas (búsqueda tolerante). */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, fontSize: 15, height: '100%' },
});
