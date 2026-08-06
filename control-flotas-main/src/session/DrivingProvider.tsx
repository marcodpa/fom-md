/**
 * Sesión de conducción (FOM-02 §3.5/§4.3).
 *
 * Estado global de "¿qué vehículo le corresponde al usuario ahora mismo, y a
 * qué título?". El modelo ya no gira alrededor del chip:
 *  - El conductor PRINCIPAL siempre ve su unidad asignada (titularidad).
 *  - Un SECUNDARIO ve la unidad mientras su PIN esté activo en el GPS; al
 *    dejarla, todo vuelve al principal.
 *  - Los conductores del modelo legado conservan el emparejamiento por chip.
 *
 * Lo consumen a la vez el gate del área de conductor, las pantallas que
 * dependen del vehículo (inspección, reportes, documentos) y el panel. El día
 * de mañana este valor lo fijará el GPS real; hoy se simula en el servicio.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// Se importa el hook desde su archivo (no el barril) para evitar un ciclo con
// `useSignOut`, que sí depende de esta sesión.
import { useAuth } from '@/auth/useAuth';
import { getSesionConduccion } from '@/services';
import type { Vehicle } from '@/types';

/** A qué título conduce el usuario su vehículo actual. */
export type ConduccionVia = 'principal' | 'secundario' | 'chip';

interface DrivingContextValue {
  /** ¿El usuario tiene un vehículo que le corresponda ahora mismo? */
  driving: boolean;
  /** Vehículo actual, o `null` si no hay. */
  vehicle: Vehicle | null;
  /** A qué título: titular, secundario por PIN, o chip legado. */
  via: ConduccionVia | null;
  /** Resolviendo la sesión de conducción al iniciar sesión. */
  cargando: boolean;
  /** Fija el emparejamiento a mano (usado al cerrar sesión para limpiarlo). */
  setDriving: (value: boolean) => void;
  /** Vuelve a resolver la sesión (reintentar / tras ingresar o dejar un PIN). */
  recheck: () => void;
}

const DrivingContext = createContext<DrivingContextValue | null>(null);

export function DrivingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [driving, setDriving] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [via, setVia] = useState<ConduccionVia | null>(null);
  const [cargando, setCargando] = useState(true);
  // Para qué usuario se resolvió la sesión (evita mostrar el estado del
  // usuario anterior mientras se verifica el nuevo, justo tras iniciar sesión).
  const [resueltoPara, setResueltoPara] = useState<string | null>(null);
  // Cambiar este valor fuerza una nueva verificación (para "Reintentar").
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let active = true;
    if (!user) {
      setDriving(false);
      setVehicle(null);
      setVia(null);
      setResueltoPara(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    getSesionConduccion(user).then((s) => {
      if (!active) return;
      setDriving(!!s);
      setVehicle(s?.vehicle ?? null);
      setVia(s?.via ?? null);
      setResueltoPara(user.id);
      setCargando(false);
    });
    return () => {
      active = false;
    };
  }, [user, intento]);

  // Se sigue "verificando" mientras la señal no corresponda al usuario actual.
  const verificando = cargando || (!!user && user.id !== resueltoPara);

  const value = useMemo<DrivingContextValue>(
    () => ({
      driving,
      vehicle,
      via,
      cargando: verificando,
      setDriving,
      recheck: () => setIntento((n) => n + 1),
    }),
    [driving, vehicle, via, verificando],
  );

  return <DrivingContext.Provider value={value}>{children}</DrivingContext.Provider>;
}

/** Acceso a la sesión de conducción. */
export function useDriving(): DrivingContextValue {
  const ctx = useContext(DrivingContext);
  if (!ctx) throw new Error('useDriving debe usarse dentro de <DrivingProvider>.');
  return ctx;
}
