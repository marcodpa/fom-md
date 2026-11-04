// ============================================================
// LA REGLA DE LOS GRUPOS DE ODT — un solo lugar.
// ------------------------------------------------------------
// La ODT se muestra con 3 estados, igual que la app: Abierta / En revisión /
// Resuelta. Es SOLO presentación: el servidor sigue con sus nueve estados y
// lo que se le envía no cambia. Cancelada cuenta como resuelta porque ya no
// espera nada (la app hace lo mismo).
//
// Este archivo NO importa nada a propósito: catalogos.js, historial-odt.js y
// Reportes lo usan, y si él importara alguno de ellos quedaría un círculo.
// Quien necesite contar o agrupar órdenes lo hace desde aquí (ver
// test/regla-conteos.test.js: comparar un estado suelto en otro lado falla).
// ============================================================

export const ESTADOS_VISIBLES = [
  { clave: 'abierta', etiqueta: 'Abierta', plural: 'Abiertas', color: 'ambar', estados: ['abierta'] },
  { clave: 'revision', etiqueta: 'En revisión', plural: 'En revisión', color: 'azul', estados: ['en_revision', 'aprobada', 'asignada', 'en_ejecucion', 'pausada', 'en_calidad'] },
  { clave: 'resuelta', etiqueta: 'Resuelta', plural: 'Resueltas', color: 'verde', estados: ['cerrada', 'cancelada'] },
]

export const ETIQUETA_GRUPO = { abierta: 'Abierta', revision: 'En revisión', resuelta: 'Resuelta', otro: 'Otro estado' }

/** 'abierta' | 'revision' | 'resuelta' de un estado del servidor; 'otro' si no lo conocemos. */
export function grupoOdt(estado) {
  return ESTADOS_VISIBLES.find(g => g.estados.includes(estado))?.clave ?? 'otro'
}

/** Cuántas órdenes hay en cada grupo. `sinResolver` = abiertas + en revisión (lo que aún espera algo). */
export function contarOdt(odts) {
  const cuenta = { abierta: 0, revision: 0, resuelta: 0 }
  for (const o of odts ?? []) {
    const g = grupoOdt(o?.estado)
    if (g in cuenta) cuenta[g] += 1
  }
  return { ...cuenta, sinResolver: cuenta.abierta + cuenta.revision }
}

/** ¿Sigue sin resolverse (abierta o en revisión)? */
export const estaSinResolver = o => {
  const g = grupoOdt(o?.estado)
  return g === 'abierta' || g === 'revision'
}
