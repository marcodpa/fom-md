import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, useAuth } from '@/auth';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { crearArea, getAreas, getCompanyBrandById } from '@/services';
import { useTheme, useThemeController } from '@/theme';
import type { AreaTipo } from '@/types';

const TIPO_LABEL: Record<AreaTipo, string> = {
  ubicacion: 'Ubicación',
  sector: 'Sector',
  contrato: 'Contrato',
};

/**
 * ÁREAS DE LA EMPRESA (FOM-02 §3.1): el supervisor las crea por ubicación
 * (ej. "Base Maturín"), por sector (ej. "Producción") o por contrato (ej.
 * "Contrato Chevron 2026"). Sirven para asignar vehículos y alertas por área.
 */
export default function AreasScreen() {
  const { colors, spacing } = useTheme();
  const { setBrand } = useThemeController();
  const { user, status } = useAuth();
  const params = useLocalSearchParams<{ companyId?: string }>();
  const companyId = params.companyId || '';

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<AreaTipo>('ubicacion');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!companyId) return;
      let active = true;
      getCompanyBrandById(companyId).then((b) => {
        if (active && b) setBrand(b);
      });
      return () => {
        active = false;
      };
    }, [companyId, setBrand]),
  );

  const { data: areas, estado, recargar } = useAsyncData(() => getAreas(companyId), [companyId]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esAdmin(user)) return <Redirect href="/" />;

  async function onCrear() {
    if (creando) return;
    setError(null);
    setCreando(true);
    try {
      await crearArea(companyId, nombre, tipo);
      setNombre('');
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el área.');
    } finally {
      setCreando(false);
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Áreas de la empresa" />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar las áreas." onRetry={recargar} />
        ) : (
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled">
            {/* Crear área */}
            <Card style={{ gap: spacing.md }}>
              <ThemedText variant="overline" color="textMuted">
                Nueva área
              </ThemedText>
              <TextField
                label="Nombre"
                value={nombre}
                onChangeText={setNombre}
                placeholder='Ej. "Base Maturín", "Producción", "Contrato Chevron 2026"'
                editable={!creando}
              />
              <SegmentedControl
                options={[
                  { value: 'ubicacion', label: 'Ubicación' },
                  { value: 'sector', label: 'Sector' },
                  { value: 'contrato', label: 'Contrato' },
                ]}
                value={tipo}
                onChange={setTipo}
              />
              {error ? (
                <ThemedText variant="caption" color="danger">
                  {error}
                </ThemedText>
              ) : null}
              <Button label={creando ? 'Creando…' : 'Crear área'} onPress={onCrear} loading={creando} />
            </Card>

            {/* Listado */}
            {estado === 'cargando' || !areas ? (
              [0, 1, 2].map((i) => <Skeleton key={i} height={56} radius={16} />)
            ) : areas.length === 0 ? (
              <EmptyState
                title="Sin áreas todavía"
                description="Crea la primera: por ubicación, por sector o por contrato."
              />
            ) : (
              <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
                {areas.map((a, i) => (
                  <View
                    key={a.id}
                    style={[
                      styles.row,
                      { gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    ]}>
                    <View style={styles.flex1}>
                      <ThemedText variant="body">{a.nombre}</ThemedText>
                    </View>
                    <Chip tone="info" label={TIPO_LABEL[a.tipo]} />
                  </View>
                ))}
              </Card>
            )}

            <ThemedText variant="caption" color="textMuted">
              Asigna cada vehículo a su área desde Flota → unidad. Las alertas también se pueden
              asignar por área.
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
  flex1: { flex: 1, minWidth: 0 },
});
