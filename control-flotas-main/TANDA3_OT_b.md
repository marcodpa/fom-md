# TANDA 3 — Volcado íntegro de archivos (Órdenes de Trabajo) — Parte 2 de 2

> Continuación de `TANDA3_OT.md`. Parte 2: pantallas + componente de badge + sección NOTAS.

---

### `src/app/orden.tsx`

```tsx
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { OTStatusBadge } from '@/components/ot-status-badge';
import { SegmentedControl, type SegmentOption } from '@/components/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { actualizarEstadoOrden, getCompanyBrandById, getOrdenDeTrabajo } from '@/services';
import { useTheme, useThemeController } from '@/theme';
import { WORK_ORDER_STATUSES, type WorkOrderListItem, type WorkOrderStatus } from '@/types';

/** Opciones del selector de estado, en orden de avance. */
const ESTADO_OPTIONS: SegmentOption<WorkOrderStatus>[] = WORK_ORDER_STATUSES.map((e) => ({
  value: e,
  label: e,
}));

function formatFechaLarga(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Detalle de una ORDEN DE TRABAJO: vehículo, quién la generó, descripción,
 * evidencia (fotos), fecha/hora y ubicación. El admin puede avanzar su estado
 * (Enviada → Revisada → En proceso → Realizada), brief §8.
 */
export default function OrdenScreen() {
  const { colors, spacing, radii } = useTheme();
  const { setBrand } = useThemeController();
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; companyId?: string }>();
  const id = params.id || null;
  const companyId = params.companyId || null;

  const [orden, setOrden] = useState<WorkOrderListItem | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  // Campos opcionales de la solución (al marcar Realizada).
  const [notaSolucion, setNotaSolucion] = useState('');
  const [costo, setCosto] = useState('');
  const [guardandoSolucion, setGuardandoSolucion] = useState(false);

  // Marca de la empresa al enfocar (mantiene el panel pintado).
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

  // Carga la OT por id.
  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const ot = await getOrdenDeTrabajo(id);
      if (!active) return;
      setOrden(ot);
      setCargando(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // Prellena los campos de solución con lo que ya tenga la OT.
  useEffect(() => {
    setNotaSolucion(orden?.notaSolucion ?? '');
    setCosto(orden?.costo != null ? String(orden.costo) : '');
  }, [orden?.id, orden?.notaSolucion, orden?.costo]);

  async function cambiarEstado(estado: WorkOrderStatus) {
    if (!orden || guardando || estado === orden.estado) return;
    setGuardando(true);
    try {
      const actualizada = await actualizarEstadoOrden(orden.id, estado);
      setOrden(actualizada);
    } finally {
      setGuardando(false);
    }
  }

  // Guarda la nota de solución y el costo (solo aplica cuando está Realizada).
  async function guardarSolucion() {
    if (!orden || guardandoSolucion) return;
    setGuardandoSolucion(true);
    try {
      const costoNum = costo.trim() ? Number(costo.replace(',', '.')) : undefined;
      const actualizada = await actualizarEstadoOrden(orden.id, 'Realizada', {
        notaSolucion: notaSolucion.trim() || undefined,
        costo: Number.isFinite(costoNum) ? costoNum : undefined,
      });
      setOrden(actualizada);
    } finally {
      setGuardandoSolucion(false);
    }
  }

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esAdmin(user)) return <Redirect href="/" />;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText variant="button" color="primary">
              ‹ Atrás
            </ThemedText>
          </Pressable>
          <ThemedText variant="subtitle">Orden de trabajo</ThemedText>
          <View style={styles.spacer} />
        </View>

        {cargando ? (
          // Esqueleto de carga (en vez de spinner).
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton width="50%" height={24} />
            <Skeleton height={44} radius={radii.md} />
            <Card style={{ gap: spacing.md }}>
              <Skeleton width="35%" height={14} />
              <Skeleton width="80%" height={14} />
              <Skeleton width="60%" height={14} />
              <Skeleton width="90%" height={14} />
            </Card>
            <Skeleton width="40%" height={14} />
            <Skeleton height={150} radius={radii.lg} />
          </View>
        ) : !orden ? (
          <View style={styles.loader}>
            <ThemedText variant="body" color="textMuted">
              No se encontró la orden de trabajo.
            </ThemedText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
              {/* Encabezado: id + estado actual */}
              <View style={[styles.rowBetween, { gap: spacing.sm }]}>
                <View style={styles.flex1}>
                  <ThemedText variant="overline" color="textMuted">
                    {orden.id}
                  </ThemedText>
                  <ThemedText variant="title">{orden.vehicleLabel}</ThemedText>
                </View>
                <OTStatusBadge estado={orden.estado} />
              </View>

              {/* Cambiar estado (Enviada → Revisada → En proceso → Realizada) */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  Estado
                </ThemedText>
                <SegmentedControl
                  options={ESTADO_OPTIONS}
                  value={orden.estado}
                  onChange={cambiarEstado}
                />
                {guardando ? (
                  <ThemedText variant="caption" color="textMuted">
                    Guardando…
                  </ThemedText>
                ) : null}
              </View>

              {/* Datos de la OT */}
              <Card style={{ gap: spacing.md }}>
                <ThemedText variant="overline" color="textMuted">
                  Detalle
                </ThemedText>
                {/* Autor: nombre clickeable → su perfil. */}
                <View style={[styles.infoRow, { gap: spacing.md }]}>
                  <ThemedText variant="body" color="textSecondary" style={styles.infoLabel}>
                    Generó
                  </ThemedText>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/perfil',
                        params: {
                          userId: orden.driverId,
                          nombre: orden.driverName,
                          companyId: companyId ?? '',
                        },
                      })
                    }>
                    <ThemedText variant="body" color="primary" style={styles.infoValue}>
                      {orden.driverName} ›
                    </ThemedText>
                  </Pressable>
                </View>
                <InfoRow label="Tipo de falla" value={orden.tipoFalla ?? 'No especificado'} />
                <InfoRow label="Fecha y hora" value={formatFechaLarga(orden.creadaEn)} />
                <InfoRow label="Ubicación" value={orden.ubicacionTexto} />
                <View style={{ gap: spacing.xs }}>
                  <ThemedText variant="caption" color="textSecondary">
                    Descripción
                  </ThemedText>
                  <ThemedText variant="body">{orden.descripcion}</ThemedText>
                </View>
              </Card>

              {/* Solución: solo cuando la OT está Realizada (nota + costo opcionales). */}
              {orden.estado === 'Realizada' ? (
                <Card style={{ gap: spacing.md }}>
                  <ThemedText variant="overline" color="textMuted">
                    Solución
                  </ThemedText>
                  <TextField
                    label="Nota de solución (opcional)"
                    value={notaSolucion}
                    onChangeText={setNotaSolucion}
                    placeholder="Qué se hizo para resolver la falla…"
                    multiline
                  />
                  <TextField
                    label="Costo (opcional)"
                    value={costo}
                    onChangeText={setCosto}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                  />
                  <Button
                    label={guardandoSolucion ? 'Guardando…' : 'Guardar solución'}
                    onPress={guardarSolucion}
                    loading={guardandoSolucion}
                  />
                </Card>
              ) : null}

              {/* Evidencia (fotos) */}
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  Evidencia
                </ThemedText>
                {orden.evidenciaUrls && orden.evidenciaUrls.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: spacing.md }}>
                    {orden.evidenciaUrls.map((url) => (
                      <Image
                        key={url}
                        source={{ uri: url }}
                        style={[
                          styles.evidence,
                          { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                        ]}
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <Card>
                    <ThemedText variant="body" color="textMuted">
                      Sin fotos adjuntas.
                    </ThemedText>
                  </Card>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/** Fila etiqueta–valor. */
function InfoRow({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.infoRow, { gap: spacing.md }]}>
      <ThemedText variant="body" color="textSecondary" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText variant="body" style={styles.infoValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  spacer: { width: 52 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scrollContent: { paddingBottom: 32 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex1: { flex: 1 },
  evidence: { width: 220, height: 150, borderWidth: StyleSheet.hairlineWidth },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoLabel: { flexShrink: 0 },
  infoValue: { flexShrink: 1, textAlign: 'right' },
});
```

