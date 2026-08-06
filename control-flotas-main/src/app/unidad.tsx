import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, esMultiempresa, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { PillButton } from '@/components/pill-button';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { confirmar } from '@/lib/confirmar';
import { OTStatusBadge } from '@/components/ot-status-badge';
import { PressableScale } from '@/components/pressable-scale';
import { TabIcon } from '@/components/tab-icon';
import {
  asignarConductorPrincipal,
  asignarVehiculoAArea,
  autorizarSecundario,
  getAreas,
  getCompanyBrandById,
  getFlotaVehiculos,
  getGpsDeVehiculo,
  getOrdenesDeTrabajo,
  getReporte,
  getSecundarios,
  getUsuariosDeEmpresa,
  getVehiculo,
  periodoMesActual,
  regenerarPinSecundario,
  revocarSecundario,
} from '@/services';
import { useTheme, useThemeController } from '@/theme';
import type { AreaTipo } from '@/types';

const AREA_TIPO_LABEL: Record<AreaTipo, string> = {
  ubicacion: 'Ubicación',
  sector: 'Sector',
  contrato: 'Contrato',
};

/**
 * DETALLE DE UNIDAD para el supervisor de empresa (FOM-02 §3.1/§3.5): asignar
 * vehículo → área, conductor PRINCIPAL (titular) y conductores SECUNDARIOS
 * autorizados con su PIN. Los secundarios solo existen si el GPS de la unidad
 * soporta identificación por PIN; si no, la unidad maneja solo principal.
 */
