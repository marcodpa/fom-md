import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl, type SegmentOption } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserReportResult } from '@/components/user-report-result';
import { getAreas, getCompanyBrandById, getReporteUsuarios, getUsuariosDeEmpresa } from '@/services';
import { useTheme, useThemeController } from '@/theme';
import type { Area, DriverProfile, UserReport, UserReportScopeType } from '@/types';

/** Alcance del reporte de usuarios (brief §7 + áreas §3.1). */
const SCOPE_OPTIONS: SegmentOption<UserReportScopeType>[] = [
  { value: 'general', label: 'General' },
  { value: 'flota', label: 'Área' },
  { value: 'grupo', label: 'Grupo' },
  { value: 'usuario', label: 'Usuario' },
];

/**
 * Generador de reportes de USUARIOS de UNA empresa (brief §7). La empresa llega
 * por parámetro y queda fija; aquí se elige el alcance (general, área,
 * conjunto de usuarios o un usuario) y el período.
 */
export default function ReporteUsuariosScreen() {
  const { colors, spacing, brand } = useTheme();
  const { setBrand } = useThemeController();
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ companyId?: string }>();
  const companyId = params.companyId || null;

  const [usuarios, setUsuarios] = useState<DriverProfile[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tipo, setTipo] = useState<UserReportScopeType>('general');
  const [userIds, setUserIds] = useState<string[]>([]);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [userPickerVisible, setUserPickerVisible] = useState(false);
  const [areaPickerVisible, setAreaPickerVisible] = useState(false);

  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>('mes');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [reporte, setReporte] = useState<UserReport | null>(null);
  const [generando, setGenerando] = useState(false);

  const necesitaUsuarios = tipo === 'usuario' || tipo === 'grupo';
  const necesitaArea = tipo === 'flota';
  const esMulti = tipo === 'grupo';

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

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    (async () => {
      const [us, a] = await Promise.all([
        getUsuariosDeEmpresa(companyId),
        getAreas(companyId),
      ]);
      if (!active) return;
      setUsuarios(us);
      setAreas(a);
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  function cambiarTipo(t: UserReportScopeType) {
    setTipo(t);
    setUserIds([]);
    setAreaId(null);
    setReporte(null);
  }

  const usuariosValue = useMemo(() => {
    if (userIds.length === 0) return 'Sin selección';
    if (userIds.length === 1) return usuarios.find((u) => u.id === userIds[0])?.nombre ?? '1 usuario';
    return `${userIds.length} usuarios`;
  }, [userIds, usuarios]);

  const areaNombre = areas.find((a) => a.id === areaId)?.nombre ?? 'Sin selección';

  const puedeGenerar =
    !!companyId &&
    (necesitaUsuarios
      ? tipo === 'usuario'
        ? userIds.length === 1
        : userIds.length >= 1
      : necesitaArea
        ? !!areaId
        : true);

  async function generar() {
    if (!companyId || !puedeGenerar || generando) return;
    setGenerando(true);
    setReporte(null);
    try {
      const r = await getReporteUsuarios({
        companyId,
        tipo,
        userIds: necesitaUsuarios ? userIds : undefined,
        areaId: necesitaArea ? (areaId ?? undefined) : undefined,
        periodo: construirPeriodo(periodoTipo, desde, hasta),
      });
      setReporte(r);
    } finally {
      setGenerando(false);
    }
  }

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esAdmin(user)) return <Redirect href="/" />;
  if (!companyId) return <Redirect href="/empresas" />;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title={brand.name} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.xl }]}>
            <View style={{ gap: spacing.md }}>
              <View style={{ gap: spacing.xs }}>
                <ThemedText variant="overline" color="textMuted">
                  Alcance
                </ThemedText>
                <SegmentedControl options={SCOPE_OPTIONS} value={tipo} onChange={cambiarTipo} />
              </View>

              {necesitaArea ? (
                <PickerField
                  label="Área de la empresa"
                  value={areaNombre}
                  onPress={() => setAreaPickerVisible(true)}
                />
              ) : null}

              {necesitaUsuarios ? (
                <PickerField
                  label={esMulti ? 'Usuarios del grupo' : 'Usuario'}
                  value={usuariosValue}
                  onPress={() => setUserPickerVisible(true)}
                />
              ) : null}

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

            {generando ? (
              <View style={styles.loader}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : reporte ? (
              <UserReportResult
                reporte={reporte}
                empresaNombre={brand.name}
                empresaColor={colors.primary}
                onUserPress={(userId, nombre, role) =>
                  router.navigate({ pathname: '/ver-perfil', params: { userId, nombre, ...(role ? { role } : {}) } })
                }
              />
            ) : (
              <Card>
                <ThemedText variant="body" color="textMuted">
                  Elige el alcance y genera un reporte para ver los datos de los usuarios.
                </ThemedText>
              </Card>
            )}
          </View>
        </ScrollView>

        {/* Modal: área de la empresa */}
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

        {/* Modal: usuarios (único o múltiple) */}
        <OptionPickerModal
          visible={userPickerVisible}
          title={esMulti ? 'Elige los usuarios' : 'Elige un usuario'}
          multiSelect={esMulti}
          options={usuarios.map((u) => ({ id: u.id, label: u.nombre, helper: u.cedula }))}
          selectedIds={userIds}
          onChange={(ids) => {
            setUserIds(ids);
            setReporte(null);
          }}
          onClose={() => setUserPickerVisible(false)}
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
