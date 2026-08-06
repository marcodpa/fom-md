import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esMultiempresa, useAuth } from '@/auth';
import { AnimatedNumber } from '@/components/animated-number';
import { Card } from '@/components/card';
import { ErrorState } from '@/components/error-state';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  getCostosPorEmpresa,
  getResumenCostos,
  rangoPreset,
  type CostoEmpresa,
  type RangoPreset,
  type ResumenCostos,
} from '@/services';
import { useAdmin } from '@/session';
import { useTheme } from '@/theme';

/** Formatea un monto USD como "$1.234". */
function usd(n: number): string {
  return `$${Math.round(n).toLocaleString('es')}`;
}

const PRESETS: { value: RangoPreset; label: string }[] = [
  { value: 'mes', label: 'Este mes' },
  { value: 'd30', label: '30 días' },
  { value: 'd90', label: '90 días' },
  { value: 'anio', label: 'Año' },
];

type CostData = { resumen: ResumenCostos; porEmpresa: CostoEmpresa[] };

/**
 * COSTOS Y GASTOS (Módulo 14): gasto de la empresa en un rango de fechas,
 * desglosado por PRODUCTO/SERVICIO y por categoría, los vehículos que más gastan
 * y —si administra varias— la comparación entre empresas. El correctivo sale de
 * las OT cerradas. Carga/estado vía useAsyncData (refetch al cambiar el rango).
 */
