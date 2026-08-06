import { Redirect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useSignOut } from '@/auth';
import { Card } from '@/components/card';
import { PressableScale } from '@/components/pressable-scale';
import { TabIcon, type TabIconName } from '@/components/tab-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSync } from '@/sync';
import { useTheme } from '@/theme';

type Item = {
  label: string;
  hint: string;
  /** Ícono guía de la fila. */
  icon: TabIconName;
  onPress: () => void;
  /** Contador (ej. mensajes sin leer). */
  badge?: number;
  danger?: boolean;
};

type Seccion = { titulo: string; items: Item[] };

/**
 * Pestaña MÁS de FOM-DRIVER: el cajón de todo lo demás (perfil, documentos,
 * mensajes, reportar, cerrar sesión), agrupado por tema. El contador de mensajes
 * sin leer se refresca al enfocar.
 */
export default function MasScreen() {
  const { colors, spacing, radii } = useTheme();
  const { user, status } = useAuth();
  const router = useRouter();
  const signOut = useSignOut();
  const { online, pendientes } = useSync();

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;

  const secciones: Seccion[] = [
    {
      titulo: 'Tu cuenta',
      items: [
        {
          // Un solo perfil para todos: la vista adapta lo que muestra al rol
          // (los conductores ven su índice de manejo) y el lápiz de dentro
          // permite editar. Ver y editar viven en la misma pantalla.
          label: 'Mi perfil',
          hint: 'Tu foto, datos, documentos e índice de manejo',
          icon: 'personal',
          onPress: () => router.navigate('/mi-perfil'),
        },
      ],
    },
    {
      titulo: 'Vehículo',
      items: [
        {
          label: 'Documentos',
          hint: 'SOAT, tecnomecánica y tarjeta de propiedad',
          icon: 'inspeccion',
          onPress: () => router.navigate('/documentos'),
        },
        {
          label: 'Reportar una falla',
          hint: 'Avisa de un problema en tu unidad',
          icon: 'ot',
          onPress: () => router.navigate('/reportar'),
        },
        {
          label: 'Usar otra unidad (PIN)',
          hint: 'Actívate como conductor secundario con tu PIN',
          icon: 'flota',
          onPress: () => router.navigate('/pin-unidad'),
        },
      ],
    },
    {
      titulo: 'Conexión',
      items: [
        {
          label: 'Sincronización',
          hint: online ? 'Conectado · datos al día' : 'Sin conexión · cambios en espera',
          icon: 'sync',
          onPress: () => router.navigate('/sincronizacion'),
          badge: pendientes.length,
        },
      ],
    },
    {
      titulo: 'Sesión',
      items: [
        {
          label: 'Cerrar sesión',
          hint: 'Salir de tu cuenta',
          icon: 'salir',
          onPress: signOut,
          danger: true,
        },
      ],
    },
  ];

  return (
    <ThemedView style={styles.root} ambient>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Barra superior */}
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
          <View>
            <ThemedText variant="overline" color="textMuted">
              FOM · Conductor
            </ThemedText>
            <ThemedText variant="title">Perfil</ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.xl }]}>
          {/* Identidad del usuario */}
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
                    {item.badge && item.badge > 0 ? (
                      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <ThemedText variant="overline" style={{ color: colors.onPrimary }}>
                          {item.badge}
                        </ThemedText>
                      </View>
                    ) : null}
                    <ThemedText variant="body" color="textMuted">
                      ›
                    </ThemedText>
                  </PressableScale>
                ))}
              </Card>
            </View>
          ))}

          <ThemedText variant="caption" color="textMuted" style={styles.center}>
            FOM · App del conductor
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingBottom: 32,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  lead: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  center: { textAlign: 'center' },
});
