import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { MapaVehiculo } from '@/components/map-vehiculo';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { getEmpresasAsignadasA, getFlotaVehiculos } from '@/services';
import { useTheme } from '@/theme';
import type { FleetVehicle, MapMarker } from '@/types';

/**
 * FLOTA de la compañía — monitoreo, no operación: la compañía (ej. Chevron) no
 * tiene flota propia; aquí ve EN UN SOLO MAPA los vehículos de sus contratistas
 * asignadas, filtrando por empresa con tildes. Las flotas de TODAS las
 * asociadas se cargan de una vez (mismo fetcher), para que tildar/destildar sea
 * instantáneo: solo cambia qué marcadores se pintan, sin nueva carga.
 */
export default function CompaniaFlotaScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();

  // El slug de la compañía: el administrador lo lleva en companyId; el
  // supervisor de solo lectura, en sus predefinidas asignadas.
  const companyId = user?.companyId ?? '';

  // Tildes de contratistas. `null` significa "aún sin tocar" ⇒ TODAS tildadas:
  // así arrancamos con el mapa completo sin un efecto que sincronice el Set
  // cuando lleguen las empresas (que cargan async).
  const [tildes, setTildes] = useState<Set<string> | null>(null);

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const empresas = await getEmpresasAsignadasA([companyId]);
      // Todas las flotas EN PARALELO y de una vez: tildar no vuelve a cargar.
      const listas = await Promise.all(empresas.map((e) => getFlotaVehiculos(e.id)));
      const flotas = new Map<string, FleetVehicle[]>();
      empresas.forEach((e, i) => flotas.set(e.id, listas[i] ?? []));
      return { empresas, flotas };
    },
    [companyId],
    { onFocus: true },
  );

  // Selección efectiva: el Set tocado por el usuario, o todas si no ha tocado.
  const seleccion = useMemo(
    () => tildes ?? new Set((data?.empresas ?? []).map((e) => e.id)),
    [tildes, data],
  );

  // Marcadores del mapa: solo los vehículos de las contratistas TILDADAS.
  const markers = useMemo<MapMarker[]>(() => {
    if (!data) return [];
    const out: MapMarker[] = [];
    for (const e of data.empresas) {
      if (!seleccion.has(e.id)) continue;
      for (const f of data.flotas.get(e.id) ?? []) {
        out.push({
          id: f.vehicle.id,
          label: f.vehicle.alias ?? f.vehicle.numero,
          coords: f.coords,
          live: f.estado === 'en_marcha',
        });
      }
    }
    return out;
  }, [data, seleccion]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  const empresas = data?.empresas ?? [];
  const todasTildadas = empresas.length > 0 && empresas.every((e) => seleccion.has(e.id));

  function alternar(id: string) {
    const next = new Set(seleccion);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTildes(next);
  }

  function alternarTodas() {
    setTildes(todasTildadas ? new Set() : new Set(empresas.map((e) => e.id)));
  }

  /** Check visual de selección (mismo lenguaje que el option-picker). */
  function CheckTilde({ activa }: { activa: boolean }) {
    return (
      <View
        style={[
          styles.check,
          { borderColor: activa ? colors.primary : colors.borderStrong, borderRadius: radii.md },
        ]}>
        {activa ? (
          <ThemedText variant="caption" color="primary">
            ✓
          </ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <View style={styles.flex1}>
            <ThemedText variant="overline" color="textMuted">
              Monitoreo de empresas asociadas
            </ThemedText>
            <ThemedText variant="title">Flota</ThemedText>
          </View>
        </View>

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar las flotas de tus asociadas." onRetry={recargar} />
        ) : !data ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton height={260} radius={radii.lg} />
            <Skeleton height={56} radius={radii.lg} />
            <Skeleton height={56} radius={radii.lg} />
            <Skeleton height={56} radius={radii.lg} />
          </View>
        ) : empresas.length === 0 ? (
          <EmptyState
            title="Sin empresas asociadas"
            description="Cuando te asignen contratistas o personales, sus flotas aparecerán aquí en el mapa."
          />
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            {/* ── MAPA: todas las unidades de las contratistas tildadas. ── */}
            {markers.length > 0 ? (
              <MapaVehiculo markers={markers} style={{ height: 260 }} />
            ) : (
              <Card>
                <ThemedText variant="caption" color="textMuted">
                  Tilda una contratista para ver su flota en el mapa.
                </ThemedText>
              </Card>
            )}

            {/* ── CONTRATISTAS: qué flotas se pintan en el mapa. ── */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                {`Contratistas (${empresas.length})`}
              </ThemedText>

              {/* "Todas" de un toque: tilda o destilda el conjunto completo. */}
              <PressableScale
                onPress={alternarTodas}
                accessibilityRole="button"
                accessibilityLabel={todasTildadas ? 'Destildar todas las contratistas' : 'Tildar todas las contratistas'}
                style={[styles.row, { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
                <CheckTilde activa={todasTildadas} />
                <ThemedText variant="button" color={todasTildadas ? 'primary' : 'text'} style={styles.flex1}>
                  Todas
                </ThemedText>
                <ThemedText variant="caption" color="textMuted">
                  {`${markers.length} en el mapa`}
                </ThemedText>
              </PressableScale>

              {empresas.map((e) => {
                const activa = seleccion.has(e.id);
                const unidades = data.flotas.get(e.id)?.length ?? 0;
                return (
                  <PressableScale
                    key={e.id}
                    onPress={() => alternar(e.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${activa ? 'Quitar' : 'Mostrar'} la flota de ${e.name} en el mapa`}>
                    <Card
                      style={[
                        styles.row,
                        {
                          gap: spacing.md,
                          paddingVertical: spacing.md,
                          borderColor: activa ? colors.primary : colors.border,
                        },
                      ]}>
                      <CheckTilde activa={activa} />
                      <ThemedText variant="button" numberOfLines={1} style={styles.flex1}>
                        {e.name}
                      </ThemedText>
                      <ThemedText variant="caption" color="textMuted">
                        {unidades === 1 ? '1 vehículo' : `${unidades} vehículos`}
                      </ThemedText>
                    </Card>
                  </PressableScale>
                );
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  check: { width: 24, height: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