---

### `src/app/panel/mantenimiento.tsx`

```tsx
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { AdminHeader } from '@/components/admin-header';
import { Card } from '@/components/card';
import { MetricCard } from '@/components/metric-card';
import { OTStatusBadge } from '@/components/ot-status-badge';
import { PressableScale } from '@/components/pressable-scale';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  getAlertasPredictivas,
  getMantenimientoCorrectivo,
  getMantenimientoResumen,
  getPlanesPreventivos,
  type AlertaPredictiva,
  type MantenimientoResumen,
  type PlanEstado,
  type PlanPreventivo,
} from '@/services';
import { useAdmin, useTenant } from '@/session';
import { useTheme, type ColorTokens } from '@/theme';
import type { WorkOrderListItem } from '@/types';

type Vista = 'correctivo' | 'preventivo' | 'predictivo';

const PLAN_VISTA: Record<PlanEstado, { tone: keyof ColorTokens; label: string }> = {
  al_dia: { tone: 'success', label: 'Al día' },
  proximo: { tone: 'warning', label: 'Próximo' },
  vencido: { tone: 'danger', label: 'Vencido' },
};

function fecha(iso: string): string {
  return new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * MANTENIMIENTO (Tablero 2 · Módulo 5): gestiona los TRES tipos —
 * correctivo (las OT que reportan los conductores, que llegan solas),
 * preventivo (por km/fecha) y predictivo (anomalías) — con un resumen arriba.
 * Todo pasa por la capa de servicios y refleja lo que hacen los conductores.
 */
export default function AdminMantenimientoScreen() {
  const { colors, spacing } = useTheme();
  const { user, status } = useAuth();
  const { empresaId } = useAdmin();
  const { sede } = useTenant();
  const router = useRouter();

  const [resumen, setResumen] = useState<MantenimientoResumen | null>(null);
  const [correctivo, setCorrectivo] = useState<WorkOrderListItem[]>([]);
  const [preventivo, setPreventivo] = useState<PlanPreventivo[]>([]);
  const [predictivo, setPredictivo] = useState<AlertaPredictiva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<Vista>('correctivo');

  useFocusEffect(
    useCallback(() => {
      if (!empresaId) return;
      let active = true;
      setCargando(true);
      Promise.all([
        getMantenimientoResumen(empresaId),
        getMantenimientoCorrectivo(empresaId),
        getPlanesPreventivos(empresaId),
        getAlertasPredictivas(empresaId),
      ]).then(([r, c, p, pr]) => {
        if (!active) return;
        setResumen(r);
        setCorrectivo(c);
        setPreventivo(p);
        setPredictivo(pr);
        setCargando(false);
      });
      return () => {
        active = false;
      };
    }, [empresaId]),
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  const abiertas = correctivo.filter((o) => o.estado !== 'Realizada');

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AdminHeader seccion="Mantenimiento" sedeNombre={sede?.nombre} />

        {cargando || !resumen ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            {/* Resumen */}
            <View style={[styles.grid, { gap: spacing.md }]}>
              <MetricCard style={styles.cell} label="OT abiertas" value={`${resumen.otAbiertas}`} valueColor={resumen.otAbiertas > 0 ? 'warning' : 'text'} />
              <MetricCard style={styles.cell} label="Preventivos próximos" value={`${resumen.preventivosProximos}`} valueColor="warning" />
              <MetricCard style={styles.cell} label="Preventivos vencidos" value={`${resumen.preventivosVencidos}`} valueColor={resumen.preventivosVencidos > 0 ? 'danger' : 'text'} />
              <MetricCard style={styles.cell} label="Alertas predictivas" value={`${resumen.predictivas}`} valueColor={resumen.predictivas > 0 ? 'warning' : 'text'} />
            </View>

            <SegmentedControl
              options={[
                { value: 'correctivo', label: 'Correctivo' },
                { value: 'preventivo', label: 'Preventivo' },
                { value: 'predictivo', label: 'Predictivo' },
              ]}
              value={vista}
              onChange={setVista}
            />

            {/* CORRECTIVO: las OT que reportan los conductores. */}
            {vista === 'correctivo' ? (
              abiertas.length === 0 ? (
                <Card>
                  <ThemedText variant="body" color="textMuted">
                    No hay OT abiertas. Cuando un conductor reporte una falla, aparece aquí.
                  </ThemedText>
                </Card>
              ) : (
                abiertas.map((ot) => (
                  <PressableScale
                    key={ot.id}
                    onPress={() => router.push({ pathname: '/orden', params: { id: ot.id, companyId: empresaId ?? '' } })}>
                    <Card style={{ gap: spacing.xs }}>
                      <View style={styles.rowBetween}>
                        <ThemedText variant="subtitle">{ot.vehicleLabel}</ThemedText>
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

            {/* PREVENTIVO: planes por km/fecha. */}
            {vista === 'preventivo' ? (
              <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                {preventivo.map((p, i) => {
                  const v = PLAN_VISTA[p.estado];
                  return (
                    <View
                      key={p.vehicleId}
                      style={[
                        styles.row,
                        { gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border },
                      ]}>
                      <View style={styles.flex1}>
                        <ThemedText variant="subtitle">{p.vehicleLabel}</ThemedText>
                        <ThemedText variant="caption" color="textMuted">
                          {`${p.servicio} · ${p.detalle}`}
                        </ThemedText>
                      </View>
                      <ThemedText variant="overline" color={v.tone}>
                        {v.label}
                      </ThemedText>
                    </View>
                  );
                })}
              </Card>
            ) : null}

            {/* PREDICTIVO: anomalías. */}
            {vista === 'predictivo' ? (
              predictivo.length === 0 ? (
                <Card>
                  <ThemedText variant="body" color="textMuted">
                    Sin alertas predictivas. La telemetría no detecta anomalías.
                  </ThemedText>
                </Card>
              ) : (
                predictivo.map((a) => (
                  <Card key={a.vehicleId} style={[styles.predRow, { gap: spacing.md }]}>
                    <View style={[styles.bar, { backgroundColor: a.severidad === 'critica' ? colors.danger : colors.warning }]} />
                    <View style={styles.flex1}>
                      <ThemedText variant="subtitle">{a.titulo}</ThemedText>
                      <ThemedText variant="caption" color="textSecondary">
                        {`${a.vehicleLabel} · ${a.detalle}`}
                      </ThemedText>
                    </View>
                  </Card>
                ))
              )
            ) : null}

            <ThemedText variant="caption" color="textMuted">
              El preventivo/predictivo es simulado por ahora; con el GPS y el backend saldrá de km,
              horas de motor y sensores reales.
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
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flexGrow: 1, flexBasis: 150, minWidth: 140 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  predRow: { flexDirection: 'row', alignItems: 'stretch' },
  bar: { width: 4, borderRadius: 2 },
  flex1: { flex: 1 },
});
```

