/**
 * AuthProvider + contexto de sesión.
 *
 * Fuente de verdad de "quién está logueado". Hoy la sesión vive solo en
 * memoria (se pierde al recargar); cuando haya backend se añadirá persistencia
 * (token seguro) sin cambiar la interfaz de este contexto.
 */

import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';

import { signIn as signInService } from '@/services';
import type { AuthStatus, User } from '@/types';

export interface AuthContextValue {
  /** Usuario autenticado, o `null` si no hay sesión. */
  user: User | null;
  /** Estado de la sesión. */
  status: AuthStatus;
  /** Inicia sesión; lanza Error con mensaje mostrable si falla. */
  signIn: (email: string, password: string) => Promise<void>;
  /** Cierra la sesión actual. */
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const signIn = useCallback(async (email: string, password: string) => {
    // Deja que el error del servicio suba a la pantalla para mostrarlo.
    const authenticated = await signInService(email, password);
    setUser(authenticated);
  }, []);

  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status: user ? 'signedIn' : 'signedOut',
      signIn,
      signOut,
    }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