export default function UnidadScreen() {
  const { colors, spacing, radii } = useTheme();
  const { setBrand } = useThemeController();
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleId?: string; companyId?: string }>();
  const vehicleId = params.vehicleId || '';
  const companyId = params.companyId || '';

  const [areaPicker, setAreaPicker] = useState(false);
  const [principalPicker, setPrincipalPicker] = useState(false);
  const [secundarioPicker, setSecundarioPicker] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinNuevo, setPinNuevo] = useState<{ nombre: string; pin: string } | null>(null);

  // Mantiene el panel pintado con la marca de la empresa.
  useFocusEffect(
    useCallback(() => {
      if (!companyId) return;
      let active = true;
      getCompanyBrandById(companyId).then((b) => {
        if (active && b) setBrand(b);
      });
      return () => {
        active = false;
      };
    }, [companyId, setBrand]),
  );

  const { data, estado, recargar } = useAsyncData(
    async () => {
      // La ente sale del PROPIO vehículo: el ojo de Flota (admin FOM) no la pasa,
      // y de ella dependen su área, su personal (conductor principal) y sus
      // métricas. Sin esto, el detalle mostraría "sin principal" aunque lo tenga.
      const vehiculo = await getVehiculo(vehicleId);
      const cid = vehiculo?.companyId || companyId;
      const [gps, areas, usuarios, secundarios, flota, reporte, ordenes] = await Promise.all([
        getGpsDeVehiculo(vehicleId),
        getAreas(cid),
        getUsuariosDeEmpresa(cid),
        getSecundarios(vehicleId),
        getFlotaVehiculos(cid),
        // Métricas del período de ESTE carro (km, índice, eventos, ODT).
        getReporte({ companyId: cid, tipo: 'vehiculo', vehicleIds: [vehicleId], periodo: periodoMesActual() }),
        getOrdenesDeTrabajo(cid),
      ]);
      return {
        vehiculo,
        gps,
        areas,
        usuarios,
        secundarios,
        vivo: flota.find((f) => f.vehicle.id === vehicleId) ?? null,
        metricas: reporte.porVehiculo[0] ?? null,
        // Mantenimiento de ESTA unidad, por separado (directriz PDF-4).
        odts: ordenes.filter((o) => o.vehicleId === vehicleId),
      };
    },
    [vehicleId, companyId],
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esAdmin(user)) return <Redirect href="/" />;

  const v = data?.vehiculo;
  const areaActual = data?.areas.find((a) => a.id === v?.areaId);
  const principalActual = data?.usuarios.find((u) => u.id === v?.conductorPrincipalId);
  // Elegibles como secundarios: conductores que no son el principal ni ya están autorizados.
  const elegibles = (data?.usuarios ?? []).filter(
    (u) => u.id !== v?.conductorPrincipalId && !data?.secundarios.some((s) => s.userId === u.id),
  );

  async function ejecutar(accion: () => Promise<unknown>) {
    setError(null);
    setOcupado(true);
    try {
      await accion();
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el cambio.');
    } finally {
      setOcupado(false);
    }
  }

  function confirmarRevocar(userId: string, nombre: string) {
    confirmar({
      titulo: 'Revocar autorización',
      mensaje: `${nombre} dejará de poder usar esta unidad con su PIN.`,
      accion: 'Revocar',
      onConfirmar: () => ejecutar(() => revocarSecundario(vehicleId, userId)),
    });
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader
          title={v ? (v.alias ?? v.numero) : 'Unidad'}
          right={
            // El CRUD del vehículo (marca, placa, mover, eliminar) es SOLO de la
            // administración FOM; el admin de ente asigna conductores más abajo.
            v && esMultiempresa(user) ? (
              <PillButton
                label="Editar"
                tone="primary"
                onPress={() => router.navigate({ pathname: '/editar-vehiculo', params: { vehicleId } })}
              />
            ) : undefined
          }
        />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar la unidad." onRetry={recargar} />
        ) : !data || !v ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton width="55%" height={22} />
            <Skeleton height={120} radius={16} />
            <Skeleton height={90} radius={16} />
            <Skeleton height={90} radius={16} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            {/* Unidad: foto (placeholder hasta tener foto real) + toda su info. */}
            <Card style={{ gap: spacing.md }}>
              <View style={[styles.hero, { gap: spacing.md }]}>
                <View style={[styles.fotoTile, { backgroundColor: colors.surfaceSunken, borderRadius: radii.lg }]}>
                  <TabIcon name="flota" color={colors.primary} size={40} />
                </View>
                <View style={styles.flex1}>
                  <View style={styles.rowBetween}>
                    <ThemedText variant="overline" color="textMuted">
                      Unidad
                    </ThemedText>
                    {data.gps ? (
                      <Chip
                        tone={data.gps.pinSupport ? 'success' : 'textMuted'}
                        label={data.gps.pinSupport ? 'GPS con PIN' : 'GPS sin PIN'}
                      />
                    ) : null}
                  </View>
                  <ThemedText variant="subtitle">{`${v.marca} ${v.modelo} · ${v.anio}`}</ThemedText>
                  <ThemedText variant="caption" color="textSecondary">
                    {`${v.placa} · ${v.numero}${v.alias ? ` · Alias: ${v.alias}` : ''}`}
                  </ThemedText>
                  {data.vivo ? (
                    <ThemedText
                      variant="caption"
                      color={data.vivo.estado === 'en_marcha' ? 'success' : 'textMuted'}>
                      {data.vivo.estado === 'en_marcha'
                        ? `En marcha · ${data.vivo.velocidadKmh} km/h`
                        : 'Parado ahora mismo'}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
              {data.gps ? (
                <ThemedText variant="caption" color="textMuted">
                  {`GPS ${data.gps.modelo} · IMEI ${data.gps.imei}`}
                </ThemedText>
              ) : null}
            </Card>

            {/* Métricas del período de ESTE carro. */}
            {data.metricas ? (
              <Card style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  Métricas del mes
                </ThemedText>
                <View style={[styles.statsGrid, { gap: spacing.lg }]}>
                  <View style={styles.stat}>
                    <ThemedText variant="title" tabular>{data.metricas.km.toLocaleString('es')}</ThemedText>
                    <ThemedText variant="caption" color="textMuted">km recorridos</ThemedText>
                  </View>
                  <View style={styles.stat}>
                    <ThemedText variant="title" tabular>{String(data.metricas.indiceSeguro)}</ThemedText>
                    <ThemedText variant="caption" color="textMuted">índice seguro</ThemedText>
                  </View>
                  <View style={styles.stat}>
                    <ThemedText variant="title" tabular>
                      {String(data.metricas.excesosVelocidad + data.metricas.frenadasBruscas + data.metricas.aceleracionesBruscas)}
                    </ThemedText>
                    <ThemedText variant="caption" color="textMuted">eventos de manejo</ThemedText>
                  </View>
                  <View style={styles.stat}>
                    <ThemedText variant="title" tabular>{String(data.metricas.otAbiertas)}</ThemedText>
                    <ThemedText variant="caption" color="textMuted">ODT abiertas</ThemedText>
                  </View>
                </View>
              </Card>
            ) : null}

            {/* Mantenimiento de ESTA unidad: sus ODT, tocables (entra al detalle). */}
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                {`Mantenimiento de esta unidad (${data.odts.length})`}
              </ThemedText>
              {data.odts.length === 0 ? (
                <Card>
                  <ThemedText variant="caption" color="textMuted">
                    Sin órdenes de trabajo registradas en esta unidad.
                  </ThemedText>
                </Card>
              ) : (
                data.odts.map((ot) => (
                  <PressableScale
                    key={ot.id}
                    onPress={() =>
                      router.navigate({ pathname: '/orden', params: { id: ot.id, companyId: v.companyId || companyId } })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir la ODT de ${ot.vehicleLabel}`}>
                    <Card style={{ gap: spacing.xs }}>
                      <View style={[styles.rowBetween, { gap: spacing.sm }]}>
                        <ThemedText variant="button" numberOfLines={1} style={styles.flex1}>
                          {ot.descripcion}
                        </ThemedText>
                        <OTStatusBadge estado={ot.estado} />
                      </View>
                      <ThemedText variant="caption" color="textMuted">
                        {ot.driverName}
                      </ThemedText>
                    </Card>
                  </PressableScale>
                ))
              )}
            </View>

            {/* Área (§3.1) */}
            <Card style={{ gap: spacing.md }}>
              <PickerField
                label="Área de la empresa"
                value={areaActual ? `${areaActual.nombre} (${AREA_TIPO_LABEL[areaActual.tipo]})` : 'Sin área asignada'}
                onPress={() => setAreaPicker(true)}
                disabled={ocupado}
              />
            </Card>

            {/* Conductor principal (§3.5): el titular de la unidad. */}
            <Card style={{ gap: spacing.md }}>
              <PickerField
                label="Conductor principal (titular)"
                value={principalActual?.nombre ?? 'Sin principal asignado'}
                onPress={() => setPrincipalPicker(true)}
                disabled={ocupado}
              />
            </Card>

            {/* Secundarios (§3.5): solo si el GPS soporta PIN. */}
            <Card style={{ gap: spacing.md }}>
              <ThemedText variant="overline" color="textMuted">
                Conductores secundarios
              </ThemedText>
              {!data.gps?.pinSupport ? (
                <ThemedText variant="caption" color="textMuted">
                  El GPS de esta unidad no tiene identificación por PIN, así que solo maneja
                  conductor principal (sin secundarios).
                </ThemedText>
              ) : (
                <>
                  {data.secundarios.length === 0 ? (
                    <ThemedText variant="caption" color="textMuted">
                      Sin secundarios autorizados. Autoriza a un conductor y se le generará su PIN.
                    </ThemedText>
                  ) : (
                    data.secundarios.map((s) => (
                      <View key={s.userId} style={[styles.rowBetween, { gap: spacing.sm }]}>
                        <View style={styles.flex1}>
                          <ThemedText variant="body">{s.nombre}</ThemedText>
                          <ThemedText variant="caption" color="textSecondary">
                            {`PIN: ${s.pin}`}
                          </ThemedText>
                        </View>
                        <PillButton
                          label="Nuevo PIN"
                          onPress={() =>
                            ejecutar(async () => {
                              const r = await regenerarPinSecundario(vehicleId, s.userId);
                              setPinNuevo({ nombre: r.nombre, pin: r.pin });
                            })
                          }
                        />
                        <PillButton label="Revocar" tone="danger" onPress={() => confirmarRevocar(s.userId, s.nombre)} />
                      </View>
                    ))
                  )}
                  <Button
                    label="Autorizar conductor secundario"
                    variant="secondary"
                    onPress={() => setSecundarioPicker(true)}
                    disabled={ocupado || elegibles.length === 0}
                  />
                  {pinNuevo ? (
                    <ThemedText variant="caption" color="success">
                      {`PIN de ${pinNuevo.nombre}: ${pinNuevo.pin}. Entrégaselo en persona.`}
                    </ThemedText>
                  ) : null}
                </>
              )}
            </Card>

            {error ? (
              <ThemedText variant="caption" color="danger">
                {error}
              </ThemedText>
            ) : null}
            {ocupado ? (
              <ThemedText variant="caption" color="textMuted">
                Guardando…
              </ThemedText>
            ) : null}
          </ScrollView>
        )}

        {/* Selectores */}
        <OptionPickerModal
          visible={areaPicker}
          title="Asignar a un área"
          options={(data?.areas ?? []).map((a) => ({ id: a.id, label: a.nombre, helper: AREA_TIPO_LABEL[a.tipo] }))}
          selectedIds={v?.areaId ? [v.areaId] : []}
          onChange={(ids) => ejecutar(() => asignarVehiculoAArea(vehicleId, ids[0] ?? null))}
          onClose={() => setAreaPicker(false)}
        />
        <OptionPickerModal
          visible={principalPicker}
          title="Conductor principal"
          options={(data?.usuarios ?? []).map((u) => ({ id: u.id, label: u.nombre }))}
          selectedIds={v?.conductorPrincipalId ? [v.conductorPrincipalId] : []}
          onChange={(ids) => ejecutar(() => asignarConductorPrincipal(vehicleId, ids[0] ?? null))}
          onClose={() => setPrincipalPicker(false)}
        />
        <OptionPickerModal
          visible={secundarioPicker}
          title="Autorizar secundario"
          options={elegibles.map((u) => ({ id: u.id, label: u.nombre }))}
          selectedIds={[]}
          onChange={(ids) => {
            const userId = ids[0];
            if (!userId) return;
            ejecutar(async () => {
              const r = await autorizarSecundario(vehicleId, userId);
              setPinNuevo({ nombre: r.nombre, pin: r.pin });
            });
          }}
          onClose={() => setSecundarioPicker(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex1: { flex: 1, minWidth: 0 },
  hero: { flexDirection: 'row', alignItems: 'center' },
  fotoTile: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { flexGrow: 1, flexBasis: '42%', gap: 2 },
});
