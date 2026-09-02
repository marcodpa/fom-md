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
    if (String(detalle || '').includes('Initial password change pending')) {
      return 'Debes cambiar la contraseña temporal antes de usar la consola.'
    }
    // El caso real más frecuente: la API exige exactamente una membresía activa.
    return 'Tu usuario no tiene un ente activo asignado, o tiene más de uno.'
  }
  if (estado === 404) {
    // Nest responde «Cannot POST /ruta» cuando la RUTA no existe, y un 404
    // propio cuando el REGISTRO no existe. Son cosas distintas y el que las
    // lee necesita distinguirlas: una se arregla desplegando, la otra
    // buscando otro registro.
    if (/^Cannot (GET|POST|PATCH|PUT|DELETE) /u.test(String(detalle || ''))) {
      return (
        'Esta función todavía no está en el servidor publicado. Ya está ' +
        'construida y espera el despliegue.'
      )
    }
    return 'Ese recurso no existe en el servidor.'
  }
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
    const mutacion = !['GET', 'HEAD', 'OPTIONS'].includes(metodo.toUpperCase())
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: mutacion
        ? {
            'content-type': 'application/json',
            'x-fom-csrf': 'fom-browser-v1',
          }
        : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: señal,
      // En desarrollo la guarda el proxy; publicada, la cookie HttpOnly viaja
      // solo al mismo origen. Nunca se habilitan credenciales cross-origin.
      credentials: 'same-origin',
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
  // Acceso por la superficie de consola. No usa `/auth/*`: ese controlador
  // exige el token interno y FOM-TEST no lo tiene configurado, así que
  // responde 503. Estas tres sí funcionan solo con la sesión, igual que el
  // acceso de la app móvil.
  entrar: (email, password) =>
    pedir(`${CONSOLA}/auth/login`, { metodo: 'POST', cuerpo: { email, password } }),
  sesion: () => pedir(`${CONSOLA}/auth/session`),
  salir: () => pedir(`${CONSOLA}/auth/logout`, { metodo: 'POST' }),
  cambiarClaveInicial: (currentPassword, newPassword) =>
    pedir(`${CONSOLA}/auth/password`, {
      metodo: 'POST',
      cuerpo: { currentPassword, newPassword },
    }),

  // Directorio real del ente resuelto por la sesión. El navegador nunca
  // declara tenantId: fom-core lo obtiene del actor autenticado.
  usuarios: ({ limite = 100, desplazamiento = 0, q = '' } = {}) => {
    const p = new URLSearchParams({ limit: limite, offset: desplazamiento })
    if (q) p.set('q', q)
    return pedir(`${CONSOLA}/users?${p}`)
  },
  crearUsuario: ({ email, displayName, role, temporaryPassword }) =>
    pedir(`${CONSOLA}/users`, {
      metodo: 'POST',
      cuerpo: { email, displayName, role, temporaryPassword },
    }),

  /**
   * Levantar una orden de trabajo desde el panel (#258 de fom-core).
   *
   * `vehicleId` viaja en el cuerpo y no en la ruta porque el supervisor abre
   * la orden eligiendo la unidad en un desplegable, no navegando a ella.
   */
  crearOdt: ({ vehicleId, description, kind, failureType, location }) =>
    pedir(`${CONSOLA}/work-orders`, {
      metodo: 'POST',
      cuerpo: { vehicleId, description, kind, failureType, location },
    }),

  // --- Escrituras del directorio (#219 de fom-core) ------------------------

  /** Cambiar perfil o estado de una persona en el ente. */
  actualizarMiembro: (userId, { role, status, reason }) =>
    pedir(`${CONSOLA}/users/${userId}`, {
      metodo: 'PATCH',
      cuerpo: { role, status, reason },
    }),

  /** Reiniciar la credencial: nace obligada a cambiarse. */
  reiniciarClave: (userId, { temporaryPassword, reason }) =>
    pedir(`${CONSOLA}/users/${userId}/credential-reset`, {
      metodo: 'POST',
      cuerpo: { temporaryPassword, reason },
    }),

  /** Alta de vehiculo. */
  crearVehiculo: (cuerpo) =>
    pedir(`${CONSOLA}/vehicles`, { metodo: 'POST', cuerpo }),

  /** Editar el vehiculo, incluida su area. */
  actualizarVehiculo: (vehicleId, cuerpo) =>
    pedir(`${CONSOLA}/vehicles/${vehicleId}`, { metodo: 'PATCH', cuerpo }),

  /** Asignar conductor a una unidad. */
  asignarConductor: (vehicleId, { userId, role, pin, reason }) =>
    pedir(`${CONSOLA}/vehicles/${vehicleId}/drivers`, {
      metodo: 'POST',
      cuerpo: { userId, role, pin, reason },
    }),

  /** Revocar una asignacion. No se borra: se cierra con fecha. */
  revocarAsignacion: (assignmentId, { reason } = {}) =>
    pedir(`${CONSOLA}/driver-assignments/${assignmentId}/revoke`, {
      metodo: 'PATCH',
      cuerpo: { reason },
    }),

  // --- Ordenes de trabajo --------------------------------------------------

  /** Mover una orden de estado. `expectedStatus` evita pisar a otro. */
  moverOdt: (odtId, cuerpo) =>
    pedir(`${CONSOLA}/work-orders/${odtId}/status`, {
      metodo: 'PATCH',
      cuerpo,
    }),

  // --- Entes: empresas, contratistas y areas (#250 de fom-core) ------------

  entes: ({ limite = 100, desplazamiento = 0 } = {}) => {
    const p = new URLSearchParams({ limit: limite, offset: desplazamiento })
    return pedir(`${CONSOLA}/tenants?${p}`)
  },
  crearEnte: (cuerpo) => pedir(`${CONSOLA}/tenants`, { metodo: 'POST', cuerpo }),
  actualizarEnte: (tenantId, cuerpo) =>
    pedir(`${CONSOLA}/tenants/${tenantId}`, { metodo: 'PATCH', cuerpo }),
  colgarContratista: (tenantId, cuerpo) =>
    pedir(`${CONSOLA}/tenants/${tenantId}/contractors`, {
      metodo: 'POST',
      cuerpo,
    }),
  descolgarContratista: (relationshipId, cuerpo = {}) =>
    pedir(`${CONSOLA}/tenant-relationships/${relationshipId}/end`, {
      metodo: 'PATCH',
      cuerpo,
    }),
  crearArea: (tenantId, cuerpo) =>
    pedir(`${CONSOLA}/tenants/${tenantId}/areas`, { metodo: 'POST', cuerpo }),
  actualizarArea: (areaId, cuerpo) =>
    pedir(`${CONSOLA}/areas/${areaId}`, { metodo: 'PATCH', cuerpo }),

  // --- Cumplimiento y avisos (#260 de fom-core) ---------------------------

  marcarAvisoLeido: (avisoId) =>
    pedir(`${CONSOLA}/notifications/${avisoId}/read`, { metodo: 'PATCH', cuerpo: {} }),
  marcarTodosLosAvisos: () =>
    pedir(`${CONSOLA}/notifications/read-all`, { metodo: 'POST', cuerpo: {} }),

  crearDocumento: (cuerpo) =>
    pedir(`${CONSOLA}/documents`, { metodo: 'POST', cuerpo }),
  actualizarDocumento: (documentoId, cuerpo) =>
    pedir(`${CONSOLA}/documents/${documentoId}`, { metodo: 'PATCH', cuerpo }),

  crearRegla: (cuerpo) =>
    pedir(`${CONSOLA}/alert-rules`, { metodo: 'POST', cuerpo }),
  actualizarRegla: (reglaId, cuerpo) =>
    pedir(`${CONSOLA}/alert-rules/${reglaId}`, { metodo: 'PATCH', cuerpo }),

  registrarEquipoGps: (cuerpo) =>
    pedir(`${CONSOLA}/gps-devices`, { metodo: 'POST', cuerpo }),
  actualizarEquipoGps: (equipoId, cuerpo) =>
    pedir(`${CONSOLA}/gps-devices/${equipoId}`, { metodo: 'PATCH', cuerpo }),
  instalarEquipoGps: (equipoId, cuerpo) =>
    pedir(`${CONSOLA}/gps-devices/${equipoId}/installation`, {
      metodo: 'POST',
      cuerpo,
    }),
  desmontarEquipoGps: (instalacionId, cuerpo = {}) =>
    pedir(`${CONSOLA}/gps-installations/${instalacionId}/remove`, {
      metodo: 'PATCH',
      cuerpo,
    }),

  // --- La persona completa (#260 de fom-core) ------------------------------

  /**
   * La gente del ente: cuenta, datos personales, la unidad que maneja hoy y
   * el documento que le vence antes, todo en una sola lectura.
   *
   * Con `enteId` se lee un CONTRATISTA, y el ente viaja en la ruta y no en la
   * consulta a propósito: lo que autoriza sale de la sesión, y esto solo
   * elige a cuál de los entes permitidos mirar.
   */
  directorio: ({ limite = 200, desplazamiento = 0, q = '', enteId = '' } = {}) => {
    const p = new URLSearchParams({ limit: limite, offset: desplazamiento })
    if (q) p.set('q', q)
    const ruta = enteId ? `${CONSOLA}/tenants/${enteId}/directory` : `${CONSOLA}/directory`
    return pedir(`${ruta}?${p}`)
  },

  actualizarPerfil: (userId, cuerpo) =>
    pedir(`${CONSOLA}/users/${userId}/profile`, { metodo: 'PATCH', cuerpo }),

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

  // --- Operación y cumplimiento (tablas de #170 y #171) --------------------

  /** Órdenes de trabajo, de la más recientemente movida a la más vieja. */
  odts: ({ estado = '', vehiculoId = '', limite = 100 } = {}) => {
    const p = new URLSearchParams({ limit: limite })
    if (estado) p.set('status', estado)
    if (vehiculoId) p.set('vehicleId', vehiculoId)
    return pedir(`${CONSOLA}/work-orders?${p}`)
  },

  /** Ficha de una orden con su historial inmutable. */
  odt: (odtId) => pedir(`${CONSOLA}/work-orders/${odtId}`),

  /** Inspecciones realizadas. */
  inspecciones: ({ vehiculoId = '', limite = 100 } = {}) => {
    const p = new URLSearchParams({ limit: limite })
    if (vehiculoId) p.set('vehicleId', vehiculoId)
    return pedir(`${CONSOLA}/inspections?${p}`)
  },

  /** Documentos, del que antes vence al que más tarda. */
  documentos: ({ vehiculoId = '', limite = 100 } = {}) => {
    const p = new URLSearchParams({ limit: limite })
    if (vehiculoId) p.set('vehicleId', vehiculoId)
    return pedir(`${CONSOLA}/documents?${p}`)
  },

  /** Reglas de alerta y a cuántas unidades alcanzan. */
  reglasAlerta: () => pedir(`${CONSOLA}/alert-rules?limit=200`),

  /** Avisos, los no leídos primero. */
  notificaciones: ({ soloSinLeer = false, limite = 100 } = {}) => {
    const p = new URLSearchParams({ limit: limite })
    if (soloSinLeer) p.set('unreadOnly', 'true')
    return pedir(`${CONSOLA}/notifications?${p}`)
  },

  /** Contadores del panel, todos del mismo instante. */
  resumenOperacion: () => pedir(`${CONSOLA}/summary`),

  // --- Todavía por la superficie interna -----------------------------------

  /** Inventario de equipos GPS. Aún no tiene equivalente en `/console`. */
  dispositivos: () => pedir(`${INTERNA}/devices`),

  /** Panorama de la recepción: totales, equipos activos, último mensaje. */
  panorama: () => pedir(`${INTERNA}/observability/overview`),
}

export default api
