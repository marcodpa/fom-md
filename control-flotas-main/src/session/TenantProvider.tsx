/**
 * Sesión de tenant (multi-tenant, brief §5).
 *
 * Al iniciar sesión resuelve el contexto del usuario (su Cuenta/Tenant y el
 * estado de su perfil obligatorio). Se reinicia con cada usuario.
 *
 * Hoy el valor lo da un mock; mañana lo dará el backend de auth. Vive junto a la
 * sesión de conducción para que el flujo de login lea todo desde un solo lugar.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/auth/useAuth';
import { getContextoLogin } from '@/services';
import type { Cuenta } from '@/types';

interface TenantContextValue {
  /** Resolviendo el contexto (cuenta/perfil) tras iniciar sesión. */
  cargando: boolean;
  /** Cuenta del usuario (o `null` si administra varias empresas). */
  cuenta: Cuenta | null;
  /** ¿Ya llenó el perfil obligatorio del primer ingreso? (FOM-02). */
  perfilCompleto: boolean;
  marcarPerfilCompleto: () => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [cargando, setCargando] = useState(true);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [perfilCompleto, setPerfilCompleto] = useState(true);

  useEffect(() => {
    let active = true;
    // Cada nuevo usuario resuelve su contexto desde cero.
    if (!user) {
      setCuenta(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    getContextoLogin(user).then((ctx) => {
      if (!active) return;
      setCuenta(ctx.cuenta);
      setPerfilCompleto(ctx.perfilCompleto);
      setCargando(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const value = useMemo<TenantContextValue>(
    () => ({
      cargando,
      cuenta,
      perfilCompleto,
      marcarPerfilCompleto: () => setPerfilCompleto(true),
    }),
    [cargando, cuenta, perfilCompleto],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

/** Acceso a la sesión de tenant (contexto de login + sede activa). */
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant debe usarse dentro de <TenantProvider>.');
  return ctx;
}
