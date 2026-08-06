import '@/global.css';

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AdminProvider, DrivingProvider, TenantProvider } from '@/session';
import { ThemeProvider, useTheme } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* ThemeProvider envuelve toda la app: es la fuente de verdad del tema. */}
      <ThemeProvider>
        {/* AuthProvider va dentro: el login ya dispone del tema. */}
        <AuthProvider>
          {/* Sesión de tenant (cuenta y perfil) resuelta al iniciar sesión. */}
          <TenantProvider>
            {/* Empresa activa del panel de admin. */}
            <AdminProvider>
              {/* Sesión de conducción: compartida entre Inicio y el panel. */}
              <DrivingProvider>
                <NavigationChrome />
              </DrivingProvider>
            </AdminProvider>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * Stack raíz. Con los headers ocultos, el fondo de cada pantalla lo fija el
 * tema vía `contentStyle`, evitando destellos del color equivocado.
 */
function NavigationChrome() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        // Transición fluida entre pantallas. Se puede volver de DOS maneras: el
        // botón "Volver" del ScreenHeader Y el gesto de deslizar desde el borde.
        animation: 'slide_from_right',
        animationDuration: 260,
        gestureEnabled: true,
      }}
    />
  );
}
