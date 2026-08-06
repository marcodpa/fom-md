/**
 * Outbox (bandeja de salida) offline-first — núcleo de FOM-MOBILE-SYNC.
 *
 * Idea: las acciones del conductor actualizan el estado local de inmediato y
 * encolan aquí su "sincronización con el servidor". Si hay conexión, la
 * operación corre ya; si no, espera en la cola y se procesa sola al reconectar.
 * Así la app sirve igual sin señal (brief §22).
 *
 * Es un singleton observable (sin React) para que lo usen tanto la capa de
 * servicios (`encolar`) como la interfaz (`useSync`, vía `subscribe`/`getSnapshot`).
 * No importa nada de `@/services`, así que no hay dependencias circulares.
 */

/** Tipo de operación encolada (para agrupar y mostrar). */
export type OutboxOpTipo = 'ot' | 'inspeccion' | 'sos';

/** Datos visibles de una operación pendiente (sin la función ejecutora). */
export interface OutboxOpInfo {
  id: string;
  tipo: OutboxOpTipo;
  /** Texto legible de qué se va a sincronizar. */
  descripcion: string;
  /** ISO de cuando se encoló. */
  creadaEn: string;
}

/** Operación completa: los datos + la función que hace la sincronización real. */
interface OutboxOp extends OutboxOpInfo {
  ejecutar: () => Promise<void>;
}

/** Estado observable de la sincronización. */
export interface EstadoSync {
  online: boolean;
  sincronizando: boolean;
  pendientes: OutboxOpInfo[];
}

let _online = true;
let _sincronizando = false;
let _cola: OutboxOp[] = [];
let _seq = 0;

// Snapshot cacheado: `useSyncExternalStore` exige una referencia ESTABLE que
// solo cambie cuando cambia el estado (si no, entra en bucle).
let _snapshot: EstadoSync = { online: true, sincronizando: false, pendientes: [] };
const listeners = new Set<() => void>();

function reconstruirSnapshot() {
  _snapshot = {
    online: _online,
    sincronizando: _sincronizando,
    // Se excluye la función ejecutora (no es serializable ni se muestra).
    pendientes: _cola.map(({ ejecutar: _ejecutar, ...info }) => info),
  };
}

function emitir() {
  reconstruirSnapshot();
  listeners.forEach((l) => l());
}

/** Suscribe un listener a los cambios de estado. Devuelve la función para des-suscribir. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot actual (referencia estable entre cambios). */
export function getSnapshot(): EstadoSync {
  return _snapshot;
}

/**
 * Encola la sincronización de una operación. Si hay conexión, la ejecuta ya; si
 * no, la deja pendiente para procesarla al reconectar.
 *
 * El estado LOCAL ya lo actualizó quien llama (optimista); esto solo maneja el
 * viaje al servidor.
 */
export async function encolar(
  tipo: OutboxOpTipo,
  descripcion: string,
  ejecutar: () => Promise<void>,
): Promise<void> {
  if (_online) {
    await ejecutar();
    return;
  }
  _cola.push({
    id: `op-${Date.now()}-${++_seq}`,
    tipo,
    descripcion,
    creadaEn: new Date().toISOString(),
    ejecutar,
  });
  emitir();
}

/**
 * Procesa la cola en orden. Idempotente por diseño: cada operación se quita solo
 * tras completarse; si una falla, se detiene y se reintenta luego (en la API
 * real, además, cada operación llevará su clave de idempotencia).
 */
async function procesarCola(): Promise<void> {
  if (_sincronizando || !_online) return;
  _sincronizando = true;
  emitir();
  while (_online && _cola.length > 0) {
    const op = _cola[0];
    try {
      await op.ejecutar();
      _cola = _cola.slice(1);
      emitir();
    } catch {
      // Se corta y se reintentará en la próxima sincronización.
      break;
    }
  }
  _sincronizando = false;
  emitir();
}

/** Cambia el estado de conexión (hoy simulado desde la UI). Al reconectar, sincroniza. */
export async function setOnline(online: boolean): Promise<void> {
  if (_online === online) return;
  _online = online;
  emitir();
  if (online) await procesarCola();
}

/** Fuerza la sincronización de lo pendiente (botón "Sincronizar ahora"). */
export async function sincronizarAhora(): Promise<void> {
  await procesarCola();
}
