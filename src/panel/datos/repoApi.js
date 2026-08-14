// ============================================================
// REPOSITORIO REAL — traduce la API de fom-core a las formas del panel
// ------------------------------------------------------------
// Solo implementa lo que la base de datos de producción respalda HOY:
// acceso, flota (equipos con su vehículo instalado) y posiciones. Todo lo
// demás —ODT, inspecciones, documentos, personal, alertas, pagos— todavía no
// existe en el esquema real, y lo sigue sirviendo la semilla.
//
// Regla que se respeta aquí: no inventar. Un dato que la base no tiene se
// devuelve `null`, nunca un cero ni un valor plausible. Un panel que muestra
// "0 km/h" cuando en realidad no sabe la velocidad miente, y nadie se entera.
// ============================================================

import { api } from './api'

/** Un equipo se considera reportando si dio señal en los últimos minutos. */
function estadoConexion(dispositivo) {
  return dispositivo.connected ? 'reportando' : 'sin_senal'
}

/**
 * Une equipo + vehículo + última posición en la forma que consumen los
 * módulos del panel.
 *
 * `estadoMarcha` queda en `null` a propósito: la base **no persiste la
 * velocidad**, así que no hay forma de saber si la unidad va rodando o está
 * detenida. `connected` solo dice si el equipo reportó hace poco, que es otra
 * cosa. El día que el decodificador guarde la velocidad, este es el único
 * punto que hay que tocar.
 */
function comoUnidad(d, posicion = null) {
  const alias = d.vehicleCode || d.model || d.imei
  return {
    id: d.vehicleId || d.id,
    dispositivoId: d.id,
    vehiculoId: d.vehicleId || null,
    empresaId: null,

    marca: d.vehicleMake || '—',
    modelo: d.vehicleModel || '—',
    anio: d.vehicleYear ?? null,
    placa: d.vehiclePlate || '—',
    numero: d.vehicleCode || '—',
    alias,
    tipo: 'otro', // el esquema real todavía no clasifica el tipo de vehículo
    vin: d.vehicleVin || null,

    gps: {
      id: d.id,
      modelo: d.model,
      imei: d.imei,
      linea: d.simPhone || '',
      operadora: d.carrier || null,
      estado: d.status,
      verificado: d.status === 'active',
      firmware: d.firmwareVersion || null,
      protocolo: d.protocolFamily || null,
      instaladoEn: d.installedAt || null,
      tecnico: d.technician || null,
      ubicacionInstalacion: d.installationLocation || null,
    },

    // Sin respaldo en la base todavía
    areaId: null,
    areaNombre: 'Sin área',
    conductorPrincipalId: null,
    conductor: null,
    conductorNombre: 'Sin asignar',
    estadoMarcha: null,
    velocidadKmh: null,
    km: null,
    indiceSeguro: null,
    aceitePct: null,
    tempMotorC: null,
    ubicacionTexto: null,
    // `null`, no `0`: no es que la unidad tenga los papeles al día, es que la
    // base todavía no guarda documentos. Un cero pintaría un tag verde
    // «Al día» sobre una unidad de la que no sabemos nada.
    docsVencidos: null,
    docsPorVencer: null,

    // Lo que sí es real
    conexion: estadoConexion(d),
    conectado: Boolean(d.connected),
    ultimoReporte: d.lastConnectionAt || null,
    lat: posicion?.latitude ?? null,
    lng: posicion?.longitude ?? null,
    posicionValida: posicion?.positionValid ?? null,
    posicionEn: posicion?.eventTime || posicion?.receivedAt || null,
  }
}

/** El historial viene envuelto; el nombre del arreglo ha cambiado antes. */
function listaPosiciones(respuesta) {
  if (Array.isArray(respuesta)) return respuesta
  return respuesta?.positions || respuesta?.items || respuesta?.data || []
}

async function posicionDe(dispositivoId) {
  try {
    const r = await api.posicion(dispositivoId)
    return r?.position ?? r ?? null
  } catch {
    // Un equipo recién dado de alta aún no tiene posiciones: no es un error
    // que deba tumbar la lista completa.
    return null
  }
}