---

### `src/app/panel/index.tsx`

```tsx
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { AdminHeader } from '@/components/admin-header';
import { Appear } from '@/components/appear';
import { Card } from '@/components/card';
import { MapaVehiculo } from '@/components/map-vehiculo';
import { MetricCard } from '@/components/metric-card';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getFlotaVehiculos, getGruposDeFlota, getResumenFlota } from '@/services';
import { useAdmin, useTenant } from '@/session';
import { useTheme } from '@/theme';
import type { FleetGroup, FleetSummary, FleetVehicle, MapMarker } from '@/types';

/**
 * RESUMEN del panel de admin: los indicadores clave de la flota y el mapa en
 * vivo (Centro de control, Tablero 2 · Módulo 1/2). "Operación por excepciones":
 * resalta OT abiertas y unidades paradas. Todo pasa por la capa de servicios.
 */
export default function AdminResumenScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const { empresaId } = useAdmin();
  const { sede } = useTenant();
  const router = useRouter();

  const [resumen, setResumen] = useState<FleetSummary | null>(null);
  const [flota, setFlota] = useState<FleetVehicle[]>([]);
  const [grupos, setGrupos] = useState<FleetGroup[]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!empresaId) return;
      let active = true;
      setCargando(true);
      Promise.all([
        getResumenFlota(empresaId),
        getFlotaVehiculos(empresaId),
        getGruposDeFlota(empresaId),
      ]).then(([r, f, g]) => {
        if (!active) return;
        setResumen(r);
        setFlota(f);
        setGrupos(g);
        setCargando(false);
      });
      return () => {
        active = false;
      };
    }, [empresaId]),
  );

  const markers = useMemo<MapMarker[]>(
    () =>
      flota.map((f) => ({
        id: f.vehicle.id,
        label: f.vehicle.numero,
        coords: f.coords,
        live: f.estado === 'en_marcha',
      })),
    [flota],
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  const sel = flota.find((f) => f.vehicle.id === seleccion);

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AdminHeader seccion="Resumen" sedeNombre={sede?.nombre} />

        {cargando || !resumen ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            {/* KPIs */}
            <Appear delay={40} style={[styles.grid, { gap: spacing.md }]}>
              <MetricCard style={styles.cell} label="Vehículos" value={`${flota.length}`} />
              <MetricCard style={styles.cell} label="En marcha" value={`${resumen.enMarcha}`} valueColor="success" />
              <MetricCard style={styles.cell} label="Parados" value={`${resumen.parados}`} valueColor="textSecondary" />
              <PressableScale style={styles.cell} onPress={() => router.push('/panel/mantenimiento')}>
                <MetricCard
                  label="Órdenes de trabajo"
                  value={`${resumen.reportesAbiertos}`}
                  helper="Abiertas · ver ›"
                  valueColor={resumen.reportesAbiertos > 0 ? 'warning' : 'text'}
                />
              </PressableScale>
            </Appear>

            {/* Mapa de la flota */}
            <Appear delay={120} style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                Flota en el mapa
              </ThemedText>
              <MapaVehiculo markers={markers} onMarkerPress={setSeleccion} style={[styles.map, { borderRadius: radii.lg }]} />

              {sel ? (
                <Card style={{ gap: spacing.sm }}>
                  <View style={styles.rowBetween}>
                    <View style={[styles.inline, { gap: spacing.xs }]}>
                      <View style={[styles.dot, { backgroundColor: sel.estado === 'en_marcha' ? colors.success : colors.textMuted }]} />
                      <ThemedText variant="subtitle">{sel.estado === 'en_marcha' ? 'En marcha' : 'Parado'}</ThemedText>
                    </View>
                    <Pressable onPress={() => setSeleccion(null)} hitSlop={8}>
                      <ThemedText variant="button" color="textMuted">
                        ✕
                      </ThemedText>
                    </Pressable>
                  </View>
                  <ThemedText variant="body" color="textSecondary">
                    {`${sel.vehicle.numero} · ${sel.vehicle.marca} ${sel.vehicle.modelo}`}
                  </ThemedText>
                  <ThemedText variant="caption" color="textMuted">
                    {`Grupo: ${grupos.find((g) => g.id === sel.vehicle.groupId)?.name ?? 'Sin grupo'}`}
                  </ThemedText>
                  {sel.conductorActual ? (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/perfil',
                          params: { userId: sel.conductorId ?? '', nombre: sel.conductorActual ?? '', companyId: empresaId ?? '' },
                        })
                      }>
                      <ThemedText variant="body" color="primary">
                        {`Conductor: ${sel.conductorActual} ›`}
                      </ThemedText>
                    </Pressable>
                  ) : (
                    <ThemedText variant="caption" color="textMuted">
                      Sin conductor
                    </ThemedText>
                  )}
                </Card>
              ) : (
                <ThemedText variant="caption" color="textMuted">
                  Toca un vehículo en el mapa para ver su detalle.
                </ThemedText>
              )}
            </Appear>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flexGrow: 1, flexBasis: 150, minWidth: 140 },
  map: { height: 300, borderWidth: 0 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
```

