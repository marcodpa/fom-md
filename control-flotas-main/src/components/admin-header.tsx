import { StyleSheet, View } from 'react-native';

import { Appear } from '@/components/appear';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

/** Iniciales para el logo placeholder de la empresa. */
function iniciales(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type AdminHeaderProps = {
  /** Nombre de la sección (tab) para el eyebrow. */
  seccion: string;
};

/**
 * Encabezado del panel de admin, común a todas las pestañas: logo + nombre de
 * la empresa (con su marca) y la sección actual. Sin acciones de navegación:
 * cerrar sesión y el cambio de contexto viven en la pestaña "Más".
 */
export function AdminHeader({ seccion }: AdminHeaderProps) {
  const { colors, spacing, radii, brand } = useTheme();

  return (
    <Appear distance={10}>
    <View style={[styles.bar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomColor: colors.border }]}>
      <View style={[styles.inline, styles.brandBlock, { gap: spacing.md }]}>
        <View style={[styles.brandMark, { backgroundColor: colors.primary, borderRadius: radii.md }]}>
          <ThemedText variant="subtitle" style={{ color: colors.onPrimary }}>
            {iniciales(brand.name)}
          </ThemedText>
        </View>
        <View style={styles.flex1}>
          <ThemedText variant="overline" color="textMuted" numberOfLines={1}>
            {seccion}
          </ThemedText>
          <ThemedText variant="subtitle" numberOfLines={1}>
            {brand.name}
          </ThemedText>
        </View>
      </View>
    </View>
    </Appear>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandMark: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center' },
  // La marca cede espacio (se trunca).
  brandBlock: { flex: 1, minWidth: 0 },
  flex1: { flex: 1, minWidth: 0 },
});
