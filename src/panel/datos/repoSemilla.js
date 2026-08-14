// ============================================================
// REPOSITORIO DE DATOS DEL PANEL
// ------------------------------------------------------------
// Única puerta de acceso a los datos. Todas las funciones son asíncronas a
// propósito: el día que exista backend, cada una pasa a ser una consulta a
// Supabase (o a la API que se elija) sin tocar ni un módulo de la interfaz.
//
//   listarVehiculos()  ->  supabase.from('vehiculos').select(VEHICULO_SELECT)
//   cambiarEstadoOdt() ->  supabase.from('odts').update({estado}).eq('id', id)
//
// Mientras tanto lee la semilla y guarda los cambios del usuario en el
// navegador, para que lo que edite el supervisor siga ahí al recargar.
// ============================================================

import {
  AREAS, AUDITORIA, COSTOS, DOCUMENTOS, EMPRESA, EMPRESAS, EVENTOS, GPS_LIBRES,
  INSPECCIONES, NOTIFICACIONES, ODTS, PAGOS, PERFILES, REGLAS, VEHICULOS, recorridoDe,
} from './semilla'
import {
  CLAVE_POR_DEFECTO, DESEMPLEADOS_ID, ETIQUETA, ITEMS_INSPECCION, ROLES_ASIGNABLES,
  estadoDocumento, etiquetaRol, puedeGestionarA, validarRolEmpresa,
} from './catalogos'
import { hoyISO } from './formato'

const CLAVE_CAMBIOS = 'fom.panel.cambios'

// --- Capa de cambios locales ----------------------------------------------
function leerCambios() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CAMBIOS) || '{}')
  } catch {
    return {}
  }
}
let cambios = leerCambios()

function guardar() {
  try {
    localStorage.setItem(CLAVE_CAMBIOS, JSON.stringify(cambios))
  } catch {
    /* almacenamiento lleno o bloqueado: los cambios viven solo en memoria */
  }
  avisar()
}

const oyentes = new Set()
function avisar() {
  oyentes.forEach((fn) => fn())
}
/** Suscribirse a cualquier cambio de datos. Devuelve la baja. */
export function alCambiarDatos(fn) {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

/** Borra todo lo editado y vuelve a los datos de origen. */
export function reiniciarDatos() {
  cambios = {}
  localStorage.removeItem(CLAVE_CAMBIOS)
  avisar()
}

function parche(coleccion, id) {
  return cambios[coleccion]?.[id]
}
function aplicar(coleccion, fila) {
  const p = parche(coleccion, fila.id)
  return p ? { ...fila, ...p } : fila
}
function guardarParche(coleccion, id, patch) {
  cambios[coleccion] = cambios[coleccion] || {}
  cambios[coleccion][id] = { ...(cambios[coleccion][id] || {}), ...patch }
  guardar()
}
function agregados(coleccion) {
  return cambios.nuevos?.[coleccion] || []
}
function agregar(coleccion, fila) {
  cambios.nuevos = cambios.nuevos || {}
  cambios.nuevos[coleccion] = [...(cambios.nuevos[coleccion] || []), fila]
  guardar()
}

// Latencia simulada, como fakeNetwork() de la app: obliga a los módulos a
// manejar el estado de carga desde ya.
const responder = (valor, ms = 120) =>
  new Promise((r) => setTimeout(() => r(typeof valor === 'function' ? valor() : valor), ms))

// --- Colecciones resueltas -------------------------------------------------
function todosVehiculos() {
  return [...VEHICULOS, ...agregados('vehiculos')].map((v) => aplicar('vehiculos', v))
}
function todosPerfiles() {
  // Los eliminados definitivamente no existen para nadie.
  return [...PERFILES, ...agregados('perfiles')]
    .map((p) => aplicar('perfiles', p))
    .filter((p) => !p.eliminado)
}
/** Solo la gente de la empresa del supervisor (la vista clásica del panel). */
function perfilesDeLaEmpresa() {
  return todosPerfiles().filter((p) => (p.empresaId ?? EMPRESA.id) === EMPRESA.id)
}
function todasOdts() {
  return [...agregados('odts'), ...ODTS]
    .map((o) => aplicar('odts', o))
    .sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn))
}
function todosDocumentos() {
  return [...DOCUMENTOS, ...agregados('documentos')].map((d) => aplicar('documentos', d))
}
function todasNotificaciones() {
  return [...NOTIFICACIONES, ...agregados('notificaciones')]
    .map((n) => aplicar('notificaciones', n))
    .sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn))
}
function todasInspecciones() {
  return [...agregados('inspecciones'), ...INSPECCIONES].map((i) => aplicar('inspecciones', i))
}
function todasEmpresas() {
  return [...EMPRESAS, ...agregados('empresas')]
    .map((e) => aplicar('empresas', e))
    .filter((e) => !e.eliminada)
}
function todosPagos() {
  return [...PAGOS, ...agregados('pagos')].map((p) => aplicar('pagos', p))
}
function todosGps() {
  return [...GPS_LIBRES, ...agregados('gps')].map((g) => aplicar('gps', g))
}
function todaAuditoria() {
  return [...agregados('auditoria'), ...AUDITORIA]
    .map((a) => aplicar('auditoria', a))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
}
let audSecuencia = 0
/** Deja constancia en la bitácora; toda acción de administración pasa por aquí. */
function auditar(tipo, { actor, empresaId = null, objetivo = '', detalle = '' } = {}) {
  audSecuencia += 1
  agregar('auditoria', {
    id: `aud-n${Date.now().toString(36)}-${audSecuencia}`,
    tipo,
    actorId: actor?.id ?? 'usr-000',
    actorNombre: actor?.nombre ?? 'Administrador FOM',
    empresaId,
    objetivo,
    detalle,
    fecha: new Date().toISOString(),
  })
}
/** Falla igual que la app: mensaje en español listo para mostrar. */
function fallo(mensaje) {
  return Promise.reject(new Error(mensaje))
}

