import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { ActionTile } from '@/components/action-tile';
import { AdminHeader } from '@/components/admin-header';
import { AnimatedNumber } from '@/components/animated-number';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { OTStatusBadge } from '@/components/ot-status-badge';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { TabIcon } from '@/components/tab-icon';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  crearOrdenDeTrabajo,
  getAlertasPredictivas,
  getFlotaVehiculos,
  getMantenimientoCorrectivo,
  getMantenimientoResumen,
  getPlanesPreventivos,
  type AlertaPredictiva,
  type MantenimientoResumen,
  type PlanEstado,
  type PlanPreventivo,
} from '@/services';
import { useAdmin } from '@/session';
import { useTheme, type ColorTokens } from '@/theme';
import type { FleetVehicle, WorkOrderListItem } from '@/types';

type Vista = 'correctivo' | 'preventivo' | 'predictivo';

const TIPO_LABEL: Record<Vista, string> = {
  correctivo: 'Correctivo',
  preventivo: 'Preventivo',
  predictivo: 'Predictivo',
};

const TIPO_HINT: Record<Vista, string> = {
  correctivo: 'ODT por fallas reportadas',
  preventivo: 'Planes por km o fecha',
  predictivo: 'Anomalías de la telemetría',
};

const PLAN_VISTA: Record<PlanEstado, { tone: keyof ColorTokens; label: string }> = {
  al_dia: { tone: 'success', label: 'Al día' },
  proximo: { tone: 'warning', label: 'Próximo' },
  vencido: { tone: 'danger', label: 'Vencido' },
};

type MantData = {
  resumen: MantenimientoResumen;
  correctivo: WorkOrderListItem[];
  preventivo: PlanPreventivo[];
  predictivo: AlertaPredictiva[];
  flota: FleetVehicle[];
};

function fecha(iso: string): string {
  return new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Ícono de mantenimiento (llave) con tinte del color de urgencia. */
function WrenchIcon({ tone }: { tone: keyof ColorTokens }) {
  const { colors, radii } = useTheme();
  return (
    <View style={[styles.leadIcon, { borderRadius: radii.md }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors[tone], opacity: 0.14, borderRadius: radii.md }]} />
      <TabIcon name="ot" color={colors[tone]} size={20} />
    </View>
  );
}

/**
 * MANTENIMIENTO (Tablero 2 · Módulo 5), separado POR FUNCIÓN (directriz PDF-2):
 * arriba las acciones con su botón cada una — Nueva ODT (solo crea ODT),
 * Alertas (su tab con toda su lógica) y Reglas — y abajo los MANTENIMIENTOS:
 * un desplegable con el tipo (correctivo/preventivo/predictivo) que lista los
 * vehículos, y al abrir uno se ven sus tareas (ODT) de ese tipo.
 */
