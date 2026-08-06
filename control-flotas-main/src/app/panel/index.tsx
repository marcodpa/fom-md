import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { AdminHeader } from '@/components/admin-header';
import { AnimatedNumber } from '@/components/animated-number';
import { Appear } from '@/components/appear';
import { Card } from '@/components/card';
import { MapaVehiculo } from '@/components/map-vehiculo';
import { PressableScale } from '@/components/pressable-scale';
import { PulseDot } from '@/components/pulse-dot';
import { TabIcon } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  evaluarReglas,
  getAreas,
  getFlotaVehiculos,
  getNotificacionesNoLeidas,
  getResumenFlota,
} from '@/services';
import { useAdmin } from '@/session';
import { useTheme } from '@/theme';
import type { Area, FleetSummary, FleetVehicle, MapMarker } from '@/types';

/**
 * RESUMEN del panel de admin: los indicadores clave de la flota y el mapa en
 * vivo (Centro de control, Tablero 2 · Módulo 1/2). "Operación por excepciones":
 * resalta OT abiertas y unidades paradas. Todo pasa por la capa de servicios.
 */
export default function AdminResumenScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const { empresaId } = useAdmin();
  const router = useRouter();

  const [resumen, setResumen] = useState<FleetSummary | null>(null);
  const [flota, setFlota] = useState<FleetVehicle[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [alertasNuevas, setAlertasNuevas] = useState(0);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!empresaId) return;
      let active = true;
      setCargando(true);
      // El motor de reglas (§3.4) corre antes del resumen: si una alerta se
      // cumplió, su ODT preventiva y su notificación ya aparecen en el tablero.
      evaluarReglas(empresaId)
        .then(() =>
          Promise.all([
            getResumenFlota(empresaId),
            getFlotaVehiculos(empresaId),
            getAreas(empresaId),
            getNotificacionesNoLeidas(empresaId),
          ]),
        )
        .then(([r, f, a, n]) => {
          if (!active) return;
          setResumen(r);
          setFlota(f);
          setAreas(a);
          setAlertasNuevas(n);
          setCargando(false);
        });
      return () => {
        active = false;
      };
    }, [empresaId]),
  );

  const markers = useMemo<MapMarker[]>(
    () =>
      flota.map((f) => ({
        id: f.vehicle.id,
        label: f.vehicle.numero,
        coords: f.coords,
        live: f.estado === 'en_marcha',
      })),
    [flota],
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  const sel = flota.find((f) => f.vehicle.id === seleccion);

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AdminHeader seccion="Resumen" />

        {cargando || !resumen ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            {/* Estado de la flota (con contexto: total + en marcha/parados) */}
            <Appear delay={40} style={{ gap: spacing.md }}>
              <Card style={{ gap: spacing.md }}>
                <View style={[styles.inline, { gap: spacing.md }]}>
                  <View style={[styles.kpiIcon, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md }]}>
                    <TabIcon name="flota" color={colors.primary} size={22} />
                  </View>
                  <View style={styles.flex1}>
                    <ThemedText variant="caption" color="textSecondary">
                      Flota
                    </ThemedText>
                    <View style={[styles.inline, { gap: 6 }]}>
                      <AnimatedNumber value={flota.length} variant="title" />
                      <ThemedText variant="caption" color="textMuted">
                        vehículos
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Barra en marcha / parados */}
                <View style={[styles.splitBar, { backgroundColor: colors.surfaceSunken, borderRadius: radii.pill }]}>
                  <View style={{ flex: Math.max(0.001, resumen.enMarcha), backgroundColor: colors.success }} />
                  <View style={{ flex: Math.max(0.001, resumen.parados), backgroundColor: colors.textMuted }} />
                </View>
                <View style={styles.legendRow}>
                  <Legend color={colors.success} value={resumen.enMarcha} label="en marcha" />
                  <Legend color={colors.textMuted} value={resumen.parados} label="parados" />
                </View>
              </Card>

              {/* OT abiertas: accionable (operación por excepciones) */}
              <PressableScale
                onPress={() => router.navigate('/panel/mantenimiento')}
                accessibilityRole="button"
                accessibilityLabel="Ver ODT">
                <Card style={[styles.inline, { gap: spacing.md }]}>
                  <View style={[styles.kpiIcon, { backgroundColor: colors.warningSurface, borderRadius: radii.md }]}>
                    <TabIcon name="ot" color={colors.warning} size={22} />
                  </View>
                  <View style={styles.flex1}>
                    <ThemedText variant="subtitle">ODT</ThemedText>
                    <ThemedText variant="caption" color="textMuted">
                      Abiertas · requieren atención
                    </ThemedText>
                  </View>
                  <View style={[styles.inline, { gap: 4 }]}>
                    <AnimatedNumber
                      value={resumen.reportesAbiertos}
                      variant="title"
                      color={resumen.reportesAbiertos > 0 ? 'warning' : 'text'}
                    />
                    <ThemedText variant="body" color="textMuted">
                      ›
                    </ThemedText>
                  </View>
                </Card>
              </PressableScale>

              {/* Alertas nuevas (§3.2): velocidad, mantenimiento y ODT nuevas. */}
              <PressableScale
                onPress={() => router.navigate({ pathname: '/notificaciones', params: { companyId: empresaId ?? '' } })}
                accessibilityRole="button"
                accessibilityLabel="Ver alertas y notificaciones">
                <Card style={[styles.inline, { gap: spacing.md }]}>
                  <View style={[styles.kpiIcon, { backgroundColor: colors.infoSurface, borderRadius: radii.md }]}>
                    <TabIcon name="alertas" color={colors.info} size={22} />
                  </View>
                  <View style={styles.flex1}>
                    <ThemedText variant="subtitle">Alertas nuevas</ThemedText>
                    <ThemedText variant="caption" color="textMuted">
                      Velocidad · mantenimiento · ODT nuevas
                    </ThemedText>
                  </View>
                  <View style={[styles.inline, { gap: 4 }]}>
                    <AnimatedNumber value={alertasNuevas} variant="title" color={alertasNuevas > 0 ? 'info' : 'text'} />
                    <ThemedText variant="body" color="textMuted">
                      ›
                    </ThemedText>
                  </View>
                </Card>
              </PressableScale>
            </Appear>

            {/* Mapa de la flota */}
            <Appear delay={120} style={{ gap: spacing.sm }}>
              <View style={styles.rowBetween}>
                <ThemedText variant="overline" color="textMuted">
                  Flota en el mapa
                </ThemedText>
                <View style={styles.inline}>
                  <PulseDot color={colors.success} active size={7} />
                  <ThemedText variant="caption" color="textMuted" style={styles.liveLabel}>
                    En vivo
                  </ThemedText>
                </View>
              </View>
              <MapaVehiculo markers={markers} onMarkerPress={setSeleccion} style={[styles.map, { borderRadius: radii.lg }]} />

              {sel ? (
                <Card style={{ gap: spacing.md }}>
                  <View style={styles.rowBetween}>
                    {/* Estado como chip con tinte de color. */}
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: sel.estado === 'en_marcha' ? colors.successSurface : colors.surfaceSunken, borderRadius: radii.pill },
                      ]}>
                      <PulseDot color={sel.estado === 'en_marcha' ? colors.success : colors.textMuted} active={sel.estado === 'en_marcha'} size={8} />
                      <ThemedText variant="caption" color={sel.estado === 'en_marcha' ? 'success' : 'textMuted'} style={styles.chipText}>
                        {sel.estado === 'en_marcha' ? 'En marcha' : 'Parado'}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => setSeleccion(null)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Cerrar detalle del vehículo">
                      <ThemedText variant="button" color="textMuted">
                        ✕
                      </ThemedText>
                    </Pressable>
                  </View>

                  {/* Identidad del vehículo (ícono + unidad + modelo/grupo). */}
                  <View style={[styles.inline, { gap: spacing.md }]}>
                    <View style={[styles.kpiIcon, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md }]}>
                      <TabIcon name="flota" color={colors.primary} size={22} />
                    </View>
                    <View style={styles.flex1}>
                      <ThemedText variant="subtitle">{sel.vehicle.numero}</ThemedText>
                      <ThemedText variant="caption" color="textMuted">
                        {`${sel.vehicle.marca} ${sel.vehicle.modelo} · ${areas.find((a) => a.id === sel.vehicle.areaId)?.nombre ?? 'Sin área'}`}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Conductor: fila con ícono de persona, tocable → su expediente. */}
                  {sel.conductorActual ? (
                    <PressableScale
                      onPress={() =>
                        router.navigate({
                          pathname: '/ver-perfil',
                          params: { userId: sel.conductorId ?? '', nombre: sel.conductorActual ?? '' },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Ver expediente de ${sel.conductorActual}`}>
                      <View style={styles.rowBetween}>
                        <View style={[styles.inline, { gap: spacing.sm }]}>
                          <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md }]}>
                            <TabIcon name="personal" color={colors.primary} size={18} />
                          </View>
                          <View>
                            <ThemedText variant="caption" color="textMuted">
                              {/* Conductor actual: principal o secundario (§3.2). */}
                              {sel.conductorId && sel.vehicle.conductorPrincipalId
                                ? sel.conductorId === sel.vehicle.conductorPrincipalId
                                  ? 'Conductor · principal'
                                  : 'Conductor · secundario (PIN)'
                                : 'Conductor'}
                            </ThemedText>
                            <ThemedText variant="body">{sel.conductorActual}</ThemedText>
                          </View>
                        </View>
                        <ThemedText variant="body" color="textMuted">
                          ›
                        </ThemedText>
                      </View>
                    </PressableScale>
                  ) : (
                    <View style={[styles.inline, { gap: spacing.sm }]}>
                      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md }]}>
                        <TabIcon name="personal" color={colors.textMuted} size={18} />
                      </View>
                      <ThemedText variant="caption" color="textMuted">
                        Sin conductor
                      </ThemedText>
                    </View>
                  )}
                </Card>
              ) : (
                <ThemedText variant="caption" color="textMuted">
                  Toca un vehículo en el mapa para ver su detalle.
                </ThemedText>
              )}
            </Appear>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/** Leyenda de la barra de flota: punto de color + valor + etiqueta. */
function Legend({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText variant="caption" color="textSecondary">
        {`${value} ${label}`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingBottom: 32 },
  map: { height: 300, borderWidth: 0 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center' },
  liveLabel: { marginLeft: 6 },
  kpiIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  rowIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
  splitBar: { flexDirection: 'row', height: 10, overflow: 'hidden' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontWeight: '600' },
});
