// ============================================================
// CLIENTE DE LA API REAL DE FOM
// ------------------------------------------------------------
// Habla con `fom-core` a través del puente del servidor de desarrollo
// (ver el proxy `/fom-api` en vite.config.js). Aquí NO hay secretos: el
// token interno lo añade el proxy del lado del servidor. Este archivo se
// compila al bundle y cualquiera puede leerlo — que no aparezca nada
// sensible es intencional.
//
// Si `VITE_FOM_API` está vacío, `HAY_API` es false y el panel trabaja con la
// semilla local. Así el sitio nunca depende de que el túnel esté arriba.
// ============================================================

const BASE = (import.meta.env?.VITE_FOM_API || '').replace(/\/+$/, '')

/** ¿El panel debe hablar con la API real? */
export const HAY_API = Boolean(BASE)

/** Mensaje en español para cada fallo, listo para mostrar en pantalla. */
function traducir(estado, cuerpo) {
  const detalle = typeof cuerpo === 'string' ? cuerpo : cuerpo?.message || cuerpo?.error
  if (estado === 0) {
    return 'Sin conexión con el servidor. Revisa que el túnel SSH siga abierto.'
  }
  if (estado === 401) return 'Tu sesión no es válida o expiró. Vuelve a entrar.'
  if (estado === 403) {
    // El caso real más frecuente: la API exige exactamente una membresía activa.
    return 'Tu usuario no tiene un ente activo asignado, o tiene más de uno.'
  }
  if (estado === 404) return 'Ese recurso no existe en el servidor.'
  if (estado === 502) return detalle || 'El puente no alcanzó la API. ¿Está abierto el túnel SSH?'
  if (estado === 503) return detalle || 'El servidor no está listo para responder esto todavía.'
  return detalle || `El servidor respondió ${estado}.`
}

/**
 * Petición a la API. Devuelve el cuerpo ya interpretado, o lanza un Error con
 * el mensaje traducido.
 */
export async function pedir(ruta, { metodo = 'GET', cuerpo, señal } = {}) {
  if (!HAY_API) throw new Error('La API real no está configurada en este entorno.')

  let respuesta
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: cuerpo ? { 'content-type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: señal,
      // El proxy guarda la sesión; no hace falta mandar credenciales.
      credentials: 'omit',
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error(traducir(0))
  }

  const texto = await respuesta.text()
  let datos = null
  if (texto) {
    try {
      datos = JSON.parse(texto)
    } catch {
      datos = texto
    }
  }

  if (!respuesta.ok) throw new Error(traducir(respuesta.status, datos))
  return datos
}

// --- Rutas concretas -------------------------------------------------------
const CONSOLA = '/gps-console-internal/api'

export const api = {
  // Autenticación self-hosted
  entrar: (email, password) =>
    pedir('/auth/login', { metodo: 'POST', cuerpo: { email, password } }),
  sesion: () => pedir('/auth/session'),
  salir: () => pedir('/auth/logout', { metodo: 'POST' }),

  // Estado del backend
  salud: () => pedir('/health'),
  version: () => pedir('/version'),

  /**
   * Inventario de equipos CON el vehículo instalado. Es, de hecho, la lista de
   * flota: la consulta del servidor cruza `gps_devices` con
   * `gps_device_assignments` y `vehicles`.
   */
  dispositivos: () => pedir(`${CONSOLA}/devices`),

  /** Última posición conocida de un equipo. */
  posicion: (dispositivoId) => pedir(`${CONSOLA}/devices/${dispositivoId}/position/latest`),

  /** Historial de posiciones de un equipo (el trazado del recorrido). */
  historial: (dispositivoId, limite = 200) =>
    pedir(`${CONSOLA}/devices/${dispositivoId}/positions?limit=${limite}`),

  /** Última posición por vehículo, cuando se tiene su id y no el del equipo. */
  posicionDeVehiculo: (vehiculoId) =>
    pedir(`${CONSOLA}/vehicles/${vehiculoId}/position/latest`),

  /** Panorama de la recepción: totales, equipos activos, último mensaje. */
  panorama: () => pedir(`${CONSOLA}/observability/overview`),
}

export default api
