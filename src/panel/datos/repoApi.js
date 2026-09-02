// ============================================================
// REPOSITORIO REAL — traduce la API de fom-core a las formas del panel
// ------------------------------------------------------------
// Lee de `/api/v1/console`, la superficie aprobada en el Issue #173. Antes leía
// del inventario de equipos GPS, que es otra cosa: un vehículo sin equipo
// instalado no aparecía en la flota, y el identificador que manejaba el panel
// era el del aparato y no el de la unidad.
//
// Regla que se respeta aquí: no inventar. Un dato que la base no tiene se
// devuelve `null`, nunca un cero ni un valor plausible. Un panel que muestra
// "0 km/h" cuando en realidad no sabe la velocidad miente, y nadie se entera.
// ============================================================

import { api } from './api'

/**
 * Une el vehículo con su estado en vivo en la forma que consumen los módulos.
 *
 * `speedKph` llega nulo mientras la unidad del campo de GPS103 no esté
 * demostrada (Issue #159). El servidor lo dice explícitamente en su contrato, y
 * aquí se respeta: nulo significa «no se sabe» y no debe convertirse en cero en
 * ningún punto del camino.
 */
function comoUnidad(v) {
  const alias = v.alias || v.fleetNumber || v.code
  return {
    id: v.id,
    vehiculoId: v.id,
    empresaId: null,

    marca: v.make || '—',
    modelo: v.model || '—',
    anio: v.modelYear ?? null,
    placa: v.plate || '—',
    numero: v.fleetNumber || v.code || '—',
    alias,
    tipo: v.vehicleType || 'otro',
    estado: v.status,

    areaId: v.areaId ?? null,
    areaNombre: v.areaName ?? null,

    // Telemetría. Todo `?? null`: la distinción entre «apagado» y «no se sabe»
    // se pierde en cuanto alguien la sustituye por un valor por defecto.
    velocidadKmh: v.speedKph ?? null,
    rumbo: v.headingDeg ?? null,
    ignition: v.ignition ?? null,
    km: v.odometerKm ?? null,

    // `motionState` lo calcula la base desde la velocidad. Con la velocidad
    // nula vale 'unknown', que es lo correcto: sin velocidad no se puede
    // afirmar si la unidad va rodando.
    estadoMarcha:
      v.motionState === 'en_marcha' || v.motionState === 'parada'
        ? v.motionState
        : null,

    lat: v.latitude ?? null,
    lng: v.longitude ?? null,
    ultimoReporte: v.lastReportAt ?? null,
    posicionEn: v.lastPositionAt ?? null,
    conectado: Boolean(v.lastReportAt),
    conexion: v.lastReportAt ? 'reportando' : 'sin_senal',

    // Sin respaldo todavía en la superficie de lectura.
    conductorPrincipalId: null,
    conductorNombre: 'Sin asignar',
    indiceSeguro: null,
    aceitePct: null,
    tempMotorC: null,
    ubicacionTexto: null,
    docsVencidos: null,
    docsPorVencer: null,
    gps: null,
  }
}

/**
 * Flota completa. Una sola llamada: el estado en vivo viene ya unido en el
 * servidor, así que desaparece la ronda de una petición de posición por unidad
 * que antes hacía este archivo.
 */
const VENTANA_COMPARTIDA_MS = 3000
let enVuelo = null
let enVueloDesde = 0

async function flota(q = '') {
  const ahora = Date.now()
  if (!q && enVuelo && ahora - enVueloDesde < VENTANA_COMPARTIDA_MS) {
    return enVuelo
  }
  const peticion = api.vehiculos({ q })
    .then((r) => (r?.items ?? []).map(comoUnidad))
    .then(conPosicionDirecta)
  if (!q) {
    enVueloDesde = ahora
    enVuelo = peticion
    // Un fallo no debe quedar cacheado: el siguiente intento tiene que salir
    // de verdad al servidor.
    peticion.catch(() => {
      enVuelo = null
    })
  }
  return peticion
}

