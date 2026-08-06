import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useSignOut } from '@/auth';
import { Appear } from '@/components/appear';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PressableScale } from '@/components/pressable-scale';
import { SegmentedControl } from '@/components/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { TabIcon } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { getCompanyBrandById, getEmpresasAsignadasA } from '@/services';
import { DEFAULT_BRAND, getContrastingTextColor, useTheme, useThemeController } from '@/theme';
import type { Company } from '@/types';

/** Empresa asignada + su color de marca (para identificarla de un vistazo). */
type AsignadaItem = { company: Company; color: string };

/** Iniciales para el logo placeholder de la empresa. */
function iniciales(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * HOME de la vista gerencial (FOM-02 §2.1): si el supervisor tiene más de una
 * predefinida elige la cuenta; luego ve la lista de empresas asignadas y entra
 * a la capa gerencial (solo lectura) de cada una. La sesión se pinta SIEMPRE
 * con la marca de la predefinida activa (P14).
 */
export default function GerencialHomeScreen() {
  const { colors, spacing, radii, brand } = useTheme();
  const { setBrand } = useThemeController();
  const { user } = useAuth();
  const signOut = useSignOut();
  const router = useRouter();

  // El SUPERVISOR gestiona su propia compañía: desde ella entra a la capa
  // gerencial de cada contratista asociado.
  const predefinidas: string[] = user?.companyId ? [user.companyId] : [];
  const [predefinidaActiva, setPredefinidaActiva] = useState<string | null>(
    predefinidas[0] ?? null,
  );

  // Nombres de las predefinidas (para el selector, §2.1) vía su marca.
  const { data: cuentas } = useAsyncData(
    async () =>
      Promise.all(
        predefinidas.map(async (id) => {
          const b = await getCompanyBrandById(id);
          return { id, nombre: b?.name ?? id };
        }),
      ),
    [user?.id],
  );

  // P14: la marca de la sesión es la de la predefinida ACTIVA.
  useEffect(() => {
    if (!predefinidaActiva) return;
    let active = true;
    getCompanyBrandById(predefinidaActiva).then((b) => {
      if (active) setBrand(b ?? DEFAULT_BRAND);
    });
    return () => {
      active = false;
    };
  }, [predefinidaActiva, setBrand]);

  // Empresas asignadas a la predefinida activa, con su color.
  const { data: items, estado, recargar } = useAsyncData<AsignadaItem[]>(
    async () => {
      if (!predefinidaActiva) return [];
      const empresas = await getEmpresasAsignadasA([predefinidaActiva]);
      return Promise.all(
        empresas.map(async (company) => {
          const b = await getCompanyBrandById(company.id);
          return { company, color: b?.primaryColor ?? DEFAULT_BRAND.primaryColor };
        }),
      );
    },
    [predefinidaActiva],
    { onFocus: true },
  );

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <View style={styles.flex1}>
            <ThemedText variant="overline" color="textMuted">
              Vista gerencial
            </ThemedText>
            <ThemedText variant="subtitle" numberOfLines={1}>
              {brand.name}
            </ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {/* Selector de cuenta predefinida, solo si supervisa más de una (§2.1). */}
            {cuentas && cuentas.length > 1 ? (
              <SegmentedControl
                options={cuentas.map((c) => ({ value: c.id, label: c.nombre }))}
                value={predefinidaActiva ?? cuentas[0].id}
                onChange={setPredefinidaActiva}
              />
            ) : null}

            <ThemedText variant="caption" color="textMuted">
              Empresas asignadas. Tu vista es gerencial y de solo lectura.
            </ThemedText>

            {estado === 'error' ? (
              <ErrorState description="No pudimos cargar tus empresas asignadas." onRetry={recargar} />
            ) : !items ? (
              [0, 1].map((i) => (
                <Card key={i} style={[styles.companyCard, { gap: spacing.md }]}>
                  <Skeleton width={48} height={48} radius={radii.md} />
                  <View style={styles.flex1}>
                    <Skeleton width="50%" height={16} />
                    <View style={{ height: spacing.xs }} />
                    <Skeleton width="30%" height={12} />
                  </View>
                </Card>
              ))
            ) : items.length === 0 ? (
              <EmptyState
                title="Sin empresas asignadas"
                description="Cuando el administrador asigne empresas a tu cuenta, aparecerán aquí."
              />
            ) : (
              items.map(({ company, color }, i) => (
                <Appear key={company.id} delay={i * 70}>
                  <PressableScale
                    onPress={() =>
                      router.navigate({
                        pathname: '/gerencial/empresa',
                        params: { companyId: company.id, nombre: company.name },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Ver capa gerencial de ${company.name}`}>
                    <Card style={[styles.companyCard, { gap: spacing.md }]}>
                      <View style={[styles.avatar, { backgroundColor: color, borderRadius: radii.md }]}>
                        <ThemedText variant="subtitle" style={{ color: getContrastingTextColor(color) }}>
                          {iniciales(company.name)}
                        </ThemedText>
                      </View>
                      <View style={styles.flex1}>
                        <ThemedText variant="subtitle">{company.name}</ThemedText>
                        <ThemedText variant="caption" color="textMuted">
                          Reporte gerencial · Reportes · Histórico ODT
                        </ThemedText>
                      </View>
                      <ThemedText variant="title" color="textMuted">
                        ›
                      </ThemedText>
                    </Card>
                  </PressableScale>
                </Appear>
              ))
            )}

            {/* Único cierre de sesión de esta superficie (sin botón en el header). */}
            <PressableScale
              onPress={signOut}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              style={{ marginTop: spacing.md }}>
              <Card style={[styles.companyCard, { gap: spacing.md }]}>
                <View style={[styles.avatar, { backgroundColor: colors.dangerSurface, borderRadius: radii.md }]}>
                  <TabIcon name="salir" color={colors.danger} size={20} />
                </View>
                <View style={styles.flex1}>
                  <ThemedText variant="button" color="danger">
                    Cerrar sesión
                  </ThemedText>
                  <ThemedText variant="caption" color="textMuted">
                    Salir de tu cuenta
                  </ThemedText>
                </View>
              </Card>
            </PressableScale>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scrollContent: { paddingBottom: 32 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  companyCard: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
