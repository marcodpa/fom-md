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

/**
 * Superficie propia de la consola, aprobada en el Issue #173 (opción B).
 *
 * Se autentica SOLO con la sesión en cookie. La superficie vieja
 * —`gps-console-internal`— exige además un token interno que un sitio en el
 * navegador no puede custodiar, y por eso no se puede publicar: funcionaba en
 * local únicamente porque el puente de `vite.config.js` guardaba el token del
 * lado del servidor.
 */
const CONSOLA = '/api/v1/console'

/** La superficie interna. Queda solo para lo que aún no tiene equivalente. */
const INTERNA = '/gps-console-internal/api'

export const api = {
  // Autenticación self-hosted
  entrar: (email, password) =>
    pedir('/auth/login', { metodo: 'POST', cuerpo: { email, password } }),
  sesion: () => pedir('/auth/session'),
  salir: () => pedir('/auth/logout', { metodo: 'POST' }),

  // Estado del backend
  salud: () => pedir('/health'),
  version: () => pedir('/version'),

  // --- Flota, por la superficie de consola ---------------------------------
  //
  // Estas cinco preguntan por VEHÍCULO, no por equipo. Antes la lista de flota
  // salía del inventario de equipos GPS, que es otra cosa: un vehículo sin
  // equipo instalado no aparecía, y el identificador que manejaba el panel era
  // el del aparato y no el de la unidad.

  /** Vehículos de la empresa, con su estado en vivo. */
  vehiculos: ({ limite = 200, desplazamiento = 0, q = '' } = {}) => {
    const p = new URLSearchParams({ limit: limite, offset: desplazamiento })
    if (q) p.set('q', q)
    return pedir(`${CONSOLA}/vehicles?${p}`)
  },

  /** Ficha de un vehículo, con su última situación conocida. */
  vehiculo: (vehiculoId) => pedir(`${CONSOLA}/vehicles/${vehiculoId}`),

  /** Última posición válida del vehículo. */
  posicionDeVehiculo: (vehiculoId) =>
    pedir(`${CONSOLA}/vehicles/${vehiculoId}/position/latest`),

  /** Recorrido del vehículo. El rango va sobre la hora de RECEPCIÓN. */
  recorrido: (vehiculoId, limite = 200) =>
    pedir(`${CONSOLA}/vehicles/${vehiculoId}/positions?limit=${limite}`),

  /** Áreas de la empresa, con cuántas unidades tiene cada una. */
  areas: () => pedir(`${CONSOLA}/areas?limit=200`),

  /** Conductores con asignación vigente. Sin datos personales. */
  conductores: () => pedir(`${CONSOLA}/drivers?limit=200`),

  // --- Todavía por la superficie interna -----------------------------------

  /** Inventario de equipos GPS. Aún no tiene equivalente en `/console`. */
  dispositivos: () => pedir(`${INTERNA}/devices`),

  /** Panorama de la recepción: totales, equipos activos, último mensaje. */
  panorama: () => pedir(`${INTERNA}/observability/overview`),
}

export default api
