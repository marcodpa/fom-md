import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { etiquetaRol, useAuth } from '@/auth';
import { AdminHeader } from '@/components/admin-header';
import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PressableScale } from '@/components/pressable-scale';
import { PillButton } from '@/components/pill-button';
import { SearchBar, normalizar } from '@/components/search-bar';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import { getFlotaVehiculos, getUsuariosDeEmpresa } from '@/services';
import { useAdmin } from '@/session';
import { useTheme, type ColorTokens } from '@/theme';
import type { DriverProfile, FleetVehicle, Role } from '@/types';
import { vigenciaMock } from '@/utils/vigencia';

const ROLE_TONE: Partial<Record<Role, keyof ColorTokens>> = {
  supervisor_company: 'info',
  admin: 'info',
  companyAdmin: 'info',
  generalAdmin: 'info',
};

/** ¿Esta persona conduce? (conductor real, o perfil mock antiguo sin rol). */
function esConductor(role?: Role): boolean {
  return !role || role === 'conductor' || role === 'driver';
}

/**
 * PERSONAL (Tablero 2 · Módulo 8): TODOS los usuarios de la empresa en una
 * lista, y en cada uno se indica si le falta algo en su perfil (perfil sin
 * completar, licencia por vencer/vencida). Tocar a la persona abre su
 * expediente con sus documentos. Todo pasa por la capa de servicios; la carga,
 * el error y el reintento los orquesta `useAsyncData` (A2).
 */
export default function AdminPersonalScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const { empresaId } = useAdmin();
  const router = useRouter();


  // Dos cargas en paralelo con estado combinado, cancelación y reintento en una
  // sola línea. `data` es la tupla [usuarios, flota]; refresca al recuperar foco.
  const { data, estado, recargar } = useAsyncData(
    () => Promise.all([getUsuariosDeEmpresa(empresaId ?? ''), getFlotaVehiculos(empresaId ?? '')]),
    [empresaId],
    { onFocus: true },
  );
  const [roster, flota]: [DriverProfile[], FleetVehicle[]] = data ?? [[], []];
  // Uno NO se administra a sí mismo: su ficha no aparece en el manejo de
  // personal (sus datos propios los edita en "Mi perfil").
  const usuarios = roster.filter((u) => u.id !== user?.id);
  const [q, setQ] = useState('');
  // Al cambiar de empresa (la pantalla se reutiliza), limpia la búsqueda vieja.
  useEffect(() => setQ(''), [empresaId]);
  const nq = normalizar(q);
  const visibles = nq
    ? usuarios.filter((u) => normalizar(`${u.nombre} ${etiquetaRol(u.role ?? 'conductor')}`).includes(nq))
    : usuarios;

  /** Qué le falta a una persona dentro de su perfil (para el indicador de la
   *  fila). La licencia solo aplica a CONDUCTORES. */
  const faltantesDe = (u: DriverProfile): string[] => {
    const faltas: string[] = [];
    if (u.cedula === 'Pendiente') faltas.push('Perfil sin completar');
    if (esConductor(u.role)) {
      const lic = vigenciaMock(u.id);
      if (lic === 'por_vencer') faltas.push('Licencia por vencer');
      if (lic === 'vencido') faltas.push('Licencia vencida');
    }
    return faltas;
  };

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AdminHeader seccion="Personal" />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar el personal." onRetry={recargar} />
        ) : !data ? (
          // Esqueletos SOLO en la primera carga (B2): los refetch por foco no
          // borran la lista visible.
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            <Skeleton height={44} radius={radii.md} />
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} style={[styles.row, { gap: spacing.md }]}>
                <Skeleton width={44} height={44} radius={radii.pill} />
                <View style={styles.flex1}>
                  <Skeleton width="55%" height={16} />
                  <View style={{ height: spacing.xs }} />
                  <Skeleton width="35%" height={12} />
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {/* Crear ARRIBA (visible aunque la lista crezca, directriz PDF-4). */}
            <View style={styles.sectionRow}>
              <ThemedText variant="overline" color="textMuted" style={styles.flex1}>
                {`Usuarios (${usuarios.length})`}
              </ThemedText>
              <PillButton
                label="+ Crear usuario"
                tone="primary"
                onPress={() => router.navigate({ pathname: '/crear-usuario', params: { companyId: empresaId ?? '' } })}
              />
            </View>

            {/* Buscador de usuarios (por nombre o rol). */}
            {usuarios.length > 0 ? (
              <SearchBar value={q} onChangeText={setQ} placeholder="Buscar por nombre o rol…" />
            ) : null}

            {usuarios.length === 0 ? (
              <EmptyState
                title="Sin usuarios"
                description="Aún no hay usuarios registrados en esta empresa."
              />
            ) : visibles.length === 0 ? (
              <EmptyState title="Sin resultados" description={`Ningún usuario coincide con “${q}”.`} />
            ) : (
              visibles.map((u) => {
                const conductor = esConductor(u.role);
                const vehiculo = conductor ? (flota.find((f) => f.conductorId === u.id) ?? null) : null;
                const conduce = !!vehiculo;
                const faltas = faltantesDe(u);
                return (
                  <PressableScale
                    key={u.id}
                    onPress={() =>
                      router.navigate({
                        pathname: '/ver-perfil',
                        params: { userId: u.id, nombre: u.nombre, role: u.role ?? 'conductor', ...(u.email ? { email: u.email } : {}) },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir el perfil de ${u.nombre}`}>
                    <Card style={[styles.row, { gap: spacing.md }]}>
                      <Avatar uri={u.fotoUrl || undefined} nombre={u.nombre} size={44} />
                      <View style={styles.flex1}>
                        <ThemedText variant="subtitle">{u.nombre}</ThemedText>
                        {/* Estado de conducción SOLO para conductores; los
                            demás (administrador, supervisor) no conducen. */}
                        {conductor ? (
                          <View style={[styles.inline, { gap: spacing.xs }]}>
                            <View style={[styles.dot, { backgroundColor: conduce ? colors.success : colors.textMuted }]} />
                            <ThemedText variant="caption" color="textMuted" numberOfLines={1}>
                              {conduce ? `Conduciendo · ${vehiculo!.vehicle.numero}` : 'No está conduciendo'}
                            </ThemedText>
                          </View>
                        ) : null}
                        {faltas.length > 0 ? (
                          <ThemedText variant="caption" color="warning" numberOfLines={1}>
                            {`Falta: ${faltas.join(' · ')}`}
                          </ThemedText>
                        ) : null}
                      </View>
                      <View style={styles.end}>
                        {/* El RANGO REAL de la persona (no todos son conductores). */}
                        <Chip tone={ROLE_TONE[u.role ?? 'conductor'] ?? 'textMuted'} label={etiquetaRol(u.role ?? 'conductor')} />
                        <ThemedText variant="caption" color="textMuted">
                          Ver perfil ›
                        </ThemedText>
                      </View>
                    </Card>
                  </PressableScale>
                );
              })
            )}

            <ThemedText variant="caption" color="textMuted">
              La vigencia de la licencia (de los conductores) es simulada por ahora; con el backend
              saldrá de las fechas reales.
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
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center' },
  end: { alignItems: 'flex-end', gap: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex1: { flex: 1 },
});
