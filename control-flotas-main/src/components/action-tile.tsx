import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme, type ColorTokens } from '@/theme';

type ActionTileProps = {
  /** Ícono guía (familia propia de la app). */
  icon: TabIconName;
  label: string;
  onPress: () => void;
  /** Tono del ícono (por defecto el acento de la marca). */
  tone?: keyof ColorTokens;
  style?: StyleProp<ViewStyle>;
};

/**
 * ACCIÓN CON ÍCONO: tarjeta compacta ícono-primero (círculo con tinte del tono
 * al ~14% + etiqueta), para grillas de acciones rápidas (hub del Admin, atajos
 * del panel). Sustituye a los botones rectangulares de solo texto: se reconoce
 * de un vistazo (preferencia: íconos sobre texto) y presiona con la escala del
 * tema. Todo del tema.
 */
export function ActionTile({ icon, label, onPress, tone = 'primary', style }: ActionTileProps) {
  const { colors, radii, spacing, borderWidths, shadows } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.tile,
        shadows.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: borderWidths.hairline,
          borderRadius: radii.lg,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm,
          gap: spacing.sm,
        },
        style,
      ]}>
      <View style={[styles.iconWrap, { borderRadius: radii.pill }]}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors[tone], opacity: 0.14, borderRadius: radii.pill },
          ]}
        />
        <TabIcon name={icon} color={colors[tone]} size={22} />
      </View>
      <ThemedText variant="caption" numberOfLines={1} style={styles.label}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', minHeight: 88 },
  iconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  label: { textAlign: 'center' },
});