/**
 * Flota completa con la última posición de cada unidad.
 *
 * Cada llamada cuesta una consulta de equipos más una posición por unidad, y
 * en el Centro de control coinciden varios interesados a la vez: la lista, el
 * detalle de la unidad abierta y el refresco periódico. Sin coordinarlos se
 * disparaban cuatro rondas idénticas cada quince segundos.
 *
 * La promesa en vuelo se comparte durante unos segundos: quien llegue dentro
 * de esa ventana se engancha a la misma respuesta en lugar de abrir otra. No
 * es una caché de datos —no se guarda nada más allá de ese instante—, solo
 * evita preguntar tres veces lo mismo a la vez.
 */
const VENTANA_COMPARTIDA_MS = 3000
let enVuelo = null
let enVueloDesde = 0

async function flotaConPosicion() {
  const ahora = Date.now()
  if (enVuelo && ahora - enVueloDesde < VENTANA_COMPARTIDA_MS) return enVuelo

  enVueloDesde = ahora
  enVuelo = (async () => {
    const respuesta = await api.dispositivos()
    const dispositivos = Array.isArray(respuesta) ? respuesta : (respuesta?.devices ?? [])
    const posiciones = await Promise.all(dispositivos.map((d) => posicionDe(d.id)))
    return dispositivos.map((d, i) => comoUnidad(d, posiciones[i]))
  })()

  // Un fallo no debe quedar cacheado: el siguiente intento tiene que salir
  // de verdad al servidor.
  enVuelo.catch(() => {
    enVuelo = null
  })
  return enVuelo
}

function filtrarTexto(lista, q) {
  if (!q) return lista
  const t = q.toLowerCase()
  return lista.filter((v) =>
    [v.placa, v.alias, v.numero, v.marca, v.modelo, v.gps.imei].join(' ').toLowerCase().includes(t)
  )
}

export const repoApi = {
  vehiculos: {
    async listar({ q = '' } = {}) {
      const lista = await flotaConPosicion()
      return filtrarTexto(lista, q).sort((a, b) => a.alias.localeCompare(b.alias))
    },

    async obtener(id) {
      const lista = await flotaConPosicion()
      const v = lista.find((x) => x.id === id || x.dispositivoId === id)
      if (!v) return null
      return {
        ...v,
        recorrido: await repoApi.recorrido(v.dispositivoId),
        // Estos dominios no existen todavía en la base real. Van vacíos en vez
        // de traer los de la semilla, que pertenecen a otros vehículos.
        documentos: [],
        odts: [],
        inspecciones: [],
        eventos: [],
        costos: [],
      }
    },
  },

  /** Trazado del recorrido, del más antiguo al más reciente. */
  async recorrido(dispositivoId) {
    if (!dispositivoId) return []
    try {
      const respuesta = await api.historial(dispositivoId, 300)
      return listaPosiciones(respuesta)
        .filter((p) => p.positionValid && p.latitude != null && p.longitude != null)
        .map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
          velocidadKmh: null, // la base no la guarda
          hora: p.eventTime || p.receivedAt,
        }))
        .reverse()
    } catch {
      return []
    }
  },

  /** Resumen con lo único que la base puede afirmar hoy. */
  async resumen() {
    const lista = await flotaConPosicion()
    const reportando = lista.filter((v) => v.conectado).length
    return {
      totalVehiculos: lista.length,
      reportando,
      sinSenal: lista.length - reportando,
      conPosicion: lista.filter((v) => v.lat != null).length,
      // Sin respaldo en la base: se declaran nulos para que la interfaz los
      // muestre como "sin datos" y no como cero.
      enMarcha: null,
      detenidos: null,
      conductores: null,
      indiceSeguroPromedio: null,
      odtAbiertas: null,
      odtEnRevision: null,
      odtCerradas: null,
      inspeccionesHoy: null,
      inspeccionesPendientes: null,
      unidadesBloqueadas: null,
      docsVencidos: null,
      docsPorVencer: null,
      alertasSinLeer: null,
      // El esquema real no modela la asignación de conductores todavía. Decir
      // "2 sin conductor" sería cierto por accidente y falso en el fondo: no
      // es que nadie las conduzca, es que la base no lleva ese registro.
      sinConductor: null,
      porArea: [],
    }
  },
}

export default repoApi
