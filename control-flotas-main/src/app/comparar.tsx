import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, useAuth } from '@/auth';
import { Card } from '@/components/card';
import { EmpresaChips } from '@/components/empresa-chips';
import { ProgressBar } from '@/components/progress-bar';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getComparativaEmpresasConColor } from '@/services';
import { DEFAULT_BRAND, useTheme, useThemeController, type ColorTokens } from '@/theme';
import type { CompanyStats, ScoreRange } from '@/types';

/** Item de comparación: estadísticas de la empresa + su color de marca. */
type CompareItem = CompanyStats & { color: string };

/** Mapea el semáforo del rango a un color del tema. */
function rangoColor(rango: ScoreRange): keyof ColorTokens {
  if (rango === 'verde') return 'success';
  if (rango === 'amarillo') return 'warning';
  return 'danger';
}

export default function CompararScreen() {
  const { spacing } = useTheme();
  const { setBrand } = useThemeController();
  const { user, status } = useAuth();

  const [items, setItems] = useState<CompareItem[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Vista transversal a varias empresas: usa la identidad neutra de la app, no
  // la marca de ninguna empresa concreta.
  useFocusEffect(
    useCallback(() => {
      setBrand(DEFAULT_BRAND);
    }, [setBrand]),
  );

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const data = await getComparativaEmpresasConColor(user.role, user.companyId);
      if (!active) return;
      setItems(data);
      setSelectedIds(data.map((d) => d.company.id)); // por defecto, todas
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // Empresas elegidas para comparar.
  const shownItems = useMemo(
    () => (items ? items.filter((i) => selectedIds.includes(i.company.id)) : []),
    [items, selectedIds],
  );

  function toggleEmpresa(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Administradores (FOM/ente) y supervisores de compañía (solo lectura).
  if (!esAdmin(user)) return <Redirect href="/" />;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Comparar empresas" />

        {!items ? (
          // Esqueleto de carga (en vez de spinner).
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
            <View style={[styles.grid, { gap: spacing.md }]}>
              {[0, 1].map((i) => (
                <Card key={i} style={[styles.card, { gap: spacing.md }]}>
                  <Skeleton width="60%" height={18} />
                  <Skeleton width="40%" height={40} />
                  <Skeleton height={8} radius={4} />
                  <Skeleton width="80%" height={12} />
                  <Skeleton width="70%" height={12} />
                </Card>
              ))}
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
              <ThemedText variant="caption" color="textMuted">
                Índice de manejo seguro y actividad de cada empresa (últimos 30 días). Más alto es
                mejor.
              </ThemedText>

              {/* Elegir qué empresas comparar (chips con su color). */}
              <EmpresaChips
                label="Empresas a comparar"
                empresas={items.map((i) => ({
                  id: i.company.id,
                  name: i.company.name,
                  color: i.color,
                }))}
                selectedIds={selectedIds}
                onToggle={toggleEmpresa}
              />

              {/* Comparar exige 2 o más empresas (brief §8). */}
              {selectedIds.length < 2 ? (
                <Card>
                  <ThemedText variant="body" color="textMuted">
                    Selecciona al menos 2 empresas para compararlas.
                  </ThemedText>
                </Card>
              ) : (
                <View style={[styles.grid, { gap: spacing.md }]}>
                  {shownItems.map((item) => (
                    <CompanyCard key={item.company.id} item={item} />
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}

      </SafeAreaView>
    </ThemedView>
  );
}

/** Tarjeta comparativa de una empresa. */
function CompanyCard({ item }: { item: CompareItem }) {
  const { colors, spacing, radii } = useTheme();
  const { metrics } = item;
  const eventos = metrics.excesosVelocidad + metrics.frenadasBruscas + metrics.aceleracionesBruscas;
  const tono = rangoColor(metrics.rango);

  return (
    <Card style={[styles.card, { gap: spacing.md }]}>
      {/* Encabezado: color de marca + nombre */}
      <View style={[styles.cardHead, { gap: spacing.sm }]}>
        <View style={[styles.swatch, { backgroundColor: item.color, borderRadius: radii.sm }]} />
        <ThemedText variant="subtitle" numberOfLines={1} style={styles.flex1}>
          {item.company.name}
        </ThemedText>
      </View>

      {/* Índice de manejo seguro + barra proporcional */}
      <View style={{ gap: spacing.xs }}>
        <View style={styles.indiceRow}>
          <ThemedText variant="display" color={tono} style={styles.tabular}>
            {metrics.indiceSeguroPromedio}
          </ThemedText>
          <ThemedText variant="caption" color="textMuted">
            {' '}
            / 100 índice seguro
          </ThemedText>
        </View>
        <ProgressBar value={metrics.indiceSeguroPromedio} color={colors[tono]} />
      </View>

      {/* Métricas de actividad */}
      <View style={{ gap: spacing.xs }}>
        <StatRow label="Vehículos" value={`${metrics.vehiculos}`} />
        <StatRow label="Km recorridos" value={metrics.kmRecorridos.toLocaleString('es')} />
        <StatRow label="Eventos de manejo" value={`${eventos}`} />
        <StatRow
          label="OT abiertas"
          value={`${metrics.reportesAbiertos}`}
          valueColor={metrics.reportesAbiertos > 0 ? 'warning' : 'text'}
        />
      </View>
    </Card>
  );
}

/** Fila etiqueta–valor de una métrica. */
function StatRow({
  label,
  value,
  valueColor = 'text',
}: {
  label: string;
  value: string;
  valueColor?: keyof ColorTokens;
}) {
  return (
    <View style={styles.statRow}>
      <ThemedText variant="body" color="textSecondary">
        {label}
      </ThemedText>
      <ThemedText variant="subtitle" color={valueColor} style={styles.tabular}>
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
  },
  scrollContent: { paddingBottom: 32 },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // Una columna en teléfono; dos o más en tablet/web.
  card: { flexGrow: 1, flexBasis: 280, minWidth: 240 },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 18, height: 18 },
  flex1: { flex: 1 },
  indiceRow: { flexDirection: 'row', alignItems: 'baseline' },
  tabular: { fontVariant: ['tabular-nums'] },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
