import { Redirect, useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { EvidenceField } from '@/components/evidence-field';
import { OTStatusBadge } from '@/components/ot-status-badge';
import { PhotoViewer } from '@/components/photo-viewer';
import { PillButton } from '@/components/pill-button';
import { PressableScale } from '@/components/pressable-scale';
import { SegmentedControl } from '@/components/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  crearAlerta,
  getAlertas,
  getOrdenesDeTrabajo,
  marcarAlertaLeida,
  marcarTodasAlertasLeidas,
} from '@/services';
import { useDriving } from '@/session';
import { useTheme, type ColorTokens } from '@/theme';
import type { Alerta, AlertaCategoria, AlertaSeveridad, WorkOrderListItem } from '@/types';
import { formatFecha, formatHora } from '@/utils/date';

/** Etiqueta legible de la categoría de la alerta. */
const CATEGORIA_LABEL: Record<AlertaCategoria, string> = {
  seguridad: 'Seguridad',
  mantenimiento: 'Mantenimiento',
  documento: 'Documento',
  otro: 'Aviso',
};

/** Ícono guía por categoría (comunica el tipo de un vistazo). */
const CATEGORIA_ICON: Record<AlertaCategoria, TabIconName> = {
  seguridad: 'alertas',
  mantenimiento: 'ot',
  documento: 'inspeccion',
  otro: 'alertas',
};

/** Severidad → token de color del tema. */
function toneSeveridad(sev: AlertaSeveridad): keyof ColorTokens {
  if (sev === 'critica') return 'danger';
  if (sev === 'advertencia') return 'warning';
  return 'info';
}

/**
 * Pestaña MANTENIMIENTO de FOM-DRIVER, en TRES bloques separados (directriz
 * PDF-2): (1) alertas de TU UNIDAD (mantenimiento/seguridad del vehículo
 * asignado o en uso), (2) tus ODT, y (3) alertas PERSONALES (tus documentos,
 * tu perfil) — cosas tuyas, no del vehículo. El conductor crea alertas propias
 * (con fotos) que también ve su supervisor en el panel.
 */
