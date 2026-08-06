import { Redirect, Stack } from 'expo-router';

import { esAdmin, esMultiempresa, useAuth } from '@/auth';
import { useTheme } from '@/theme';

/**
 * Grupo de la VISTA GERENCIAL: la capa de reportes, histórico de ODT y
 * comparativas de las empresas ASOCIADAS a una compañía. Entran el SUPERVISOR
 * de la compañía (que administra a sus contratistas) y los ADMIN FOM (que ven
 * la capa gerencial de cualquier ente). Nadie más.
 */
export default function GerencialLayout() {
  const { colors } = useTheme();
  const { user, status } = useAuth();

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  // Supervisor de la COMPAÑÍA (abre la capa gerencial de sus asociadas) o admin
  // FOM; cualquier otro rol vuelve a su superficie.
  const esDeCompania = esAdmin(user) && user.companyTipo === 'predefinida';
  if (!esMultiempresa(user) && !esDeCompania) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        animationDuration: 260,
        gestureEnabled: true,
      }}
    />
  );
}
