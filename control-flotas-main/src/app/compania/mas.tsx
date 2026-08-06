import { Redirect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useSignOut } from '@/auth';
import { Card } from '@/components/card';
import { PressableScale } from '@/components/pressable-scale';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DEFAULT_BRAND, useTheme } from '@/theme';

type Item = { label: string; hint: string; icon: TabIconName; onPress: () => void; danger?: boolean };
type Seccion = { titulo: string; items: Item[] };

/**
 * MÁS de la vista de COMPAÑÍA (ej. Chevron): su perfil, los reportes
 * transversales del sistema (multi-empresa, comparativas, costos, auditoría)
 * y la sesión. La compañía no opera flota propia — monitorea a sus empresas
 * asociadas — así que aquí no hay operación, solo cuenta y reportes.
 * Cerrar sesión vive SOLO aquí.
 */
export default function CompaniaMasScreen() {
  const { colors, spacing, radii, brand } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  const signOut = useSignOut();

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  // El administrador lleva `companyId`; el supervisor de solo lectura, sus
  // predefinidas asignadas (la primera es su compañía activa).
  const companyId = user.companyId ?? '';

  // La marca de la compañía la pinta el _layout (P14); mientras no cargue,
  // el genérico evita el sinsentido "Compañía Control de Flotas".
  const etiquetaCompania =
    brand.name !== DEFAULT_BRAND.name ? `Compañía ${brand.name}` : 'Administración de la compañía';

  const secciones: Seccion[] = [
    {
      titulo: 'Mi cuenta',
      items: [
        {
          label: 'Mi perfil',
          hint: 'Tu foto, cédula, dirección, documentos y permisos de trabajo',
          icon: 'personal',
          onPress: () => router.navigate('/mi-perfil'),
        },
      ],
    },
    {
      titulo: 'Reportes del sistema',
      items: [
        { label: 'Reporte multi-empresa', hint: 'Generador con varias empresas a la vez', icon: 'reporte', onPress: () => router.navigate('/reporte-multi') },
        { label: 'Comparar empresas', hint: 'Indicadores lado a lado', icon: 'comparar', onPress: () => router.navigate('/comparar') },
        { label: 'Costos y gastos', hint: 'Por rango de fechas, producto y servicio', icon: 'costos', onPress: () => router.navigate({ pathname: '/costos', params: { companyId } }) },
        { label: 'Auditoría', hint: 'Quién creó cada vehículo, con qué GPS y cuándo', icon: 'auditoria', onPress: () => router.navigate('/auditoria') },
      ],
    },
    {
      titulo: 'Sesión',
      items: [
        { label: 'Cerrar sesión', hint: 'Salir de tu cuenta', icon: 'salir', onPress: signOut, danger: true },
      ],
    },
  ];

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <View>
            <ThemedText variant="overline" color="textMuted">
              {`${brand.name} · Monitoreo`}
            </ThemedText>
            <ThemedText variant="title">Perfil</ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.xl }]}>
          {/* Identidad: quién está en la sesión y de qué compañía. */}
          <Card style={{ gap: spacing.xs }}>
            <ThemedText variant="subtitle">{user.name}</ThemedText>
            <ThemedText variant="caption" color="textMuted">
              {`${user.email} · ${etiquetaCompania}`}
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
                    {/* Ícono guía: mismo lenguaje de fila que los Más del resto de la app. */}
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
            FOM · Monitoreo de compañía
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  lead: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
  center: { textAlign: 'center' },
});
