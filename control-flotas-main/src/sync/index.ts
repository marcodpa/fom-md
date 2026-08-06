/**
 * Módulo de sincronización offline-first (FOM-MOBILE-SYNC).
 *
 * `encolar` lo usa la capa de servicios para diferir la sincronización con el
 * servidor; `useSync` y `SyncBanner` los usa la interfaz.
 */

export { encolar, setOnline, sincronizarAhora, type OutboxOpTipo, type EstadoSync } from './outbox';
export { useSync, type UseSync } from './use-sync';
export { SyncBanner } from './sync-banner';
