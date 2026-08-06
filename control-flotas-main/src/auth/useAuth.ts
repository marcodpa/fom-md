import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from './AuthProvider';

/** Acceso a la sesión actual y a las acciones de login/logout. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return ctx;
}
