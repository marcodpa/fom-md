import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';

import { useSync } from './use-sync';

/**
 * Indicador global de sincronización de FOM-DRIVER. Flota sobre las pestañas y
 * solo aparece cuando hace falta: sin conexión, sincronizando o con cambios
 * pendientes. Al tocarlo abre la pantalla de Sincronización. Cuando todo está al
 * día y hay conexión, no muestra nada.
 */
export function SyncBanner() {
  const { colors, spacing, radii, shadows } = useTheme();
  const router = useRouter();
  const { online, sincronizando, pendientes } = useSync();

  const nPend = pendientes.length;

  // Todo en orden: no estorbar.
  if (online && !sincronizando && nPend === 0) return null;

  // Color + texto según el estado.
  let color = colors.info;
  let texto = 'Sincronizando…';
  if (!online) {
    color = colors.warning;
    texto = nPend > 0 ? `Sin conexión · ${nPend} sin enviar` : 'Sin conexión';
  } else if (sincronizando) {
    color = colors.info;
    texto = 'Sincronizando…';
  } else {
    color = colors.info;
    texto = `${nPend} por sincronizar`;
  }

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <PressableScale onPress={() => router.navigate('/sincronizacion')}>
        <View
          style={[
            styles.pill,
            shadows.card,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: color,
              borderRadius: radii.pill,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              gap: spacing.sm,
            },
          ]}>
          {online && sincronizando ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <View style={[styles.dot, { backgroundColor: color }]} />
          )}
          <ThemedText variant="caption" style={{ color: colors.text }}>
            {texto}
          </ThemedText>
        </View>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 72, // sobre la barra de pestañas
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
