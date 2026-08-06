import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, esMultiempresa, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmpresaDatosForm, type EmpresaDatosPatch } from '@/components/empresa-datos-form';
import { ErrorState } from '@/components/error-state';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { actualizarEmpresa, getEmpresasSistema, getFlotaVehiculos } from '@/services';
import { useTheme } from '@/theme';

/**
 * EDITAR CONTRATISTA — el CRUD del ADMINISTRADOR de una compañía sobre los
 * DATOS de sus empresas asociadas (nombre, RIF, teléfono, correo), con las
 * mismas validaciones y desplegables del alta (vía EmpresaDatosForm, el mismo
 * formulario que usa la consola FOM). Los pagos, el servicio y la eliminación
 * siguen siendo de la administración FOM (en consola-empresa). Desde aquí
 * también se salta a sus reportes y ODT.
 */
export default function EditarEmpresaScreen() {
  const { spacing } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ companyId?: string }>();
  const companyId = params.companyId || '';

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [empresas, flota] = await Promise.all([getEmpresasSistema(), getFlotaVehiculos(companyId)]);
      return { empresas, flota };
    },
    [companyId],
    { onFocus: true },
  );

  const [ocupado, setOcupado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empresa = data?.empresas.find((e) => e.id === companyId) ?? null;
  const flota = data?.flota ?? [];

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // FOM edita todo desde su consola; esta pantalla es del administrador de
  // compañía sobre sus asociadas (la RLS lo re-valida en el servidor).
  if (!esAdmin(user) || (!esMultiempresa(user) && user.companyTipo !== 'predefinida')) {
    return <Redirect href="/" />;
  }

  async function onGuardar(patch: EmpresaDatosPatch) {
    if (ocupado) return;
    setError(null);
    setGuardado(false);
    setOcupado(true);
    try {
      await actualizarEmpresa(companyId, patch);
      setGuardado(true);
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title={empresa?.name ?? 'Empresa'} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          {estado === 'error' ? (
            <ErrorState description="No pudimos cargar la empresa." onRetry={recargar} />
          ) : !data ? (
            <View style={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}>
              <Skeleton height={220} radius={16} />
            </View>
          ) : !empresa ? (
            <ErrorState description="Esa empresa ya no existe." onRetry={() => router.back()} />
          ) : (
            <ScrollView
              contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
              keyboardShouldPersistTaps="handled">
              <Card style={{ gap: spacing.md }}>
                <View style={styles.rowBetween}>
                  <ThemedText variant="overline" color="textMuted">
                    Datos de la contratista
                  </ThemedText>
                  {guardado ? <Chip tone="success" label="Guardado ✓" /> : null}
                </View>
                <EmpresaDatosForm empresa={empresa} ocupado={ocupado} onGuardar={onGuardar} />
                {error ? (
                  <ThemedText variant="caption" color="danger">
                    {error}
                  </ThemedText>
                ) : null}
              </Card>

              {/* ── SUS UNIDADES: tocar una abre su CRUD (editar / mover /
                  eliminar — la RLS valida el alcance en el servidor). ── */}
              <Card style={{ gap: spacing.sm }}>
                <ThemedText variant="overline" color="textMuted">
                  {`Unidades (${flota.length})`}
                </ThemedText>
                {flota.length === 0 ? (
                  <ThemedText variant="caption" color="textMuted">
                    Esta empresa no tiene vehículos todavía.
                  </ThemedText>
                ) : (
                  flota.map((f) => (
                    <PressableScale
                      key={f.vehicle.id}
                      onPress={() =>
                        router.navigate({ pathname: '/unidad', params: { vehicleId: f.vehicle.id } })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Ver la unidad ${f.vehicle.alias ?? f.vehicle.numero}`}
                      style={[styles.rowBetween, { paddingVertical: spacing.xs }]}>
                      <ThemedText variant="button">{f.vehicle.alias ?? f.vehicle.numero}</ThemedText>
                      <ThemedText variant="caption" color="textMuted">
                        {`${f.vehicle.marca} ${f.vehicle.modelo} · ${f.vehicle.placa} ›`}
                      </ThemedText>
                    </PressableScale>
                  ))
                )}
              </Card>

              {/* Su capa de monitoreo: reportes y ODT. */}
              <Button
                label="Ver sus reportes y ODT"
                variant="secondary"
                onPress={() =>
                  router.navigate({
                    pathname: '/gerencial/empresa',
                    params: { companyId, nombre: empresa.name },
                  })
                }
              />
              <ThemedText variant="caption" color="textMuted">
                Los pagos, el servicio y la eliminación de la empresa los maneja la administración
                FOM.
              </ThemedText>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
