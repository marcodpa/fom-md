import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OptionPickerModal } from '@/components/option-picker';
import { Skeleton } from '@/components/skeleton';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { exportarPdf, htmlReporte, type SeccionPdf } from '@/lib/pdf';
import {
  getEmpresasAsignadasA,
  getReporte,
  getReporteGerencial,
  getReporteUsuarios,
  periodoMesActual,
} from '@/services';
import { useTheme } from '@/theme';
import type { Company, CompanyTipo, FleetReport, ReporteGerencial, UserReport } from '@/types';

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

/** Reportes que la compañía puede pedir de cada empresa asociada. */
type TipoReporte = 'gerencial' | 'flota' | 'usuarios' | 'todos';

const REPORTE_OPCIONES: { id: TipoReporte; label: string; helper: string }[] = [
  { id: 'gerencial', label: 'Gerencial', helper: 'ODT, costos y tiempos de resolución' },
  { id: 'flota', label: 'Flota', helper: 'Km, índice seguro y desglose por unidad' },
  { id: 'usuarios', label: 'Usuarios', helper: 'Actividad del personal de la empresa' },
  { id: 'todos', label: 'Todos', helper: 'Los tres reportes en un solo PDF' },
];

const REPORTE_TITULO: Record<TipoReporte, string> = {
  gerencial: 'Reporte gerencial',
  flota: 'Reporte de flota',
  usuarios: 'Reporte de usuarios',
  todos: 'Reporte completo',
};

// ── Secciones del PDF por tipo de reporte ──────────────────────────────────
// Se arman aparte para poder COMBINARLAS en "todos" sin duplicar lógica.

function seccionesGerencial(g: ReporteGerencial): SeccionPdf[] {
  return [
    {
      tipo: 'datos',
      titulo: `Gerencial · ${g.periodo}`,
      filas: [
        ['ODT abiertas', String(g.odtAbiertas)],
        ['ODT en revisión', String(g.odtEnRevision)],
        ['ODT cerradas', String(g.odtCerradas)],
        ['Correctivas / preventivas', `${g.odtCorrectivas} / ${g.odtPreventivas}`],
        ['Costo total (ODT cerradas)', `$${g.costoTotal.toLocaleString('es')}`],
        [
          'Resolución promedio',
          g.horasPromedioResolucion != null ? `${g.horasPromedioResolucion} h` : 'Sin datos',
        ],
      ],
    },
  ];
}

function seccionesFlota(r: FleetReport): SeccionPdf[] {
  return [
    {
      tipo: 'datos',
      titulo: `Flota · ${r.periodo}`,
      filas: [
        ['Vehículos', String(r.metrics.vehiculos)],
        ['Km recorridos', r.metrics.kmRecorridos.toLocaleString('es')],
        ['Índice seguro promedio', `${r.metrics.indiceSeguroPromedio} / 100`],
        ['Excesos de velocidad', String(r.metrics.excesosVelocidad)],
        ['Frenadas bruscas', String(r.metrics.frenadasBruscas)],
        ['Aceleraciones bruscas', String(r.metrics.aceleracionesBruscas)],
        ['ODT abiertas', String(r.metrics.reportesAbiertos)],
      ],
    },
    {
      tipo: 'tabla',
      titulo: 'Por vehículo',
      headers: ['Unidad', 'Área', 'Km', 'Índice', 'ODT abiertas'],
      rows: r.porVehiculo.map((v) => [
        v.vehicle.alias ?? `${v.vehicle.numero} · ${v.vehicle.marca} ${v.vehicle.modelo}`,
        v.areaName,
        v.km.toLocaleString('es'),
        String(v.indiceSeguro),
        String(v.otAbiertas),
      ]),
    },
  ];
}

function seccionesUsuarios(u: UserReport): SeccionPdf[] {
  return [
    {
      tipo: 'datos',
      titulo: `Usuarios · ${u.periodo}`,
      filas: [
        ['Usuarios', String(u.metrics.usuarios)],
        ['Km recorridos', u.metrics.kmRecorridos.toLocaleString('es')],
        ['Días conducidos', String(u.metrics.diasConducidos)],
        ['Horas conducidas', String(u.metrics.horasConducidas)],
        ['Recargas / litros', `${u.metrics.recargas} / ${u.metrics.litros.toLocaleString('es')} L`],
        ['OT reportadas', String(u.metrics.otReportadas)],
      ],
    },
    {
      tipo: 'tabla',
      titulo: 'Por usuario',
      headers: ['Nombre', 'Cédula', 'Km', 'Horas', 'OT'],
      rows: u.usuarios.map((p) => [
        p.nombre,
        p.cedula,
        p.metrics.kmRecorridos.toLocaleString('es'),
        String(p.metrics.horasConducidas),
        String(p.metrics.otReportadas),
      ]),
    },
  ];
}

/**
 * RESUMEN de la compañía (ej. Chevron) — vista de MONITOREO: la compañía no
 * opera flota propia; administra y supervisa a sus empresas asociadas. Aquí
 * vive su acción central: sacar los reportes (gerencial, flota, usuarios) de
 * cada asociada en PDF. Nada se crea ni se edita desde esta superficie.
 */
