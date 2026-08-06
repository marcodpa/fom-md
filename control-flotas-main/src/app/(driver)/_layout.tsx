import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { esCuentaPersonal, esMultiempresa, puedeConducir, useAuth } from '@/auth';
import { AppTabBar } from '@/components/app-tab-bar';
import { TabIcon } from '@/components/tab-icon';
import { useDriving } from '@/session';
import { SyncBanner } from '@/sync';
import { useTheme } from '@/theme';

/**
 * Navegación inferior de FOM-DRIVER (la app del conductor): Inicio ·
 * Inspección · Mantenimiento · Más. Vive en el grupo de ruta `(driver)`, así que solo
 * aparece en las pantallas del conductor; el login y los paneles quedan fuera
 * de estas tabs.
 */
export default function DriverTabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { cargando } = useDriving();

  // Mientras se resuelve su unidad asignada, un loader. Todo conductor entra a
  // su Inicio y monitorea su vehículo asignado (aunque en el momento lo maneje
  // otra persona). Los administradores que no conducen no llegan aquí.
  const esConductor = !!user && puedeConducir(user);

  // Guard: quien NO conduce no debe ver las tabs del conductor (p. ej. si llega
  // a "/" por deep-link). Se le manda a su superficie: cuentas personales a su
  // espacio, la vista gerencial y el multiempresa al menú de empresas, y el
  // supervisor de una empresa a su panel.
  if (user && !puedeConducir(user)) {
    if (esCuentaPersonal(user)) return <Redirect href="/personal" />;
    // La gente de una compañía (supervisor o administrador) monitorea en /compania.
    if (!esMultiempresa(user) && user.companyTipo === 'predefinida') {
      return <Redirect href="/compania" />;
    }
    // Solo los admin FOM van a la administración del sistema; el resto, a su
    // panel (con empresa siempre: el login corta a los operativos sin empresa).
    return <Redirect href={esMultiempresa(user) ? '/admin' : '/panel'} />;
  }

  if (esConductor && cargando) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Tabs
        tabBar={(props) => <AppTabBar {...props} />}
        // Sin esto, la 'shift' a veces deja la pestaña entrante en blanco/negro
        // (carrera al desmontar la escena saliente: react-navigation #12755).
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
          // Transición suave al cambiar de pestaña.
          animation: 'shift',
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color }) => <TabIcon name="inicio" color={color} />,
          }}
        />
        <Tabs.Screen
          name="inspeccion"
          options={{
            title: 'Inspección',
            tabBarIcon: ({ color }) => <TabIcon name="inspeccion" color={color} />,
          }}
        />
        <Tabs.Screen
          name="mantenimiento"
          options={{
            title: 'Mantenim.',
            tabBarIcon: ({ color }) => <TabIcon name="ot" color={color} />,
          }}
        />
        <Tabs.Screen
          name="mas"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color }) => <TabIcon name="personal" color={color} />,
          }}
        />
      </Tabs>

      {/* Indicador global de sincronización (flota sobre las pestañas). */}
      <SyncBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
