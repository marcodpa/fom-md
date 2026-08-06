import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esAdmin, useAuth } from '@/auth';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  evaluarReglas,
  getCompanyBrandById,
  getNotificacionesPanel,
  marcarNotificacionLeida,
} from '@/services';
import { useTheme, useThemeController } from '@/theme';

function fecha(iso: string): string {
  return new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * NOTIFICACIONES del panel (FOM-02 §3.2–§3.4, D7 in-app): "Nueva ODT" cuando
 * un conductor reporta, y "alerta cumplida" cuando una regla se dispara. Tocar
 * una notificación con ODT abre la ODT.
 */
export default function NotificacionesScreen() {
  const { colors, spacing } = useTheme();
  const { setBrand } = useThemeController();
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ companyId?: string }>();
  // El supervisor personal (Ale) solo ve las notificaciones de SU cuenta.
  const companyId =
    user?.role === 'supervisor_personal' ? (user.companyId ?? '') : params.companyId || '';

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

  // El motor mock evalúa las reglas antes de listar (§3.4): si alguna se
  // cumplió, aquí ya aparece su notificación (y su ODT preventiva en Mantto.).
  const { data: items, estado, recargar } = useAsyncData(
    async () => {
      await evaluarReglas(companyId);
      return getNotificacionesPanel(companyId);
    },
    [companyId],
    { onFocus: true },
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Panel operativo + supervisor personal (a Ale le llegan sus alertas, §5.2).
  if (!esAdmin(user) && user.role !== 'supervisor_personal') return <Redirect href="/" />;

  const puedeAbrirOdt = esAdmin(user);

  async function abrir(id: string, odtId?: string) {
    await marcarNotificacionLeida(id);
    if (odtId && puedeAbrirOdt) {
      router.navigate({ pathname: '/orden', params: { id: odtId, companyId } });
    } else {
      recargar();
    }
  }

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Notificaciones" />

        {estado === 'error' ? (
          <ErrorState description="No pudimos cargar las notificaciones." onRetry={recargar} />
        ) : !items ? (
          <View style={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={72} radius={16} />
            ))}
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            title="Sin notificaciones"
            description="Cuando llegue una ODT nueva o se cumpla una alerta, la verás aquí."
          />
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.md }]}>
            {items.map((n) => (
              <PressableScale
                key={n.id}
                onPress={() => abrir(n.id, n.odtId)}
                accessibilityRole="button"
                accessibilityLabel={n.titulo}>
                <Card style={{ gap: spacing.xs }}>
                  {/* Texto COMPLETO (sin cortar) y la tarjeta entera entra a la
                      ODT al tocarla — sin botón aparte (directriz PDF-3). */}
                  <View style={[styles.row, { gap: spacing.sm }]}>
                    {!n.leida ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
                    <ThemedText variant="subtitle" style={styles.flex1}>
                      {n.titulo}
                    </ThemedText>
                    <ThemedText variant="caption" color="textMuted">
                      {fecha(n.creadaEn)}
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption" color="textSecondary">
                    {n.detalle}
                  </ThemedText>
                </Card>
              </PressableScale>
            ))}
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
  dot: { width: 8, height: 8, borderRadius: 4 },
  flex1: { flex: 1, minWidth: 0 },
});
