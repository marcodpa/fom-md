import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esMultiempresa, useAuth } from '@/auth';
import { AdminHeader } from '@/components/admin-header';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PressableScale } from '@/components/pressable-scale';
import { SearchBar, normalizar } from '@/components/search-bar';
import { SegmentedControl } from '@/components/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { TabIcon } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { getAreas, getFlotaVehiculos, getInspeccionVehiculo } from '@/services';
import { useAdmin } from '@/session';
import { useTheme, type ColorTokens } from '@/theme';
import type { Area, FleetVehicle, InspeccionEstado } from '@/types';
import { VIGENCIA_VISTA, vigenciaMock } from '@/utils/vigencia';

/**
 * Cómo se ve la inspección preoperacional de cada unidad en el panel. Refleja
 * automáticamente lo que hace (o no) el conductor.
 */
const INSPECCION_VISTA: Record<InspeccionEstado, { tone: keyof ColorTokens; label: string }> = {
  aprobada: { tone: 'success', label: 'Inspección OK' },
  aprobada_con_observaciones: { tone: 'warning', label: 'Con observaciones' },
  pendiente: { tone: 'textMuted', label: 'Inspección pendiente' },
  bloqueada: { tone: 'danger', label: 'Unidad bloqueada' },
};

type FlotaData = {
  flota: FleetVehicle[];
  areas: Area[];
  inspecciones: Record<string, InspeccionEstado>;
};

/**
 * FLOTA (Tablero 2 · Módulo 3): los vehículos de la empresa, con su estado en
 * vivo, su área, quién los conduce, sus documentos y su inspección. Filtro por
 * "requieren atención" (operación por excepciones). Carga/estado vía useAsyncData.
 */