---

### `src/components/ot-status-badge.tsx`

```tsx
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme, type ColorTokens } from '@/theme';
import type { WorkOrderStatus } from '@/types';

/** Color semántico del tema para cada estado de OT (brief §8). */
export function otStatusColor(estado: WorkOrderStatus): keyof ColorTokens {
  if (estado === 'Realizada') return 'success';
  if (estado === 'En proceso') return 'warning';
  if (estado === 'Revisada') return 'warning';
  return 'info'; // Enviada: recién llegada, aún sin abrir.
}

/** Badge con el estado de una orden de trabajo, pintado con el color del tema. */
export function OTStatusBadge({ estado }: { estado: WorkOrderStatus }) {
  const { colors, radii, spacing } = useTheme();
  const tone = otStatusColor(estado);
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors[`${tone}Surface` as keyof ColorTokens],
          borderRadius: radii.pill,
          paddingHorizontal: spacing.sm,
        },
      ]}>
      <ThemedText variant="overline" color={tone}>
        {estado}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingVertical: 2, justifyContent: 'center', alignSelf: 'flex-start' },
});
```

---

## NOTAS

### 1. ¿Qué pantalla(s) navegan hacia `orden.tsx` y cómo pasan el id de la OT?

- **Solo una pantalla** navega a `/orden`: **`src/app/panel/mantenimiento.tsx`**, en la pestaña
  **Correctivo**, cuando el admin toca una tarjeta de OT abierta (línea ~130):

  ```tsx
  router.push({ pathname: '/orden', params: { id: ot.id, companyId: empresaId ?? '' } })
  ```

