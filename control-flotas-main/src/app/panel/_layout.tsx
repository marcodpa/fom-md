import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';

import { esAdmin, esMultiempresa, useAuth } from '@/auth';
import { AppTabBar } from '@/components/app-tab-bar';
import { TabIcon } from '@/components/tab-icon';
import { useAdmin } from '@/session';
import { getCompanyBrandById } from '@/services';
import { useThemeController } from '@/theme';

/**
 * Panel de administración por PESTAÑAS (FOM-WEB móvil): Resumen · Flota ·
 * Personal · OT · Más. Vive en el grupo `(admin)`, aparte del área de conductor.
 * Se pinta con la marca de la empresa activa. Solo entra un admin con una
 * empresa elegida; el admin general que no ha elegido va al menú de empresas.
 */
export default function AdminTabsLayout() {
  const { setBrand } = useThemeController();
  const { user, status } = useAuth();
  const { empresaId } = useAdmin();

  // Pinta el panel con la marca de la empresa activa.
  useEffect(() => {
    if (!empresaId) return;
    let active = true;
    getCompanyBrandById(empresaId).then((b) => {
      if (active && b) setBrand(b);
    });
    return () => {
      active = false;
    };
  }, [empresaId, setBrand]);

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esAdmin(user)) return <Redirect href="/" />;
  // La gente de una COMPAÑÍA no opera flota: su superficie es /compania.
  if (!esMultiempresa(user) && user.companyTipo === 'predefinida') {
    return <Redirect href="/compania" />;
  }
  // Sin empresa elegida: el admin FOM vuelve a su administración; el resto, a
  // su superficie base.
  if (!empresaId) return <Redirect href={esMultiempresa(user) ? '/admin' : '/'} />;

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
