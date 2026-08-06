import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esMultiempresa, useAuth } from '@/auth';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PillButton } from '@/components/pill-button';
import { PressableScale } from '@/components/pressable-scale';
import { SearchBar, normalizar } from '@/components/search-bar';
import { Skeleton } from '@/components/skeleton';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { esDesempleados, getEmpresasSistema } from '@/services';
import { useTheme } from '@/theme';
import type { CompanyTipo } from '@/types';

const TIPO_LABEL: Record<CompanyTipo, string> = {
  predefinida: 'Compañía',
  estandar: 'Contratista',
  personal: 'Personal',
};

/** Ícono que identifica el tipo de ente de un vistazo. */
const TIPO_ICON: Record<CompanyTipo, TabIconName> = {
  predefinida: 'empresa',
  estandar: 'flota',
  personal: 'inicio',
};

/**
 * ENTES del sistema — la tab del admin FOM: TODAS las entes (compañías,
 * contratistas y personales) con su tipo y el estado de su servicio. Tocar una
 * abre su ADMINISTRACIÓN completa (datos, pagos, servicio, sus personas,
 * entrar a su panel; en compañías, además sus empresas asociadas).
 */
export default function AdminEmpresasSistemaScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();

  const { data: empresas, estado, recargar } = useAsyncData(getEmpresasSistema, [], { onFocus: true });
  const [q, setQ] = useState('');

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esMultiempresa(user)) return <Redirect href="/" />;

  // "Desempleados C.A." NO es una empresa administrable: es solo el contenedor
  // de gente sin empleo (vive en la tab Usuarios), no aparece aquí.
  const lista = (empresas ?? []).filter((e) => !esDesempleados(e.id));
  const nq = normalizar(q);
  const visibles = nq
    ? lista.filter((e) => normalizar(`${e.name} ${e.rif ?? ''} ${TIPO_LABEL[e.tipo ?? 'estandar']}`).includes(nq))
    : lista;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <View style={styles.flex1}>
            <ThemedText variant="overline" color="textMuted">
              FOM · Administración del sistema
            </ThemedText>
            <ThemedText variant="title">Empresas</ThemedText>
          </View>
          {/* Crear ARRIBA, siempre a la vista aunque la lista crezca. */}
          <PillButton label="+ Nueva empresa" tone="primary" onPress={() => router.navigate('/crear-empresa')} />
        </View>

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar las empresas." onRetry={recargar} />
        ) : !empresas ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={72} radius={16} />
            ))}
          </View>
        ) : lista.length === 0 ? (
          <EmptyState
            title="Sin empresas todavía"
            description="Crea la primera con el botón de arriba: normal, general (contratante) o personal."
          />
        ) : (
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}
            keyboardShouldPersistTaps="handled">
            <SearchBar value={q} onChangeText={setQ} placeholder="Buscar por nombre, RIF o tipo…" />
            {visibles.length === 0 ? (
              <ThemedText variant="caption" color="textMuted" style={{ paddingVertical: spacing.md }}>
                {`Sin resultados para “${q}”.`}
              </ThemedText>
            ) : null}
            {visibles.map((e) => {
              const activo = e.servicioActivo !== false;
              // "asignada a": nombres legibles, no slugs.
              const asignadaA = e.predefinidaIds
                ?.map((id) => lista.find((x) => x.id === id)?.name ?? id)
                .join(', ');
              return (
                <PressableScale
                  key={e.id}
                  onPress={() => router.navigate({ pathname: '/consola-empresa', params: { companyId: e.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`Administrar ${e.name}, ${TIPO_LABEL[e.tipo ?? 'estandar']}`}>
                  <Card style={[styles.row, { gap: spacing.md }]}>
                    {/* Ícono del tipo: compañía, contratista o personal. */}
                    <View style={[styles.lead, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md }]}>
                      <TabIcon name={TIPO_ICON[e.tipo ?? 'estandar']} color={colors.primary} size={20} />
                    </View>
                    <View style={styles.flex1}>
                      <ThemedText variant="subtitle">{e.name}</ThemedText>
                      <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
                        {`${TIPO_LABEL[e.tipo ?? 'estandar']}${e.rif ? ` · ${e.rif}` : ''}${
                          asignadaA ? ` · asignada a ${asignadaA}` : ''
                        }`}
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
              Toca una ente para administrarla: datos, pagos, servicio, personas y su panel. En las
              compañías, también sus empresas asociadas.
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
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  lead: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
