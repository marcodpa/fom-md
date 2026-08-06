import { Redirect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esMultiempresa, puedeConducir, useAuth, useSignOut } from '@/auth';
import { AdminHeader } from '@/components/admin-header';
import { Card } from '@/components/card';
import { PressableScale } from '@/components/pressable-scale';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAdmin } from '@/session';
import { useTheme } from '@/theme';

type Item = { label: string; hint: string; icon: TabIconName; onPress: () => void; danger?: boolean };
type Seccion = { titulo: string; items: Item[] };

/**
 * MÁS del panel de admin: reportes y estadísticas, operación (áreas, reglas,
 * notificaciones), comparativas (si administra varias empresas) y la sesión.
 * Cerrar sesión vive SOLO aquí (no hay botón "Salir" en los encabezados).
 */
export default function AdminMasScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const { empresaId } = useAdmin();
  const router = useRouter();
  const signOut = useSignOut();

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  const cid = empresaId ?? '';

  const secciones: Seccion[] = [
    {
      titulo: 'Reportes y estadísticas',
      items: [
        { label: 'Reporte de vehículos', hint: 'Métricas de la flota por período', icon: 'reporte', onPress: () => router.navigate({ pathname: '/reporte', params: { companyId: cid } }) },
        { label: 'Formato de la predefinida', hint: 'Informe estadístico (ej. formato Chevron), por área', icon: 'resumen', onPress: () => router.navigate({ pathname: '/reporte-formato', params: { companyId: cid } }) },
        { label: 'Reporte de usuarios', hint: 'Métricas de manejo por conductor', icon: 'personal', onPress: () => router.navigate({ pathname: '/reporte-usuarios', params: { companyId: cid } }) },
        { label: 'Costos y gastos', hint: 'Por rango de fechas, producto y servicio', icon: 'costos', onPress: () => router.navigate({ pathname: '/costos', params: { companyId: cid } }) },
      ],
    },
    {
      titulo: 'Operación',
      items: [
        { label: 'Áreas de la empresa', hint: 'Por ubicación, sector o contrato', icon: 'flota', onPress: () => router.navigate({ pathname: '/areas', params: { companyId: cid } }) },
        { label: 'Reglas de alerta', hint: 'Velocidad y mantenimiento, por vehículo o área', icon: 'alertas', onPress: () => router.navigate({ pathname: '/reglas-alerta', params: { companyId: cid } }) },
        { label: 'Notificaciones', hint: 'ODT nuevas y alertas cumplidas', icon: 'mensaje', onPress: () => router.navigate({ pathname: '/notificaciones', params: { companyId: cid } }) },
      ],
    },
  ];

  if (esMultiempresa(user)) {
    secciones.push({
      titulo: 'Administración FOM',
      items: [
        // navigate (no replace): vuelve a la instancia de /admin que ya está
        // en la pila en vez de crear otra (evita apilar paneles duplicados).
        { label: 'Volver a mi administración', hint: 'El panel del sistema completo', icon: 'resumen', onPress: () => router.navigate('/admin') },
      ],
    });
  }

  // Sesión: mi perfil, cambio de contexto (si además conduce) y el ÚNICO
  // cierre de sesión.
  const sesion: Item[] = [
    { label: 'Mi perfil', hint: 'Tu foto, cédula, dirección y fecha de nacimiento', icon: 'personal', onPress: () => router.navigate('/mi-perfil') },
  ];
  if (puedeConducir(user)) {
    // navigate: regresa a las tabs del conductor existentes (replace creaba
    // una copia nueva con su mapa en cada alternada Panel ↔ Mi conducción).
    sesion.push({ label: 'Mi conducción', hint: 'Ir a mi vista de conductor', icon: 'inicio', onPress: () => router.navigate('/') });
  }
  sesion.push({ label: 'Cerrar sesión', hint: 'Salir de tu cuenta', icon: 'salir', onPress: signOut, danger: true });
  secciones.push({ titulo: 'Sesión', items: sesion });

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AdminHeader seccion="Perfil" />

        <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.xl }]}>
          <Card style={{ gap: spacing.xs }}>
            <ThemedText variant="subtitle">{user.name}</ThemedText>
            <ThemedText variant="caption" color="textMuted">
              {user.email}
            </ThemedText>
          </Card>

          {secciones.map((seccion) => (
            <View key={seccion.titulo} style={{ gap: spacing.sm }}>
              <ThemedText variant="overline" color="textMuted">
                {seccion.titulo}
              </ThemedText>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {seccion.items.map((item, i) => (
                  <PressableScale
                    key={item.label}
                    onPress={item.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={[
                      styles.row,
                      {
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.md,
                        gap: spacing.md,
                        borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                        borderTopColor: colors.border,
                      },
                    ]}>
                    {/* Ícono guía: mismo lenguaje de fila que el Más del conductor. */}
                    <View style={[styles.lead, { backgroundColor: colors.surfaceSunken, borderRadius: radii.md }]}>
                      <TabIcon name={item.icon} color={item.danger ? colors.danger : colors.primary} size={20} />
                    </View>
                    <View style={styles.flex1}>
                      <ThemedText variant="button" color={item.danger ? 'danger' : 'text'}>
                        {item.label}
                      </ThemedText>
                      <ThemedText variant="caption" color="textMuted">
                        {item.hint}
                      </ThemedText>
                    </View>
                    <ThemedText variant="body" color="textMuted">
                      ›
                    </ThemedText>
                  </PressableScale>
                ))}
              </Card>
            </View>
          ))}

          <ThemedText variant="caption" color="textMuted" style={styles.center}>
            FOM · Panel de administración
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  lead: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
  center: { textAlign: 'center' },
});
