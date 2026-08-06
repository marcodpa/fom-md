import { Redirect, Stack } from 'expo-router';

import { esCuentaPersonal, useAuth } from '@/auth';
import { useTheme } from '@/theme';

/**
 * Grupo de las CUENTAS PERSONALES (FOM-02 §5–§6): la flota doméstica de Ale
 * (supervisor personal) y la vista mínima de sus usuarios (Santi, Sofi).
 * Ningún otro rol entra aquí; estos roles no ven el panel corporativo.
 */
export default function PersonalLayout() {
  const { colors } = useTheme();
  const { user, status } = useAuth();

  if (status !== 'signedIn' || !user) return <Redirect href="/login" />;
  if (!esCuentaPersonal(user)) return <Redirect href="/" />;

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
