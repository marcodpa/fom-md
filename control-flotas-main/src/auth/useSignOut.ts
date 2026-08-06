import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { cerrarSesionRemota } from '@/services';
import { useDriving } from '@/session';
import { DEFAULT_BRAND, useThemeController } from '@/theme';

import { useAuth } from './useAuth';

/**
 * Cierre de sesión centralizado y correcto:
 *
 *  1. Limpia el usuario (la "empresa activa" deriva del usuario, así que se va
 *     con él).
 *  2. Restaura la marca base de la app, para que el login NO quede pintado con
 *     los colores de la última empresa vista.
 *  3. Resetea la pila de navegación: el login es punto final, sin poder volver
 *     atrás (deslizando) a ningún panel.
 *
 * Se usa desde cualquier botón "Salir" para garantizar el mismo comportamiento.
 */
export function useSignOut(): () => void {
  const router = useRouter();
  const { signOut } = useAuth();
  const { setBrand } = useThemeController();
  const { setDriving } = useDriving();

  return useCallback(() => {
    cerrarSesionRemota(); // también en la BD (si está conectada)
    signOut();
    setDriving(false); // que el siguiente usuario no herede la sesión de conducción
    setBrand(DEFAULT_BRAND);
    // Descarta las pantallas apiladas (paneles, conductor…) y deja el login solo.
    if (router.canDismiss()) router.dismissAll();
    router.replace('/login');
  }, [signOut, setDriving, setBrand, router]);
}