export default function CostosScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const { empresaId } = useAdmin();
  const params = useLocalSearchParams<{ companyId?: string }>();
  const companyId = params.companyId || empresaId || '';

  const [preset, setPreset] = useState<RangoPreset>('mes');
  const rango = useMemo(() => rangoPreset(preset), [preset]);
  const multi = !!user && esMultiempresa(user);

  const { data, estado, recargar } = useAsyncData<CostData>(
    async () => {
      const [resumen, porEmpresa] = await Promise.all([
        getResumenCostos(companyId, rango),
        multi ? getCostosPorEmpresa(rango) : Promise.resolve<CostoEmpresa[]>([]),
      ]);
      return { resumen, porEmpresa };
    },
    [companyId, rango, multi],
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  const resumen = data?.resumen;
  const porEmpresa = data?.porEmpresa ?? [];
  const maxEmpresa = Math.max(1, ...porEmpresa.map((e) => e.total));

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Costos y gastos" />

        <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
          <SegmentedControl options={PRESETS} value={preset} onChange={setPreset} />
          <ThemedText variant="caption" color="textMuted">
            {rango.label}
          </ThemedText>

          {estado === 'error' ? (
            <ErrorState description="No pudimos cargar los costos." onRetry={recargar} />
          ) : !resumen ? (
            <View style={{ gap: spacing.lg }}>
              <Card style={{ gap: spacing.sm }}>
                <Skeleton width="45%" height={12} />
                <Skeleton width="55%" height={36} />
                <Skeleton height={12} />
              </Card>
              <Card style={{ gap: spacing.md }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height={14} />
                ))}
              </Card>
            </View>
          ) : (
            <>
              {/* Total del período (cuenta con "$") */}
              <Card style={{ gap: spacing.xs }}>
                <ThemedText variant="overline" color="textMuted">
                  Gasto total del período
                </ThemedText>
                <AnimatedNumber value={resumen.total} format={usd} />
                <ThemedText variant="caption" color="textMuted">
                  {`${resumen.nItems} registros`}
                </ThemedText>
                {/* Barra producto vs servicio */}
                <View style={[styles.splitBar, { borderRadius: radii.pill, backgroundColor: colors.surfaceSunken }]}>
                  <View style={{ flex: Math.max(0.001, resumen.porClase.producto), backgroundColor: colors.primary }} />
                  <View style={{ flex: Math.max(0.001, resumen.porClase.servicio), backgroundColor: colors.warning }} />
                </View>
                <View style={styles.legendRow}>
                  <Leyenda color={colors.primary} label="Productos" valor={usd(resumen.porClase.producto)} />
                  <Leyenda color={colors.warning} label="Servicios" valor={usd(resumen.porClase.servicio)} />
                </View>
              </Card>

              {/* Desglose por categoría (producto/servicio) */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  Por producto / servicio
                </ThemedText>
                {resumen.porCategoria.length === 0 ? (
                  <Card>
                    <ThemedText variant="body" color="textMuted">
                      Sin gastos registrados en este período.
                    </ThemedText>
                  </Card>
                ) : (
                  <Card style={{ gap: spacing.md }}>
                    {resumen.porCategoria.map((c) => (
                      <View key={c.categoria.id} style={{ gap: 6 }}>
                        <View style={styles.rowBetween}>
                          <View style={[styles.inline, { gap: spacing.xs }]}>
                            <View
                              style={[
                                styles.classDot,
                                { backgroundColor: c.categoria.clase === 'producto' ? colors.primary : colors.warning },
                              ]}
                            />
                            <ThemedText variant="body">{c.categoria.label}</ThemedText>
                          </View>
                          <ThemedText variant="button">{usd(c.total)}</ThemedText>
                        </View>
                        <View style={[styles.track, { backgroundColor: colors.surfaceSunken, borderRadius: radii.pill }]}>
                          <View
                            style={[
                              styles.fill,
                              {
                                width: `${Math.max(2, c.porcentaje)}%`,
                                backgroundColor: c.categoria.clase === 'producto' ? colors.primary : colors.warning,
                                borderRadius: radii.pill,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </Card>
                )}
              </View>

              {/* Vehículos que más gastan */}
              {resumen.topVehiculos.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <ThemedText variant="overline" color="textMuted">
                    Vehículos con más gasto
                  </ThemedText>
                  <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                    {resumen.topVehiculos.map((v, i) => (
                      <View
                        key={v.vehicleId}
                        style={[
                          styles.rowBetween,
                          { paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border },
                        ]}>
                        <ThemedText variant="body" numberOfLines={1} style={styles.flex1}>
                          {v.vehicleLabel}
                        </ThemedText>
                        <ThemedText variant="button">{usd(v.total)}</ThemedText>
                      </View>
                    ))}
                  </Card>
                </View>
              ) : null}

              {/* Comparación entre empresas (solo admin general) */}
              {multi && porEmpresa.length > 1 ? (
                <View style={{ gap: spacing.sm }}>
                  <ThemedText variant="overline" color="textMuted">
                    Comparación entre empresas
                  </ThemedText>
                  <Card style={{ gap: spacing.md }}>
                    {porEmpresa.map((e) => (
                      <View key={e.company.id} style={{ gap: 6 }}>
                        <View style={styles.rowBetween}>
                          <ThemedText variant="body">{e.company.name}</ThemedText>
                          <ThemedText variant="button">{usd(e.total)}</ThemedText>
                        </View>
                        <View style={[styles.track, { backgroundColor: colors.surfaceSunken, borderRadius: radii.pill }]}>
                          <View
                            style={[
                              styles.fill,
                              { width: `${Math.max(2, (e.total / maxEmpresa) * 100)}%`, backgroundColor: colors.primary, borderRadius: radii.pill },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </Card>
                </View>
              ) : null}

              <ThemedText variant="caption" color="textMuted">
                Los costos son simulados por ahora (el correctivo sale de las OT cerradas). Con el
                backend saldrán de las facturas y cargas reales. El reporte se adaptará al formato que
                pida cada empresa.
              </ThemedText>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Leyenda color + etiqueta + valor. */
function Leyenda({ color, label, valor }: { color: string; label: string; valor: string }) {
  return (
    <View style={styles.inline}>
      <View style={[styles.classDot, { backgroundColor: color, marginRight: 6 }]} />
      <ThemedText variant="caption" color="textSecondary">
        {`${label} · `}
      </ThemedText>
      <ThemedText variant="caption">{valor}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  splitBar: { flexDirection: 'row', height: 12, overflow: 'hidden', marginTop: 8 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center' },
  classDot: { width: 8, height: 8, borderRadius: 4 },
  track: { height: 8, overflow: 'hidden' },
  fill: { height: 8 },
  flex1: { flex: 1 },
});
