/**
 * Sesión de administración: cuál es la EMPRESA activa del panel.
 *
 * El panel de admin (grupo de rutas `(admin)`) es una app por pestañas y todas
 * necesitan saber sobre qué empresa trabajan. Aquí se guarda:
 *  - Admin de UNA empresa (companyAdmin): su empresa activa es la suya (auto).
 *  - Admin de VARIAS (generalAdmin/superAdmin): la elige en el menú de empresas.
 *
 * Se reinicia con cada usuario. Vive junto al resto de la sesión.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { esAdmin, esMultiempresa } from '@/auth/permissions';
import { useAuth } from '@/auth/useAuth';

interface AdminContextValue {
  /** Empresa sobre la que trabaja el panel (o `null` si aún no se elige). */
  empresaId: string | null;
  /** Fija la empresa activa (lo usa el menú de empresas del admin general). */
  setEmpresa: (id: string) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Empresa elegida a mano (admin general). El admin de una sola empresa NO
  // elige: su empresa se deriva de una vez (sincrónico → sin parpadeo al entrar).
  const [elegida, setElegida] = useState<string | null>(null);

  useEffect(() => {
    setElegida(null); // cada usuario elige de nuevo
  }, [user]);

  const empresaId =
    elegida ?? (user && esAdmin(user) && !esMultiempresa(user) ? user.companyId ?? null : null);

  const value = useMemo<AdminContextValue>(
    () => ({ empresaId, setEmpresa: setElegida }),
    [empresaId],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

/** Acceso a la empresa activa del panel de admin. */
export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin debe usarse dentro de <AdminProvider>.');
  return ctx;
}
