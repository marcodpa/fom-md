import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal, PickerField } from '@/components/option-picker';
import { ODT_ESTADO_LABEL, OTStatusBadge } from '@/components/ot-status-badge';
import { PillButton } from '@/components/pill-button';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { exportarPdf, htmlReporte, type SeccionPdf } from '@/lib/pdf';
import {
  getEmpresasAsignadasA,
  getOrdenesDeTrabajo,
  getResumenCostos,
  type RangoFechas,
  type ResumenCostos,
} from '@/services';
import { useTheme } from '@/theme';
import type { Company, CompanyTipo, WorkOrderListItem } from '@/types';

const TIPO_LABEL: Record<CompanyTipo, string> = {
  predefinida: 'Compañía',
  estandar: 'Contratista',
  personal: 'Personal',
};

const TIPO_ICON: Record<CompanyTipo, TabIconName> = {
  predefinida: 'empresa',
  estandar: 'flota',
  personal: 'inicio',
};

const DIA_MS = 86_400_000;

/**
 * Rangos de consulta que ofrece la pantalla. Se construyen UNA vez por montaje
 * (no a nivel de módulo) para que "hasta" sea el momento real de la visita y
 * no el arranque de la app.
 */
function construirRangos(): RangoFechas[] {
  const ahora = new Date();
  const hasta = ahora.toISOString();
  return [
    {
      desde: new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString(),
      hasta,
      label: 'Este mes',
    },
    { desde: new Date(ahora.getTime() - 30 * DIA_MS).toISOString(), hasta, label: 'Últimos 30 días' },
    { desde: new Date(ahora.getTime() - 90 * DIA_MS).toISOString(), hasta, label: 'Últimos 90 días' },
    { desde: new Date(ahora.getFullYear(), 0, 1).toISOString(), hasta, label: 'Este año' },
  ];
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

function dinero(n: number): string {
  return `$${n.toLocaleString('es')}`;
}

/** Secciones del PDF de mantenimiento de UNA asociada (resumen + hechas + por hacer). */
function seccionesPdf(
  empresa: Company,
  rango: RangoFechas,
  hechas: WorkOrderListItem[],
  porHacer: WorkOrderListItem[],
  costos: ResumenCostos,
): SeccionPdf[] {
  return [
    {
      tipo: 'datos',
      titulo: 'Resumen',
      filas: [
        ['Empresa', empresa.name],
        ['Rango', rango.label],
        ['Costo total del rango', dinero(costos.total)],
        ['Actividades hechas', String(hechas.length)],
        ['Actividades por hacer', String(porHacer.length)],
        ['En producto', dinero(costos.porClase.producto)],
        ['En servicio', dinero(costos.porClase.servicio)],
      ],
    },
    {
      tipo: 'tabla',
      titulo: 'Actividades hechas',
      headers: ['Unidad', 'Qué se hizo', 'Costo', 'Resuelta'],
      rows: hechas.map((o) => [
        o.vehicleLabel,
        o.notaSolucion ?? o.descripcion,
        o.costo != null ? dinero(o.costo) : '—',
        o.resueltaEn ? fechaCorta(o.resueltaEn) : '—',
      ]),
    },
    {
      tipo: 'tabla',
      titulo: 'Actividades por hacer',
      headers: ['Unidad', 'Falla', 'Estado'],
      rows: porHacer.map((o) => [o.vehicleLabel, o.descripcion, ODT_ESTADO_LABEL[o.estado]]),
    },
  ];
}

/**
 * MANTENIMIENTO de la compañía (ej. Chevron) — vista de MONITOREO: la compañía
 * no opera flota propia; aquí vigila las actividades de mantenimiento de sus
 * empresas asociadas (ODT por hacer y hechas) y lo que cuestan en el rango de
 * fechas elegido, con el PDF de cada asociada a un toque. Nada se gestiona
 * desde esta superficie.
 */
export default function CompaniaMantenimientoScreen() {
  const { colors, spacing, radii, brand } = useTheme();
  const { user, status } = useAuth();

  // Rangos estables por montaje: su identidad no cambia entre renders, así el
  // rango elegido puede viajar en las deps del useAsyncData sin re-disparos.
  const [rangos] = useState<RangoFechas[]>(construirRangos);
  const [rango, setRango] = useState<RangoFechas>(rangos[0]);
  const [rangoPicker, setRangoPicker] = useState(false);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  // Id de la empresa cuyo PDF se está generando (deshabilita el resto).
  const [generando, setGenerando] = useState<string | null>(null);

  // El administrador lleva `companyId`; el supervisor de solo lectura, sus
  // predefinidas asignadas (la primera es su compañía activa).
  const companyId = user?.companyId ?? '';

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const empresas = await getEmpresasAsignadasA([companyId]);
      // Todo por asociada en paralelo: las ODT no dependen del rango (histórico
      // completo), los costos sí (por eso `rango` está en las deps).
      const porEmpresa = await Promise.all(
        empresas.map(async (e) => {
          const [odts, costos] = await Promise.all([
            getOrdenesDeTrabajo(e.id),
            getResumenCostos(e.id, rango),
          ]);
          return { id: e.id, odts, costos };
        }),
      );
      return {
        empresas,
        odtsPorEmpresa: new Map(porEmpresa.map((p) => [p.id, p.odts])),
        costosPorEmpresa: new Map(porEmpresa.map((p) => [p.id, p.costos])),
      };
    },
    [companyId, rango],
    { onFocus: true },
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  function toggleEmpresa(id: string) {
    setAbiertas((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  /** Arma el HTML del mantenimiento de la asociada y lo exporta a PDF. */
  async function descargarPdf(
    empresa: Company,
    hechas: WorkOrderListItem[],
    porHacer: WorkOrderListItem[],
    costos: ResumenCostos,
  ) {
    setGenerando(empresa.id);
    try {
      const html = htmlReporte({
        titulo: `Mantenimiento — ${empresa.name}`,
        subtitulo: `Monitoreo de ${brand.name} · ${rango.label}`,
        secciones: seccionesPdf(empresa, rango, hechas, porHacer, costos),
      });
      await exportarPdf(html);
    } finally {
      setGenerando(null);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Barra superior propia: esta vista es de la COMPAÑÍA, que monitorea. */}
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <View style={styles.flex1}>
            <ThemedText variant="overline" color="textMuted">
              {`${brand.name} · Monitoreo`}
            </ThemedText>
            <ThemedText variant="title">Mantenimiento</ThemedText>
          </View>
          <Chip tone="info" label={user.name.split(' ')[0]} />
        </View>

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar el mantenimiento." onRetry={recargar} />
        ) : !data ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton height={64} radius={radii.md} />
            <Skeleton height={96} radius={16} />
            <Skeleton height={96} radius={16} />
            <Skeleton height={96} radius={16} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {/* El rango manda sobre TODOS los costos de la pantalla. */}
            <PickerField
              label="Rango de fechas"
              value={rango.label}
              onPress={() => setRangoPicker(true)}
            />

            {data.empresas.length === 0 ? (
              <EmptyState
                title="Sin empresas asociadas"
                description="Cuando FOM asigne contratistas o personales a tu compañía, su mantenimiento aparecerá aquí."
              />
            ) : (
              <>
                <ThemedText variant="overline" color="textMuted">
                  {`Empresas asociadas (${data.empresas.length})`}
                </ThemedText>

                {data.empresas.map((e) => {
                  const abierta = abiertas.has(e.id);
                  const odts = data.odtsPorEmpresa.get(e.id) ?? [];
                  const costos = data.costosPorEmpresa.get(e.id);
                  const porHacer = odts.filter((o) => o.estado !== 'cerrada');
                  const hechas = odts.filter((o) => o.estado === 'cerrada');
                  return (
                    <Card key={e.id} style={{ gap: 0, paddingVertical: spacing.xs }}>
                      {/* Cabecera: quién es y cuánto costó su mantenimiento en el rango. */}
                      <PressableScale
                        onPress={() => toggleEmpresa(e.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${abierta ? 'Ocultar' : 'Ver'} el mantenimiento de ${e.name}`}
                        style={[styles.row, { gap: spacing.md, paddingVertical: spacing.sm }]}>
                        <View
                          style={[
                            styles.lead,
                            { backgroundColor: colors.surfaceSunken, borderRadius: radii.md },
                          ]}>
                          <TabIcon name={TIPO_ICON[e.tipo ?? 'estandar']} color={colors.primary} size={20} />
                        </View>
                        <View style={styles.flex1}>
                          <ThemedText variant="button" numberOfLines={1}>
                            {e.name}
                          </ThemedText>
                          <ThemedText variant="caption" color="textMuted">
                            {TIPO_LABEL[e.tipo ?? 'estandar']}
                          </ThemedText>
                        </View>
                        <Chip tone="primary" label={costos ? dinero(costos.total) : '—'} />
                        <ThemedText variant="body" color="textMuted">
                          {abierta ? '▾' : '›'}
                        </ThemedText>
                      </PressableScale>

                      {abierta ? (
                        <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
                          {/* ── POR HACER: abiertas o en revisión ─────────── */}
                          <View style={{ gap: spacing.xs }}>
                            <ThemedText variant="overline" color="textMuted">
                              {`Actividades por hacer (${porHacer.length})`}
                            </ThemedText>
                            {porHacer.length === 0 ? (
                              <ThemedText variant="caption" color="textMuted">
                                Nada pendiente.
                              </ThemedText>
                            ) : (
                              porHacer.map((o) => (
                                <View
                                  key={o.id}
                                  style={[
                                    styles.row,
                                    {
                                      gap: spacing.md,
                                      paddingVertical: spacing.sm,
                                      borderTopWidth: StyleSheet.hairlineWidth,
                                      borderTopColor: colors.border,
                                    },
                                  ]}>
                                  <View style={styles.flex1}>
                                    <ThemedText variant="button" numberOfLines={1}>
                                      {o.vehicleLabel}
                                    </ThemedText>
                                    <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
                                      {o.descripcion}
                                    </ThemedText>
                                  </View>
                                  <OTStatusBadge estado={o.estado} />
                                </View>
                              ))
                            )}
                          </View>

                          {/* ── HECHAS: cerradas, con su costo y su fecha ──── */}
                          <View style={{ gap: spacing.xs }}>
                            <ThemedText variant="overline" color="textMuted">
                              {`Actividades hechas (${hechas.length})`}
                            </ThemedText>
                            {hechas.length === 0 ? (
                              <ThemedText variant="caption" color="textMuted">
                                Sin actividades cerradas todavía.
                              </ThemedText>
                            ) : (
                              hechas.map((o) => (
                                <View
                                  key={o.id}
                                  style={[
                                    styles.row,
                                    {
                                      gap: spacing.md,
                                      paddingVertical: spacing.sm,
                                      borderTopWidth: StyleSheet.hairlineWidth,
                                      borderTopColor: colors.border,
                                    },
                                  ]}>
                                  <View style={styles.flex1}>
                                    <ThemedText variant="button" numberOfLines={1}>
                                      {o.vehicleLabel}
                                    </ThemedText>
                                    <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
                                      {o.notaSolucion ?? o.descripcion}
                                    </ThemedText>
                                  </View>
                                  {o.costo != null ? (
                                    <ThemedText variant="button">{dinero(o.costo)}</ThemedText>
                                  ) : null}
                                  {o.resueltaEn ? (
                                    <ThemedText variant="caption" color="textMuted">
                                      {fechaCorta(o.resueltaEn)}
                                    </ThemedText>
                                  ) : null}
                                </View>
                              ))
                            )}
                          </View>

                          {/* ── COSTOS DEL RANGO: total y producto vs servicio ── */}
                          {costos ? (
                            <View style={{ gap: spacing.xs }}>
                              <ThemedText variant="overline" color="textMuted">
                                {`Costos · ${rango.label}`}
                              </ThemedText>
                              <View style={styles.rowBetween}>
                                <ThemedText variant="body" color="textSecondary">
                                  Total
                                </ThemedText>
                                <ThemedText variant="subtitle">{dinero(costos.total)}</ThemedText>
                              </View>
                              <View style={styles.rowBetween}>
                                <ThemedText variant="body" color="textSecondary">
                                  Producto
                                </ThemedText>
                                <ThemedText variant="button">{dinero(costos.porClase.producto)}</ThemedText>
                              </View>
                              <View style={styles.rowBetween}>
                                <ThemedText variant="body" color="textSecondary">
                                  Servicio
                                </ThemedText>
                                <ThemedText variant="button">{dinero(costos.porClase.servicio)}</ThemedText>
                              </View>
                            </View>
                          ) : null}

                          {/* Todo lo de arriba, en un PDF listo para compartir. */}
                          {costos ? (
                            <View
                              style={[
                                styles.row,
                                {
                                  paddingVertical: spacing.sm,
                                  borderTopWidth: StyleSheet.hairlineWidth,
                                  borderTopColor: colors.border,
                                },
                              ]}>
                              <PillButton
                                label={generando === e.id ? 'Generando…' : 'Descargar PDF'}
                                tone="primary"
                                onPress={() => {
                                  // Un PDF a la vez: la hoja de compartir es modal.
                                  if (generando == null) void descargarPdf(e, hechas, porHacer, costos);
                                }}
                              />
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </Card>
                  );
                })}

                <ThemedText variant="caption" color="textMuted">
                  Las actividades salen de las ODT de cada asociada; los costos, del rango elegido
                  arriba. Toca una empresa para ver su detalle y descargar su PDF.
                </ThemedText>
              </>
            )}
          </ScrollView>
        )}

        {/* Elegir el rango de fechas de los costos. */}
        <OptionPickerModal
          visible={rangoPicker}
          title="Rango de fechas"
          options={rangos.map((r) => ({ id: r.label, label: r.label }))}
          selectedIds={[rango.label]}
          onChange={(ids) => {
            const elegido = rangos.find((r) => r.label === ids[0]);
            if (elegido) setRango(elegido);
          }}
          onClose={() => setRangoPicker(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lead: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
