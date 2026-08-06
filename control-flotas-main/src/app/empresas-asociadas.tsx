import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, esMultiempresa, useAuth } from '@/auth';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { getEmpresasAsignadasA } from '@/services';
import { useTheme } from '@/theme';
import type { CompanyTipo } from '@/types';

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

/**
 * EMPRESAS ASOCIADAS a una compañía: la misma vista que la tab Empresas, pero
 * filtrada a las contratistas y personales asignadas a esta compañía.
 * - Admin FOM: tocar una abre su administración completa (consola-empresa).
 * - ADMINISTRADOR de la compañía: su lista de contratistas — tocar una abre
 *   su capa gerencial (reportes, ODT); su gente se maneja en "Usuarios de
 *   mis entes".
 */
export default function EmpresasAsociadasScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ companyId?: string; nombre?: string }>();
  const companyId = params.companyId || '';
  const nombre = params.nombre || 'mi compañía';

  const { data: empresas, estado, recargar } = useAsyncData(
    () => getEmpresasAsignadasA([companyId]),
    [companyId],
    { onFocus: true },
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  const esFom = esMultiempresa(user);
  // Entra el admin FOM (cualquier compañía) o el administrador DE ESTA compañía.
  if (!companyId || (!esFom && !(esAdmin(user) && user.companyId === companyId))) {
    return <Redirect href="/" />;
  }

  const lista = empresas ?? [];

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title={`Asociadas a ${nombre}`} />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar las empresas asociadas." onRetry={recargar} />
        ) : !empresas ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={72} radius={16} />
            ))}
          </View>
        ) : lista.length === 0 ? (
          <EmptyState
            title="Sin empresas asociadas"
            description={`Asigna contratistas o personales a ${nombre} al crearlas, o editándolas desde su administración.`}
          />
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {lista.map((e) => {
              const activo = e.servicioActivo !== false;
              return (
                <PressableScale
                  key={e.id}
                  onPress={() =>
                    esFom
                      ? router.navigate({ pathname: '/consola-empresa', params: { companyId: e.id } })
                      : esAdmin(user)
                        ? // El ADMINISTRADOR de la compañía manipula la contratista
                          // (editar datos + saltar a sus reportes).
                          router.navigate({ pathname: '/editar-empresa', params: { companyId: e.id } })
                        : router.navigate({
                            pathname: '/gerencial/empresa',
                            params: { companyId: e.id, nombre: e.name },
                          })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${esFom ? 'Administrar' : 'Ver'} ${e.name}, ${TIPO_LABEL[e.tipo ?? 'estandar']}`}>
                  <Card style={[styles.row, { gap: spacing.md }]}>
                    <View style={[styles.lead, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md }]}>
                      <TabIcon name={TIPO_ICON[e.tipo ?? 'estandar']} color={colors.primary} size={20} />
                    </View>
                    <View style={styles.flex1}>
                      <ThemedText variant="subtitle">{e.name}</ThemedText>
                      <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
                        {`${TIPO_LABEL[e.tipo ?? 'estandar']}${e.rif ? ` · ${e.rif}` : ''}`}
                      </ThemedText>
                    </View>
                    <Chip tone={activo ? 'success' : 'danger'} label={activo ? 'Activa' : 'Suspendida'} />
                    <ThemedText variant="body" color="textMuted">
                      ›
                    </ThemedText>
                  </Card>
                </PressableScale>
              );
            })}
            <ThemedText variant="caption" color="textMuted">
              {esFom
                ? 'Toca una empresa para ver toda su información: datos, pagos, servicio, personas y su panel.'
                : 'Toca una empresa para ver sus reportes y su histórico de ODT. Su gente se maneja en "Usuarios de mis entes".'}
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
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  lead: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