/** Vehículo con conductor, área y estado de documentos ya resueltos. */
function enriquecerVehiculo(v, perfiles, docs) {
  const conductor = perfiles.find((p) => p.id === v.conductorPrincipalId) || null
  const area = AREAS.find((a) => a.id === v.areaId) || null
  const misDocs = docs.filter((d) => d.ambito === 'vehiculo' && d.vehiculoId === v.id)
  const vencidos = misDocs.filter((d) => estadoDocumento(d.venceEn) === 'vencido').length
  const porVencer = misDocs.filter((d) => estadoDocumento(d.venceEn) === 'por_vencer').length
  return {
    ...v,
    conductor,
    conductorNombre: conductor?.nombre ?? 'Sin asignar',
    area,
    areaNombre: area?.nombre ?? 'Sin área',
    docsVencidos: vencidos,
    docsPorVencer: porVencer,
  }
}

// ============================================================
// API
// ============================================================
export const repo = {
  empresa: () => responder(EMPRESA, 40),
  areas: () => responder(AREAS, 40),

  // ---------------- Resumen ejecutivo ----------------
  async resumen() {
    const veh = todosVehiculos()
    const perfiles = perfilesDeLaEmpresa()
    const docs = todosDocumentos()
    const odts = todasOdts()
    const insp = todasInspecciones()
    const hoy = hoyISO()

    const enMarcha = veh.filter((v) => v.estadoMarcha === 'en_marcha').length
    const inspHoy = insp.filter((i) => i.fecha === hoy)
    const bloqueadas = inspHoy.filter((i) => i.resultado === 'bloqueada')
    const docsVencidos = docs.filter((d) => estadoDocumento(d.venceEn) === 'vencido').length
    const docsPorVencer = docs.filter((d) => estadoDocumento(d.venceEn) === 'por_vencer').length
    const abiertas = odts.filter((o) => o.estado === 'abierta')
    const enRevision = odts.filter((o) => o.estado === 'en_revision')
    const cerradas = odts.filter((o) => o.estado === 'cerrada')

    // Promedio del índice de manejo seguro (media simple, como la app)
    const indice = Math.round(veh.reduce((a, v) => a + v.indiceSeguro, 0) / (veh.length || 1))

    // Horas promedio de resolución sobre las ODT cerradas
    const conTiempo = cerradas.filter((o) => o.resueltaEn)
    const horasProm = conTiempo.length
      ? Math.round(
          conTiempo.reduce((a, o) => a + (new Date(o.resueltaEn) - new Date(o.creadaEn)) / 3600000, 0) /
            conTiempo.length
        )
      : 0

    return responder({
      totalVehiculos: veh.length,
      enMarcha,
      detenidos: veh.length - enMarcha,
      conductores: perfiles.filter((p) => p.conduce).length,
      odtAbiertas: abiertas.length,
      odtEnRevision: enRevision.length,
      odtCerradas: cerradas.length,
      costoCerradas: cerradas.reduce((a, o) => a + (o.costo ?? 0), 0),
      horasPromedioResolucion: horasProm,
      inspeccionesHoy: inspHoy.length,
      inspeccionesPendientes: Math.max(0, veh.length - inspHoy.length),
      unidadesBloqueadas: bloqueadas.length,
      docsVencidos,
      docsPorVencer,
      indiceSeguroPromedio: indice,
      alertasSinLeer: todasNotificaciones().filter((n) => !n.leida).length,
      sinConductor: veh.filter((v) => !v.conductorPrincipalId).length,
      porArea: AREAS.map((a) => ({
        ...a,
        total: veh.filter((v) => v.areaId === a.id).length,
        enMarcha: veh.filter((v) => v.areaId === a.id && v.estadoMarcha === 'en_marcha').length,
      })).filter((a) => a.total > 0),
    })
  },

  // ---------------- Vehículos ----------------
  vehiculos: {
    async listar({ q = '', areaId = '', estado = '' } = {}) {
      const perfiles = todosPerfiles()
      const docs = todosDocumentos()
      let lista = todosVehiculos().map((v) => enriquecerVehiculo(v, perfiles, docs))
      if (areaId) lista = lista.filter((v) => v.areaId === areaId)
      if (estado) lista = lista.filter((v) => v.estadoMarcha === estado)
      if (q) {
        const t = q.toLowerCase()
        lista = lista.filter((v) =>
          [v.placa, v.alias, v.numero, v.marca, v.modelo, v.conductorNombre]
            .join(' ')
            .toLowerCase()
            .includes(t)
        )
      }
      return responder(lista.sort((a, b) => a.alias.localeCompare(b.alias)))
    },

    async obtener(id) {
      const perfiles = todosPerfiles()
      const docs = todosDocumentos()
      const v = todosVehiculos().find((x) => x.id === id)
      if (!v) return responder(null)
      const completo = enriquecerVehiculo(v, perfiles, docs)
      return responder({
        ...completo,
        documentos: docs
          .filter((d) => d.ambito === 'vehiculo' && d.vehiculoId === id)
          .map((d) => ({ ...d, estado: estadoDocumento(d.venceEn) }))
          .sort((a, b) => new Date(a.venceEn) - new Date(b.venceEn)),
        odts: todasOdts().filter((o) => o.vehiculoId === id),
        inspecciones: todasInspecciones()
          .filter((i) => i.vehiculoId === id)
          .sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn)),
        eventos: EVENTOS.filter((e) => e.vehiculoId === id),
        costos: COSTOS.filter((c) => c.vehiculoId === id),
        recorrido: recorridoDe(id),
      })
    },

    async actualizar(id, patch) {
      guardarParche('vehiculos', id, patch)
      return responder(true, 200)
    },

    /** Asigna el conductor principal (equivale a asignarConductorPrincipal). */
    async asignarConductor(id, userId) {
      guardarParche('vehiculos', id, { conductorPrincipalId: userId || null })
      return responder(true, 200)
    },

    async asignarArea(id, areaId) {
      guardarParche('vehiculos', id, { areaId: areaId || null })
      return responder(true, 200)
    },

    /**
     * Alta de vehículo: SOLO el Administrador FOM, y solo con un GPS ya
     * verificado (la regla dura de la app: sin GPS probado no hay unidad).
     */
    async crear({ alias, placa, marca, modelo, anio, tipo = 'camioneta', gpsId, areaId = null }, actor) {
      if (actor?.rol !== 'admin') return fallo('Solo el Administrador FOM puede crear vehículos.')
      const placaN = String(placa || '').toUpperCase().replace(/\s+/g, '')
      if (!placaN) return fallo('La placa es obligatoria.')
      if (todosVehiculos().some((v) => v.placa.toUpperCase().replace(/\s+/g, '') === placaN))
        return fallo('Ya existe un vehículo con esa placa.')
      const gps = todosGps().find((g) => g.id === gpsId)
      if (!gps) return fallo('Selecciona un GPS del inventario.')
      if (!gps.verificado) return fallo('El GPS debe estar verificado antes de asignarse a un vehículo.')
      if (gps.vehiculoId) return fallo('Ese GPS ya está instalado en otra unidad.')

      const n = todosVehiculos().length + 1
      const id = `veh-n${Date.now().toString(36)}`
      const area = AREAS.find((a) => a.id === areaId) || AREAS[0]
      const fila = {
        id,
        empresaId: EMPRESA.id,
        marca: marca || 'Toyota',
        modelo: modelo || 'Hilux',
        anio: Number(anio) || new Date().getFullYear(),
        placa: placaN,
        numero: `U-${String(n).padStart(3, '0')}`,
        alias: alias?.trim() || `Unidad ${String(n).padStart(2, '0')}`,
        tipo,
        gps: { id: gps.id, modelo: gps.modelo, imei: gps.imei, linea: gps.linea, verificado: true, pinSupport: gps.pinSupport, panicoProbado: gps.panicoProbado },
        areaId: area.id,
        conductorPrincipalId: null,
        estadoMarcha: 'parada',
        velocidadKmh: 0,
        km: 0,
        lat: area.base.lat,
        lng: area.base.lng,
        indiceSeguro: 100,
        aceitePct: 100,
        tempMotorC: 0,
        ubicacionTexto: 'Patio principal',
        ultimoReporte: new Date().toISOString(),
        creadoEn: new Date().toISOString(),
      }
      agregar('vehiculos', fila)
      guardarParche('gps', gps.id, { vehiculoId: id, empresaId: EMPRESA.id })
      auditar('crear_vehiculo', {
        actor,
        empresaId: EMPRESA.id,
        objetivo: `${fila.alias} · ${fila.placa}`,
        detalle: `Alta con GPS ${gps.modelo} verificado`,
      })
      return responder(fila, 300)
    },
  },

  // ---------------- Personal ----------------
  personal: {
    async listar({ q = '', soloConductores = false } = {}) {
      const veh = todosVehiculos()
      let lista = perfilesDeLaEmpresa().map((p) => {
        const unidad = veh.find((v) => v.conductorPrincipalId === p.id) || null
        const misEventos = EVENTOS.filter((e) => e.conductorId === p.id)
        return {
          ...p,
          unidad,
          unidadNombre: unidad ? `${unidad.alias} · ${unidad.placa}` : 'Sin unidad',
          indiceSeguro: unidad?.indiceSeguro ?? null,
          eventos: misEventos.length,
          licenciaEstado: p.licenciaVence ? estadoDocumento(p.licenciaVence) : null,
          medicaEstado: p.cartaMedicaVence ? estadoDocumento(p.cartaMedicaVence) : null,
        }
      })
      if (soloConductores) lista = lista.filter((p) => p.conduce)
      if (q) {
        const t = q.toLowerCase()
        lista = lista.filter((p) => [p.nombre, p.cedula, p.email].join(' ').toLowerCase().includes(t))
      }
      return responder(lista.sort((a, b) => a.nombre.localeCompare(b.nombre)))
    },

    async obtener(id) {
      const p = todosPerfiles().find((x) => x.id === id)
      if (!p) return responder(null)
      const veh = todosVehiculos()
      const unidad = veh.find((v) => v.conductorPrincipalId === id) || null
      const misEventos = EVENTOS.filter((e) => e.conductorId === id)
      const misInsp = todasInspecciones()
        .filter((i) => i.conductorId === id)
        .sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn))
      return responder({
        ...p,
        unidad,
        eventos: misEventos,
        inspecciones: misInsp,
        odts: todasOdts().filter((o) => o.creadorId === id),
        documentos: todosDocumentos()
          .filter((d) => d.ambito === 'persona' && d.userId === id)
          .map((d) => ({ ...d, estado: estadoDocumento(d.venceEn) })),
        indiceSeguro: unidad?.indiceSeguro ?? null,
      })
    },

    async actualizar(id, patch) {
      guardarParche('perfiles', id, patch)
      return responder(true, 200)
    },
  },

  // ---------------- Órdenes de trabajo ----------------
  odts: {
    async listar({ estado = '', tipo = '', q = '' } = {}) {
      const veh = todosVehiculos()
      const perfiles = todosPerfiles()
      let lista = todasOdts().map((o) => {
        const v = veh.find((x) => x.id === o.vehiculoId)
        const creador = perfiles.find((p) => p.id === o.creadorId)
        return {
          ...o,
          vehiculo: v,
          vehiculoNombre: v ? `${v.alias} · ${v.placa}` : '—',
          creadorNombre: o.creadorId ? (creador?.nombre ?? '—') : 'Sistema',
        }
      })
      if (estado) lista = lista.filter((o) => o.estado === estado)
      if (tipo) lista = lista.filter((o) => o.tipo === tipo)
      if (q) {
        const t = q.toLowerCase()
        lista = lista.filter((o) =>
          [o.descripcion, o.vehiculoNombre, o.creadorNombre, o.tipoFalla].join(' ').toLowerCase().includes(t)
        )
      }
      return responder(lista)
    },

    async obtener(id) {
      const lista = await this.listar()
      return lista.find((o) => o.id === id) ?? null
    },

    /** Crea una ODT correctiva, como crearOrdenDeTrabajo de la app. */
    async crear({ vehiculoId, descripcion, tipoFalla, ubicacion, creadorId }) {
      const id = `odt-n${Date.now().toString(36)}`
      const veh = todosVehiculos().find((v) => v.id === vehiculoId)
      agregar('odts', {
        id,
        empresaId: EMPRESA.id,
        vehiculoId,
        creadorId: creadorId ?? null,
        autorVia: 'principal',
        tipo: 'correctiva',
        estado: 'abierta',
        descripcion,
        tipoFalla: tipoFalla || null,
        ubicacion: ubicacion || veh?.ubicacionTexto || '',
        evidenciaUrls: [],
        notaSolucion: null,
        costo: null,
        resueltaEn: null,
        reglaId: null,
        creadaEn: new Date().toISOString(),
      })
      // El trigger de la base crea la notificación; aquí se replica.
      agregar('notificaciones', {
        id: `not-n${Date.now().toString(36)}`,
        empresaId: EMPRESA.id,
        tipo: 'odt_nueva',
        titulo: `Nueva ODT — Vehículo ${veh?.alias ?? ''} (${veh?.placa ?? ''})`,
        detalle: descripcion,
        odtId: id,
        leida: false,
        creadaEn: new Date().toISOString(),
      })
      return responder(id, 260)
    },

    /**
     * Cambia el estado. Al cerrar guarda nota y costo y sella resueltaEn;
     * al reabrir lo limpia (mismo comportamiento del trigger V3).
     */
    async cambiarEstado(id, estado, extras = {}) {
      const patch = { estado }
      if (estado === 'cerrada') {
        patch.resueltaEn = new Date().toISOString()
        if (extras.notaSolucion !== undefined) patch.notaSolucion = extras.notaSolucion
        if (extras.costo !== undefined) patch.costo = extras.costo
      } else {
        patch.resueltaEn = null
      }
      guardarParche('odts', id, patch)
      return responder(true, 220)
    },
  },

  // ---------------- Inspecciones ----------------
  inspecciones: {
    itemsPlantilla: (tipo = 'otro') =>
      ITEMS_INSPECCION.filter((i) => i.tipos.length === 0 || i.tipos.includes(tipo)),

    async listar({ fecha = '', resultado = '', q = '' } = {}) {
      const veh = todosVehiculos()
      const perfiles = todosPerfiles()
      let lista = todasInspecciones().map((i) => {
        const v = veh.find((x) => x.id === i.vehiculoId)
        const c = perfiles.find((p) => p.id === i.conductorId)
        return {
          ...i,
          vehiculo: v,
          vehiculoNombre: v ? `${v.alias} · ${v.placa}` : '—',
          conductorNombre: c?.nombre ?? '—',
          tipoVehiculo: v?.tipo ?? 'otro',
        }
      })
      if (fecha) lista = lista.filter((i) => i.fecha === fecha)
      if (resultado) lista = lista.filter((i) => i.resultado === resultado)
      if (q) {
        const t = q.toLowerCase()
        lista = lista.filter((i) => [i.vehiculoNombre, i.conductorNombre].join(' ').toLowerCase().includes(t))
      }
      return responder(lista.sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn)))
    },

    /** Unidades sin inspección de hoy: lo que el supervisor debe perseguir. */
    async pendientesHoy() {
      const hoy = hoyISO()
      const hechas = new Set(todasInspecciones().filter((i) => i.fecha === hoy).map((i) => i.vehiculoId))
      const perfiles = todosPerfiles()
      const docs = todosDocumentos()
      return responder(
        todosVehiculos()
          .filter((v) => !hechas.has(v.id))
          .map((v) => enriquecerVehiculo(v, perfiles, docs))
      )
    },
  },

  // ---------------- Documentos ----------------
  documentos: {
    async listar({ ambito = '', estado = '', q = '' } = {}) {
      const veh = todosVehiculos()
      const perfiles = todosPerfiles()
      let lista = todosDocumentos().map((d) => {
        const v = d.vehiculoId ? veh.find((x) => x.id === d.vehiculoId) : null
        const p = d.userId ? perfiles.find((x) => x.id === d.userId) : null
        return {
          ...d,
          estado: estadoDocumento(d.venceEn),
          titular: v ? `${v.alias} · ${v.placa}` : (p?.nombre ?? '—'),
          titularId: v?.id ?? p?.id ?? null,
        }
      })
      if (ambito) lista = lista.filter((d) => d.ambito === ambito)
      if (estado) lista = lista.filter((d) => d.estado === estado)
      if (q) {
        const t = q.toLowerCase()
        lista = lista.filter((d) => [d.tipo, d.titular].join(' ').toLowerCase().includes(t))
      }
      const orden = { vencido: 0, por_vencer: 1, vigente: 2 }
      return responder(
        lista.sort(
          (a, b) => orden[a.estado] - orden[b.estado] || new Date(a.venceEn) - new Date(b.venceEn)
        )
      )
    },

    async actualizarVencimiento(id, venceEn) {
      guardarParche('documentos', id, { venceEn })
      return responder(true, 200)
    },
  },

  // ---------------- Alertas y notificaciones ----------------
  alertas: {
    async listar({ soloSinLeer = false } = {}) {
      let lista = todasNotificaciones()
      if (soloSinLeer) lista = lista.filter((n) => !n.leida)
      return responder(lista)
    },
    async marcarLeida(id) {
      guardarParche('notificaciones', id, { leida: true })
      return responder(true, 100)
    },
    async marcarTodasLeidas() {
      todasNotificaciones().forEach((n) => {
        if (!n.leida) guardarParche('notificaciones', n.id, { leida: true })
      })
      return responder(true, 150)
    },
    /** Eventos de manejo detectados (base del índice seguro). */
    async eventos({ dias = 28 } = {}) {
      const veh = todosVehiculos()
      const perfiles = todosPerfiles()
      const corte = Date.now() - dias * 86400000
      return responder(
        EVENTOS.filter((e) => new Date(e.creadaEn).getTime() >= corte).map((e) => ({
          ...e,
          vehiculo: veh.find((v) => v.id === e.vehiculoId) ?? null,
          conductorNombre: perfiles.find((p) => p.id === e.conductorId)?.nombre ?? '—',
        }))
      )
    },
  },

  // ---------------- Reglas de alerta ----------------
  reglas: {
    listar: () => responder(REGLAS),
  },

  // ---------------- Costos y reportes ----------------
  costos: {
    async resumen({ dias = 30 } = {}) {
      const desde = new Date(Date.now() - dias * 86400000)
      const lista = COSTOS.filter((c) => new Date(`${c.fecha}T00:00:00`) >= desde)
      const total = lista.reduce((a, c) => a + c.monto, 0)
      const porCategoria = {}
      lista.forEach((c) => {
        porCategoria[c.categoria] = (porCategoria[c.categoria] || 0) + c.monto
      })
      const veh = todosVehiculos()
      const kmTotal = veh.reduce((a, v) => a + v.km, 0)
      return responder({
        total,
        dias,
        porCategoria: Object.entries(porCategoria)
          .map(([categoria, monto]) => ({ categoria, monto }))
          .sort((a, b) => b.monto - a.monto),
        costoPorKm: kmTotal ? total / kmTotal : 0,
        movimientos: lista.length,
      })
    },
  },

  /** Serie de posiciones del día para dibujar el recorrido. */
  recorrido: (vehiculoId) => responder(recorridoDe(vehiculoId), 80),

  // ============================================================
  // ADMINISTRACIÓN FOM — espejo de las Edge Functions de la app.
  // Solo el rol `admin` llega aquí; la consola además esconde estas
  // rutas para cualquier otro rol.
  // ============================================================
  admin: {
    // ---------------- Empresas (entes) ----------------
    empresas: {
      async listar({ q = '', tipo = '' } = {}) {
        const perfiles = todosPerfiles()
        const pagos = todosPagos()
        const veh = todosVehiculos()
        let lista = todasEmpresas().map((e) => {
          const gente = perfiles.filter((p) => p.empresaId === e.id)
          const deuda = pagos.filter((p) => p.empresaId === e.id && p.estado !== 'pagado')
          return {
            ...e,
            tipoEtiqueta: ETIQUETA.company_tipo[e.tipo] ?? e.tipo,
            usuarios: gente.length,
            conductores: gente.filter((p) => p.conduce).length,
            vehiculos: veh.filter((v) => (v.empresaId ?? EMPRESA.id) === e.id).length,
            pagosPendientes: deuda.length,
            deuda: deuda.reduce((a, p) => a + p.monto, 0),
          }
        })
        if (tipo) lista = lista.filter((e) => e.tipo === tipo)
        if (q) {
          const t = q.toLowerCase()
          lista = lista.filter((e) => [e.nombre, e.rif, e.contacto, e.email].join(' ').toLowerCase().includes(t))
        }
        // El ente de respaldo siempre al final, como en la app.
        return responder(lista.sort((a, b) => (a.respaldo ? 1 : 0) - (b.respaldo ? 1 : 0) || a.nombre.localeCompare(b.nombre)))
      },

      async obtener(id) {
        const lista = await this.listar()
        const e = lista.find((x) => x.id === id)
        if (!e) return responder(null)
        return responder({
          ...e,
          personal: todosPerfiles()
            .filter((p) => p.empresaId === id)
            .map((p) => ({ ...p, rolEtiqueta: etiquetaRol(p.rol, e.tipo) })),
          pagos: todosPagos().filter((p) => p.empresaId === id),
          gps: todosGps().filter((g) => g.empresaId === id),
        })
      },

      async crear({ nombre, tipo = 'estandar', rif = '', contacto = '', telefono = '', email = '', predefinidas = [] }, actor) {
        if (!nombre?.trim()) return fallo('El nombre del ente es obligatorio.')
        const slug = nombre.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        if (todasEmpresas().some((e) => e.slug === slug)) return fallo('Ya existe un ente con ese nombre.')
        const fila = {
          id: slug, slug, nombre: nombre.trim(), tipo, rif, contacto, telefono, email,
          servicioActivo: true,
          // Solo una contratista trabaja PARA compañías; los demás tipos no llevan lista.
          predefinidas: tipo === 'estandar' ? predefinidas : [],
        }
        agregar('empresas', fila)
        auditar('crear_empresa', { actor, empresaId: slug, objetivo: fila.nombre, detalle: `Alta de ${ETIQUETA.company_tipo[tipo] ?? tipo}` })
        return responder(fila, 280)
      },

      async actualizar(id, patch, actor) {
        const e = todasEmpresas().find((x) => x.id === id)
        if (!e) return fallo('Ese ente no existe.')
        if (e.respaldo) return fallo('El ente de respaldo no se edita: es del sistema.')
        guardarParche('empresas', id, patch)
        auditar('editar_empresa', { actor, empresaId: id, objetivo: e.nombre, detalle: 'Datos del ente actualizados' })
        return responder(true, 220)
      },

      /** Suspende o reactiva el servicio FOM del ente. */
      async setServicio(id, activo, actor) {
        const e = todasEmpresas().find((x) => x.id === id)
        if (!e) return fallo('Ese ente no existe.')
        if (e.respaldo) return fallo('El ente de respaldo no tiene servicio que suspender.')
        guardarParche('empresas', id, { servicioActivo: !!activo })
        auditar('servicio_empresa', {
          actor, empresaId: id, objetivo: e.nombre,
          detalle: activo ? 'Servicio reactivado' : 'Servicio suspendido',
        })
        return responder(true, 240)
      },

      /** Qué compañías (predefinidas) puede ver una contratista. */
      async asignarPredefinidas(id, listaIds, actor) {
        const e = todasEmpresas().find((x) => x.id === id)
        if (!e) return fallo('Ese ente no existe.')
        if (e.tipo !== 'estandar') return fallo('Solo una contratista trabaja para compañías.')
        guardarParche('empresas', id, { predefinidas: listaIds })
        auditar('editar_empresa', { actor, empresaId: id, objetivo: e.nombre, detalle: `Compañías asignadas: ${listaIds.length}` })
        return responder(true, 220)
      },

      async eliminar(id, actor) {
        const e = todasEmpresas().find((x) => x.id === id)
        if (!e) return fallo('Ese ente no existe.')
        if (e.respaldo) return fallo('El ente de respaldo no se puede eliminar.')
        if (todosPerfiles().some((p) => p.empresaId === id))
          return fallo('El ente aún tiene personal: muévelo o envíalo a Desempleados C.A. primero.')
        guardarParche('empresas', id, { eliminada: true })
        auditar('eliminar_empresa', { actor, empresaId: id, objetivo: e.nombre, detalle: 'Ente eliminado' })
        return responder(true, 260)
      },
    },

    // ---------------- Pagos del servicio ----------------
    pagos: {
      async listar({ empresaId = '', estado = '' } = {}) {
        const empresas = todasEmpresas()
        let lista = todosPagos().map((p) => ({
          ...p,
          empresa: empresas.find((e) => e.id === p.empresaId) ?? null,
          empresaNombre: empresas.find((e) => e.id === p.empresaId)?.nombre ?? '—',
        }))
        if (empresaId) lista = lista.filter((p) => p.empresaId === empresaId)
        if (estado) lista = lista.filter((p) => p.estado === estado)
        // Lo urgente primero: vencido, pendiente, pagado; dentro, lo más reciente.
        const orden = { vencido: 0, pendiente: 1, pagado: 2 }
        return responder(lista.sort((a, b) => orden[a.estado] - orden[b.estado] || b.periodo.localeCompare(a.periodo)))
      },

      async registrar({ empresaId, monto, moneda = 'USD', periodo, nota = '' }, actor) {
        const e = todasEmpresas().find((x) => x.id === empresaId)
        if (!e) return fallo('Selecciona el ente del pago.')
        if (!(Number(monto) > 0)) return fallo('El monto debe ser mayor que cero.')
        if (!/^\d{4}-\d{2}$/.test(periodo || '')) return fallo('El período va como AAAA-MM, por ejemplo 2026-08.')
        if (todosPagos().some((p) => p.empresaId === empresaId && p.periodo === periodo))
          return fallo('Ese período ya tiene una cuota registrada para este ente.')
        const fila = {
          id: `pag-n${Date.now().toString(36)}`,
          empresaId, monto: Number(monto), moneda, periodo,
          estado: 'pendiente', pagadoEn: null, nota,
          creadaEn: new Date().toISOString(),
        }
        agregar('pagos', fila)
        auditar('registrar_pago', { actor, empresaId, objetivo: `${periodo} · ${monto} ${moneda}`, detalle: nota || 'Cuota del servicio' })
        return responder(fila, 280)
      },

      /** Marca pagado / pendiente / vencido; al pagar sella pagadoEn. */
      async actualizarEstado(id, estado, actor) {
        const p = todosPagos().find((x) => x.id === id)
        if (!p) return fallo('Ese pago no existe.')
        guardarParche('pagos', id, { estado, pagadoEn: estado === 'pagado' ? new Date().toISOString() : null })
        auditar('actualizar_pago', {
          actor, empresaId: p.empresaId,
          objetivo: `${p.periodo} · ${p.monto} ${p.moneda}`,
          detalle: `Estado: ${ETIQUETA.pago_estado[estado] ?? estado}`,
        })
        return responder(true, 240)
      },
    },

    // ---------------- Inventario de GPS ----------------
    gps: {
      async listar({ q = '' } = {}) {
        const empresas = todasEmpresas()
        const veh = todosVehiculos()
        // Inventario libre + los equipos ya instalados en la flota.
        const instalados = veh.map((v) => ({
          ...v.gps,
          empresaId: v.empresaId ?? EMPRESA.id,
          vehiculoId: v.id,
          vehiculoNombre: `${v.alias} · ${v.placa}`,
        }))
        let lista = [...todosGps(), ...instalados].map((g) => ({
          ...g,
          empresaNombre: g.empresaId ? (empresas.find((e) => e.id === g.empresaId)?.nombre ?? '—') : 'Sin asociar',
        }))
        if (q) {
          const t = q.toLowerCase()
          lista = lista.filter((g) => [g.modelo, g.imei, g.linea, g.empresaNombre, g.vehiculoNombre].join(' ').toLowerCase().includes(t))
        }
        // Sin verificar primero: es lo que el admin tiene que atender.
        return responder(lista.sort((a, b) => (a.verificado ? 1 : 0) - (b.verificado ? 1 : 0)))
      },

      /** GPS verificados y sin unidad: los únicos válidos para crear vehículo. */
      async disponibles() {
        return responder(todosGps().filter((g) => g.verificado && !g.vehiculoId))
      },

      async registrar({ modelo, imei, linea = '' }, actor) {
        if (!modelo?.trim()) return fallo('Indica el modelo del equipo.')
        const imeiN = String(imei || '').replace(/\D/g, '')
        if (!/^\d{15}$/.test(imeiN)) return fallo('El IMEI debe tener exactamente 15 dígitos.')
        const veh = todosVehiculos()
        if (todosGps().some((g) => g.imei === imeiN) || veh.some((v) => v.gps?.imei === imeiN))
          return fallo('Ya hay un GPS registrado con ese IMEI.')
        const fila = {
          id: `gps-n${Date.now().toString(36)}`,
          modelo: modelo.trim(), imei: imeiN, linea,
          empresaId: null, verificado: false, pinSupport: false, panicoProbado: false,
        }
        agregar('gps', fila)
        auditar('registrar_gps', { actor, objetivo: `${fila.modelo} · ${imeiN}`, detalle: 'Equipo agregado al inventario' })
        return responder(fila, 280)
      },

      /**
       * Verificación por ping, igual que la app: el PRIMER intento siempre
       * falla (el equipo tarda en despertar); el segundo confirma.
       */
      async verificar(id, actor) {
        const g = todosGps().find((x) => x.id === id)
        if (!g) return fallo('Ese GPS no está en el inventario.')
        if (g.verificado) return responder({ ok: true, mensaje: 'El equipo ya estaba verificado.' }, 300)
        if (!g.intentoVerificacion) {
          guardarParche('gps', id, { intentoVerificacion: true })
          return responder({ ok: false, error: 'El equipo no respondió al primer ping. Suele despertar al segundo intento: vuelve a probar.' }, 900)
        }
        guardarParche('gps', id, { verificado: true })
        auditar('verificar_gps', { actor, empresaId: g.empresaId, objetivo: `${g.modelo} · ${g.imei}`, detalle: 'Equipo verificado por ping' })
        return responder({ ok: true, mensaje: 'GPS verificado: el equipo respondió con posición válida.' }, 900)
      },

      async asociar(id, empresaId, actor) {
        const g = todosGps().find((x) => x.id === id)
        if (!g) return fallo('Ese GPS no está en el inventario.')
        if (g.vehiculoId) return fallo('Ese GPS ya está instalado en una unidad.')
        const e = empresaId ? todasEmpresas().find((x) => x.id === empresaId) : null
        if (empresaId && !e) return fallo('Ese ente no existe.')
        guardarParche('gps', id, { empresaId: empresaId || null })
        auditar('asociar_gps', {
          actor, empresaId: empresaId || null,
          objetivo: `${g.modelo} · ${g.imei}`,
          detalle: e ? `Asociado a ${e.nombre}` : 'Devuelto al inventario general',
        })
        return responder(true, 260)
      },

      /** Prueba del botón de pánico (solo equipos verificados con soporte PIN). */
      async probarPanico(id, actor) {
        const g = todosGps().find((x) => x.id === id)
        if (!g) return fallo('Ese GPS no está en el inventario.')
        if (!g.verificado) return fallo('Verifica el equipo antes de probar el pánico.')
        if (!g.pinSupport) return fallo('Ese modelo no trae entrada de botón de pánico.')
        guardarParche('gps', id, { panicoProbado: true })
        auditar('probar_panico', { actor, empresaId: g.empresaId, objetivo: `${g.modelo} · ${g.imei}`, detalle: 'Botón de pánico probado correctamente' })
        return responder({ ok: true, mensaje: 'Señal de pánico recibida en la central.' }, 900)
      },
    },

    // ---------------- Usuarios del sistema (todas las empresas) ----------------
    usuarios: {
      async listar({ q = '', empresaId = '', rol = '' } = {}) {
        const empresas = todasEmpresas()
        let lista = todosPerfiles().map((p) => {
          const e = empresas.find((x) => x.id === p.empresaId) ?? null
          return {
            ...p,
            empresa: e,
            empresaNombre: e?.nombre ?? '—',
            rolEtiqueta: etiquetaRol(p.rol, e?.tipo),
            esDesempleado: p.empresaId === DESEMPLEADOS_ID,
          }
        })
        if (empresaId) lista = lista.filter((p) => p.empresaId === empresaId)
        if (rol) lista = lista.filter((p) => p.rol === rol)
        if (q) {
          const t = q.toLowerCase()
          lista = lista.filter((p) => [p.nombre, p.email, p.cedula, p.empresaNombre].join(' ').toLowerCase().includes(t))
        }
        return responder(lista.sort((a, b) => a.nombre.localeCompare(b.nombre)))
      },

      /**
       * Alta de usuario, como la Edge Function: rol asignable, compatible con
       * el tipo de ente, y clave por defecto que se entrega una sola vez.
       */
      async crear({ nombre, email, rol, empresaId, conduce = false }, actor) {
        if (!nombre?.trim()) return fallo('El nombre es obligatorio.')
        if (!/.+@.+\..+/.test(email || '')) return fallo('Escribe un correo válido.')
        if (todosPerfiles().some((p) => p.email.toLowerCase() === email.toLowerCase()))
          return fallo('Ya existe un usuario con ese correo.')
        if (!ROLES_ASIGNABLES.includes(rol)) return fallo('Ese rol no se puede asignar desde el panel.')
        const e = todasEmpresas().find((x) => x.id === empresaId)
        if (!e) return fallo('Selecciona el ente del usuario.')
        const errorRol = validarRolEmpresa(rol, e.tipo)
        if (errorRol) return fallo(errorRol)
        const fila = {
          id: `usr-n${Date.now().toString(36)}`,
          nombre: nombre.trim(),
          email: email.trim(),
          rol,
          empresaId,
          conduce: rol === 'conductor' ? true : !!conduce,
          perfilCompleto: false,
          cedula: '', telefono: '', direccion: '', fechaNacimiento: null,
          licenciaNumero: '', licenciaCategoria: '', licenciaVence: null,
          cartaMedicaVence: null, areaId: null,
          claveTemporal: true,
          creadoEn: new Date().toISOString(),
        }
        agregar('perfiles', fila)
        auditar('crear_usuario', {
          actor, empresaId,
          objetivo: fila.nombre,
          detalle: `Perfil ${etiquetaRol(rol, e.tipo)} con clave por defecto`,
        })
        return responder({ ...fila, clave: CLAVE_POR_DEFECTO }, 300)
      },

      async actualizar(id, patch, actor) {
        const p = todosPerfiles().find((x) => x.id === id)
        if (!p) return fallo('Ese usuario no existe.')
        if (!puedeGestionarA(actor, p)) return fallo('No puedes gestionar a ese usuario: su rango no es menor que el tuyo.')
        guardarParche('perfiles', id, patch)
        auditar('editar_usuario', { actor, empresaId: p.empresaId, objetivo: p.nombre, detalle: 'Perfil actualizado' })
        return responder(true, 240)
      },

      /** Mueve a otro ente, validando rol contra el tipo de destino. */
      async mover(id, empresaId, actor) {
        const p = todosPerfiles().find((x) => x.id === id)
        if (!p) return fallo('Ese usuario no existe.')
        if (!puedeGestionarA(actor, p)) return fallo('No puedes gestionar a ese usuario: su rango no es menor que el tuyo.')
        const e = todasEmpresas().find((x) => x.id === empresaId)
        if (!e) return fallo('Ese ente no existe.')
        const errorRol = validarRolEmpresa(p.rol, e.tipo)
        if (errorRol) return fallo(errorRol)
        guardarParche('perfiles', id, { empresaId, areaId: null })
        auditar('mover_usuario', { actor, empresaId, objetivo: p.nombre, detalle: `Movido a ${e.nombre}` })
        return responder(true, 260)
      },

      /**
       * "Eliminar" de la app: la cuenta no se borra, pasa a Desempleados C.A.
       * y suelta la unidad que tuviera asignada.
       */
      async enviarADesempleados(id, actor) {
        const p = todosPerfiles().find((x) => x.id === id)
        if (!p) return fallo('Ese usuario no existe.')
        if (!puedeGestionarA(actor, p)) return fallo('No puedes gestionar a ese usuario: su rango no es menor que el tuyo.')
        if (p.empresaId === DESEMPLEADOS_ID) return fallo('Ese usuario ya está en Desempleados C.A.')
        todosVehiculos().forEach((v) => {
          if (v.conductorPrincipalId === id) guardarParche('vehiculos', v.id, { conductorPrincipalId: null })
        })
        guardarParche('perfiles', id, { empresaId: DESEMPLEADOS_ID, areaId: null })
        auditar('eliminar_usuario', { actor, empresaId: p.empresaId, objetivo: p.nombre, detalle: 'Salió de la empresa; su cuenta pasó a Desempleados C.A.' })
        return responder(true, 280)
      },

      /** Borrado real: solo desde el ente de respaldo, y es definitivo. */
      async eliminarDefinitivo(id, actor) {
        const p = todosPerfiles().find((x) => x.id === id)
        if (!p) return fallo('Ese usuario no existe.')
        if (p.empresaId !== DESEMPLEADOS_ID)
          return fallo('Solo se elimina definitivamente desde Desempleados C.A.: envíalo allí primero.')
        guardarParche('perfiles', id, { eliminado: true })
        auditar('eliminar_definitivo', { actor, empresaId: DESEMPLEADOS_ID, objetivo: p.nombre, detalle: 'Cuenta eliminada definitivamente' })
        return responder(true, 300)
      },

      /** Restablece la clave a la por defecto. Jamás a un admin ni a uno mismo. */
      async cambiarClave(id, actor) {
        const p = todosPerfiles().find((x) => x.id === id)
        if (!p) return fallo('Ese usuario no existe.')
        if (p.rol === 'admin') return fallo('La clave de un Administrador FOM no se restablece desde el panel.')
        if (actor?.id === id) return fallo('Tu propia clave se cambia desde tu perfil, no desde aquí.')
        guardarParche('perfiles', id, { claveTemporal: true })
        auditar('cambiar_clave', { actor, empresaId: p.empresaId, objetivo: p.nombre, detalle: 'Clave restablecida a la por defecto' })
        return responder({ clave: CLAVE_POR_DEFECTO }, 280)
      },
    },

    // ---------------- Auditoría ----------------
    auditoria: {
      async listar({ tipo = '', empresaId = '', q = '' } = {}) {
        const empresas = todasEmpresas()
        let lista = todaAuditoria().map((a) => ({
          ...a,
          empresaNombre: a.empresaId ? (empresas.find((e) => e.id === a.empresaId)?.nombre ?? '—') : 'Sistema',
        }))
        if (tipo) lista = lista.filter((a) => a.tipo === tipo)
        if (empresaId) lista = lista.filter((a) => a.empresaId === empresaId)
        if (q) {
          const t = q.toLowerCase()
          lista = lista.filter((a) => [a.actorNombre, a.objetivo, a.detalle, a.empresaNombre].join(' ').toLowerCase().includes(t))
        }
        return responder(lista)
      },
    },
  },
}

export default repo
