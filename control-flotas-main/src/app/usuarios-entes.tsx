import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, esMultiempresa, etiquetaRol, useAuth } from '@/auth';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ErrorState } from '@/components/error-state';
import { PillButton } from '@/components/pill-button';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { getEmpresasSistema, listarUsuariosSistema } from '@/services';
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
 * USUARIOS DE MIS ENTES — la gestión de gente del ADMINISTRADOR de una
 * compañía (su compañía + sus asociadas) o de una contratista/personal (su
 * propio ente): una tarjeta por ente que se abre para ver sus perfiles;
 * tocar a una persona la edita (datos, ente, perfil, eliminar) y cada ente
 * tiene su "+ Añadir usuario". El servidor valida el alcance de cada acción.
 */
export default function UsuariosEntesScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();

  const { data, estado, recargar } = useAsyncData(
    async () => {
      const [usuarios, empresas] = await Promise.all([listarUsuariosSistema(), getEmpresasSistema()]);
      return { usuarios, empresas };
    },
    [],
    { onFocus: true },
  );

  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // El admin FOM tiene su propia tab Usuarios; esta es de los administradores.
  if (esMultiempresa(user)) return <Redirect href="/admin" />;
  if (!esAdmin(user)) return <Redirect href="/" />;

  const usuarios = data?.usuarios ?? [];
  const empresas = data?.empresas ?? [];

  // Mi ALCANCE: mi ente y, si es una compañía, también sus asociadas.
  const propia = empresas.find((e) => e.id === user.companyId);
  const alcance = propia
    ? propia.tipo === 'predefinida'
      ? [propia, ...empresas.filter((e) => e.predefinidaIds?.includes(propia.id))]
      : [propia]
    : [];

  // Sin los admin FOM y sin UNO MISMO: nadie se administra a sí mismo desde el
  // manejo de usuarios (sus datos propios los edita en "Mi perfil").
  const usuariosDe = (companyId: string) =>
    usuarios.filter(
      (u) =>
        u.role !== 'admin' &&
        u.role !== 'superAdmin' &&
        u.id !== user?.id &&
        u.companyId === companyId,
    );

  function toggleEmpresa(id: string) {
    setAbiertas((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Usuarios de mis entes" />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar los usuarios." onRetry={recargar} />
        ) : !data ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={64} radius={16} />
            ))}
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {alcance.map((e) => {
              const abierta = abiertas.has(e.id);
              const gente = usuariosDe(e.id);
              return (
                <Card key={e.id} style={{ gap: 0, paddingVertical: spacing.xs }}>
                  <PressableScale
                    onPress={() => toggleEmpresa(e.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${abierta ? 'Ocultar' : 'Ver'} los perfiles de ${e.name}`}
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
                        gente.map((u: User) => (
                          <PressableScale
                            key={u.id}
                            onPress={() =>
                              router.navigate({ pathname: '/editar-usuario', params: { userId: u.id } })
                            }
                            accessibilityRole="button"
                            accessibilityLabel={`Editar a ${u.name}`}
                            style={[
                              styles.row,
                              {
                                gap: spacing.md,
                                paddingVertical: spacing.md,
                                borderTopWidth: StyleSheet.hairlineWidth,
                                borderTopColor: colors.border,
                              },
                            ]}>
                            <View style={styles.flex1}>
                              <ThemedText variant="button">{u.name}</ThemedText>
                              <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
                                {u.email}
                              </ThemedText>
                            </View>
                            <Chip tone="textMuted" label={etiquetaRol(u.role, e.tipo)} />
                            <ThemedText variant="body" color="textMuted">
                              ›
                            </ThemedText>
                          </PressableScale>
                        ))
                      )}
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
                    </View>
                  ) : null}
                </Card>
              );
            })}
            <ThemedText variant="caption" color="textMuted">
              Toca una ente para ver su gente; toca a una persona para editarla, moverla entre tus
              entes o eliminarla.
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
