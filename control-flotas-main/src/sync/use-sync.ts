import { useSyncExternalStore } from 'react';

import { getSnapshot, setOnline, sincronizarAhora, subscribe, type EstadoSync } from './outbox';

/** Estado de sincronización + acciones, para la interfaz. */
export type UseSync = EstadoSync & {
  setOnline: (online: boolean) => Promise<void>;
  sincronizarAhora: () => Promise<void>;
};

/**
 * Hook reactivo al estado del outbox. Cualquier pantalla que lo use se
 * re-renderiza cuando cambian la conexión o las operaciones pendientes.
 */
export function useSync(): UseSync {
  const estado = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...estado, setOnline, sincronizarAhora };
}
