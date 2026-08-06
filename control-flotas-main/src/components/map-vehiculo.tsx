import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { PulseDot } from '@/components/pulse-dot';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';
import type { LatLng, MapMarker } from '@/types';

type MapaVehiculoProps = {
  /** Nombre del vehículo (modo single). Ignorado en modo multi-vehículo. */
  vehicleName?: string;
  /** En vivo (modo single). */
  live?: boolean;
  /**
   * Color del punto del vehículo (modo single). Ej: azul = entró sin chip;
   * verde = en marcha; gris = parado. Por defecto, el acento de la marca.
   */
  markerColor?: string;
  /**
   * Posición del VEHÍCULO (modo single) que reporta su GPS (mock hoy, API
   * mañana). Con ella el mapa muestra DOS puntos: el vehículo aquí y TU
   * ubicación con el punto del sistema (FOM-02 §8-8). Sin ella, se conserva la
   * simulación legada (el teléfono ES el vehículo).
   */
  vehicleCoords?: LatLng | null;
  /**
   * Marcadores de toda la flota (modo multi-vehículo). Si se pasan, el mapa
   * muestra todos los vehículos en sus coordenadas.
   */
  markers?: MapMarker[];
  /** Toca un marcador (modo multi): devuelve su id para mostrar su info. */
  onMarkerPress?: (id: string) => void;
  /** Oculta las etiquetas flotantes del mapa (nombre / EN VIVO) para no duplicar. */
  hideOverlays?: boolean;
  /**
   * Modo SOLO USUARIO: sin vehículo. Muestra el mapa con TU ubicación (punto
   * del sistema) aunque no estés en ninguna unidad (directriz: la persona ve
   * dónde está aun sin vehículo).
   */
  soloUsuario?: boolean;
  /** Estilo del contenedor (para alto, bordes, etc.). */
  style?: StyleProp<ViewStyle>;
};

type Coords = { latitude: number; longitude: number };
type Permiso = 'pendiente' | 'ok' | 'denegado';

/** Región que encuadra todos los marcadores con un margen. */
function regionDeMarcadores(markers: MapMarker[]): Region {
  const lats = markers.map((m) => m.coords.lat);
  const lngs = markers.map((m) => m.coords.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.02),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.02),
  };
}

/**
 * Mapa del vehículo (nativo). Dos modos:
 *  - single: el vehículo del conductor (con `vehicleCoords`, dos puntos:
 *    vehículo + tu ubicación; sin ellas, simulación legada teléfono=vehículo).
 *  - multi: si recibe `markers`, pinta toda la flota en sus coordenadas.
 *
 * REGLA DE MAPA (FOM-02 §8-8): en TODOS los modos se pide la ubicación del
 * usuario y se muestra su punto ("tú") además del vehículo/vehículos. Si el
 * permiso se niega, el mapa sigue funcionando y lo avisa con calma.
 *
 * Encapsula `react-native-maps` y `expo-location`: el GPS real se conecta
 * cambiando solo este archivo.
 */
