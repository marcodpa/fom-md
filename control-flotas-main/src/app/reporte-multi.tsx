import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmpresaChips } from '@/components/empresa-chips';
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
import { UserReportResult } from '@/components/user-report-result';
import { getEmpresasDelUsuarioConColor, getReporte, getReporteUsuarios } from '@/services';
import { DEFAULT_BRAND, useTheme, useThemeController } from '@/theme';
import type { Company, FleetReport, UserReport } from '@/types';

/** Empresa con su color de marca (para los chips). */
type EmpresaColor = { company: Company; color: string };

/** Reportar por vehículos o por usuarios (igual que en el panel de empresa). */
type TipoReporte = 'vehiculos' | 'usuarios';
const TIPO_OPTIONS: SegmentOption<TipoReporte>[] = [
  { value: 'vehiculos', label: 'Vehículos' },
  { value: 'usuarios', label: 'Usuarios' },
];

/**
 * Generador de reportes MULTI-EMPRESA (menú del admin general). Permite elegir
 * una, varias o todas las empresas y un rango de tiempo, y produce el reporte
 * GENERAL de cada empresa seleccionada (todos sus vehículos). El detalle por
 * grupo/vehículo se hace en el panel de cada empresa. Identidad neutra.
 */
export default function ReporteMultiScreen() {
  const { colors, spacing } = useTheme();
  const { setBrand } = useThemeController();
  const { user, status } = useAuth();

  const [companies, setCompanies] = useState<EmpresaColor[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Reportar por vehículos o por usuarios.
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('vehiculos');

  // Período (rango de tiempo) del reporte.
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>('mes');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [reportesVeh, setReportesVeh] = useState<FleetReport[] | null>(null);
  const [reportesUsr, setReportesUsr] = useState<UserReport[] | null>(null);
  const [generando, setGenerando] = useState(false);

  // Vista transversal: identidad neutra de la app, no la de una empresa.
  useFocusEffect(
    useCallback(() => {
      setBrand(DEFAULT_BRAND);
    }, [setBrand]),
  );

  // Carga las empresas accesibles (con su color); por defecto, todas elegidas.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const list = await getEmpresasDelUsuarioConColor(user.role, user.companyId);
      if (!active) return;
      setCompanies(list);
      setSelectedIds(list.map((c) => c.company.id));
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const nombrePorId = useMemo(
    () => new Map(companies.map((c) => [c.company.id, c.company.name])),
    [companies],
  );
  const colorPorId = useMemo(
    () => new Map(companies.map((c) => [c.company.id, c.color])),
    [companies],
  );

  function toggleEmpresa(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    limpiar();
  }

  const puedeGenerar = selectedIds.length >= 1 && !generando;

  function limpiar() {
    setReportesVeh(null);
    setReportesUsr(null);
  }

  async function generar() {
    if (!puedeGenerar) return;
    setGenerando(true);
    limpiar();
    try {
      const periodo = construirPeriodo(periodoTipo, desde, hasta);
      if (tipoReporte === 'vehiculos') {
        const reps = await Promise.all(
          selectedIds.map((companyId) => getReporte({ companyId, tipo: 'general', periodo })),
        );
        setReportesVeh(reps);
      } else {
        const reps = await Promise.all(
          selectedIds.map((companyId) => getReporteUsuarios({ companyId, tipo: 'general', periodo })),
        );
        setReportesUsr(reps);
      }
    } finally {
      setGenerando(false);
    }
  }

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Administradores (FOM/ente) y supervisores de compañía (solo lectura).
  if (!esAdmin(user)) return <Redirect href="/" />;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Generador multi-empresa" />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.xl }]}>
            <View style={{ gap: spacing.md }}>
              {/* De vehículos o de usuarios (igual que en el panel de empresa). */}
              <View style={{ gap: spacing.xs }}>
                <ThemedText variant="overline" color="textMuted">
                  Reporte de
                </ThemedText>
                <SegmentedControl
                  options={TIPO_OPTIONS}
                  value={tipoReporte}
                  onChange={(t) => {
                    setTipoReporte(t);
                    limpiar();
                  }}
                />
              </View>

              <EmpresaChips
                label="Empresas"
                empresas={companies.map((c) => ({
                  id: c.company.id,
                  name: c.company.name,
                  color: c.color,
                }))}
                selectedIds={selectedIds}
                onToggle={toggleEmpresa}
              />

              {/* Rango de tiempo. */}
              <PeriodoSelector
                tipo={periodoTipo}
                desde={desde}
                hasta={hasta}
                onTipoChange={(t) => {
                  setPeriodoTipo(t);
                  limpiar();
                }}
                onDesdeChange={setDesde}
                onHastaChange={setHasta}
              />

              <ThemedText variant="caption" color="textMuted">
                Se genera el reporte general de cada empresa. Para el detalle por grupo o vehículo,
                entra al panel de cada empresa.
              </ThemedText>

              <Button
                label={generando ? 'Generando…' : 'Generar reportes'}
                onPress={generar}
                loading={generando}
                disabled={!puedeGenerar}
              />
            </View>

            {/* Resultado: un reporte por empresa seleccionada */}
            {generando ? (
              <View style={styles.loader}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : reportesVeh ? (
              reportesVeh.map((r) => (
                <ReporteResultado
                  key={r.scope.companyId}
                  reporte={r}
                  empresaNombre={nombrePorId.get(r.scope.companyId) ?? r.scope.companyId}
                  empresaColor={colorPorId.get(r.scope.companyId)}
                />
              ))
            ) : reportesUsr ? (
              reportesUsr.map((r) => (
                <UserReportResult
                  key={r.scope.companyId}
                  reporte={r}
                  empresaNombre={nombrePorId.get(r.scope.companyId) ?? r.scope.companyId}
                  empresaColor={colorPorId.get(r.scope.companyId)}
                />
              ))
            ) : (
              <Card>
                <ThemedText variant="body" color="textMuted">
                  Elige empresas y un período, y genera los reportes.
                </ThemedText>
              </Card>
            )}
          </View>
        </ScrollView>
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
