import { Image, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { MetricCard } from '@/components/metric-card';
import { PressableScale } from '@/components/pressable-scale';
import { ChartsPlaceholder, ReportHeader } from '@/components/report-header';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/theme';
import type { DriverProfile, Role, UserReport } from '@/types';

/**
 * Resultado de un reporte de USUARIOS: encabezado-resumen + agregado del período
 * + espacio para gráficas + cada usuario con sus datos y métricas. Compartido
 * por el generador de empresa y el multi.
 */
export function UserReportResult({
  reporte,
  empresaNombre,
  empresaColor,
  onUserPress,
}: {
  reporte: UserReport;
  /** Empresa del reporte (para el encabezado; en multi es cada empresa). */
  empresaNombre?: string;
  empresaColor?: string;
  /** Abre el perfil de un usuario (opcional). Pasa el rol para que el perfil
   *  no trate a un administrador como conductor. */
  onUserPress?: (userId: string, nombre: string, role?: Role) => void;
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

      {/* KPIs agregados */}
      <View style={[styles.grid, { gap: spacing.md }]}>
        <MetricCard style={styles.cell} label="Usuarios" value={`${metrics.usuarios}`} />
        <MetricCard
          style={styles.cell}
          label="Km recorridos"
          value={metrics.kmRecorridos.toLocaleString('es')}
        />
        <MetricCard style={styles.cell} label="Días" value={`${metrics.diasConducidos}`} />
        <MetricCard style={styles.cell} label="Horas" value={`${metrics.horasConducidas}`} />
        <MetricCard
          style={styles.cell}
          label="Recargas"
          value={`${metrics.recargas}`}
          helper={`${metrics.litros} L en total`}
        />
        <MetricCard
          style={styles.cell}
          label="OT reportadas"
          value={`${metrics.otReportadas}`}
          valueColor={metrics.otReportadas > 0 ? 'warning' : 'text'}
        />
      </View>

      {/* Espacio reservado para gráficas. */}
      <ChartsPlaceholder />

      {/* Desglose por usuario */}
      {reporte.usuarios.length === 0 ? (
        <Card>
          <ThemedText variant="body" color="textMuted">
            No hay usuarios en este alcance.
          </ThemedText>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="overline" color="textMuted">
            Por usuario
          </ThemedText>
          <Card style={{ gap: spacing.xs }}>
            {reporte.usuarios.map((u, i) => (
              <UserRow
                key={u.id}
                user={u}
                divider={i > 0}
                onPress={onUserPress ? () => onUserPress(u.id, u.nombre, u.role) : undefined}
              />
            ))}
          </Card>
        </View>
      )}
    </View>
  );
}

/** Fila de un usuario dentro del reporte (datos + métricas). */
function UserRow({
  user,
  divider,
  onPress,
}: {
  user: DriverProfile;
  divider: boolean;
  onPress?: () => void;
}) {
  const { colors, spacing, radii } = useTheme();
  const m = user.metrics;
  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.row,
        divider && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
        { paddingVertical: spacing.md, gap: spacing.md },
      ]}>
      <Image
        source={{ uri: user.fotoUrl }}
        style={[styles.avatar, { borderRadius: radii.pill, backgroundColor: colors.surfaceSunken }]}
      />
      <View style={styles.flex1}>
        <ThemedText variant="subtitle">{user.nombre}</ThemedText>
        <ThemedText variant="caption" color="textSecondary" numberOfLines={1}>
          {`${user.cedula} · ${m.vehiculosUsados.length} vehículos`}
        </ThemedText>
        <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
          {`${m.kmRecorridos.toLocaleString('es')} km · ${m.diasConducidos} d · ${m.horasConducidas} h · ${m.recargas} recargas · ${m.otReportadas} ODT`}
        </ThemedText>
      </View>
      {onPress ? (
        <ThemedText variant="title" color="textMuted">
          ›
        </ThemedText>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flexGrow: 1, flexBasis: 150, minWidth: 140 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40 },
  flex1: { flex: 1 },
});
