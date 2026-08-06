import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

type CheckboxProps = {
  checked: boolean;
  onPress: () => void;
  size?: number;
  /** Etiqueta accesible (ej. "Seleccionar Unidad 07"). */
  label?: string;
};

/** Casilla de selección (tildar) para las listas con borrado masivo. */
export function Checkbox({ checked, onPress, size = 24, label }: CheckboxProps) {
  const { colors, radii } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}>
      <View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            borderRadius: radii.sm,
            borderColor: checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : 'transparent',
          },
        ]}>
        {checked ? (
          <ThemedText variant="caption" style={{ color: colors.onPrimary, fontWeight: '700' }}>
            ✓
          </ThemedText>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
