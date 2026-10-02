// Cómo trabaja el administrador FOM «dentro» de una empresa.
//
// El servidor ya no lee una cabecera para cambiar de empresa (Issue 567): cada lectura o
// escritura de una empresa ajena viaja con la empresa EN LA RUTA, `/tenants/{id}/...`, y el
// servidor vuelve a autorizarla. Lo que no tiene ruta así todavía no se puede pedir para otra
// empresa; mandarlo tal cual devolvería los datos de la empresa propia del administrador como
// si fueran los de la elegida, así que se rechaza antes de salir.

const CONSOLA = '/api/v1/console'

/** Rutas que son del administrador o de la plataforma, no de una empresa: no cambian. */
const GLOBALES = [
  /^\/auth\//,
  /^\/tenants(\/|\?|$)/,
  /^\/tenant-relationships\//,
  /^\/platform\//,
  /^\/audit(\?|$)/,
  /^\/identity-transfers/,
  /^\/vehicle-transfers/,
  /^\/gps-devices/,
  /^\/gps-installations\//,
]

/** Las que ya tienen versión con la empresa en la ruta, y cómo se escriben. */
const EXPLICITAS = [
  { metodo: 'GET', de: /^\/vehicles(\?.*)?$/, a: (id, m) => `/tenants/${id}/vehicles${m[1] ?? ''}` },
  { metodo: 'GET', de: /^\/directory(\?.*)?$/, a: (id, m) => `/tenants/${id}/directory${m[1] ?? ''}` },
  { metodo: 'GET', de: /^\/vehicles\/([0-9a-f-]{36})\/daily-metrics(\?.*)?$/i, a: (id, m) => `/tenants/${id}/vehicles/${m[1]}/daily-metrics${m[2] ?? ''}` },
  { metodo: 'POST', de: /^\/users$/, a: (id) => `/tenants/${id}/users` },
  { metodo: 'PATCH', de: /^\/users\/([0-9a-f-]{36})$/i, a: (id, m) => `/tenants/${id}/users/${m[1]}` },
]

/**
 * `null` si la ruta no tiene versión por empresa; la misma ruta si es global; o la ruta con
 * la empresa en el camino. `ruta` incluye el prefijo `/api/v1/console`.
 */
export function aRutaPorEnte(ruta, metodo, enteId) {
  if (!enteId || !ruta.startsWith(`${CONSOLA}/`)) return ruta
  const resto = ruta.slice(CONSOLA.length)
  if (GLOBALES.some((r) => r.test(resto))) return ruta
  for (const regla of EXPLICITAS) {
    if (regla.metodo !== metodo.toUpperCase()) continue
    const m = regla.de.exec(resto)
    if (m) return `${CONSOLA}${regla.a(enteId, m)}`
  }
  return null
}

export const SIN_RUTA_POR_ENTE =
  'Esta pantalla todavía no se puede ver ni modificar desde otra empresa: el servidor aún no tiene esa ruta por empresa. Sal de la empresa para ver tus propios datos.'