/**
 * PUENTE mientras el estado vivo del servidor llega vacío (Issue #169,
 * PR #194 de fom-core): si una unidad viene sin último reporte, se le pide
 * su ÚLTIMA posición — una sola lectura por unidad, no el recorrido — y con
 * eso el mapa pinta y el contador de reportando dice la verdad.
 *
 * El tope de 25 unidades es deliberado: este puente es para flotas chicas
 * mientras el servidor no proyecta el estado vivo; con flotas grandes la
 * ronda de peticiones se volvería el problema, y la respuesta correcta es
 * la proyección del lado de la base, no más peticiones. Cuando el servidor
 * empiece a mandar lastReportAt, este código deja de ejecutarse solo.
 */
async function conPosicionDirecta(lista) {
  // Se pide por FALTA DE COORDENADAS, no por falta de fecha. El listado
  // del servidor manda `lastReportAt` pero NO manda latitud ni longitud, asi
  // que mirar la fecha daba por resuelto lo que seguia sin resolverse: la
  // unidad contaba como «reportando» y el mapa se quedaba sin punto.
  const sinVivo = lista.filter(
    (v) => !Number.isFinite(v.lat) || !Number.isFinite(v.lng),
  )
  if (sinVivo.length === 0 || sinVivo.length > 25) return lista
  const posiciones = await Promise.all(
    sinVivo.map((v) =>
      api
        .posicionDeVehiculo(v.id)
        .then((r) => r?.position ?? null)
        // Sin posición no hay nada que corregir: la unidad queda como estaba.
        .catch(() => null),
    ),
  )
  const porId = new Map()
  sinVivo.forEach((v, i) => porId.set(v.id, posiciones[i]))
  return lista.map((v) => {
    const p = porId.get(v.id)
    if (!p) return v
    return {
      ...v,
      lat: p.latitude ?? v.lat,
      lng: p.longitude ?? v.lng,
      // La fecha que ya traia el listado es la buena si la posicion no trae
      // una suya: no se pisa un dato cierto con un nulo.
      ultimoReporte: p.receivedAt ?? v.ultimoReporte ?? null,
      posicionEn: p.receivedAt ?? v.posicionEn ?? null,
      rumbo: p.telemetry?.headingDeg ?? null,
      velocidadKmh: p.telemetry?.speedKph ?? null,
      conectado: Boolean(p.receivedAt ?? v.ultimoReporte),
      conexion:
        (p.receivedAt ?? v.ultimoReporte) ? 'reportando' : 'sin_senal',
    }
  })
}

function conductoresPorVehiculo(lista) {
  const porVehiculo = new Map()
  for (const c of lista) {
    if (!porVehiculo.has(c.vehicleId)) porVehiculo.set(c.vehicleId, c)
  }
  return porVehiculo
}

