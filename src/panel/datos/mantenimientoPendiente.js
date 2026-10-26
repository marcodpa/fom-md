// ============================================================
// LO PENDIENTE DE MANTENIMIENTO DE LA UNIDAD DEL CONDUCTOR (T-183): el número
// de la casilla «Mantenimiento N pend.» de Mi unidad. Es la MISMA regla que la
// app (`pendientesDeMiUnidad` en maintenanceService.ts), para que los dos
// digan lo mismo:
//  - sus órdenes sin resolver: abiertas o en revisión (en el taller); cerrada y
//    cancelada ya no esperan nada;
//  - el mantenimiento programado VENCIDO registrado en FOM: la acción pendiente
//    o en curso, sin orden propia (esa ya cuenta arriba), pasada de km o de fecha.
// Lo próximo (aún no vence) y lo hecho no cuentan.
// ============================================================
import { estadoVisible } from './historial-odt.js'

const ABIERTAS = new Set(['pending', 'in_progress'])

/** ¿La orden sigue esperando algo? Abierta o en revisión (los 3 estados de la app). */
export function ordenSinResolver(o) {
  const clave = estadoVisible(o?.estado).clave
  return clave === 'abierta' || clave === 'revision'
}

/** ¿La acción programada ya venció? Pendiente o en curso, sin orden, pasada de km o de fecha. */
export function accionVencida(a, { odometroKm = null, ahora = Date.now() } = {}) {
  if (!a || !ABIERTAS.has(a.estado) || a.odtId) return false
  const porKm = Number.isFinite(a.venceKm) && Number.isFinite(odometroKm) && a.venceKm <= odometroKm
  const porFecha = Boolean(a.venceEn) && Date.parse(a.venceEn) <= ahora
  return porKm || porFecha
}

/**
 * Cuántas cosas pendientes tiene la unidad. `odts` null: no se pudieron leer
 * (la casilla dice «—»). `acciones` null: sin leer, cuentan solo las órdenes.
 */
export function pendientesDeMiUnidad({ odts, acciones = null, odometroKm = null, ahora = Date.now() }) {
  if (!Array.isArray(odts)) return null
  const ordenes = odts.filter(ordenSinResolver).length
  const vencidas = (acciones ?? []).filter((a) => accionVencida(a, { odometroKm, ahora })).length
  return ordenes + vencidas
}