export default function AdminMantenimientoScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const { empresaId } = useAdmin();
  const router = useRouter();

  // Tipo de mantenimiento elegido (desplegable) y vehículo expandido.
  const [vista, setVista] = useState<Vista>('correctivo');
  const [tipoPickerVisible, setTipoPickerVisible] = useState(false);
  const [vehAbierto, setVehAbierto] = useState<string | null>(null);

  const { data, estado, recargar } = useAsyncData<MantData>(
    async () => {
      const [resumen, correctivo, preventivo, predictivo, flota] = await Promise.all([
        getMantenimientoResumen(empresaId ?? ''),
        getMantenimientoCorrectivo(empresaId ?? ''),
        getPlanesPreventivos(empresaId ?? ''),
        getAlertasPredictivas(empresaId ?? ''),
        getFlotaVehiculos(empresaId ?? ''),
      ]);
      return { resumen, correctivo, preventivo, predictivo, flota };
    },
    [empresaId],
    { onFocus: true },
  );

  // Nueva ODT manual (la registra el supervisor, no un conductor).
  const [creandoOdt, setCreandoOdt] = useState(false);
  const [odtVehicleId, setOdtVehicleId] = useState<string | null>(null);
  const [odtDescripcion, setOdtDescripcion] = useState('');
  const [odtPickerVisible, setOdtPickerVisible] = useState(false);
  const [odtEnviando, setOdtEnviando] = useState(false);
  const [odtError, setOdtError] = useState<string | null>(null);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  async function onCrearOdt() {
    if (odtEnviando || !odtVehicleId || !odtDescripcion.trim()) return;
    setOdtError(null);
    setOdtEnviando(true);
    try {
      await crearOrdenDeTrabajo({
        vehicleId: odtVehicleId,
        driverId: user?.id ?? '',
        descripcion: odtDescripcion,
        ubicacionTexto: 'Registrada desde el panel',
        evidenciaUris: [],
      });
      setOdtVehicleId(null);
      setOdtDescripcion('');
      setCreandoOdt(false);
      recargar();
    } catch (e) {
      setOdtError(e instanceof Error ? e.message : 'No se pudo crear la ODT.');
    } finally {
      setOdtEnviando(false);
    }
  }

  const abiertas = (data?.correctivo ?? []).filter((o) => o.estado !== 'cerrada');
  const preventivo = data?.preventivo ?? [];
  const predictivo = data?.predictivo ?? [];
  const resumen = data?.resumen;
  const flota = data?.flota ?? [];
  const odtVehiculoLabel = odtVehicleId
    ? (() => {
        const f = flota.find((x) => x.vehicle.id === odtVehicleId);
        return f ? `${f.vehicle.alias ?? f.vehicle.numero} · ${f.vehicle.marca} ${f.vehicle.modelo}` : '1 unidad';
      })()
    : 'Elige la unidad';

  const stats = resumen
    ? [
        { label: 'ODT abiertas', value: resumen.otAbiertas, tone: (resumen.otAbiertas > 0 ? 'warning' : 'text') as keyof ColorTokens },
        { label: 'Prev. próximos', value: resumen.preventivosProximos, tone: 'warning' as keyof ColorTokens },
        { label: 'Prev. vencidos', value: resumen.preventivosVencidos, tone: (resumen.preventivosVencidos > 0 ? 'danger' : 'text') as keyof ColorTokens },
        { label: 'Predictivas', value: resumen.predictivas, tone: (resumen.predictivas > 0 ? 'warning' : 'text') as keyof ColorTokens },
      ]
    : [];

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AdminHeader seccion="Mantenimiento" />

        {!resumen ? (
          estado === 'error' ? (
            <ErrorState description="No pudimos cargar el mantenimiento." onRetry={recargar} />
          ) : (
            <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
              <Card style={[styles.grid, { gap: spacing.lg }]}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.stat}>
                    <Skeleton width="45%" height={24} />
                    <View style={{ height: 4 }} />
                    <Skeleton width="75%" height={12} />
                  </View>
                ))}
              </Card>
              <Skeleton height={44} radius={radii.md} />
              {[0, 1, 2].map((i) => (
                <Card key={i} style={{ gap: spacing.sm }}>
                  <Skeleton width="55%" height={16} />
                  <Skeleton width="85%" height={12} />
                </Card>
              ))}
            </View>
          )
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            {/* Resumen: un solo card con 4 stats (número que cuenta + color). */}
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

            {/* Acciones (ícono-primero): cada función con su propio botón. */}
            <View style={[styles.tools, { gap: spacing.sm }]}>
              <ActionTile
                icon="ot"
                label={creandoOdt ? 'Cerrar' : 'Nueva ODT'}
                style={styles.toolBtn}
                onPress={() => setCreandoOdt((v) => !v)}
              />
              <ActionTile
                icon="mensaje"
                label="Alertas"
                style={styles.toolBtn}
                onPress={() => router.navigate({ pathname: '/notificaciones', params: { companyId: empresaId ?? '' } })}
              />
              <ActionTile
                icon="alertas"
                label="Reglas"
                style={styles.toolBtn}
                onPress={() => router.navigate({ pathname: '/reglas-alerta', params: { companyId: empresaId ?? '' } })}
              />
            </View>

            {/* Nueva ODT: SOLO crea órdenes de trabajo (nada más). */}
            {creandoOdt ? (
              <Card style={{ gap: spacing.md }}>
                <PickerField label="Unidad" value={odtVehiculoLabel} onPress={() => setOdtPickerVisible(true)} />
                <TextField
                  label="Descripción"
                  placeholder="Qué hay que atender"
                  value={odtDescripcion}
                  onChangeText={setOdtDescripcion}
                  multiline
                  error={odtError ?? undefined}
                />
                <Button
                  label="Crear ODT"
                  icon="ot"
                  onPress={onCrearOdt}
                  loading={odtEnviando}
                  disabled={!odtVehicleId || !odtDescripcion.trim()}
                />
              </Card>
            ) : null}

            {/* MANTENIMIENTOS: tipo desplegable → vehículos → sus tareas. */}
            <View style={{ gap: spacing.xs }}>
              <ThemedText variant="overline" color="textMuted">
                Mantenimientos
              </ThemedText>
              <PickerField
                label="Tipo de mantenimiento"
                value={`${TIPO_LABEL[vista]} · ${TIPO_HINT[vista]}`}
                onPress={() => setTipoPickerVisible(true)}
              />
            </View>

            {flota.length === 0 ? (
              <EmptyState title="Sin vehículos" description="Aún no hay vehículos en esta empresa." />
            ) : (
              <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                {flota.map((f, i) => {
                  const vid = f.vehicle.id;
                  const tareasOdt = vista === 'correctivo' ? abiertas.filter((o) => o.vehicleId === vid) : [];
                  const tareasPrev = vista === 'preventivo' ? preventivo.filter((p) => p.vehicleId === vid) : [];
                  const tareasPred = vista === 'predictivo' ? predictivo.filter((a) => a.vehicleId === vid) : [];
                  const total = tareasOdt.length + tareasPrev.length + tareasPred.length;
                  const abierto = vehAbierto === vid;
                  return (
                    <View
                      key={vid}
                      style={{
                        borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                        borderTopColor: colors.border,
                      }}>
                      {/* Fila del vehículo: alias + cuántas tareas de este tipo tiene. */}
                      <PressableScale
                        onPress={() => setVehAbierto(abierto ? null : vid)}
                        accessibilityRole="button"
                        accessibilityLabel={`${abierto ? 'Cerrar' : 'Abrir'} las tareas de ${f.vehicle.alias ?? f.vehicle.numero}`}
                        style={[styles.row, { gap: spacing.md, paddingVertical: spacing.md }]}>
                        <WrenchIcon tone={total > 0 ? 'warning' : 'textMuted'} />
                        <View style={styles.flex1}>
                          <ThemedText variant="subtitle">{f.vehicle.alias ?? f.vehicle.numero}</ThemedText>
                          <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
                            {`${f.vehicle.marca} ${f.vehicle.modelo} · ${f.vehicle.placa}`}
                          </ThemedText>
                        </View>
                        <Chip
                          tone={total > 0 ? 'warning' : 'success'}
                          label={total > 0 ? `${total} tarea${total > 1 ? 's' : ''}` : 'Al día'}
                        />
                        <ThemedText variant="body" color="textMuted">
                          {abierto ? '▾' : '›'}
                        </ThemedText>
                      </PressableScale>

                      {/* Tareas del tipo elegido en ESTE vehículo. */}
                      {abierto ? (
                        <View style={{ paddingBottom: spacing.md, gap: spacing.sm }}>
                          {total === 0 ? (
                            <ThemedText variant="caption" color="textMuted">
                              {`Sin tareas de mantenimiento ${TIPO_LABEL[vista].toLowerCase()} en esta unidad.`}
                            </ThemedText>
                          ) : null}
                          {tareasOdt.map((ot) => (
                            <PressableScale
                              key={ot.id}
                              onPress={() => router.navigate({ pathname: '/orden', params: { id: ot.id, companyId: empresaId ?? '' } })}
                              accessibilityRole="button"
                              accessibilityLabel={`Abrir ODT de ${ot.vehicleLabel}`}
                              style={[{ backgroundColor: colors.surfaceSunken, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs }]}>
                              <View style={[styles.rowBetween, { gap: spacing.sm }]}>
                                <ThemedText variant="button" numberOfLines={1} style={styles.flex1}>
                                  {ot.descripcion}
                                </ThemedText>
                                <OTStatusBadge estado={ot.estado} />
                              </View>
                              <View style={styles.rowBetween}>
                                <ThemedText variant="caption" color="textMuted">
                                  {ot.driverName}
                                </ThemedText>
                                <ThemedText variant="caption" color="textMuted">
                                  {fecha(ot.creadaEn)}
                                </ThemedText>
                              </View>
                            </PressableScale>
                          ))}
                          {tareasPrev.map((p) => {
                            const v = PLAN_VISTA[p.estado];
                            return (
                              <View
                                key={`${p.vehicleId}-${p.servicio}`}
                                style={[styles.rowBetween, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm }]}>
                                <View style={styles.flex1}>
                                  <ThemedText variant="button">{p.servicio}</ThemedText>
                                  <ThemedText variant="caption" color="textMuted">
                                    {p.detalle}
                                  </ThemedText>
                                </View>
                                <Chip tone={v.tone} label={v.label} />
                              </View>
                            );
                          })}
                          {tareasPred.map((a) => {
                            const tone: keyof ColorTokens = a.severidad === 'critica' ? 'danger' : 'warning';
                            return (
                              <View
                                key={`${a.vehicleId}-${a.titulo}`}
                                style={[styles.rowBetween, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm }]}>
                                <View style={styles.flex1}>
                                  <ThemedText variant="button">{a.titulo}</ThemedText>
                                  <ThemedText variant="caption" color="textMuted">
                                    {a.detalle}
                                  </ThemedText>
                                </View>
                                <Chip tone={tone} label={a.severidad === 'critica' ? 'Crítica' : 'Advertencia'} />
                              </View>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </Card>
            )}

            <ThemedText variant="caption" color="textMuted">
              El preventivo/predictivo es simulado por ahora; con el GPS y el backend saldrá de km,
              horas de motor y sensores reales.
            </ThemedText>
          </ScrollView>
        )}

        {/* Modal: tipo de mantenimiento (lista desplegable). */}
        <OptionPickerModal
          visible={tipoPickerVisible}
          title="Tipo de mantenimiento"
          options={[
            { id: 'correctivo', label: `Correctivo (${abiertas.length})`, helper: TIPO_HINT.correctivo },
            { id: 'preventivo', label: `Preventivo (${preventivo.length})`, helper: TIPO_HINT.preventivo },
            { id: 'predictivo', label: `Predictivo (${predictivo.length})`, helper: TIPO_HINT.predictivo },
          ]}
          selectedIds={[vista]}
          onChange={(ids) => {
            if (ids[0]) setVista(ids[0] as Vista);
            setVehAbierto(null);
          }}
          onClose={() => setTipoPickerVisible(false)}
        />

        {/* Modal: unidad de la ODT manual. */}
        <OptionPickerModal
          visible={odtPickerVisible}
          title="Elige la unidad"
          options={flota.map((f) => ({
            id: f.vehicle.id,
            label: `${f.vehicle.alias ?? f.vehicle.numero} · ${f.vehicle.marca} ${f.vehicle.modelo}`,
            helper: f.conductorActual ?? 'Sin conductor',
          }))}
          selectedIds={odtVehicleId ? [odtVehicleId] : []}
          onChange={(ids) => setOdtVehicleId(ids[0] ?? null)}
          onClose={() => setOdtPickerVisible(false)}
        />
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
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leadIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  flex1: { flex: 1 },
  // Grilla de acciones ícono-primero (mismo lenguaje que el menú de empresas).
  tools: { flexDirection: 'row', flexWrap: 'wrap' },
  toolBtn: { flexGrow: 1, flexBasis: 104 },
});