export const repoApi = {
  admin: {
    usuarios: {
      async listar({ q = '', rol = '' } = {}) {
        const r = await api.usuarios({ q, limite: 200 })
        let lista = (r?.items ?? []).map((u) => ({
          id: u.userId,
          nombre: u.displayName,
          email: u.email,
          rol: u.role,
          rolEtiqueta: u.role === 'supervisor'
            ? 'Supervisor'
            : u.role === 'conductor'
              ? 'Conductor'
              : u.role === 'operator'
                ? 'Operador'
                : 'Usuario',
          empresaId: null,
          empresaNombre: 'Ente actual',
          conduce: u.role === 'conductor',
          claveTemporal: null,
          perfilCompleto: null,
          esDesempleado: false,
          estado: u.status,
          activadoEn: u.activatedAt,
        }))
        if (rol) lista = lista.filter((u) => u.rol === rol)
        return lista
      },

      async crear({ nombre, email, rol, clave }) {
        const r = await api.crearUsuario({
          email,
          displayName: nombre,
          role: rol,
          temporaryPassword: clave,
        })
        return {
          id: r.userId,
          nombre: r.displayName,
          email: r.email,
          rol: r.role,
          clave: r.passwordSet ? clave : null,
          claveCreada: Boolean(r.passwordSet),
          debeCambiarClave: Boolean(r.mustChangePassword),
        }
      },
    },
  },

  vehiculos: {
    async listar({ q = '' } = {}) {
      const [lista, conductores] = await Promise.all([
        flota(q),
        // Los conductores no son imprescindibles para pintar el mapa: si esa
        // llamada falla, la flota se muestra igual y sin nombre en vez de no
        // mostrarse.
        api.conductores().then((r) => r?.items ?? []).catch(() => []),
      ])
      const porVehiculo = conductoresPorVehiculo(conductores)
      return lista
        .map((v) => {
          const c = porVehiculo.get(v.id)
          return c
            ? { ...v, conductorPrincipalId: c.userId, conductorNombre: c.displayName }
            : v
        })
        .sort((a, b) => a.alias.localeCompare(b.alias))
    },

    async obtener(id) {
      const [ficha, recorrido] = await Promise.all([
        api.vehiculo(id),
        repoApi.recorrido(id),
      ])
      // El expediente trae ahora sus dominios reales. Cada uno cae a lista
      // vacía por separado: un fallo en documentos no debe dejar el vehículo
      // sin mapa.
      const [documentos, odts, inspecciones] = await Promise.all([
        repoApi.documentos.listar({ vehiculoId: id }).catch(() => []),
        repoApi.odts.listar().then((l) => l.filter((o) => o.vehiculoId === id)).catch(() => []),
        repoApi.inspecciones.listar({ vehiculoId: id }).catch(() => []),
      ])
      return {
        ...comoUnidad(ficha.vehicle),
        recorrido,
        documentos,
        odts,
        inspecciones,
        eventos: [],
        costos: [],
      }
    },
  },

  /** Trazado del recorrido, del más antiguo al más reciente. */
  async recorrido(vehiculoId) {
    if (!vehiculoId) return []
    try {
      const r = await api.recorrido(vehiculoId, 300)
      return (r?.positions ?? [])
        .filter((p) => p.positionValid && p.latitude != null && p.longitude != null)
        .map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
          velocidadKmh: p.telemetry?.speedKph ?? null,
          rumbo: p.telemetry?.headingDeg ?? null,
          hora: p.eventTime || p.receivedAt,
        }))
        .reverse()
    } catch {
      return []
    }
  },

  /** Áreas reales. Ya no se devuelve una lista vacía. */
  async areas() {
    try {
      const r = await api.areas()
      return (r?.items ?? []).map((a) => ({
        id: a.id,
        nombre: a.name,
        tipo: a.kind,
        estado: a.status,
        vehiculos: a.vehicleCount,
      }))
    } catch {
      return []
    }
  },

  /** Conductores con asignación vigente. Sin cédula ni teléfono: ver #168. */
  async conductores() {
    try {
      const r = await api.conductores()
      return (r?.items ?? []).map((c) => ({
        id: c.userId,
        nombre: c.displayName,
        rol: c.role,
        vehiculoId: c.vehicleId,
        vehiculo: c.vehiclePlate || c.vehicleCode,
        desde: c.validFrom,
      }))
    } catch {
      return []
    }
  },

  // --- Operación y cumplimiento --------------------------------------------
  //
  // La forma de cada elemento imita a la de la semilla para que los módulos no
  // cambien: la migración es del dato, no de la interfaz.

  odts: {
    async listar({ estado = '', q = '' } = {}) {
      try {
        const r = await api.odts({ estado })
        let lista = (r?.items ?? []).map((o) => ({
          id: o.id,
          estado: o.status,
          tipo: o.kind,
          descripcion: o.description,
          falla: o.failureType,
          ubicacion: o.location,
          notaResolucion: o.resolutionNote,
          costo: o.resolutionCost,
          resueltaEn: o.resolvedAt,
          creadaEn: o.createdAt,
          vehiculoId: o.vehicleId,
          vehiculoNombre: [o.vehicleCode, o.vehiclePlate].filter(Boolean).join(' · ') || '—',
          creadorNombre: o.createdByName || 'Sistema',
        }))
        if (q) {
          const t = q.toLowerCase()
          lista = lista.filter((o) =>
            [o.descripcion, o.vehiculoNombre].join(' ').toLowerCase().includes(t))
        }
        return lista
      } catch {
        return []
      }
    },

    async obtener(id) {
      const r = await api.odt(id)
      const o = r.workOrder
      return {
        id: o.id,
        estado: o.status,
        tipo: o.kind,
        descripcion: o.description,
        falla: o.failureType,
        ubicacion: o.location,
        notaResolucion: o.resolutionNote,
        costo: o.resolutionCost,
        resueltaEn: o.resolvedAt,
        creadaEn: o.createdAt,
        vehiculoId: o.vehicleId,
        vehiculoNombre: [o.vehicleCode, o.vehiclePlate].filter(Boolean).join(' · ') || '—',
        creadorNombre: o.createdByName || 'Sistema',
        // El historial es inmutable: lo escribe la base al cambiar el estado.
        eventos: (r.events ?? []).map((e) => ({
          orden: e.sequence,
          de: e.fromStatus,
          a: e.toStatus,
          nota: e.note,
          cuando: e.occurredAt,
          quien: e.actorName || 'Sistema',
        })),
      }
    },
  },

  inspecciones: {
    async listar({ vehiculoId = '' } = {}) {
      try {
        const r = await api.inspecciones({ vehiculoId })
        return (r?.items ?? []).map((i) => ({
          id: i.id,
          resultado: i.result,
          fecha: i.inspectionDate,
          ubicacion: i.location,
          enviadaEn: i.submittedAt,
          vehiculoId: i.vehicleId,
          vehiculoNombre: [i.vehicleCode, i.vehiclePlate].filter(Boolean).join(' · ') || '—',
          conductorNombre: i.driverName || '—',
          plantilla: i.templateName,
        }))
      } catch {
        return []
      }
    },
  },

  documentos: {
    async listar({ vehiculoId = '' } = {}) {
      try {
        const r = await api.documentos({ vehiculoId })
        return (r?.items ?? []).map((d) => ({
          id: d.id,
          ambito: d.scope,
          tipo: d.documentType,
          numero: d.documentNumber,
          emitidoEl: d.issuedOn,
          venceEl: d.expiresOn,
          // Calculado en la base, no aquí: el reloj del navegador puede estar
          // en otra zona, y un documento vencido que aparece vigente es el
          // fallo que este módulo evita.
          diasParaVencer: d.daysToExpiry,
          estado: d.status,
          notas: d.notes,
          vehiculoId: d.vehicleId,
          vehiculoNombre: [d.vehicleCode, d.vehiclePlate].filter(Boolean).join(' · ') || '—',
          archivos: d.fileCount,
        }))
      } catch {
        return []
      }
    },
  },

  alertas: {
    async listar({ soloSinLeer = false } = {}) {
      try {
        const r = await api.notificaciones({ soloSinLeer })
        return (r?.items ?? []).map((n) => ({
          id: n.id,
          tipo: n.notificationType,
          titulo: n.title,
          detalle: n.detail,
          odtId: n.workOrderId,
          leidaEn: n.readAt,
          creadaEn: n.createdAt,
        }))
      } catch {
        return []
      }
    },
  },

  reglas: {
    async listar() {
      try {
        const r = await api.reglasAlerta()
        return (r?.items ?? []).map((g) => ({
          id: g.id,
          tipo: g.ruleType,
          umbralKmh: g.thresholdKph,
          umbralKm: g.thresholdKm,
          servicio: g.serviceName,
          activa: g.isActive,
          vehiculos: g.vehicleCount,
        }))
      } catch {
        return []
      }
    },
  },

  /** Resumen con lo que la base puede afirmar hoy. */
  async resumen() {
    const [lista, areas, operacion] = await Promise.all([
      flota(),
      repoApi.areas().catch(() => []),
      // Si los contadores fallan, el panel muestra el resto igual.
      api.resumenOperacion().catch(() => ({})),
    ])
    const reportando = lista.filter((v) => v.conectado).length
    const sabeMarcha = lista.some((v) => v.estadoMarcha != null)
    return {
      totalVehiculos: lista.length,
      reportando,
      sinSenal: lista.length - reportando,
      conPosicion: lista.filter((v) => v.lat != null).length,
      // `null` mientras la velocidad no se guarde: contar cero en marcha sería
      // afirmar que la flota está parada, y lo cierto es que no se sabe.
      enMarcha: sabeMarcha
        ? lista.filter((v) => v.estadoMarcha === 'en_marcha').length
        : null,
      detenidos: sabeMarcha
        ? lista.filter((v) => v.estadoMarcha === 'parada').length
        : null,
      conductores: null,
      sinConductor: lista.filter((v) => v.conductorNombre === 'Sin asignar').length,
      porArea: areas.map((a) => ({ area: a.nombre, total: a.vehiculos })),
      // Contadores reales de operación, todos del mismo instante.
      ...operacion,
      // Sin respaldo todavía.
      indiceSeguroPromedio: null,
      unidadesBloqueadas: null,
    }
  },
}

export default repoApi
