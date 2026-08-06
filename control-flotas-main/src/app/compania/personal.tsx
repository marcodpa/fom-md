import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, etiquetaRol, useAuth } from '@/auth';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorState } from '@/components/error-state';
import { PillButton } from '@/components/pill-button';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { getEmpresasAsignadasA, listarUsuariosSistema } from '@/services';
import { useTheme } from '@/theme';
import type { CompanyTipo, User } from '@/types';

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
 * PERSONAL de la compañía — monitoreo de la GENTE, no de la flota: primero los
 * usuarios de la propia compañía (sus administradores y supervisores) y luego
 * una tarjeta expandible por empresa asociada con sus perfiles, igual que en
 * usuarios-entes. El ADMINISTRADOR toca a una persona para editarla; el
 * SUPERVISOR (solo lectura, FOM-02 §2) solo mira: sus filas no se tocan.
 */
export default function CompaniaPersonalScreen() {
  const { colors, spacing, radii, brand } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();

  // El slug de la compañía: el administrador lo lleva en companyId; el
  // supervisor de solo lectura, en sus predefinidas asignadas.
  const companyId = user?.companyId ?? '';

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [usuarios, contratistas] = await Promise.all([
        listarUsuariosSistema(),
        getEmpresasAsignadasA([companyId]),
      ]);
      return { usuarios, contratistas };
    },
    [companyId],
    { onFocus: true },
  );

  // Contratistas abiertas (expandidas) para ver su gente.
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  // Solo el ADMINISTRADOR edita gente; el supervisor de solo lectura, no.
  const puedeEditar = esAdmin(user);

  const usuarios = data?.usuarios ?? [];
  const contratistas = data?.contratistas ?? [];

  // La gente de un ente, sin los admin FOM (que no pertenecen a ninguna empresa)
  // y sin UNO MISMO: nadie se administra a sí mismo desde el manejo de personal
  // (sus datos propios los edita en "Mi perfil").
  const usuariosDe = (empresaId: string) =>
    usuarios.filter(
      (u) =>
        u.role !== 'admin' &&
        u.role !== 'superAdmin' &&
        u.id !== user?.id &&
        u.companyId === empresaId,
    );

  const miGente = usuariosDe(companyId);

  function toggleEmpresa(id: string) {
    setAbiertas((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  /**
   * Fila de una persona (nombre, email, rango). Con permiso de edición es
   * tocable (→ editar-usuario); en solo lectura es una fila inerte, para que
   * el supervisor no reciba affordances de acciones que no puede hacer.
   */
  function FilaPersona({ u, conBorde, tipo }: { u: User; conBorde: boolean; tipo?: CompanyTipo }) {
    const filaStyle = [
      styles.row,
      {
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderTopWidth: conBorde ? StyleSheet.hairlineWidth : 0,
        borderTopColor: colors.border,
      },
    ];
    const contenido = (
      <>
        <View style={styles.flex1}>
          <ThemedText variant="button">{u.name}</ThemedText>
          <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
            {u.email}
          </ThemedText>
        </View>
        <Chip tone="textMuted" label={etiquetaRol(u.role, tipo)} />
        {puedeEditar ? (
          <ThemedText variant="body" color="textMuted">
            ›
          </ThemedText>
        ) : null}
      </>
    );
    if (!puedeEditar) return <View style={filaStyle}>{contenido}</View>;
    return (
      <PressableScale
        onPress={() => router.navigate({ pathname: '/editar-usuario', params: { userId: u.id } })}
        accessibilityRole="button"
        accessibilityLabel={`Editar a ${u.name}`}
        style={filaStyle}>
        {contenido}
      </PressableScale>
    );
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <View style={styles.flex1}>
            <ThemedText variant="overline" color="textMuted">
              {`${brand.name} · Monitoreo`}
            </ThemedText>
            <ThemedText variant="title">Personal</ThemedText>
          </View>
        </View>

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar el personal." onRetry={recargar} />
        ) : !data ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            <Skeleton height={120} radius={16} />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={64} radius={16} />
            ))}
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {/* ── PRIMERO los nuestros: la gente de la propia compañía. ── */}
            <ThemedText variant="overline" color="textMuted">
              {`Mi compañía (${miGente.length})`}
            </ThemedText>
            <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
              {miGente.length === 0 ? (
                <ThemedText variant="caption" color="textMuted" style={{ paddingVertical: spacing.sm }}>
                  Sin usuarios todavía.
                </ThemedText>
              ) : (
                miGente.map((u, i) => <FilaPersona key={u.id} u={u} conBorde={i > 0} tipo="predefinida" />)
              )}
            </Card>

            {/* ── Luego, una tarjeta expandible por empresa asociada. ── */}
            <ThemedText variant="overline" color="textMuted" style={{ marginTop: spacing.md }}>
              {`Empresas asociadas (${contratistas.length})`}
            </ThemedText>
            {contratistas.length === 0 ? (
              <Card>
                <ThemedText variant="caption" color="textMuted">
                  Cuando FOM asigne contratistas o personales a tu compañía, su gente aparecerá aquí.
                </ThemedText>
              </Card>
            ) : (
              contratistas.map((e) => {
                const abierta = abiertas.has(e.id);
                const gente = usuariosDe(e.id);
                return (
                  <Card key={e.id} style={{ gap: 0, paddingVertical: spacing.xs }}>
                    <PressableScale
                      onPress={() => toggleEmpresa(e.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${abierta ? 'Ocultar' : 'Ver'} el personal de ${e.name}`}
                      style={[styles.row, { gap: spacing.md, paddingVertical: spacing.sm }]}>
                      <View style={[styles.lead, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md }]}>
                        <TabIcon name={TIPO_ICON[e.tipo ?? 'estandar']} color={colors.primary} size={20} />
                      </View>
                      <View style={styles.flex1}>
                        <ThemedText variant="button">{e.name}</ThemedText>
                        <ThemedText variant="caption" color="textMuted">
                          {TIPO_LABEL[e.tipo ?? 'estandar']}
                        </ThemedText>
                      </View>
                      <Chip tone="textMuted" label={`${gente.length}`} />
                      <ThemedText variant="body" color="textMuted">
                        {abierta ? '▾' : '›'}
                      </ThemedText>
                    </PressableScale>

                    {abierta ? (
                      <View>
                        {gente.length === 0 ? (
                          <ThemedText variant="caption" color="textMuted" style={{ paddingVertical: spacing.sm }}>
                            Sin usuarios todavía.
                          </ThemedText>
                        ) : (
                          gente.map((u) => <FilaPersona key={u.id} u={u} conBorde tipo={e.tipo} />)
                        )}
                        {/* Crear vive en crear-usuario; aquí solo el atajo del admin. */}
                        {puedeEditar ? (
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
                              label="+ Añadir usuario"
                              tone="primary"
                              onPress={() =>
                                router.navigate({ pathname: '/crear-usuario', params: { companyId: e.id } })
                              }
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </Card>
                );
              })
            )}

            <ThemedText variant="caption" color="textMuted">
              {puedeEditar
                ? 'Toca una empresa para ver su gente; toca a una persona para editarla.'
                : 'Toca una empresa para ver su gente y el rango de cada persona.'}
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
