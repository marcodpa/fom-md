import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedNumber } from '@/components/animated-number';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OTStatusBadge } from '@/components/ot-status-badge';
import { PressableScale } from '@/components/pressable-scale';
import { ReporteResultado } from '@/components/report-result';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  getCompanyBrandById,
  getOrdenesDeTrabajo,
  getReporte,
  getReporteGerencial,
  periodoMesActual,
} from '@/services';
import { useTheme, type ColorTokens } from '@/theme';

type Vista = 'gerencial' | 'reportes' | 'odt';

function fecha(iso: string): string {
  return new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * CAPA GERENCIAL de una empresa asignada (FOM-02 §2.1) — SOLO LECTURA:
 * reporte gerencial + todos los reportes de la empresa + histórico de ODT +
 * "información extra" (alcance por definir, D1). Sin métricas operativas en la
 * sección gerencial (§8-5). La sesión mantiene la marca de la predefinida; la
 * empresa mirada se identifica con texto/chip (P14).
 */
export default function GerencialEmpresaScreen() {
  const { spacing, radii } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ companyId?: string; nombre?: string }>();
  const companyId = params.companyId || '';
  const nombre = params.nombre || companyId;

  const [vista, setVista] = useState<Vista>('gerencial');

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [gerencial, reporte, odts, brandEmpresa] = await Promise.all([
        getReporteGerencial(companyId),
        getReporte({ companyId, tipo: 'general', periodo: periodoMesActual() }),
        getOrdenesDeTrabajo(companyId),
        getCompanyBrandById(companyId),
      ]);
      return { gerencial, reporte, odts, colorEmpresa: brandEmpresa?.primaryColor };
    },
    [companyId],
    { onFocus: true },
  );

  const stats = data
    ? [
        { label: 'ODT abiertas', value: data.gerencial.odtAbiertas, tone: (data.gerencial.odtAbiertas > 0 ? 'warning' : 'text') as keyof ColorTokens },
        { label: 'En revisión', value: data.gerencial.odtEnRevision, tone: 'text' as keyof ColorTokens },
        { label: 'Cerradas', value: data.gerencial.odtCerradas, tone: 'success' as keyof ColorTokens },
        { label: 'Preventivas', value: data.gerencial.odtPreventivas, tone: 'text' as keyof ColorTokens },
      ]
    : [];

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title={nombre} right={<Chip tone="info" label="Solo lectura" />} />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar la capa gerencial." onRetry={recargar} />
        ) : !data ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton height={44} radius={radii.md} />
            <Card style={[styles.grid, { gap: spacing.lg }]}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.stat}>
                  <Skeleton width="45%" height={24} />
                  <View style={{ height: 4 }} />
                  <Skeleton width="75%" height={12} />
                </View>
              ))}
            </Card>
            <Skeleton height={120} radius={radii.lg} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <SegmentedControl
              options={[
                { value: 'gerencial', label: 'Gerencial' },
                { value: 'reportes', label: 'Reportes' },
                { value: 'odt', label: `ODT (${data.odts.length})` },
              ]}
              value={vista}
              onChange={setVista}
            />

            {/* ── REPORTE GERENCIAL (§2.1): derivado de ODT y costos. ── */}
            {vista === 'gerencial' ? (
              <>
                <Card style={[styles.grid, { gap: spacing.lg }]}>
                  {stats.map((s) => (
                    <View key={s.label} style={styles.stat}>
                      <AnimatedNumber value={s.value} variant="title" color={s.tone} />
                      <ThemedText variant="caption" color="textMuted">
                        {s.label}
                      </ThemedText>
                    </View>
                  ))}
                </Card>

                <Card style={{ gap: spacing.md }}>
                  <ThemedText variant="overline" color="textMuted">
                    {`Mantenimiento · ${data.gerencial.periodo}`}
                  </ThemedText>
                  <View style={styles.rowBetween}>
                    <ThemedText variant="body" color="textSecondary">
                      Costo total (ODT cerradas)
                    </ThemedText>
                    <ThemedText variant="subtitle">
                      {`$${data.gerencial.costoTotal.toLocaleString('es')}`}
                    </ThemedText>
                  </View>
                  <View style={styles.rowBetween}>
                    <ThemedText variant="body" color="textSecondary">
                      Resolución promedio
                    </ThemedText>
                    <ThemedText variant="subtitle">
                      {data.gerencial.horasPromedioResolucion != null
                        ? `${data.gerencial.horasPromedioResolucion} h`
                        : 'Sin datos'}
                    </ThemedText>
                  </View>
                </Card>

                {/* "Información extra" (§2.1) — alcance pendiente de definir (D1). */}
                <Card style={{ gap: spacing.xs }}>
                  <ThemedText variant="overline" color="textMuted">
                    Información extra
                  </ThemedText>
                  <ThemedText variant="caption" color="textMuted">
                    Alcance por definir con la predefinida. Se habilitará cuando se acuerde su
                    contenido.
                  </ThemedText>
                </Card>

                <ThemedText variant="caption" color="textMuted">
                  Borrador del reporte gerencial: se ajustará al formato real que exige la
                  predefinida cuando lleguen sus documentos.
                </ThemedText>
              </>
            ) : null}

            {/* ── REPORTES de la empresa (§2.1), solo lectura. ── */}
            {vista === 'reportes' ? (
              <>
                {/* El informe en el formato que exige la predefinida (D2/D3),
                    modelado sobre el informe real Samfor→Chevron. */}
                <Button
                  label="Informe en formato Chevron"
                  onPress={() =>
                    router.navigate({ pathname: '/reporte-formato', params: { companyId, nombre } })
                  }
                />
                <ReporteResultado
                  reporte={data.reporte}
                  empresaNombre={nombre}
                  empresaColor={data.colorEmpresa}
                />
              </>
            ) : null}

            {/* ── HISTÓRICO DE ODT (§2.1): todas, incluidas las cerradas. ── */}
            {vista === 'odt' ? (
              data.odts.length === 0 ? (
                <EmptyState
                  title="Sin ODT registradas"
                  description="Cuando la empresa gestione órdenes de trabajo, su histórico aparecerá aquí."
                />
              ) : (
                data.odts.map((ot) => (
                  <PressableScale
                    key={ot.id}
                    onPress={() => router.navigate({ pathname: '/gerencial/odt', params: { id: ot.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver ODT de ${ot.vehicleLabel}`}>
                    <Card style={{ gap: spacing.sm }}>
                      <View style={[styles.rowBetween, { gap: spacing.sm }]}>
                        <ThemedText variant="subtitle" numberOfLines={1} style={styles.flex1}>
                          {ot.vehicleLabel}
                        </ThemedText>
                        <OTStatusBadge estado={ot.estado} />
                      </View>
                      <ThemedText variant="caption" color="textSecondary" numberOfLines={2}>
                        {ot.descripcion}
                      </ThemedText>
                      <View style={styles.rowBetween}>
                        <ThemedText variant="caption" color="textMuted">
                          {ot.driverName}
                        </ThemedText>
                        <ThemedText variant="caption" color="textMuted">
                          {fecha(ot.creadaEn)}
                        </ThemedText>
                      </View>
                    </Card>
                  </PressableScale>
                ))
              )
            ) : null}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { flexGrow: 1, flexBasis: '42%', gap: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex1: { flex: 1, minWidth: 0 },
});
