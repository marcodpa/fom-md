import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, puedeConducir, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EvidenceField } from '@/components/evidence-field';
import { PhotoViewer } from '@/components/photo-viewer';
import { ODT_ESTADO_LABEL, OTStatusBadge } from '@/components/ot-status-badge';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl, type SegmentOption } from '@/components/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { actualizarEstadoOrden, getCompanyBrandById, getOrdenDeTrabajo } from '@/services';
import { useTheme, useThemeController } from '@/theme';
import { ODT_ESTADOS, type OdtEstado, type WorkOrderListItem } from '@/types';

/** Opciones del selector de estado, en orden de avance (FOM-02 §3.3). */
const ESTADO_OPTIONS: SegmentOption<OdtEstado>[] = ODT_ESTADOS.map((e) => ({
  value: e,
  label: ODT_ESTADO_LABEL[e],
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
 * Detalle de una ODT: vehículo, quién la generó, descripción, evidencia
 * (fotos), fecha/hora y ubicación. El supervisor avanza su estado (abierta →
 * en_revision → cerrada) y al cerrar completa el cierre: qué se hizo, costo,
 * factura/foto y fecha de resolución (FOM-02 §3.3).
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
  // Campos del CIERRE (al pasar a cerrada, §3.3): qué se hizo + costo + factura.
  const [notaSolucion, setNotaSolucion] = useState('');
  const [costo, setCosto] = useState('');
  const [facturaUris, setFacturaUris] = useState<string[]>([]);
  // Foto abierta a pantalla completa (visor), o null.
  const [fotoAbierta, setFotoAbierta] = useState<string | null>(null);
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

  // Prellena los campos del cierre con lo que ya tenga la ODT.
  useEffect(() => {
    setNotaSolucion(orden?.notaSolucion ?? '');
    setCosto(orden?.costo != null ? String(orden.costo) : '');
    setFacturaUris(orden?.evidenciaResolucionUrls ?? []);
  }, [orden?.id, orden?.notaSolucion, orden?.costo, orden?.evidenciaResolucionUrls]);

  async function cambiarEstado(estado: OdtEstado) {
    if (!orden || guardando || estado === orden.estado) return;
    setGuardando(true);
    try {
      const actualizada = await actualizarEstadoOrden(orden.id, estado);
      setOrden(actualizada);
    } finally {
      setGuardando(false);
    }
  }

  // Guarda el cierre completo (§3.3): qué se hizo + costo + factura/foto. La
  // fecha de resolución la fija el servicio al cerrar.
  async function guardarCierre() {
    if (!orden || guardandoSolucion) return;
    setGuardandoSolucion(true);
    try {
      const costoNum = costo.trim() ? Number(costo.replace(',', '.')) : undefined;
      const actualizada = await actualizarEstadoOrden(orden.id, 'cerrada', {
        notaSolucion: notaSolucion.trim() || undefined,
        costo: Number.isFinite(costoNum) ? costoNum : undefined,
        evidenciaResolucionUrls: facturaUris,
      });
      setOrden(actualizada);
    } finally {
      setGuardandoSolucion(false);
    }
  }

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // El conductor TAMBIÉN entra (sus pantallas enlazan aquí: "tócala para verla
  // por dentro") pero en solo lectura; avanzar estado y cerrar es del supervisor.
  if (!esAdmin(user) && !puedeConducir(user)) return <Redirect href="/" />;
  const soloLectura = !esAdmin(user);

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="ODT" />

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
              No se encontró la ODT.
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

              {/* Cambiar estado (abierta → en_revision → cerrada, §3.3): solo
                  el supervisor; el conductor ya ve el estado en el badge. */}
              {!soloLectura ? (
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
              ) : null}

              {/* Datos de la ODT */}
              <Card style={{ gap: spacing.md }}>
                <View style={styles.rowBetween}>
                  <ThemedText variant="overline" color="textMuted">
                    Detalle
                  </ThemedText>
                  {/* Origen (§3.3–§3.4): correctiva (conductor) o preventiva (sistema). */}
                  <Chip
                    tone={orden.tipo === 'preventiva' ? 'info' : 'warning'}
                    label={orden.tipo === 'preventiva' ? 'Preventiva' : 'Correctiva'}
                  />
                </View>
                {/* Autor: nombre clickeable → su perfil. */}
                <View style={[styles.infoRow, { gap: spacing.md }]}>
                  <ThemedText variant="body" color="textSecondary" style={styles.infoLabel}>
                    Generó
                  </ThemedText>
                  {/* Quién la creó (§3.3): si fue un secundario, el sistema lo
                      identificó por su PIN. El expediente completo solo lo abre un
                      administrador (ver-perfil es de administradores); el conductor
                      lo ve como texto. Las preventivas las genera el SISTEMA (sin
                      persona autora): ahí tampoco hay expediente que abrir. */}
                  {soloLectura || !orden.driverId || orden.driverId === 'sistema' ? (
                    <ThemedText variant="body" style={styles.infoValue}>
                      {`${orden.driverName}${orden.autorVia === 'secundario' ? ' · Secundario (PIN)' : orden.autorVia === 'principal' ? ' · Principal' : ''}`}
                    </ThemedText>
                  ) : (
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel={`Ver expediente de ${orden.driverName}`}
                      onPress={() =>
                        router.navigate({
                          pathname: '/ver-perfil',
                          params: { userId: orden.driverId, nombre: orden.driverName },
                        })
                      }>
                      <ThemedText variant="body" color="primary" style={styles.infoValue}>
                        {`${orden.driverName}${orden.autorVia === 'secundario' ? ' · Secundario (PIN)' : orden.autorVia === 'principal' ? ' · Principal' : ''} ›`}
                      </ThemedText>
                    </PressableScale>
                  )}
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

              {/* Cierre (§3.3): solo al pasar a cerrada — qué se hizo + costo +
                  factura/foto + fecha de resolución (la fija el sistema). El
                  conductor lo ve como información, sin campos editables. */}
              {orden.estado === 'cerrada' && soloLectura ? (
                <Card style={{ gap: spacing.md }}>
                  <View style={styles.rowBetween}>
                    <ThemedText variant="overline" color="textMuted">
                      Cierre
                    </ThemedText>
                    {orden.resueltaEn ? (
                      <ThemedText variant="caption" color="textMuted">
                        {`Resuelta el ${formatFechaLarga(orden.resueltaEn)}`}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={{ gap: spacing.xs }}>
                    <ThemedText variant="caption" color="textSecondary">
                      Qué se hizo
                    </ThemedText>
                    <ThemedText variant="body">{orden.notaSolucion || 'Sin nota de cierre.'}</ThemedText>
                  </View>
                  {orden.costo != null ? (
                    <InfoRow label="Costo" value={String(orden.costo)} />
                  ) : null}
                  {(orden.evidenciaResolucionUrls?.length ?? 0) > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: spacing.md }}>
                      {(orden.evidenciaResolucionUrls ?? []).map((url) => (
                        <Pressable
                          key={url}
                          onPress={() => setFotoAbierta(url)}
                          accessibilityRole="imagebutton"
                          accessibilityLabel="Ver foto de la resolución a pantalla completa">
                          <Image
                            source={{ uri: url }}
                            style={[
                              styles.evidence,
                              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                            ]}
                          />
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : null}
                </Card>
              ) : orden.estado === 'cerrada' ? (
                <Card style={{ gap: spacing.md }}>
                  <View style={styles.rowBetween}>
                    <ThemedText variant="overline" color="textMuted">
                      Cierre
                    </ThemedText>
                    {orden.resueltaEn ? (
                      <ThemedText variant="caption" color="textMuted">
                        {`Resuelta el ${formatFechaLarga(orden.resueltaEn)}`}
                      </ThemedText>
                    ) : null}
                  </View>
                  <TextField
                    label="Qué se hizo"
                    value={notaSolucion}
                    onChangeText={setNotaSolucion}
                    placeholder="Qué se hizo para resolver la falla…"
                    multiline
                  />
                  <TextField
                    label="Costo"
                    value={costo}
                    onChangeText={setCosto}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                  />
                  <View style={{ gap: spacing.sm }}>
                    <ThemedText variant="caption" color="textSecondary">
                      Factura o foto de la resolución
                    </ThemedText>
                    <EvidenceField uris={facturaUris} onChange={setFacturaUris} />
                  </View>
                  <Button
                    label={guardandoSolucion ? 'Guardando…' : 'Guardar cierre'}
                    onPress={guardarCierre}
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
                      <Pressable
                        key={url}
                        onPress={() => setFotoAbierta(url)}
                        accessibilityRole="imagebutton"
                        accessibilityLabel="Ver foto a pantalla completa">
                        <Image
                          source={{ uri: url }}
                          style={[
                            styles.evidence,
                            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                          ]}
                        />
                      </Pressable>
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

        {/* Visor a pantalla completa: tocar una evidencia la abre entera. */}
        <PhotoViewer uri={fotoAbierta} onClose={() => setFotoAbierta(null)} />
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
