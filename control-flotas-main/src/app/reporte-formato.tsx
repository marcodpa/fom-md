import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, useAuth } from '@/auth';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { rangoColor } from '@/components/report-result';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { getAreas, getReporteFormatoPredefinida } from '@/services';
import { useTheme, type ColorTokens } from '@/theme';
import type { ScoreRange } from '@/types';

const RANGO_LABEL: Record<ScoreRange, string> = {
  verde: 'Conforme',
  amarillo: 'Alerta',
  rojo: 'Atención',
};

/**
 * INFORME EN FORMATO DE LA PREDEFINIDA (D2/D3): la versión viva del "Informe
 * estadístico SIRCOP" que Samfor envía a Chevron por correo — mejorada:
 * semáforo aplicado en cada indicador, conductores identificados por
 * principal/PIN (el "% de registro" deja de ser 0), y filtro por área/contrato
 * (Oficina, Termoeléctrica, Desmalezado…). Lo ven el supervisor de la empresa
 * (§3.2) y el supervisor de la predefinida en solo lectura (§2.1).
 */
export default function ReporteFormatoScreen() {
  const { colors, spacing } = useTheme();
  const { user, status } = useAuth();
  const params = useLocalSearchParams<{ companyId?: string; nombre?: string }>();
  const companyId = params.companyId || '';

  const [areaId, setAreaId] = useState<string | null>(null);
  const [areaPicker, setAreaPicker] = useState(false);

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [reporte, areas] = await Promise.all([
        getReporteFormatoPredefinida(companyId, areaId),
        getAreas(companyId),
      ]);
      return { reporte, areas };
    },
    [companyId, areaId],
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Lo genera el operativo de la ente (§3.2) y el Supervisor de la compañía.
  if (!esAdmin(user)) return <Redirect href="/" />;

  const r = data?.reporte;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title={r ? `Formato ${r.predefinidaNombre}` : 'Formato de la predefinida'} />

        {estado === 'error' ? (
          <ErrorState description="No pudimos generar el informe." onRetry={recargar} />
        ) : estado === 'cargando' || !r || !data ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton height={64} radius={16} />
            <Skeleton height={140} radius={16} />
            <Skeleton height={200} radius={16} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            {/* Encabezado del informe, como el real: empresa · área · período. */}
            <Card style={{ gap: spacing.xs }}>
              <ThemedText variant="overline" color="textMuted">
                Informe estadístico
              </ThemedText>
              <ThemedText variant="title">
                {`${r.companyNombre}${r.areaNombre ? ` · ${r.areaNombre}` : ''}`}
              </ThemedText>
              <ThemedText variant="caption" color="textMuted">
                {`${r.periodo} · formato ${r.predefinidaNombre}`}
              </ThemedText>
            </Card>

            {/* Filtro por área/contrato (así viajan los informes reales). */}
            {data.areas.length > 0 ? (
              <PickerField
                label="Área / contrato"
                value={r.areaNombre ?? 'Toda la empresa'}
                onPress={() => setAreaPicker(true)}
              />
            ) : null}

            {/* ── Indicadores con semáforo (tabla 1 del informe real). ── */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                Indicadores
              </ThemedText>
              {r.indicadores.map((ind) => (
                <Card key={ind.nombre} style={{ gap: spacing.sm }}>
                  <View style={styles.rowBetween}>
                    <ThemedText variant="subtitle" style={styles.flex1}>
                      {ind.nombre}
                    </ThemedText>
                    <Chip tone={rangoColor(ind.rango)} label={RANGO_LABEL[ind.rango]} />
                  </View>
                  <View style={styles.rowBetween}>
                    <ThemedText variant="title" color={rangoColor(ind.rango) as keyof ColorTokens}>
                      {ind.valor}
                    </ThemedText>
                    <ThemedText variant="caption" color="textMuted">
                      {`Nivel óptimo: ${ind.optimo}`}
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption" color="textSecondary">
                    {ind.interpretacion}
                  </ThemedText>
                </Card>
              ))}
            </View>

            {/* ── Distancias recorridas (tabla 2). ── */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                Distancias recorridas
              </ThemedText>
              {r.distancias.length === 0 ? (
                <EmptyState title="Sin unidades en este alcance" description="Elige otra área o toda la empresa." />
              ) : (
                <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                  <View style={[styles.tRow, { paddingVertical: spacing.sm }]}>
                    <ThemedText variant="overline" color="textMuted" style={styles.cUnidad}>
                      Unidad
                    </ThemedText>
                    <ThemedText variant="overline" color="textMuted" style={styles.cNum}>
                      Mes
                    </ThemedText>
                    <ThemedText variant="overline" color="textMuted" style={styles.cNum}>
                      Últ. 6 meses
                    </ThemedText>
                  </View>
                  {r.distancias.map((f, i) => (
                    <View
                      key={f.placa}
                      style={[
                        styles.tRow,
                        { paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border },
                      ]}>
                      <View style={styles.cUnidad}>
                        <ThemedText variant="body">{f.unidadLabel}</ThemedText>
                        <ThemedText variant="caption" color="textMuted">
                          {f.placa}
                        </ThemedText>
                      </View>
                      <ThemedText variant="body" style={styles.cNum}>
                        {`${f.recorridoActual.toLocaleString('es')} km`}
                      </ThemedText>
                      <ThemedText variant="body" color="textSecondary" style={styles.cNum}>
                        {`${f.recorridoU6m.toLocaleString('es')} km`}
                      </ThemedText>
                    </View>
                  ))}
                </Card>
              )}
            </View>

            {/* ── Cuadro de resumen por conductor (tabla 3). ── */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                Resumen por conductor
              </ThemedText>
              <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                {r.conductores.map((c, i) => (
                  <View
                    key={c.conductor}
                    style={[
                      { gap: 2, paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    ]}>
                    <View style={styles.rowBetween}>
                      <ThemedText variant="body" style={styles.flex1}>
                        {c.conductor}
                      </ThemedText>
                      {c.identificado ? (
                        <Chip tone={rangoColor(c.score < 1.5 ? 'verde' : c.score < 3.5 ? 'amarillo' : 'rojo')} label={`Score ${c.score.toFixed(2)}`} />
                      ) : (
                        <Chip tone="danger" label="Sin identificar" />
                      )}
                    </View>
                    <ThemedText variant="caption" color="textMuted">
                      {`${c.km.toLocaleString('es')} km · ${c.horas} h · ${c.aceleraciones} acel · ${c.frenadas} fren · ${c.excesos} exc${c.velocidadMax ? ` · máx ${c.velocidadMax} km/h` : ''}`}
                    </ThemedText>
                  </View>
                ))}
              </Card>
              <ThemedText variant="caption" color="textMuted">
                La identificación sale de la titularidad y el PIN del GPS (§3.5): cada kilómetro con
                su responsable, sin depender de que el chofer “se registre”.
              </ThemedText>
            </View>

            {/* ── Alertas por vehículo por cada 100 km (tabla 4). ── */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                Alertas por vehículo (cada 100 km)
              </ThemedText>
              <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                {r.alertasPorVehiculo.map((f, i) => (
                  <View
                    key={f.unidadLabel}
                    style={[
                      styles.tRow,
                      { paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    ]}>
                    <ThemedText variant="body" style={styles.flex1}>
                      {f.unidadLabel}
                    </ThemedText>
                    <ThemedText variant="body" color={rangoColor(f.rango) as keyof ColorTokens}>
                      {f.alertas100km.toFixed(2)}
                    </ThemedText>
                  </View>
                ))}
              </Card>
            </View>

            <ThemedText variant="caption" color="textMuted">
              La exportación a PDF/correo (como viaja hoy el informe) llegará con el backend.
            </ThemedText>
          </ScrollView>
        )}

        <OptionPickerModal
          visible={areaPicker}
          title="Área / contrato del informe"
          options={[
            { id: '__todas__', label: 'Toda la empresa' },
            ...(data?.areas ?? []).map((a) => ({ id: a.id, label: a.nombre })),
          ]}
          selectedIds={areaId ? [areaId] : ['__todas__']}
          onChange={(ids) => setAreaId(ids[0] === '__todas__' ? null : (ids[0] ?? null))}
          onClose={() => setAreaPicker(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cUnidad: { flex: 1.4, minWidth: 0 },
  cNum: { flex: 1, textAlign: 'right' },
  flex1: { flex: 1, minWidth: 0 },
});