- El id se pasa como **parámetro de ruta** (forma objeto de expo-router, `params`), NO como query
  string manual ni como segmento dinámico de archivo. La ruta es estática (`src/app/orden.tsx` →
  `/orden`); los valores viajan en `params`.
- Se pasan **dos** parámetros: `id` (id de la OT, obligatorio para cargarla) y `companyId` (para que
  `orden.tsx` re-pinte el panel con la marca de esa empresa vía `getCompanyBrandById`).
- `orden.tsx` los lee con:

  ```tsx
  const params = useLocalSearchParams<{ id?: string; companyId?: string }>();
  const id = params.id || null;
  const companyId = params.companyId || null;
  ```

  Con `id` llama a `getOrdenDeTrabajo(id)`; si no hay `id`, no carga nada. El `companyId` también se
  reenvía al abrir el perfil del autor de la OT (`/perfil`).

### 2. Estado de `orden.tsx`

**Está completamente implementada** (no es placeholder ni está a medio hacer). Incluye:

- Carga de la OT por `id` con `getOrdenDeTrabajo` (+ esqueleto de carga y estado "no encontrada").
- Encabezado con id de la OT, etiqueta del vehículo y `OTStatusBadge`.
- **Cambio de estado** por el admin con `SegmentedControl` (Enviada → Revisada → En proceso →
  Realizada) vía `actualizarEstadoOrden`.
