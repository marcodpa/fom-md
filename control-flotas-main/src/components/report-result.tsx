import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { MetricCard } from '@/components/metric-card';
import { ChartsPlaceholder, ReportHeader } from '@/components/report-header';
import { ThemedText } from '@/components/themed-text';
import { useTheme, type ColorTokens } from '@/theme';
import type { FleetReport, ScoreRange, VehicleReportRow } from '@/types';

/** Mapea el semáforo del rango a un color del tema. */
export function rangoColor(rango: ScoreRange): keyof ColorTokens {
  if (rango === 'verde') return 'success';
  if (rango === 'amarillo') return 'warning';
  return 'danger';
}

/**
 * Resultado de un reporte de vehículos: encabezado-resumen + KPIs + espacio para
 * gráficas + eventos + desglose por vehículo. Compartido por el reporte de una
 * empresa y por el generador multi-empresa.
 */
export function ReporteResultado({
  reporte,
  empresaNombre,
  empresaColor,
}: {
  reporte: FleetReport;
  /** Empresa del reporte (para el encabezado; en multi es cada empresa). */
  empresaNombre?: string;
  empresaColor?: string;
}) {
  const { spacing } = useTheme();
  const { metrics } = reporte;

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Encabezado-resumen: empresa, alcance y período. */}
      <ReportHeader
        empresaNombre={empresaNombre}
        empresaColor={empresaColor}
        alcance={reporte.titulo}
        periodo={reporte.periodo}
      />

      {/* KPIs principales */}
      <View style={[styles.grid, { gap: spacing.md }]}>
        <MetricCard
          style={styles.gridCell}
          label="Índice seguro prom."
          value={`${metrics.indiceSeguroPromedio}`}
          helper="100 = perfecto"
          valueColor={rangoColor(metrics.rango)}
        />
        <MetricCard style={styles.gridCell} label="Vehículos" value={`${metrics.vehiculos}`} />
        <MetricCard
          style={styles.gridCell}
          label="Km recorridos"
          value={metrics.kmRecorridos.toLocaleString('es')}
        />
        <MetricCard
          style={styles.gridCell}
          label="OT abiertas"
          value={`${metrics.reportesAbiertos}`}
          valueColor={metrics.reportesAbiertos > 0 ? 'warning' : 'text'}
        />
      </View>

      {/* Espacio reservado para gráficas. */}
      <ChartsPlaceholder />

      {/* Eventos del período (conteos crudos) */}
      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="overline" color="textMuted">
          Eventos del período
        </ThemedText>
        <View style={styles.eventsRow}>
          <EventTile label="Excesos vel." value={metrics.excesosVelocidad} />
          <EventTile label="Frenadas" value={metrics.frenadasBruscas} />
          <EventTile label="Aceleraciones" value={metrics.aceleracionesBruscas} />
        </View>
      </Card>

      {/* Desglose por vehículo (vacío en el reporte general) */}
      {reporte.porVehiculo.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="overline" color="textMuted">
            Desglose por vehículo
          </ThemedText>
          <Card style={{ gap: spacing.xs }}>
            {reporte.porVehiculo.map((row, i) => (
              <VehicleReportRowView key={row.vehicle.id} row={row} divider={i > 0} />
            ))}
          </Card>
        </View>
      ) : null}
    </View>
  );
}

/** Conteo de un tipo de evento. */
function EventTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.eventTile}>
      <ThemedText variant="title">{value}</ThemedText>
      <ThemedText variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

/** Fila del desglose por vehículo. */
function VehicleReportRowView({ row, divider }: { row: VehicleReportRow; divider: boolean }) {
  const { colors, spacing } = useTheme();
  const enMarcha = row.estado === 'en_marcha';
  return (
    <View
      style={[
        styles.vehicleRow,
        divider && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
        { paddingVertical: spacing.md, gap: spacing.md },
      ]}>
      <View style={styles.flex1}>
        <ThemedText variant="subtitle">{`${row.vehicle.numero} · ${row.vehicle.marca} ${row.vehicle.modelo}`}</ThemedText>
        {/* Área + estado (en marcha / parado). */}
        <View style={[styles.estadoRow, { gap: spacing.xs }]}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: enMarcha ? colors.success : colors.textMuted },
            ]}
          />
          <ThemedText variant="caption" color="textSecondary" numberOfLines={1}>
            {`${enMarcha ? 'En marcha' : 'Parado'} · ${row.areaName} · ${row.vehicle.placa} · ${row.vehicle.anio}`}
          </ThemedText>
        </View>
        <ThemedText variant="caption" color="textMuted">
          {`${row.km.toLocaleString('es')} km · ${row.excesosVelocidad} exc · ${row.frenadasBruscas} fren · ${row.aceleracionesBruscas} acel · ${row.otAbiertas} ODT abiertas`}
        </ThemedText>
      </View>
      <View style={styles.indiceWrap}>
        <ThemedText variant="title" color={rangoColor(row.rango)}>
          {row.indiceSeguro}
        </ThemedText>
        <ThemedText variant="caption" color="textMuted">
          índice
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { flexGrow: 1, flexBasis: 150, minWidth: 140 },
  eventsRow: { flexDirection: 'row' },
  eventTile: { flex: 1, alignItems: 'center', gap: 2 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center' },
  estadoRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  flex1: { flex: 1 },
  indiceWrap: { alignItems: 'center', minWidth: 56 },
});
