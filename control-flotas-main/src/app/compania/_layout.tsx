import { Redirect, Tabs, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { esAdmin, useAuth } from '@/auth';
import { AppTabBar } from '@/components/app-tab-bar';
import { TabIcon } from '@/components/tab-icon';
import { useThemeController, DEFAULT_BRAND } from '@/theme';
import { getCompanyBrandById } from '@/services';

/**
 * VISTA DE COMPAÑÍA — la superficie de MONITOREO de la gente de una compañía
 * (ej. Chevron): Resumen · Flota · Personal · Mantenimiento · Más. La compañía
 * NO opera flota propia: administra y supervisa a sus empresas asociadas —
 * reportes (en PDF), mapa de las flotas de sus contratistas, su personal por
 * ente y los costos/actividades de mantenimiento.
 *
 * Entran el ADMINISTRADOR y el SUPERVISOR de una compañía; nadie más.
 */
export default function CompaniaTabsLayout() {
  const { user, status } = useAuth();
  const { setBrand } = useThemeController();

  // La sesión se pinta con la marca de la compañía (P14).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const id = user?.companyId;
      if (!id) {
        setBrand(DEFAULT_BRAND);
        return;
      }
      getCompanyBrandById(id).then((b) => {
        if (active) setBrand(b ?? DEFAULT_BRAND);
      });
      return () => {
        active = false;
      };
    }, [user?.companyId, setBrand]),
  );

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Exclusiva del SUPERVISOR de una COMPAÑÍA (el único rol operativo de ese ente).
  const esDeCompania = esAdmin(user) && user.companyTipo === 'predefinida';
  if (!esDeCompania) return <Redirect href="/" />;

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
        name="flota"
        options={{ title: 'Flota', tabBarIcon: ({ color }) => <TabIcon name="flota" color={color} /> }}
      />
      <Tabs.Screen
        name="personal"
        options={{ title: 'Personal', tabBarIcon: ({ color }) => <TabIcon name="personal" color={color} /> }}
      />
      <Tabs.Screen
        name="mantenimiento"
        options={{ title: 'Mantto.', tabBarIcon: ({ color }) => <TabIcon name="ot" color={color} /> }}
      />
      <Tabs.Screen
        name="mas"
        options={{ title: 'Perfil', tabBarIcon: ({ color }) => <TabIcon name="personal" color={color} /> }}
      />
    </Tabs>
  );
}
