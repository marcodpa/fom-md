import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import {
  PeriodoSelector,
  construirPeriodo,
  type PeriodoTipo,
} from '@/components/periodo-selector';
import { ReporteResultado } from '@/components/report-result';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl, type SegmentOption } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getAreas, getCompanyBrandById, getFlotaVehiculos, getReporte } from '@/services';
import { useTheme, useThemeController } from '@/theme';
import type { Area, FleetReport, FleetVehicle, ReportScopeType } from '@/types';

/** Opciones de alcance del reporte de vehículos (brief §6 + áreas §3.1). */
const SCOPE_OPTIONS: SegmentOption<ReportScopeType>[] = [
  { value: 'general', label: 'General' },
  { value: 'flota', label: 'Área' },
  { value: 'grupo', label: 'Grupo' },
  { value: 'vehiculo', label: 'Vehículo' },
];

/**
 * Generador de reportes de UNA empresa. La empresa llega por parámetro desde su
 * panel y queda fija: aquí solo se elige el ALCANCE dentro de esa empresa
 * (vehículo, grupo, área o general). El generador multi-empresa vive aparte,
 * en el menú del admin general (brief §6).
 */
export default function ReporteScreen() {
  const { colors, spacing, brand } = useTheme();
  const { setBrand } = useThemeController();
  const { user, status } = useAuth();
  const params = useLocalSearchParams<{ companyId?: string }>();
  const companyId = params.companyId || null;

  const [flota, setFlota] = useState<FleetVehicle[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tipo, setTipo] = useState<ReportScopeType>('general');
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [vehiclePickerVisible, setVehiclePickerVisible] = useState(false);
  const [areaPickerVisible, setAreaPickerVisible] = useState(false);

  // Período (rango de tiempo) del reporte.
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>('mes');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [reporte, setReporte] = useState<FleetReport | null>(null);
  const [generando, setGenerando] = useState(false);

  const necesitaVehiculos = tipo === 'vehiculo' || tipo === 'grupo';
  const necesitaArea = tipo === 'flota';
  const esMulti = tipo === 'grupo';

  // Pinta la pantalla con la marca de la empresa al recibir el foco.
  useFocusEffect(
    useCallback(() => {
      if (!companyId) return;
      let active = true;
      (async () => {
        const b = await getCompanyBrandById(companyId);
        if (active && b) setBrand(b);
      })();
      return () => {
        active = false;
      };
    }, [companyId, setBrand]),
  );

  // Carga la flota y las áreas de la empresa (para los selectores).
  useEffect(() => {
    if (!companyId) return;
    let active = true;
    (async () => {
      const [f, a] = await Promise.all([getFlotaVehiculos(companyId), getAreas(companyId)]);
      if (!active) return;
      setFlota(f);
      setAreas(a);
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  // Cambiar de alcance invalida la selección y el reporte previos.
  function cambiarTipo(t: ReportScopeType) {
    setTipo(t);
    setVehicleIds([]);
    setAreaId(null);
    setReporte(null);
  }

  // Texto del campo de vehículos según lo elegido.
  const vehiclesValue = useMemo(() => {
    if (vehicleIds.length === 0) return 'Sin selección';
    if (vehicleIds.length === 1) {
      const v = flota.find((f) => f.vehicle.id === vehicleIds[0]);
      return v ? `${v.vehicle.numero} · ${v.vehicle.marca} ${v.vehicle.modelo}` : '1 vehículo';
    }
    return `${vehicleIds.length} vehículos`;
  }, [vehicleIds, flota]);

  const areaNombre = areas.find((a) => a.id === areaId)?.nombre ?? 'Sin selección';

  const puedeGenerar =
    !!companyId &&
    (necesitaVehiculos
      ? tipo === 'vehiculo'
        ? vehicleIds.length === 1
        : vehicleIds.length >= 1
      : necesitaArea
        ? !!areaId
        : true);

  async function generar() {
    if (!companyId || !puedeGenerar || generando) return;
    setGenerando(true);
    setReporte(null);
    try {
      const r = await getReporte({
        companyId,
        tipo,
        vehicleIds: necesitaVehiculos ? vehicleIds : undefined,
        areaId: necesitaArea ? (areaId ?? undefined) : undefined,
        periodo: construirPeriodo(periodoTipo, desde, hasta),
      });
      setReporte(r);
    } finally {
      setGenerando(false);
    }
  }

  // Guardas de acceso: el reporte es una capa de administración (brief §5).
  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esAdmin(user)) return <Redirect href="/" />;
  // Sin empresa no hay reporte de empresa: se vuelve al menú.
  if (!companyId) return <Redirect href="/empresas" />;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title={brand.name} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.xl }]}>
            {/* Configuración del reporte (solo alcance: la empresa está fija) */}
            <View style={{ gap: spacing.md }}>
              <View style={{ gap: spacing.xs }}>
                <ThemedText variant="overline" color="textMuted">
                  Alcance
                </ThemedText>
                <SegmentedControl options={SCOPE_OPTIONS} value={tipo} onChange={cambiarTipo} />
              </View>

              {/* Alcance "Área" = elegir un área de la empresa (§3.1). */}
              {necesitaArea ? (
                <PickerField
                  label="Área de la empresa"
                  value={areaNombre}
                  onPress={() => setAreaPickerVisible(true)}
                />
              ) : null}

              {/* Selector de vehículos solo para vehículo/grupo. */}
              {necesitaVehiculos ? (
                <PickerField
                  label={esMulti ? 'Vehículos del grupo' : 'Vehículo'}
                  value={vehiclesValue}
                  onPress={() => setVehiclePickerVisible(true)}
                />
              ) : null}

              {/* Rango de tiempo. */}
              <PeriodoSelector
                tipo={periodoTipo}
                desde={desde}
                hasta={hasta}
                onTipoChange={(t) => {
                  setPeriodoTipo(t);
                  setReporte(null);
                }}
                onDesdeChange={setDesde}
                onHastaChange={setHasta}
              />

              <Button
                label={generando ? 'Generando…' : 'Generar reporte'}
                onPress={generar}
                loading={generando}
                disabled={!puedeGenerar}
              />
            </View>

            {/* Resultado */}
            {generando ? (
              <View style={styles.loader}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : reporte ? (
              <ReporteResultado
                reporte={reporte}
                empresaNombre={brand.name}
                empresaColor={colors.primary}
              />
            ) : (
              <Card>
                <ThemedText variant="body" color="textMuted">
                  Elige el alcance y genera un reporte para ver las métricas del período.
                </ThemedText>
              </Card>
            )}
          </View>
        </ScrollView>

        {/* Modal: área de la empresa (para alcance "Área") */}
        <OptionPickerModal
          visible={areaPickerVisible}
          title="Elige un área"
          options={areas.map((a) => ({ id: a.id, label: a.nombre }))}
          selectedIds={areaId ? [areaId] : []}
          onChange={(ids) => {
            setAreaId(ids[0] ?? null);
            setReporte(null);
          }}
          onClose={() => setAreaPickerVisible(false)}
        />

        {/* Modal: vehículos (único o múltiple según el alcance) */}
        <OptionPickerModal
          visible={vehiclePickerVisible}
          title={esMulti ? 'Elige los vehículos' : 'Elige un vehículo'}
          multiSelect={esMulti}
          options={flota.map((f) => ({
            id: f.vehicle.id,
            label: `${f.vehicle.numero} · ${f.vehicle.marca} ${f.vehicle.modelo}`,
            helper: f.conductorActual ?? 'Sin conductor',
          }))}
          selectedIds={vehicleIds}
          onChange={(ids) => {
            setVehicleIds(ids);
            setReporte(null);
          }}
          onClose={() => setVehiclePickerVisible(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scrollContent: { paddingBottom: 32 },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center' },
  loader: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
});
