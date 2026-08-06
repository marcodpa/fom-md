import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PulseDot } from '@/components/pulse-dot';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';
import type { LatLng, MapMarker } from '@/types';

type MapaVehiculoProps = {
  vehicleName?: string;
  live?: boolean;
  /** Color del punto propio (modo single). */
  markerColor?: string;
  /** Posición del vehículo (modo single, §8-8). En web solo informa el placeholder. */
  vehicleCoords?: LatLng | null;
  /** Marcadores de flota (modo multi-vehículo). */
  markers?: MapMarker[];
  /** Toca un marcador (modo multi). */
  onMarkerPress?: (id: string) => void;
  /** Oculta las etiquetas flotantes (paridad con el nativo). */
  hideOverlays?: boolean;
  /** Modo SOLO USUARIO: sin vehículo, muestra tu ubicación (paridad con el nativo). */
  soloUsuario?: boolean;
  /** Estilo del contenedor (para alto, bordes, etc.). */
  style?: StyleProp<ViewStyle>;
};

/**
 * Respaldo web del mapa. `react-native-maps` no soporta web, así que aquí se
 * muestra un placeholder temático. El mapa real vive en `map-vehiculo.tsx`
 * (nativo) y Metro elige el archivo correcto por plataforma. En multi-vehículo
 * lista los marcadores como botones para poder probar la info en web.
 */
export function MapaVehiculo({
  vehicleName,
  live = false,
  markerColor,
  markers,
  onMarkerPress,
  style,
}: MapaVehiculoProps) {
  const { colors, radii, spacing } = useTheme();
  const esMulti = !!markers && markers.length > 0;
  const dotColor = markerColor ?? colors.primary;

  // ── Modo multi-vehículo: placeholder + lista tocable de la flota ───────────
  if (esMulti) {
    const enMarcha = markers!.filter((m) => m.live).length;
    return (
      <View
        style={[
          styles.container,
          styles.multi,
          { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
          style,
        ]}>
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }}>
          <ThemedText variant="caption" color="textMuted">
            {`Mapa de flota en la app móvil · ${markers!.length} vehículos · ${enMarcha} en marcha`}
          </ThemedText>
          {markers!.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => onMarkerPress?.(m.id)}
              style={[
                styles.markerRow,
                { borderColor: colors.border, borderRadius: radii.sm, padding: spacing.sm, gap: spacing.sm },
              ]}>
              <View
                style={[styles.rowDot, { backgroundColor: m.live ? colors.success : colors.textMuted }]}
              />
              <ThemedText variant="caption" color="text">
                {m.label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── Modo single ────────────────────────────────────────────────────────────
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
        style,
      ]}>
      <View style={styles.center}>
        <View style={[styles.pin, { borderColor: dotColor }]}>
          <View style={[styles.pinDot, { backgroundColor: dotColor }]} />
        </View>
        <ThemedText variant="caption" color="textMuted">
          Mapa disponible en la app móvil
        </ThemedText>
      </View>

      <View style={[styles.overlay, styles.topLeft]}>
        <View style={[styles.pill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <ThemedText variant="caption" color="text">
            {vehicleName}
          </ThemedText>
        </View>
      </View>
      <View style={[styles.overlay, styles.topRight]}>
        <View
          style={[
            styles.pill,
            styles.livePill,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border, gap: spacing.xs },
          ]}>
          <PulseDot color={live ? colors.success : colors.textMuted} active={live} />
          <ThemedText variant="overline" color={live ? 'success' : 'textMuted'}>
            {live ? 'EN VIVO' : 'SIN SEÑAL'}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // En multi la lista se alinea arriba, no centrada.
  multi: { justifyContent: 'flex-start', alignItems: 'stretch' },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  center: { alignItems: 'center', gap: 8 },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDot: { width: 10, height: 10, borderRadius: 5 },
  overlay: { position: 'absolute', top: 12 },
  topLeft: { left: 12 },
  topRight: { right: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  livePill: { alignItems: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
});