export default function CompaniaResumenScreen() {
  const { colors, spacing, radii, brand } = useTheme();
  const { user, status } = useAuth();

  // La empresa cuyo selector de reportes está abierto, o `null` si ninguno.
  const [pickerEmpresa, setPickerEmpresa] = useState<Company | null>(null);
  // Id de la empresa cuyo PDF se está generando (deshabilita el resto).
  const [generando, setGenerando] = useState<string | null>(null);
  // Último error de generación por empresa (se limpia al reintentar).
  const [errores, setErrores] = useState<Record<string, string>>({});

  // El administrador lleva `companyId`; el supervisor de solo lectura, sus
  // predefinidas asignadas (la primera es su compañía activa).
  const companyId = user?.companyId ?? '';

  const { data: empresas, estado, recargar } = useAsyncData(
    () => getEmpresasAsignadasA([companyId]),
    [companyId],
    { onFocus: true },
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  const lista = empresas ?? [];

  /** Junta las secciones pedidas, arma el HTML y lo exporta a PDF. */
  async function generarReporte(empresa: Company, tipo: TipoReporte) {
    setPickerEmpresa(null);
    setGenerando(empresa.id);
    setErrores((prev) => ({ ...prev, [empresa.id]: '' }));
    try {
      const secciones: SeccionPdf[] = [];
      if (tipo === 'gerencial' || tipo === 'todos') {
        secciones.push(...seccionesGerencial(await getReporteGerencial(empresa.id)));
      }
      if (tipo === 'flota' || tipo === 'todos') {
        secciones.push(
          ...seccionesFlota(
            await getReporte({ companyId: empresa.id, tipo: 'general', periodo: periodoMesActual() }),
          ),
        );
      }
      if (tipo === 'usuarios' || tipo === 'todos') {
        secciones.push(
          ...seccionesUsuarios(
            await getReporteUsuarios({
              companyId: empresa.id,
              tipo: 'general',
              periodo: periodoMesActual(),
            }),
          ),
        );
      }
      const html = htmlReporte({
        titulo: `${REPORTE_TITULO[tipo]} — ${empresa.name}`,
        subtitulo: `Monitoreo de ${brand.name} · ${periodoMesActual().label}`,
        secciones,
      });
      await exportarPdf(html);
    } catch {
      setErrores((prev) => ({
        ...prev,
        [empresa.id]: 'No pudimos generar el reporte. Intenta de nuevo.',
      }));
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
            <ThemedText variant="title">Resumen</ThemedText>
          </View>
          <Chip tone="info" label={user.name.split(' ')[0]} />
        </View>

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar tus empresas asociadas." onRetry={recargar} />
        ) : !empresas ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <Skeleton height={132} radius={16} />
            <Skeleton height={132} radius={16} />
            <Skeleton height={132} radius={16} />
          </View>
        ) : lista.length === 0 ? (
          <EmptyState
            title="Sin empresas asociadas"
            description="Cuando FOM asigne contratistas o personales a tu compañía, aparecerán aquí con sus reportes."
          />
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            <ThemedText variant="overline" color="textMuted">
              {`Empresas asociadas (${lista.length})`}
            </ThemedText>

            {lista.map((e) => {
              const activa = e.servicioActivo !== false;
              const error = errores[e.id];
              return (
                <Card key={e.id} style={{ gap: spacing.md }}>
                  <View style={[styles.row, { gap: spacing.md }]}>
                    <View
                      style={[
                        styles.lead,
                        { backgroundColor: colors.surfaceSunken, borderRadius: radii.md },
                      ]}>
                      <TabIcon name={TIPO_ICON[e.tipo ?? 'estandar']} color={colors.primary} size={20} />
                    </View>
                    <View style={styles.flex1}>
                      <ThemedText variant="subtitle" numberOfLines={1}>
                        {e.name}
                      </ThemedText>
                      <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
                        {`${TIPO_LABEL[e.tipo ?? 'estandar']}${e.rif ? ` · ${e.rif}` : ''}`}
                      </ThemedText>
                    </View>
                    <Chip tone={activa ? 'success' : 'danger'} label={activa ? 'Activa' : 'Suspendida'} />
                  </View>

                  <Button
                    label={generando === e.id ? 'Generando…' : 'Generar reporte'}
                    variant="secondary"
                    icon="reporte"
                    loading={generando === e.id}
                    // Un PDF a la vez: la hoja de compartir del sistema es modal.
                    disabled={generando != null && generando !== e.id}
                    onPress={() => setPickerEmpresa(e)}
                  />

                  {error ? (
                    <ThemedText variant="caption" color="danger">
                      {error}
                    </ThemedText>
                  ) : null}
                </Card>
              );
            })}

            <ThemedText variant="caption" color="textMuted">
              Todos los reportes se generan en PDF, listos para guardar o compartir. Para el detalle
              en vivo de cada empresa, usa las pestañas Flota, Personal y Mantenimiento.
            </ThemedText>
          </ScrollView>
        )}

        {/* Elegir qué reporte sacar de la empresa tocada. */}
        <OptionPickerModal
          visible={pickerEmpresa != null}
          title={`Reporte de ${pickerEmpresa?.name ?? ''}`}
          options={REPORTE_OPCIONES}
          selectedIds={[]}
          onChange={(ids) => {
            const tipo = ids[0] as TipoReporte | undefined;
            if (tipo && pickerEmpresa) void generarReporte(pickerEmpresa, tipo);
          }}
          onClose={() => setPickerEmpresa(null)}
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
  lead: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