export default function AdminFlotaScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const { empresaId } = useAdmin();
  const router = useRouter();

  const [filtro, setFiltro] = useState<'todos' | 'atencion'>('todos');
  const [q, setQ] = useState('');
  // Al cambiar de empresa (la pantalla se reutiliza), limpia la búsqueda vieja.
  useEffect(() => setQ(''), [empresaId]);

  // Flota + áreas + inspección de cada unidad (encadenado) en un solo fetcher.
  const { data, estado, recargar } = useAsyncData<FlotaData>(
    async () => {
      const [flota, areas] = await Promise.all([
        getFlotaVehiculos(empresaId ?? ''),
        getAreas(empresaId ?? ''),
      ]);
      const estados = await Promise.all(flota.map((v) => getInspeccionVehiculo(v.vehicle.id)));
      const inspecciones = Object.fromEntries(flota.map((v, i) => [v.vehicle.id, estados[i]]));
      return { flota, areas, inspecciones };
    },
    [empresaId],
    { onFocus: true },
  );
  const { flota, areas, inspecciones } = data ?? { flota: [], areas: [], inspecciones: {} };

  const requiereAtencion = useMemo(
    () => (f: FleetVehicle) => {
      const insp = inspecciones[f.vehicle.id];
      const inspMal = insp === 'bloqueada' || insp === 'pendiente' || insp === 'aprobada_con_observaciones';
      return vigenciaMock(f.vehicle.id) !== 'al_dia' || inspMal;
    },
    [inspecciones],
  );

  const porFiltro = useMemo(
    () => (filtro === 'atencion' ? flota.filter(requiereAtencion) : flota),
    [flota, filtro, requiereAtencion],
  );
  const lista = useMemo(() => {
    const nq = normalizar(q);
    if (!nq) return porFiltro;
    return porFiltro.filter((f) => {
      const area = areas.find((a) => a.id === f.vehicle.areaId)?.nombre ?? '';
      return normalizar(
        `${f.vehicle.alias ?? ''} ${f.vehicle.numero} ${f.vehicle.marca} ${f.vehicle.modelo} ${f.vehicle.placa} ${f.conductorActual ?? ''} ${area}`,
      ).includes(nq);
    });
  }, [porFiltro, q, areas]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AdminHeader seccion="Flota" />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar la flota." onRetry={recargar} />
        ) : !data ? (
          // Solo la PRIMERA carga: en los refetch por foco los datos previos
          // siguen visibles (sin flash de esqueletos al cambiar de pestaña).
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            <Skeleton height={44} radius={radii.md} />
            <Card style={{ gap: spacing.lg }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.row, { gap: spacing.md }]}>
                  <Skeleton width={44} height={44} radius={radii.md} />
                  <View style={styles.flex1}>
                    <Skeleton width="50%" height={16} />
                    <View style={{ height: spacing.xs }} />
                    <Skeleton width="70%" height={12} />
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            <SegmentedControl
              options={[
                { value: 'todos', label: `Todos (${flota.length})` },
                { value: 'atencion', label: 'Requieren atención' },
              ]}
              value={filtro}
              onChange={setFiltro}
            />

            {/* Estructura de la empresa (FOM-02 §3.1): las áreas las crea el supervisor. */}
            <PressableScale
              onPress={() => router.navigate({ pathname: '/areas', params: { companyId: empresaId ?? '' } })}
              accessibilityRole="button"
              accessibilityLabel="Gestionar áreas de la empresa">
              <Card style={[styles.row, { gap: spacing.md, paddingVertical: spacing.md }]}>
                <View style={[styles.unitIcon, { borderRadius: radii.md, backgroundColor: colors.surfaceSunken }]}>
                  <TabIcon name="flota" color={colors.primary} size={20} />
                </View>
                <View style={styles.flex1}>
                  <ThemedText variant="button">Áreas de la empresa</ThemedText>
                  <ThemedText variant="caption" color="textMuted">
                    Por ubicación, sector o contrato
                  </ThemedText>
                </View>
                <ThemedText variant="body" color="textMuted">
                  ›
                </ThemedText>
              </Card>
            </PressableScale>

            {/* Alta de vehículo: SOLO la administración FOM. Un administrador de
                ente no da de alta vehículos (solo asigna sus conductores). */}
            {user && esMultiempresa(user) ? (
              <PressableScale
                onPress={() => router.navigate({ pathname: '/crear-vehiculo', params: { companyId: empresaId ?? '' } })}
                accessibilityRole="button"
                accessibilityLabel="Crear un vehículo nuevo">
                <Card style={[styles.row, { gap: spacing.md, paddingVertical: spacing.md }]}>
                  <View style={[styles.unitIcon, { borderRadius: radii.md, backgroundColor: colors.surfaceSunken }]}>
                    <TabIcon name="ot" color={colors.primary} size={20} />
                  </View>
                  <View style={styles.flex1}>
                    <ThemedText variant="button">Nuevo vehículo</ThemedText>
                    <ThemedText variant="caption" color="textMuted">
                      Con su GPS y su conductor principal en el mismo alta
                    </ThemedText>
                  </View>
                  <ThemedText variant="body" color="textMuted">
                    ›
                  </ThemedText>
                </Card>
              </PressableScale>
            ) : null}

            {/* Buscador de unidades (por alias, número, marca, placa, conductor o área). */}
            {flota.length > 0 ? (
              <SearchBar value={q} onChangeText={setQ} placeholder="Buscar unidad, placa, conductor o área…" />
            ) : null}

            {lista.length === 0 ? (
              normalizar(q) ? (
                <EmptyState title="Sin resultados" description={`Ninguna unidad coincide con “${q}”.`} />
              ) : (
                <EmptyState
                  title={filtro === 'atencion' ? 'Todo al día' : 'Sin vehículos'}
                  description={
                    filtro === 'atencion'
                      ? 'Ninguna unidad requiere atención ahora mismo.'
                      : 'Aún no hay vehículos en esta empresa.'
                  }
                />
              )
            ) : (
              <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                {lista.map((f, i) => {
                  const area = areas.find((a) => a.id === f.vehicle.areaId)?.nombre ?? 'Sin área';
                  const docs = VIGENCIA_VISTA[vigenciaMock(f.vehicle.id)];
                  const insp = inspecciones[f.vehicle.id];
                  const inspVista = insp ? INSPECCION_VISTA[insp] : null;
                  const enMarcha = f.estado === 'en_marcha';
                  const estadoTone: keyof ColorTokens = enMarcha ? 'success' : 'textMuted';
                  return (
                    <PressableScale
                      key={f.vehicle.id}
                      onPress={() =>
                        router.navigate({
                          pathname: '/unidad',
                          params: { vehicleId: f.vehicle.id, companyId: empresaId ?? '' },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir unidad ${f.vehicle.alias ?? f.vehicle.numero}`}>
                      <View
                        style={[
                          styles.row,
                          {
                            gap: spacing.md,
                            paddingVertical: spacing.md,
                            borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                            borderTopColor: colors.border,
                          },
                        ]}>
                        {/* Ícono de unidad, tintado por estado (en marcha = verde). */}
                        <View style={[styles.unitIcon, { borderRadius: radii.md }]}>
                          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors[estadoTone], opacity: 0.14, borderRadius: radii.md }]} />
                          <TabIcon name="flota" color={colors[estadoTone]} size={22} />
                        </View>

                        <View style={styles.flex1}>
                          <View style={[styles.inline, { gap: spacing.sm }]}>
                            {/* El ALIAS interno de la empresa manda (§8-1); el número acompaña. */}
                            <ThemedText variant="subtitle">{f.vehicle.alias ?? f.vehicle.numero}</ThemedText>
                            <ThemedText variant="caption" color="textMuted">
                              {`${f.vehicle.numero} · ${f.vehicle.marca} ${f.vehicle.modelo}`}
                            </ThemedText>
                          </View>
                          <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
                            {`${area}${f.conductorActual ? ` · ${f.conductorActual}` : ' · Sin conductor'}`}
                          </ThemedText>
                          {inspVista ? (
                            <View style={[styles.inline, { gap: spacing.xs, marginTop: 2 }]}>
                              <View style={[styles.inspDot, { backgroundColor: colors[inspVista.tone] }]} />
                              <ThemedText variant="caption" color={inspVista.tone}>
                                {inspVista.label}
                              </ThemedText>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.end}>
                          <Chip tone={docs.tone as keyof ColorTokens} label={docs.label} />
                          <ThemedText variant="caption" color={enMarcha ? 'success' : 'textMuted'}>
                            {enMarcha ? `${f.velocidadKmh} km/h` : 'Parado'}
                          </ThemedText>
                        </View>
                      </View>
                    </PressableScale>
                  );
                })}
              </Card>
            )}

            <ThemedText variant="caption" color="textMuted">
              La inspección refleja en vivo lo que hace el conductor. El estado de documentos (SOAT,
              tecnomecánica…) es simulado por ahora; con el backend saldrá de las fechas reales.
            </ThemedText>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  end: { alignItems: 'flex-end', gap: 4 },
  unitIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  inspDot: { width: 6, height: 6, borderRadius: 3 },
  flex1: { flex: 1 },
});