- Tarjeta de **Detalle**: autor (nombre clickeable → `/perfil`), tipo de falla, fecha/hora,
  ubicación y descripción.
- Tarjeta de **Solución** (solo cuando la OT está `Realizada`): campos opcionales de nota de
  solución y costo, que persisten con `actualizarEstadoOrden(id, 'Realizada', { notaSolucion, costo })`.
- **Evidencia**: carrusel horizontal de fotos (`orden.evidenciaUrls`) o aviso "Sin fotos adjuntas".
- Guards: redirige a `/login` si no hay sesión y a `/` si el usuario no es admin.
- Ya lleva el fondo ambiental (`<ThemedView ... ambient>`) del rediseño reciente.

### 3. Otros componentes/listas de OT (relacionados, NO volcados aquí)

- **`src/app/perfil.tsx`** — el expediente del conductor muestra una lista **"OT reportadas"**
  (tarjetas inline con `OTStatusBadge`), cargada con `getOrdenesDeTrabajo(companyId)` filtrada por
  `driverId`. Es el único otro lugar que consume `getOrdenesDeTrabajo` en pantallas.
- **No existe un componente dedicado tipo "OTCard" / "OTList"**: tanto en `mantenimiento.tsx`
  (Correctivo) como en `perfil.tsx`, las filas de OT se arman **inline** con `Card` + `OTStatusBadge`.
  El **Resumen** (`panel/index.tsx`) no usa un componente de OT: muestra el **contador** de OT
  abiertas con el componente genérico `MetricCard` (valor `resumen.reportesAbiertos`, que viene de
  `getResumenFlota`), y su KPI navega a `/panel/mantenimiento` (no a `/orden`).
- **`src/components/ot-status-badge.tsx`** exporta, además del componente `OTStatusBadge`, la función
  auxiliar **`otStatusColor(estado)`** (mapea el estado de la OT a un token de color del tema). Ambos
  se incluyen en el volcado de arriba.
- Nota de datos: el contador de "OT abiertas" cuenta estados `!== 'Realizada'`
  (`reportesAbiertosDe` en `companyService.ts`), y el mismo criterio usa la lista Correctivo de
  `mantenimiento.tsx` (`abiertas = correctivo.filter(o => o.estado !== 'Realizada')`).

*Fin de la Parte 2.*
