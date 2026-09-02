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

/**
 * Clave temporal legible pero no adivinable. Se genera en el navegador y
 * viaja una sola vez: el servidor guarda el hash y obliga a cambiarla.
 */
function claveTemporal() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(12)
  crypto.getRandomValues(bytes)
  const cuerpo = [...bytes].map((b) => alfabeto[b % alfabeto.length]).join('')
  return `Fom-${cuerpo.slice(0, 4)}-${cuerpo.slice(4, 8)}-${cuerpo.slice(8, 12)}`
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

      /**
       * Cambiar el perfil o el estado de alguien.
       *
       * `revoked` es terminal por diseño del ciclo de vida: de ahi no se
       * vuelve. Suspender, en cambio, se deshace.
       */
      async cambiar(id, { rol, estado, motivo } = {}) {
        await api.actualizarMiembro(id, {
          role: rol || undefined,
          status: estado || undefined,
          reason: motivo || undefined,
        })
        return true
      },

      async suspender(id, motivo) {
        await api.actualizarMiembro(id, { status: 'suspended', reason: motivo })
        return true
      },

      async reactivar(id, motivo) {
        await api.actualizarMiembro(id, { status: 'active', reason: motivo })
        return true
      },

      /**
       * Reiniciar la clave. La nueva se genera AQUI y se devuelve una sola
       * vez para entregarla en mano; el servidor solo guarda su hash y la
       * marca como obligada a cambiarse en el primer ingreso.
       */
      async cambiarClave(id) {
        const clave = claveTemporal()
        await api.reiniciarClave(id, {
          temporaryPassword: clave,
          reason: 'Reinicio solicitado desde la consola',
        })
        return { clave, debeCambiarClave: true }
      },

      /**
       * Sacar a alguien del ente. El servidor NO borra la membresia: la
       * revoca, y con eso caen sus sesiones. Borrarla dejaria sin dueño el
       * rastro de todo lo que esa persona hizo.
       */
      async enviarADesempleados(id) {
        await api.actualizarMiembro(id, {
          status: 'revoked',
          reason: 'Salida del ente registrada desde la consola',
        })
        return true
      },

      /** Mismo camino: revocar. Aqui no existe el borrado definitivo. */
      async eliminar(id) {
        await api.actualizarMiembro(id, {
          status: 'revoked',
          reason: 'Acceso revocado desde la consola',
        })
        return true
      },

      async eliminarDefinitivo() {
        throw new Error(
          'Una cuenta no se borra: se revoca, y su rastro queda. Borrarla ' +
            'dejaria sin dueño todo lo que esa persona registro — ordenes, ' +
            'inspecciones y firmas. Usa «revocar acceso».',
        )
      },

      async mover() {
        throw new Error(
          'Mudar una persona de empresa no existe todavia en el servidor: ' +
            'hoy se revoca en la empresa de origen y se le da de alta en la ' +
            'de destino.',
        )
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

  avisosEscritura: {
    /**
     * Dar un aviso por visto. Marca para TODA la empresa: la base no guarda
     * quien lo leyo, porque el aviso describe algo de la flota y no del que
     * lo mira. Si un supervisor lo marca, deja de aparecerle a sus companeros.
     */
    async marcarLeida(avisoId) {
      await api.marcarAvisoLeido(avisoId)
      return true
    },
    async marcarTodasLeidas() {
      const r = await api.marcarTodosLosAvisos()
      return { marcados: r?.markedCount ?? 0 }
    },
  },

  documentosEscritura: {
    async crear({ ambito, vehiculoId, personaId, tipo, numero, emitidoEn, venceEn, notas }) {
      const r = await api.crearDocumento({
        scope: ambito === 'persona' ? 'persona' : 'vehiculo',
        vehicleId: ambito === 'persona' ? undefined : vehiculoId,
        holderUserId: ambito === 'persona' ? personaId : undefined,
        documentType: tipo,
        documentNumber: numero || undefined,
        issuedOn: emitidoEn || undefined,
        expiresOn: venceEn,
        notes: notas || undefined,
      })
      return { id: r?.document?.id ?? null }
    },

    /** La correccion mas frecuente del modulo: mover el vencimiento. */
    async actualizarVencimiento(documentoId, venceEn) {
      await api.actualizarDocumento(documentoId, { expiresOn: venceEn })
      return true
    },

    async actualizar(documentoId, { numero, emitidoEn, venceEn, notas, estado }) {
      await api.actualizarDocumento(documentoId, {
        documentNumber: numero,
        issuedOn: emitidoEn,
        expiresOn: venceEn,
        notes: notas,
        status: estado,
      })
      return true
    },

    /** Archivar no borra: saca de la vigilancia y conserva el historial. */
    async archivar(documentoId) {
      await api.actualizarDocumento(documentoId, { status: 'archived' })
      return true
    },
  },

  reglasEscritura: {
    async crear({ tipo, umbralKmh, umbralKm, servicio, activa = true }) {
      const r = await api.crearRegla({
        ruleType: tipo === 'velocidad' ? 'velocidad' : 'mantenimiento',
        thresholdKph: tipo === 'velocidad' ? Number(umbralKmh) : undefined,
        thresholdKm: tipo === 'velocidad' ? undefined : Number(umbralKm),
        serviceName: tipo === 'velocidad' ? undefined : servicio,
        isActive: activa,
      })
      return { id: r?.alertRule?.id ?? null }
    },
    async set(reglaId, { umbralKmh, umbralKm, servicio, activa }) {
      await api.actualizarRegla(reglaId, {
        thresholdKph: umbralKmh === undefined ? undefined : Number(umbralKmh),
        thresholdKm: umbralKm === undefined ? undefined : Number(umbralKm),
        serviceName: servicio,
        isActive: activa,
      })
      return true
    },
    async eliminar(reglaId) {
      // Una regla no se borra: se desactiva. Borrarla dejaria sin explicacion
      // las alertas que ya genero.
      await api.actualizarRegla(reglaId, { isActive: false })
      return true
    },
  },

  gpsEscritura: {
    async registrar({ imei, modelo, protocolo, fabricante, serie }) {
      const r = await api.registrarEquipoGps({
        imei,
        model: modelo,
        protocolFamily: protocolo || 'coban-gps103',
        manufacturer: fabricante || undefined,
        serialNumber: serie || undefined,
      })
      return { id: r?.gpsDevice?.id ?? null }
    },
    async asociar(equipoId, vehiculoId, notas) {
      await api.instalarEquipoGps(equipoId, {
        vehicleId: vehiculoId,
        notes: notas || undefined,
      })
      return true
    },
    async desmontar(instalacionId, notas) {
      await api.desmontarEquipoGps(instalacionId, { notes: notas || undefined })
      return true
    },
    async set(equipoId, { estado, fabricante, serie }) {
      await api.actualizarEquipoGps(equipoId, {
        status: estado,
        manufacturer: fabricante,
        serialNumber: serie,
      })
      return true
    },
  },

  empresas: {
    /**
     * Los tres tipos del panel son las tres categorias de la base:
     * «estandar» es un contratista, «predefinida» es una compania (la que
     * cuelga contratistas de si misma) y «personal» es la de una persona.
     */
    async listar() {
      const r = await api.entes()
      return (r?.items ?? []).map((t) => ({
        id: t.id,
        nombre: t.name,
        codigo: t.code,
        tipo:
          t.category === 'compania'
            ? 'predefinida'
            : t.category === 'personal'
              ? 'personal'
              : 'estandar',
        estado: t.status,
        servicioActivo: t.status === 'active',
        rif: t.rif ?? '',
        telefono: t.phone ?? '',
        email: t.email ?? '',
        contacto: t.contactName ?? '',
        creadoEn: t.createdAt ?? null,
      }))
    },

    async crear({ nombre, tipo, rif, contacto, telefono, email }) {
      const r = await api.crearEnte({
        name: nombre,
        category:
          tipo === 'predefinida'
            ? 'compania'
            : tipo === 'personal'
              ? 'personal'
              : 'contratista',
        rif: rif || undefined,
        phone: telefono || undefined,
        email: email || undefined,
        contactName: contacto || undefined,
      })
      return { id: r?.tenant?.id ?? null }
    },

    /** Suspender o reactivar el servicio de un ente. */
    async setServicio(id, activo, _actor, motivo) {
      await api.actualizarEnte(id, {
        status: activo ? 'active' : 'suspended',
        reason: motivo || 'Cambio de servicio desde la consola',
      })
      return true
    },

    async eliminar(id, _actor, motivo) {
      // Un ente con historial no se borra. Suspenderlo lo saca de operacion
      // y deja el rastro en pie, que es lo que la auditoria necesita.
      await api.actualizarEnte(id, {
        status: 'suspended',
        reason: motivo || 'Ente retirado de operacion desde la consola',
      })
      return true
    },

    /** Colgar un contratista de una compania. */
    async asignar(companiaId, contratistaId) {
      await api.colgarContratista(companiaId, {
        contractorTenantId: contratistaId,
      })
      return true
    },

    async desasignar(relacionId, motivo) {
      await api.descolgarContratista(relacionId, {
        reason: motivo || undefined,
      })
      return true
    },

    async asignarPredefinidas(companiaId, contratistas = []) {
      for (const contratistaId of contratistas) {
        await api.colgarContratista(companiaId, {
          contractorTenantId: contratistaId,
        })
      }
      return true
    },
  },

  areasEscritura: {
    async crear(tenantId, { nombre, tipo = 'zona' }) {
      const r = await api.crearArea(tenantId, { name: nombre, kind: tipo })
      return { id: r?.area?.id ?? null }
    },
    async set(areaId, { nombre, tipo, estado }) {
      await api.actualizarArea(areaId, {
        name: nombre,
        kind: tipo,
        status: estado,
      })
      return true
    },
  },

  vehiculosEscritura: {
    /**
     * Alta de vehiculo.
     *
     * El panel pide un GPS al crear, pero la superficie de consola da de alta
     * la UNIDAD; el equipo se comisiona aparte desde la app de campo. Se avisa
     * en vez de fingir que el GPS quedo asociado, porque un vehiculo que se
     * cree «con GPS» y no lo tenga es peor que uno que se sepa sin el.
     */
    async crear({ alias, placa, marca, modelo, anio, tipo, areaId, gpsId }) {
      const r = await api.crearVehiculo({
        code: (alias || placa || '').trim().toLowerCase().replace(/\s+/gu, '-'),
        plate: placa || undefined,
        alias: alias || undefined,
        make: marca || undefined,
        model: modelo || undefined,
        modelYear: anio ? Number(anio) : undefined,
        vehicleType: tipo || undefined,
      })
      const id = r?.vehicle?.id ?? null
      if (id && areaId) await api.actualizarVehiculo(id, { areaId })
      if (gpsId) {
        throw new Error(
          'La unidad quedo creada, pero el GPS se asocia desde la app de ' +
            'campo al comisionar el equipo. Registrala ahi para vincularlo.',
        )
      }
      return { id }
    },

    async set(id, parche) {
      await api.actualizarVehiculo(id, {
        plate: parche.placa,
        alias: parche.alias,
        make: parche.marca,
        model: parche.modelo,
        modelYear: parche.anio ? Number(parche.anio) : undefined,
        vehicleType: parche.tipo,
        areaId: parche.areaId,
      })
      return true
    },

    /** El area del vehiculo es un campo suyo, no una tabla aparte. */
    async asignarArea(id, areaId) {
      await api.actualizarVehiculo(id, { areaId: areaId || null })
      return true
    },

    /**
     * Asignar conductor. Sin `userId` la intencion es DESASIGNAR, y eso el
     * servidor no lo hace borrando sino revocando la asignacion vigente, que
     * es la que deja rastro de quien manejo y hasta cuando.
     */
    async asignarConductor(id, userId, { rol = 'principal', pin, motivo } = {}) {
      if (!userId) {
        throw new Error(
          'Para quitar un conductor hay que revocar su asignacion vigente ' +
            'desde su expediente: no se borra, se cierra con fecha.',
        )
      }
      await api.asignarConductor(id, {
        userId,
        role: rol,
        pin: pin || undefined,
        reason: motivo || undefined,
      })
      return true
    },

    async revocarAsignacion(asignacionId, motivo) {
      await api.revocarAsignacion(asignacionId, { reason: motivo || undefined })
      return true
    },
  },

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

    /**
   * Abrir una orden. El servidor decide el estado inicial y el histórico:
   * aquí solo viaja lo que el supervisor escribió.
   */
    async crear({ vehiculoId, descripcion, tipoFalla, ubicacion, tipo }) {
      const r = await api.crearOdt({
        vehicleId: vehiculoId,
        description: descripcion,
        kind: tipo || 'correctiva',
        failureType: tipoFalla || undefined,
        location: ubicacion || undefined,
      })
      return { id: r?.workOrder?.id ?? null, estado: r?.workOrder?.status ?? null }
    },

    /**
     * Mover la orden de estado. `estadoEsperado` es el que el panel acaba de
     * leer: si otro lo movio mientras tanto, el servidor responde 409 en vez
     * de pisar su trabajo.
     */
    async mover(id, { estadoEsperado, estado, nota, notaResolucion, costo, moneda }) {
      const r = await api.moverOdt(id, {
        expectedStatus: estadoEsperado,
        status: estado,
        note: nota,
        resolutionNote: notaResolucion || undefined,
        resolutionCost: costo === undefined || costo === null || costo === ''
          ? undefined
          : Number(costo),
        resolutionCurrency: moneda || undefined,
      })
      return { estado: r?.workOrder?.status ?? null }
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