export function MapaVehiculo({
  vehicleName,
  live = false,
  markerColor,
  vehicleCoords,
  markers,
  onMarkerPress,
  hideOverlays = false,
  soloUsuario = false,
  style,
}: MapaVehiculoProps) {
  const { colors, radii, spacing } = useTheme();
  const esMulti = !!markers && markers.length > 0;
  const conCoordsVehiculo = !!vehicleCoords;
  // Color del punto del vehículo: el indicado, o el acento de la marca.
  const dotColor = markerColor ?? colors.primary;
  const mapRef = useRef<MapView>(null);
  const [permiso, setPermiso] = useState<Permiso>('pendiente');
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let active = true;
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      // §8-8: SIEMPRE se pide la ubicación del usuario (todos los modos).
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!active) return;
      if (status !== 'granted') {
        setPermiso('denegado');
        return;
      }
      setPermiso('ok');

      // Solo la simulación legada (teléfono = vehículo) sigue la posición para
      // mover el marcador; con GPS real o en multi, el punto "tú" lo pinta el
      // sistema con `showsUserLocation`.
      if (esMulti || conCoordsVehiculo) return;

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!active) return;
      setCoords({ latitude: current.coords.latitude, longitude: current.coords.longitude });

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
        (loc) => {
          const next = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setCoords(next);
          mapRef.current?.animateCamera({ center: next }, { duration: 500 });
        },
      );
    })();

    return () => {
      active = false;
      sub?.remove();
    };
  }, [esMulti, conCoordsVehiculo]);

  /** Aviso discreto cuando no podemos mostrar "tu ubicación" (permiso negado). */
  const avisoSinPermiso =
    permiso === 'denegado' ? (
      <View style={[styles.overlay, styles.bottomLeft]}>
        <View style={[styles.pill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <ThemedText variant="caption" color="textMuted">
            Activa la ubicación para verte en el mapa
          </ThemedText>
        </View>
      </View>
    ) : null;

  // ── Modo multi-vehículo: toda la flota + tu ubicación ──────────────────────
  if (esMulti) {
    const enMarcha = markers!.filter((m) => m.live).length;
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
          style,
        ]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={regionDeMarcadores(markers!)}
          showsUserLocation={permiso === 'ok'}
          showsMyLocationButton={false}
          toolbarEnabled={false}>
          {markers!.map((m) => (
            <Marker
              key={m.id}
              coordinate={{ latitude: m.coords.lat, longitude: m.coords.lng }}
              title={m.label}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => onMarkerPress?.(m.id)}>
              <View style={styles.markerWrap}>
                <View
                  style={[
                    styles.markerRing,
                    { borderColor: m.live ? colors.success : colors.textMuted },
                  ]}
                />
                <View
                  style={[
                    styles.markerDot,
                    {
                      backgroundColor: m.live ? colors.success : colors.textMuted,
                      borderColor: colors.background,
                    },
                  ]}
                />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Overlay: resumen de la flota en el mapa */}
        <View style={[styles.overlay, styles.topLeft]}>
          <View
            style={[styles.pill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <ThemedText variant="caption" color="text">
              {`${markers!.length} vehículos · ${enMarcha} en marcha`}
            </ThemedText>
          </View>
        </View>
        {avisoSinPermiso}
      </View>
    );
  }

  // ── Modo single: el vehículo del conductor + tu ubicación ──────────────────
  const vehiclePoint: Coords | null = vehicleCoords
    ? { latitude: vehicleCoords.lat, longitude: vehicleCoords.lng }
    : coords;
  const region: Region | undefined = vehiclePoint
    ? { ...vehiclePoint, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : undefined;
  const mapaListo = !!vehiclePoint;
  const sinNada = permiso === 'denegado' && !vehicleCoords;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
        style,
      ]}>
      {mapaListo ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          // Mapa detallado nativo: Apple Maps en iOS, Google Maps en Android.
          showsUserLocation={permiso === 'ok'}
          showsMyLocationButton={false}
          showsCompass
          showsPointsOfInterest
          toolbarEnabled={false}>
          {/* En modo solo-usuario no hay vehículo: el único punto eres tú. */}
          {soloUsuario ? null : (
            <Marker coordinate={vehiclePoint!} title={vehicleName} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.markerWrap}>
                <View style={[styles.markerRing, { borderColor: dotColor }]} />
                <View
                  style={[styles.markerDot, { backgroundColor: dotColor, borderColor: colors.background }]}
                />
              </View>
            </Marker>
          )}
        </MapView>
      ) : (
        <View style={styles.center}>
          {sinNada ? (
            <ThemedText
              variant="caption"
              color="textMuted"
              style={[styles.permText, { paddingHorizontal: spacing.lg }]}>
              Activa la ubicación para ver el vehículo en el mapa
            </ThemedText>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
      )}

      {/* Overlay: nombre del vehículo */}
      {!hideOverlays ? (
        <View style={[styles.overlay, styles.topLeft]}>
          <View
            style={[styles.pill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <ThemedText variant="caption" color="text">
              {vehicleName}
            </ThemedText>
          </View>
        </View>
      ) : null}

      {/* Overlay: en vivo */}
      {!hideOverlays ? (
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
      ) : null}
      {mapaListo ? avisoSinPermiso : null}
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
  center: { alignItems: 'center', justifyContent: 'center' },
  permText: { textAlign: 'center' },
  // Marcador del vehículo (punto con anillo).
  markerWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  markerRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    opacity: 0.35,
  },
  markerDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
  overlay: { position: 'absolute', top: 12 },
  topLeft: { left: 12 },
  topRight: { right: 12 },
  bottomLeft: { top: undefined, bottom: 12, left: 12 },
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
