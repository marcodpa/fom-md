import { Redirect, Tabs, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { esMultiempresa, useAuth } from '@/auth';
import { AppTabBar } from '@/components/app-tab-bar';
import { TabIcon } from '@/components/tab-icon';
import { DEFAULT_BRAND, useThemeController } from '@/theme';

/**
 * ADMINISTRACIÓN FOM — la superficie PROPIA de los 3 administradores del
 * sistema (los desarrolladores, sin empresa): Resumen · Empresas · Usuarios ·
 * Más. Desde aquí controlan TODO: lo administrativo (pagos, servicio activo,
 * crear/editar/eliminar empresas y perfiles) y lo operacional (entrar al panel
 * de cualquier empresa o a la capa gerencial de una general).
 *
 * Siempre con la identidad BASE de FOM: esta vista es del sistema, no de una
 * empresa.
 */
export default function AdminFomTabsLayout() {
  const { user, status } = useAuth();
  const { setBrand } = useThemeController();

  // La administración del sistema nunca hereda la marca de una empresa.
  useFocusEffect(
    useCallback(() => {
      setBrand(DEFAULT_BRAND);
    }, [setBrand]),
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Exclusiva de los admin FOM.
  if (!esMultiempresa(user)) return <Redirect href="/" />;

  return (
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
        options={{ title: 'Resumen', tabBarIcon: ({ color }) => <TabIcon name="resumen" color={color} /> }}
      />
      <Tabs.Screen
        name="empresas"
        options={{ title: 'Empresas', tabBarIcon: ({ color }) => <TabIcon name="empresa" color={color} /> }}
      />
      <Tabs.Screen
        name="usuarios"
        options={{ title: 'Usuarios', tabBarIcon: ({ color }) => <TabIcon name="personal" color={color} /> }}
      />
      <Tabs.Screen
        name="flota"
        options={{ title: 'Flota', tabBarIcon: ({ color }) => <TabIcon name="flota" color={color} /> }}
      />
      <Tabs.Screen
        name="mas"
        options={{ title: 'Perfil', tabBarIcon: ({ color }) => <TabIcon name="personal" color={color} /> }}
      />
    </Tabs>
  );
}