export default function MantenimientoScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const { vehicle } = useDriving();
  const router = useRouter();

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [ordenes, setOrdenes] = useState<WorkOrderListItem[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario de alerta propia (se abre bajo demanda, sin salir de la vista).
  const [creando, setCreando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [severidad, setSeveridad] = useState<AlertaSeveridad>('advertencia');
  const [categoria, setCategoria] = useState<AlertaCategoria>('seguridad');
  const [ambito, setAmbito] = useState<'vehiculo' | 'personal'>('vehiculo');
  const [fotoUris, setFotoUris] = useState<string[]>([]);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Foto abierta a pantalla completa (visor), o null.
  const [fotoAbierta, setFotoAbierta] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [als, ots] = await Promise.all([
      getAlertas(user ?? undefined),
      user?.companyId ? getOrdenesDeTrabajo(user.companyId) : Promise.resolve([]),
    ]);
    // Sus ODT: las que reportó él, o las de la unidad que tiene asignada.
    const mias = ots.filter((o) => o.driverId === user?.id || (vehicle && o.vehicleId === vehicle.id));
    setAlertas(als);
    setOrdenes(mias);
    setCargando(false);
  }, [user, vehicle]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      cargar().then(() => {
        if (!active) return;
      });
      return () => {
        active = false;
      };
    }, [cargar]),
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  const noLeidas = alertas.filter((a) => !a.leida).length;

  // PERSONAL (tus documentos, tu perfil) vs VEHÍCULO (tu unidad): dos listas.
  const ambitoDe = (a: Alerta): 'personal' | 'vehiculo' =>
    a.ambito ?? (a.categoria === 'documento' ? 'personal' : 'vehiculo');
  const alertasUnidad = alertas.filter((a) => ambitoDe(a) === 'vehiculo');
  const alertasPersonales = alertas.filter((a) => ambitoDe(a) === 'personal');

  async function marcarLeida(id: string) {
    // Optimista: se ve leída de inmediato.
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, leida: true } : a)));
    await marcarAlertaLeida(id);
  }

  /** Abre la alerta: la marca leída y, si tiene enlace, navega a él. */
  function abrir(alerta: Alerta) {
    if (!alerta.leida) marcarLeida(alerta.id);
    if (alerta.enlace) router.navigate(alerta.enlace as Href);
  }

  async function marcarTodas() {
    setAlertas((prev) => prev.map((a) => ({ ...a, leida: true })));
    await marcarTodasAlertasLeidas();
  }

  /** Tarjeta de una alerta (misma pieza para la lista de la unidad y la personal). */
  function renderAlerta(alerta: Alerta) {
    const tone = toneSeveridad(alerta.severidad);
    const accent = colors[tone];
    return (
      <PressableScale
        key={alerta.id}
        onPress={() => abrir(alerta)}
        accessibilityRole="button"
        accessibilityLabel={`${alerta.titulo}${alerta.leida ? '' : ', sin leer'}`}>
        <Card style={[styles.cardRow, { gap: spacing.md, opacity: alerta.leida ? 0.7 : 1 }]}>
          {/* Ícono guía por categoría, tintado por severidad. */}
          <View style={[styles.lead, { borderRadius: radii.md }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: accent, opacity: 0.14, borderRadius: radii.md }]} />
            <TabIcon name={CATEGORIA_ICON[alerta.categoria]} color={accent} size={20} />
          </View>
          <View style={styles.flex1}>
            <View style={[styles.titleRow, { gap: spacing.sm }]}>
              <ThemedText variant="subtitle" style={styles.flex1}>
                {alerta.titulo}
              </ThemedText>
              {!alerta.leida ? <View style={[styles.unread, { backgroundColor: accent }]} /> : null}
            </View>
            <ThemedText variant="body" color="textSecondary">
              {alerta.detalle}
            </ThemedText>
            {alerta.fotoUrls && alerta.fotoUrls.length > 0 ? (
              <View style={[styles.fotosRow, { gap: spacing.xs, marginTop: spacing.xs }]}>
                {alerta.fotoUrls.map((url) => (
                  <Pressable
                    key={url}
                    onPress={() => setFotoAbierta(url)}
                    accessibilityRole="imagebutton"
                    accessibilityLabel="Ver foto a pantalla completa">
                    <Image source={{ uri: url }} style={[styles.foto, { borderRadius: radii.md }]} contentFit="cover" />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={[styles.metaRow, { gap: spacing.sm, marginTop: spacing.xs }]}>
              <Chip tone={tone} label={CATEGORIA_LABEL[alerta.categoria]} />
              <ThemedText variant="caption" color="textMuted" style={styles.flex1}>
                {formatHora(alerta.creadaEn)}
              </ThemedText>
              {alerta.enlace ? (
                <ThemedText variant="body" color="textMuted">
                  ›
                </ThemedText>
              ) : null}
            </View>
          </View>
        </Card>
      </PressableScale>
    );
  }

  async function enviarAlerta() {
    setErrorForm(null);
    setEnviando(true);
    try {
      const nueva = await crearAlerta({
        titulo,
        detalle,
        severidad,
        categoria,
        ambito,
        fotoUris,
        user: user ?? undefined,
      });
      setAlertas((prev) => [nueva, ...prev]);
      setTitulo('');
      setDetalle('');
      setFotoUris([]);
      setCreando(false);
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo crear la alerta.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Barra superior */}
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <View>
            <ThemedText variant="overline" color="textMuted">
              FOM · Conductor
            </ThemedText>
            <ThemedText variant="title">Mantenimiento</ThemedText>
          </View>
          {noLeidas > 0 ? (
            <Pressable onPress={marcarTodas} hitSlop={8}>
              <ThemedText variant="button" color="primary">
                Marcar todas
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {cargando ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {[0, 1, 2].map((i) => (
              <Card key={i} style={[styles.cardRow, { gap: spacing.md }]}>
                <Skeleton width={40} height={40} radius={radii.md} />
                <View style={styles.flex1}>
                  <Skeleton width="60%" height={16} />
                  <View style={{ height: 6 }} />
                  <Skeleton width="90%" height={12} />
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {/* ── ALERTAS DE TU UNIDAD (arriba, con creación propia) ────── */}
            <View style={[styles.sectionRow, { gap: spacing.sm }]}>
              <ThemedText variant="overline" color="textMuted" style={styles.flex1}>
                Alertas de tu unidad
              </ThemedText>
              <PillButton
                label={creando ? 'Cerrar' : '+ Nueva alerta'}
                tone="primary"
                onPress={() => setCreando((v) => !v)}
              />
            </View>

            {creando ? (
              <Card style={{ gap: spacing.md }}>
                {/* ¿De qué es la alerta? Separa lo personal de lo del vehículo. */}
                <SegmentedControl
                  options={[
                    { value: 'vehiculo', label: 'De mi unidad' },
                    { value: 'personal', label: 'Personal' },
                  ]}
                  value={ambito}
                  onChange={setAmbito}
                />
                <TextField
                  label="Título"
                  placeholder="¿Qué está pasando?"
                  value={titulo}
                  onChangeText={setTitulo}
                  error={errorForm ?? undefined}
                />
                <TextField
                  label="Detalle (opcional)"
                  placeholder="Cuéntalo en una línea"
                  value={detalle}
                  onChangeText={setDetalle}
                  multiline
                />
                <SegmentedControl
                  options={[
                    { value: 'seguridad', label: 'Seguridad' },
                    { value: 'mantenimiento', label: 'Mantenimiento' },
                    { value: 'otro', label: 'Otro' },
                  ]}
                  value={categoria}
                  onChange={setCategoria}
                />
                <SegmentedControl
                  options={[
                    { value: 'info', label: 'Informativa' },
                    { value: 'advertencia', label: 'Advertencia' },
                    { value: 'critica', label: 'Crítica' },
                  ]}
                  value={severidad}
                  onChange={setSeveridad}
                />
                <EvidenceField uris={fotoUris} onChange={setFotoUris} />
                <Button
                  label="Crear alerta"
                  icon="alertas"
                  onPress={enviarAlerta}
                  loading={enviando}
                  disabled={!titulo.trim()}
                />
                <ThemedText variant="caption" color="textMuted">
                  Tu supervisor también la verá en el panel.
                </ThemedText>
              </Card>
            ) : null}

            {alertasUnidad.length === 0 ? (
              <EmptyState title="Sin alertas de tu unidad" description="El vehículo está en orden por ahora." />
            ) : (
              alertasUnidad.map(renderAlerta)
            )}

            {/* ── MIS ODT ───────────────────────────────────────────────── */}
            <View style={[styles.sectionRow, { gap: spacing.sm, marginTop: spacing.md }]}>
              <ThemedText variant="overline" color="textMuted" style={styles.flex1}>
                Mis órdenes de trabajo
              </ThemedText>
              <PillButton label="+ Reportar falla" tone="primary" onPress={() => router.navigate('/reportar')} />
            </View>

            {ordenes.length === 0 ? (
              <EmptyState
                title="Sin órdenes de trabajo"
                description="Cuando reportes una falla, su ODT y su avance aparecerán aquí."
              />
            ) : (
              ordenes.map((ot) => (
                <PressableScale
                  key={ot.id}
                  onPress={() =>
                    router.navigate({ pathname: '/orden', params: { id: ot.id, companyId: user.companyId ?? '' } })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ODT de ${ot.vehicleLabel}`}>
                  <Card style={{ gap: spacing.sm }}>
                    <View style={[styles.titleRow, { gap: spacing.sm }]}>
                      <View style={[styles.lead, { borderRadius: radii.md }]}>
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.warning, opacity: 0.14, borderRadius: radii.md }]} />
                        <TabIcon name="ot" color={colors.warning} size={20} />
                      </View>
                      <ThemedText variant="subtitle" numberOfLines={1} style={styles.flex1}>
                        {ot.vehicleLabel}
                      </ThemedText>
                      <OTStatusBadge estado={ot.estado} />
                    </View>
                    <ThemedText variant="caption" color="textSecondary" numberOfLines={2}>
                      {ot.descripcion}
                    </ThemedText>
                    <ThemedText variant="caption" color="textMuted">
                      {formatFecha(ot.creadaEn)}
                    </ThemedText>
                  </Card>
                </PressableScale>
              ))
            )}

            {/* ── ALERTAS PERSONALES (tus documentos, tu perfil) ─────────── */}
            <View style={[styles.sectionRow, { gap: spacing.sm, marginTop: spacing.md }]}>
              <ThemedText variant="overline" color="textMuted" style={styles.flex1}>
                Alertas personales
              </ThemedText>
              <PillButton label="Mis documentos ›" tone="primary" onPress={() => router.navigate('/documentos')} />
            </View>

            {alertasPersonales.length === 0 ? (
              <EmptyState
                title="Nada personal pendiente"
                description="Tus documentos y tu perfil están al día."
              />
            ) : (
              alertasPersonales.map(renderAlerta)
            )}
          </ScrollView>
        )}

        {/* Visor a pantalla completa: tocar una foto la abre entera, no en miniatura. */}
        <PhotoViewer uri={fotoAbierta} onClose={() => setFotoAbierta(null)} />
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
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingBottom: 32,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  lead: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  flex1: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  unread: { width: 10, height: 10, borderRadius: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  fotosRow: { flexDirection: 'row', flexWrap: 'wrap' },
  foto: { width: 64, height: 64 },
});
