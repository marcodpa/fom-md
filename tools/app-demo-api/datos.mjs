// Datos de DEMOSTRACIÓN para el servidor falso de la app (T-147). Nada de clientes reales:
// todo sale de la semilla del panel web (src/panel/datos/semilla.js), la misma que pinta las
// capturas del panel —Transporte Lago Sur, Carlos Méndez en la Unidad 01 · Z69FC7W—, traducido
// a la forma de la API móvil de FOM que lee la app (fom-driver-juan/src/services/*).
//
// La semilla usa imports sin extensión (estilo Vite), así que se empaqueta con el esbuild que ya
// trae el repo y se importa el resultado.
import { buildSync } from 'esbuild'
import { existsSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..', '..')

async function cargarSemilla() {
  const salida = join(tmpdir(), 'fom-app-demo-api')
  mkdirSync(salida, { recursive: true })
  const archivo = join(salida, `semilla-${process.pid}.mjs`)
  buildSync({
    entryPoints: [join(RAIZ, 'src/panel/datos/semilla.js')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: archivo,
    logLevel: 'warning',
  })
  const catalogo = join(salida, `catalogos-${process.pid}.mjs`)
  buildSync({
    entryPoints: [join(RAIZ, 'src/panel/datos/catalogos.js')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: catalogo,
    logLevel: 'warning',
  })
  return { s: await import(pathToFileURL(archivo).href), c: await import(pathToFileURL(catalogo).href) }
}

const { s, c } = await cargarSemilla()
export const AHORA_SEMILLA = s.AHORA_SEMILLA
const DIA = 86400000

// --- Ids: la app solo acepta UUID (esIdDb / esIdFom) ------------------------
const PREFIJO = {
  ente: 'a0', persona: 'b0', unidad: 'c0', odt: 'd0', insp: 'e0', doc: 'f0', area: '10', alerta: '20',
  aviso: '30', plan: '40', accion: '50', formato: '60', item: '70', hallazgo: '80', evento: '90',
  asignacion: 'a1', sesion: 'a2', gps: 'a3', credencial: 'a4',
}
const numeroDe = (texto) => {
  const m = String(texto).match(/^[a-z]+-(\d+)$/i)
  if (m) return Number(m[1])
  let h = 7
  for (const ch of String(texto)) h = (h * 31 + ch.charCodeAt(0)) % 1e11
  return h
}
// El primer bloque sale de la clave (FNV-1a): la app enseña el código de la ODT con los 8
// primeros caracteres del id (`ODT-55E1A962`) y con ceros salían todas «ODT-D0000000».
const hex8 = (texto) => {
  let h = 2166136261
  for (const ch of String(texto)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return h.toString(16).padStart(8, '0')
}
export function uuid(tipo, clave) {
  const p = PREFIJO[tipo]
  return `${hex8(`${tipo}:${clave}`)}-${p}00-4000-8000-${String(numeroDe(clave)).padStart(12, '0')}`
}

// --- Azar determinista por clave --------------------------------------------
function azar(clave) {
  let h = 2166136261
  for (const ch of String(clave)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  let x = h || 1
  return () => {
    x ^= x << 13; x >>>= 0
    x ^= x >>> 17
    x ^= x << 5; x >>>= 0
    return x / 4294967296
  }
}
const diaLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// --- Ente, áreas, gente -----------------------------------------------------
export const ENTE_ID = uuid('ente', 'transporte-lago-sur')
const CATEGORIA = { estandar: 'contratista', predefinida: 'compania', personal: 'personal' }
export const ENTES = s.EMPRESAS.filter((e) => !e.respaldo).map((e) => ({
  id: uuid('ente', e.id),
  name: e.nombre,
  category: CATEGORIA[e.tipo] ?? 'contratista',
  status: e.servicioActivo ? 'active' : 'suspended',
  rif: e.rif,
  phone: e.telefono?.replace(/\s+/g, '') || null,
  email: e.email || null,
  contactName: e.contacto || null,
  brandColor: null,
  vehicleCount: String(e.id === 'transporte-lago-sur' ? s.VEHICULOS.length : 0),
  memberCount: String(s.PERFILES.filter((p) => p.empresaId === e.id).length),
}))

const COLOR_AREA = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7']
export const AREAS = s.AREAS.map((a, i) => ({
  id: uuid('area', a.id),
  name: a.nombre,
  kind: a.tipo,
  status: 'active',
  color: COLOR_AREA[i % COLOR_AREA.length],
}))

const cedulaFom = (ced) => (ced ? ced.toLowerCase().replace(/\./g, '') : null)
const telFom = (t) => (t ? t.replace(/\s+/g, '') : null)

// Las dos cuentas de la demo: el conductor y el supervisor que salen en las capturas del panel.
export const CUENTAS = {
  'conductor@fom.com.ve': 'usr-002',
  'supervisor@fom.com.ve': 'usr-001',
}

export const PERSONAS = s.PERFILES.filter((p) => p.empresaId === 'transporte-lago-sur').map((p) => ({
  semillaId: p.id,
  id: uuid('persona', p.id),
  nombre: p.nombre,
  // El conductor de la demo entra con la cuenta de demostración, como en el panel.
  email: p.id === 'usr-002' ? 'conductor@fom.com.ve' : p.email,
  rolFom: p.rol === 'conductor' ? 'conductor' : 'supervisor',
  cedula: cedulaFom(p.cedula),
  telefono: telFom(p.telefono),
  direccion: p.direccion,
  nacimiento: p.fechaNacimiento,
  licenciaNumero: p.licenciaNumero || null,
  licenciaCategoria: p.licenciaCategoria || null,
  licenciaVence: p.licenciaVence,
  cartaMedicaVence: p.cartaMedicaVence,
  creadoEn: p.creadoEn,
}))
// Carlos, el conductor de la demo, con los papeles al día (como en «Mi perfil» del panel).
{
  const carlos = PERSONAS.find((p) => p.semillaId === 'usr-002')
  carlos.telefono = '+584141710071'
  carlos.licenciaVence = diaLocal(new Date(AHORA_SEMILLA + 420 * DIA))
  carlos.cartaMedicaVence = diaLocal(new Date(AHORA_SEMILLA + 23 * DIA))
}
export const personaPorSemilla = Object.fromEntries(PERSONAS.map((p) => [p.semillaId, p]))
export const personaPorId = Object.fromEntries(PERSONAS.map((p) => [p.id, p]))

// --- Unidades ----------------------------------------------------------------
export const UNIDADES = s.VEHICULOS.map((v) => {
  const conductor = v.conductorPrincipalId ? personaPorSemilla[v.conductorPrincipalId] : null
  return {
    semillaId: v.id,
    id: uuid('unidad', v.id),
    code: v.numero.toUpperCase(),
    vehicleType: v.tipo,
    plate: v.placa,
    make: v.marca,
    model: v.modelo,
    modelYear: v.id === 'veh-001' ? 2022 : v.anio,
    areaId: uuid('area', v.areaId),
    km: v.km,
    lat: v.lat,
    lng: v.lng,
    enMarcha: v.estadoMarcha === 'en_marcha',
    velocidad: v.velocidadKmh,
    indice: v.id === 'veh-001' ? 83 : v.indiceSeguro,
    ubicacion: v.ubicacionTexto,
    ultimoReporte: v.ultimoReporte,
    conductorId: conductor?.id ?? null,
    conductorNombre: conductor?.nombre ?? null,
    gps: v.gps,
    creadoEn: v.creadoEn,
  }
})
export const unidadPorId = Object.fromEntries(UNIDADES.map((u) => [u.id, u]))
export const unidadPorSemilla = Object.fromEntries(UNIDADES.map((u) => [u.semillaId, u]))
export const UNIDAD_CARLOS = unidadPorSemilla['veh-001']

/** Corre una hora de la semilla al «ahora» del servidor: así nada envejece mientras corre. */
export const alDia = (iso) => (iso ? new Date(Date.parse(iso) + (Date.now() - AHORA_SEMILLA)).toISOString() : iso)

export function posicionDe(u) {
  const t = alDia(u.ultimoReporte)
  const r = azar(`rumbo-${u.id}`)
  return {
    id: uuid('evento', `pos-${u.semillaId}`),
    vehicleId: u.id,
    eventTime: t,
    receivedAt: t,
    latitude: u.lat,
    longitude: u.lng,
    positionValid: true,
    quality: { positionValid: true, timezoneStatus: 'ok' },
    speedKph: u.enMarcha ? (u.semillaId === 'veh-001' ? 61 : u.velocidad) : 0,
    headingDeg: Math.round(r() * 359),
    ignition: u.enMarcha,
    odometerKm: u.km,
  }
}

export function vehiculoFom(u) {
  return {
    id: u.id,
    code: u.code,
    vehicleType: u.vehicleType,
    plate: u.plate,
    vin: null,
    make: u.make,
    model: u.model,
    modelYear: u.modelYear,
    status: 'active',
    areaId: u.areaId,
    odometerKm: u.km,
    createdAt: u.creadoEn,
    updatedAt: u.creadoEn,
  }
}

/** Recorrido del día (puntos crudos de la semilla), del más nuevo al más viejo. */
export function recorridoDe(u) {
  const { puntos } = s.recorridoDetalladoDe(u.semillaId, 24)
  return puntos
    .map((p, i) => ({
      id: uuid('evento', `${u.semillaId}-p${i}`),
      vehicleId: u.id,
      eventTime: alDia(p.hora),
      receivedAt: alDia(p.hora),
      latitude: p.lat,
      longitude: p.lng,
      positionValid: true,
      quality: { positionValid: true, timezoneStatus: 'ok' },
      speedKph: p.velocidadKmh,
      headingDeg: null,
      ignition: p.velocidadKmh > 0,
      odometerKm: null,
    }))
    .reverse()
}

// --- Métricas por día de cada unidad ------------------------------------------
// Cada día con su distancia, eventos e índice. El índice de manejo del conductor y la lista
// de eventos salen de aquí, así cuadran entre sí. La Unidad 01 de Carlos lleva lo de las
// capturas del panel: 83/100 «Puede mejorar», con 2 frenadas, 1 aceleración y 3 excesos en 7 días.
const DIAS_CARLOS = { 0: [1, 0, 1], 1: [0, 1, 0], 3: [1, 0, 1], 5: [0, 0, 1] } // [frenadas, aceleraciones, excesos]
export function metricaDelDia(u, fecha) {
  const r = azar(`dia-${u.id}-${fecha}`)
  const d = new Date(`${fecha}T12:00:00`)
  const hace = Math.round((new Date(diaLocal(new Date())) - new Date(fecha)) / DIA)
  if (hace < 0) return null
  const finde = d.getDay() === 0 || d.getDay() === 6
  const km = Math.round((finde ? 15 + r() * 45 : 55 + r() * 125) * (hace === 0 ? 0.55 : 1))
  let [fr, ac, ex] = [r() < 0.35 ? 1 : 0, r() < 0.2 ? 1 : 0, r() < 0.3 ? Math.ceil(r() * 2) : 0]
  if (u.semillaId === 'veh-001' && hace < 7) [fr, ac, ex] = DIAS_CARLOS[hace] ?? [0, 0, 0]
  const indice = u.semillaId === 'veh-001' ? 83 : Math.max(50, Math.min(99, Math.round(u.indice + (r() - 0.5) * 8)))
  return {
    metricDate: fecha,
    distanceMeters: km * 1000,
    maxSpeedKph: Math.round(70 + r() * 40 + ex * 12),
    speedingEvents: ex,
    harshBrakingEvents: fr,
    harshAccelerationEvents: ac,
    safetyIndex: indice,
  }
}

export function diasEntre(desde, hasta) {
  const lista = []
  const fin = new Date(`${hasta}T12:00:00`)
  for (let d = new Date(`${desde}T12:00:00`); d <= fin && lista.length < 400; d = new Date(d.getTime() + DIA)) {
    lista.push(diaLocal(d))
  }
  return lista
}

export function metricaConductor(p, desde, hasta) {
  const u = UNIDADES.find((x) => x.conductorId === p.id)
  const filas = u ? diasEntre(desde, hasta).map((f) => metricaDelDia(u, f)).filter(Boolean) : []
  const suma = (k) => filas.reduce((a, f) => a + (f[k] ?? 0), 0)
  const metros = suma('distanceMeters')
  return {
    userId: p.id,
    displayName: p.nombre,
    drivingSeconds: Math.round((metros / 1000 / 42) * 3600),
    metricDays: filas.filter((f) => f.distanceMeters > 0).length,
    distanceMeters: metros,
    maxSpeedKph: filas.length ? Math.max(...filas.map((f) => f.maxSpeedKph)) : null,
    speedingEvents: suma('speedingEvents'),
    harshBrakingEvents: suma('harshBrakingEvents'),
    harshAccelerationEvents: suma('harshAccelerationEvents'),
    safetyIndex: filas.length ? Math.round(filas.reduce((a, f) => a + f.safetyIndex, 0) / filas.length) : null,
  }
}

/** Los eventos de manejo de un conductor en los últimos `dias` días, del más nuevo al más viejo. */
export function eventosDe(p, dias) {
  const u = UNIDADES.find((x) => x.conductorId === p.id)
  if (!u) return []
  const ruta = s.recorridoDe(u.semillaId, 26)
  const lista = []
  const hoy = new Date()
  for (let i = 0; i < dias; i++) {
    const fecha = diaLocal(new Date(hoy.getTime() - i * DIA))
    const m = metricaDelDia(u, fecha)
    if (!m) continue
    const r = azar(`ev-${u.id}-${fecha}`)
    const tipos = [
      ['harsh_braking', m.harshBrakingEvents],
      ['harsh_acceleration', m.harshAccelerationEvents],
      ['speeding', m.speedingEvents],
    ]
    for (const [type, n] of tipos) {
      for (let k = 0; k < n; k++) {
        const base = new Date(`${fecha}T06:30:00`).getTime()
        let t = base + r() * 11 * 3600000
        if (t > Date.now() - 20 * 60000) t = Date.now() - (20 + r() * 200) * 60000
        const punto = ruta[Math.floor(r() * ruta.length)] ?? { lat: u.lat, lng: u.lng }
        const v = type === 'speeding' ? Math.round(122 + r() * 18) : Math.round(48 + r() * 30)
        lista.push({
          id: uuid('evento', `${u.semillaId}-${fecha}-${type}-${k}`),
          type,
          occurredAt: new Date(t).toISOString(),
          vehicleId: u.id,
          vehicleCode: u.code,
          lat: punto.lat + (r() - 0.5) * 0.002,
          lng: punto.lng + (r() - 0.5) * 0.002,
          speedBeforeKph: v,
          speedAfterKph: type === 'harsh_braking' ? Math.round(v * 0.45) : type === 'harsh_acceleration' ? v + 22 : null,
        })
      }
    }
  }
  return lista.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

// --- Órdenes de trabajo ------------------------------------------------------
const GRAVEDAD = { frenos: 'alta', motor: 'alta', neumaticos: 'media', electrico: 'media', carroceria: 'baja' }
export const ORDENES = s.ODTS.map((o) => {
  const u = unidadPorSemilla[o.vehiculoId]
  const autor = o.creadorId ? personaPorSemilla[o.creadorId]?.nombre ?? null : null
  return {
    id: uuid('odt', o.id),
    status: o.estado,
    kind: o.tipo,
    description: o.descripcion,
    severity: o.tipo === 'preventiva' ? 'media' : GRAVEDAD[o.tipoFalla] ?? 'media',
    failureType: o.tipoFalla,
    location: o.ubicacion,
    resolutionNote: o.notaSolucion,
    resolutionCost: o.costo,
    resolvedAt: o.resueltaEn,
    createdAt: o.creadaEn,
    vehicleId: u.id,
    vehicleCode: u.code,
    vehiclePlate: u.plate,
    createdByName: autor,
    maintenanceActionId: null,
    asignadaA: null,
    asignadaEn: null,
  }
})
// Las dos que el panel le enseña a Carlos en «Asignadas a ti», de su Unidad 01.
{
  const u = UNIDAD_CARLOS
  const carlos = personaPorSemilla['usr-002']
  const base = (n, extra) => ({
    id: uuid('odt', `odt-9${n}`),
    kind: 'correctiva',
    location: u.ubicacion,
    resolutionNote: null,
    resolutionCost: null,
    resolvedAt: null,
    vehicleId: u.id,
    vehicleCode: u.code,
    vehiclePlate: u.plate,
    createdByName: 'Yeison Márquez',
    maintenanceActionId: null,
    asignadaA: carlos.id,
    ...extra,
  })
  ORDENES.unshift(
    base(1, {
      status: 'asignada',
      description: 'Cambiar las pastillas de freno delanteras: chillan al frenar.',
      severity: 'alta',
      failureType: 'frenos',
      createdAt: new Date(AHORA_SEMILLA - 1 * DIA - 3 * 3600000).toISOString(),
      asignadaEn: new Date(AHORA_SEMILLA - 1 * DIA - 2 * 3600000).toISOString(),
    }),
    base(2, {
      status: 'asignada',
      // La foto del reporte es una luz trasera rota (luz-trasera.jpg): la descripción dice eso
      // mismo, y es la falla que Carlos marcó en la inspección («No enciende la luz trasera…»).
      description: 'Luz trasera izquierda rota: se cayó la mica y no enciende.',
      severity: 'media',
      failureType: 'electrico',
      createdAt: new Date(AHORA_SEMILLA - 2 * DIA - 5 * 3600000).toISOString(),
      asignadaEn: new Date(AHORA_SEMILLA - 2 * DIA - 4 * 3600000).toISOString(),
    }),
  )
}
// La resuelta de las capturas: frenos de la Unidad 01, con fotos del reporte y del cierre.
{
  const u = UNIDAD_CARLOS
  ORDENES.push({
    id: uuid('odt', 'odt-990'),
    status: 'cerrada',
    kind: 'correctiva',
    description: 'Las pastillas delanteras chillan al frenar y el pedal se siente largo.',
    severity: 'alta',
    failureType: 'frenos',
    location: u.ubicacion,
    resolutionNote: 'Repuesto sustituido y probado en ruta corta. Unidad operativa.',
    resolutionCost: 155,
    resolvedAt: new Date(AHORA_SEMILLA - 5 * DIA).toISOString(),
    createdAt: new Date(AHORA_SEMILLA - 20 * DIA).toISOString(),
    vehicleId: u.id,
    vehicleCode: u.code,
    vehiclePlate: u.plate,
    createdByName: 'Carlos Méndez',
    maintenanceActionId: null,
    asignadaA: null,
    asignadaEn: null,
  })
}
export const ORDEN_RESUELTA_ID = uuid('odt', 'odt-990')
export const ORDEN_ASIGNADA_ID = uuid('odt', 'odt-91')
export const ORDEN_LUZ_ID = uuid('odt', 'odt-92')

export function eventosDeOrden(o) {
  const ev = [{ sequence: 1, fromStatus: null, toStatus: 'abierta', note: null, occurredAt: o.createdAt, actorName: o.createdByName }]
  const paso = (de, a, nota, en, actor = 'Yeison Márquez') =>
    ev.push({ sequence: ev.length + 1, fromStatus: de, toStatus: a, note: nota, occurredAt: en, actorName: actor })
  const t = Date.parse(o.createdAt)
  if (o.status !== 'abierta') paso('abierta', 'en_revision', null, new Date(t + 3 * 3600000).toISOString())
  if (o.status === 'asignada') paso('en_revision', 'asignada', null, o.asignadaEn)
  if (o.status === 'cerrada') paso('en_revision', 'cerrada', o.resolutionNote, o.resolvedAt)
  return ev
}

// --- Inspecciones --------------------------------------------------------------
export const ITEMS = c.ITEMS_INSPECCION.map((it, i) => ({
  id: uuid('item', it.id),
  category: it.categoria,
  name: it.nombre,
  isCritical: it.critico,
  helpText: null,
  displayOrder: i + 1,
  tipos: it.tipos,
}))
// El orden de la hoja: como la planilla del panel.
const ORDEN_CATEGORIAS = ['Frenos', 'Luces', 'Motor y fluidos', 'Cabina y seguridad', 'Llantas', 'Documentos', 'Carga y acople']
ITEMS.sort((a, b) => ORDEN_CATEGORIAS.indexOf(a.category) - ORDEN_CATEGORIAS.indexOf(b.category) || a.displayOrder - b.displayOrder)
ITEMS.forEach((it, i) => (it.displayOrder = i + 1))
export const FORMATO_ID = uuid('formato', 'preoperacional')
export const FORMATO_NOMBRE = 'Inspección preoperacional'
export function formatoPara(u) {
  return {
    id: FORMATO_ID,
    name: FORMATO_NOMBRE,
    items: ITEMS.filter((it) => it.tipos.length === 0 || it.tipos.includes(u.vehicleType)).map(({ tipos, ...it }) => it),
  }
}

export const INSPECCIONES = s.INSPECCIONES.map((i) => {
  const u = unidadPorSemilla[i.vehiculoId]
  const p = i.conductorId ? personaPorSemilla[i.conductorId] : null
  return {
    id: uuid('insp', i.id),
    kind: 'daily',
    result: i.resultado,
    inspectionDate: i.fecha,
    location: i.ubicacion,
    // La semilla las pone a horas en punto, todas con los mismos minutos: aquí se reparten
    // unos minutos antes (por clave), para que la lista no repita «12:10» cinco veces.
    submittedAt: i.creadaEn ? new Date(Date.parse(i.creadaEn) - Math.floor(azar(`env-${i.id}`)() * 52) * 60000).toISOString() : i.creadaEn,
    vehicleId: u.id,
    vehicleCode: u.code,
    vehiclePlate: u.plate,
    driverName: p?.nombre ?? null,
    driverUserId: p?.id ?? null,
    templateName: FORMATO_NOMBRE,
    observaciones: i.observaciones,
    fallasCriticas: i.fallasCriticas,
  }
})
// La semilla trae pocos días de inspecciones: el historial por persona salía al 33 %. Se
// completan los días hábiles de los últimos 40 (casi todas aprobadas, a primera hora), sin
// pisar las que ya hay. El sábado, la mitad; el domingo no se trabaja.
{
  const hay = new Set(INSPECCIONES.map((i) => `${i.vehicleId}|${i.inspectionDate}`))
  for (const u of UNIDADES) {
    if (!u.conductorId) continue
    const p = personaPorId[u.conductorId]
    for (let k = 1; k <= 40; k++) {
      const d = new Date(AHORA_SEMILLA - k * DIA)
      const fecha = diaLocal(d)
      if (hay.has(`${u.id}|${fecha}`) || d.getDay() === 0) continue
      const r = azar(`gen-insp-${u.id}-${fecha}`)
      if (r() < (d.getDay() === 6 ? 0.5 : 0.08)) continue
      const t = r()
      const result = t < 0.04 ? 'bloqueada' : t < 0.18 ? 'aprobada_con_observaciones' : 'aprobada'
      const hora = new Date(`${fecha}T06:00:00`).getTime() + Math.floor(r() * 95) * 60000
      INSPECCIONES.push({
        id: uuid('insp', `gen-${u.semillaId}-${fecha}`), kind: 'daily', result, inspectionDate: fecha, location: u.ubicacion,
        submittedAt: new Date(hora).toISOString(), vehicleId: u.id, vehicleCode: u.code, vehiclePlate: u.plate,
        driverName: p.nombre, driverUserId: p.id, templateName: FORMATO_NOMBRE,
        observaciones: result === 'aprobada' ? 0 : 1, fallasCriticas: result === 'bloqueada' ? 1 : 0,
      })
    }
  }
  INSPECCIONES.sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate) || (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
}
// La diaria de HOY de la Unidad 01 la decide el modo del servidor (pendiente, aprobada, bloqueada).
export const HOY_SEMILLA = diaLocal(new Date(AHORA_SEMILLA))
for (let k = INSPECCIONES.length - 1; k >= 0; k--) {
  const i = INSPECCIONES[k]
  if (i.vehicleId === UNIDAD_CARLOS.id && i.inspectionDate === HOY_SEMILLA) INSPECCIONES.splice(k, 1)
}
// Ayer, la de Carlos salió aprobada con una observación (para el historial).
{
  const ayer = INSPECCIONES.find((i) => i.vehicleId === UNIDAD_CARLOS.id)
  if (ayer) Object.assign(ayer, { result: 'aprobada_con_observaciones', observaciones: 1, fallasCriticas: 0 })
}

const NOTAS = {
  observacion: ['Desgaste leve, revisar en el próximo servicio.', 'Funciona, pero con ruido.', 'Falta poco para cambiarlo.'],
  falla: ['No enciende la luz trasera izquierda.', 'El pedal llega casi al piso.', 'Fuga visible bajo el motor.'],
}
export function hallazgosDe(insp) {
  const u = unidadPorId[insp.vehicleId]
  const items = formatoPara(u).items
  const r = azar(`hall-${insp.id}`)
  const estados = new Map(items.map((it) => [it.id, 'conforme']))
  const criticos = items.filter((it) => it.isCritical)
  const leves = items.filter((it) => !it.isCritical)
  if (insp.fijos) for (const [id, e] of Object.entries(insp.fijos)) estados.set(id, e)
  else {
    for (let k = 0; k < (insp.fallasCriticas ?? 0); k++) estados.set(criticos[Math.floor(r() * criticos.length)].id, 'falla')
    for (let k = 0; k < (insp.observaciones ?? 0); k++) estados.set(leves[Math.floor(r() * leves.length)].id, 'observacion')
  }
  return items.map((it, n) => {
    const estado = estados.get(it.id)
    return {
      id: uuid('hallazgo', `${insp.id}-${n}`),
      templateItemId: it.id,
      category: it.category,
      name: it.name,
      displayOrder: it.displayOrder,
      itemState: estado,
      isCritical: it.isCritical,
      note: estado === 'conforme' ? null : (insp.notas?.[it.id] ?? NOTAS[estado][Math.floor(r() * 3)]),
    }
  })
}
export const itemPorNombre = (nombre) => ITEMS.find((it) => it.name === nombre)

// --- Documentos -----------------------------------------------------------------
const CODIGO_DOC = {
  'Póliza de seguro': 'poliza_seguro',
  'Certificado de circulación': 'carnet_circulacion',
  // La app no tiene «Revisión técnica»: su papel de unidad equivalente son los trimestres.
  'Revisión técnica': 'trimestres',
  RCV: 'rcv',
  'Licencia de conducir': 'licencia_conducir',
  'Certificado médico': 'carta_medica',
  'Cédula de identidad': 'cedula_identidad',
}
export const DOCUMENTOS = s.DOCUMENTOS.map((d) => {
  const u = d.vehiculoId ? unidadPorSemilla[d.vehiculoId] : null
  const p = d.userId ? personaPorSemilla[d.userId] : null
  let vence = d.venceEn
  // La Unidad 01 sale «Documento vencido» en la lista del panel: se respeta con su RCV.
  if (u?.semillaId === 'veh-001' && d.tipo === 'RCV') vence = diaLocal(new Date(AHORA_SEMILLA - 6 * DIA))
  if (u?.semillaId === 'veh-001' && d.tipo !== 'RCV') vence = diaLocal(new Date(AHORA_SEMILLA + (120 + d.tipo.length * 9) * DIA))
  // La semilla deja una docena de papeles de unidad vencidos: en la app eso llena «No pueden
  // salir» con media flota. Se dejan vencidos tres (U-001 RCV, U-008 póliza, U-015) y el resto
  // pasa a «por vencer» en las próximas semanas.
  if (u && u.semillaId !== 'veh-001' && !['veh-008', 'veh-015'].includes(u.semillaId) && vence < diaLocal(new Date(AHORA_SEMILLA)))
    vence = diaLocal(new Date(AHORA_SEMILLA + (6 + Math.floor(azar(`venc-${d.id}`)() * 40)) * DIA))
  if (p?.semillaId === 'usr-002') vence = d.tipo === 'Licencia de conducir' ? p.licenciaVence : d.tipo === 'Certificado médico' ? p.cartaMedicaVence : vence
  return {
    id: uuid('doc', d.id),
    scope: d.ambito === 'vehiculo' ? 'vehiculo' : 'persona',
    documentType: CODIGO_DOC[d.tipo] ?? 'documento',
    expiresOn: vence,
    status: 'active',
    vehicleId: u?.id ?? null,
    vehicleCode: u?.code ?? null,
    holderUserId: p?.id ?? null,
    holderDisplayName: p?.nombre ?? null,
  }
})

// --- Avisos (buzón del panel) y alertas -------------------------------------------
// La app nombra las unidades por su código («U-005»), no por el alias del panel («Unidad 05»).
const codigoApp = (t) => (t ? t.replace(/\bUnidad (\d+)\b/g, (_, n) => `U-${n.padStart(3, '0')}`) : t)
const odtPorSemilla = (id) => (id ? uuid('odt', id) : null)
export const AVISOS = s.NOTIFICACIONES.map((n) => ({
  id: uuid('aviso', n.id),
  notificationType: n.tipo,
  title: codigoApp(n.titulo.replace(/Vehículo (Unidad \d+) \(([A-Z0-9]+)\)/, (_, alias, placa) => `${alias} · ${placa}`)),
  detail: codigoApp(n.detalle),
  workOrderId: odtPorSemilla(n.odtId),
  readAt: n.leida ? n.creadaEn : null,
  dismissedAt: null,
  createdAt: n.creadaEn,
}))

export function alertasPara(persona) {
  const ahora = Date.now()
  const hace = (min) => new Date(ahora - min * 60000).toISOString()
  if (persona.rolFom === 'conductor') {
    const u = UNIDADES.find((x) => x.conductorId === persona.id)
    if (!u) return []
    return [
      {
        id: uuid('alerta', `c-${persona.semillaId}-1`), vehicleId: u.id, documentId: null, workOrderId: ORDEN_ASIGNADA_ID,
        maintenanceActionId: null, userCredentialId: null, category: 'maintenance',
        title: `Te asignaron una orden · ${u.code.toUpperCase()}`, detail: 'Cambiar las pastillas de freno delanteras.',
        readAt: null, dismissedAt: null, createdAt: hace(26 * 60),
      },
      {
        id: uuid('alerta', `c-${persona.semillaId}-2`), vehicleId: u.id, documentId: null, workOrderId: null,
        maintenanceActionId: null, userCredentialId: null, category: 'fleet',
        title: 'Exceso de velocidad', detail: `${u.code.toUpperCase()} pasó de 120 km/h en la Troncal 17.`,
        readAt: hace(30), dismissedAt: null, createdAt: hace(3 * 60 + 12),
      },
    ]
  }
  // Supervisor: excesos de la flota en marcha y mantenimiento por cumplirse.
  const rapidas = UNIDADES.filter((u) => u.enMarcha && u.velocidad > 70).slice(0, 5)
  return [
    ...rapidas.map((u, i) => ({
      id: uuid('alerta', `s-vel-${i}`), vehicleId: u.id, documentId: null, workOrderId: null, maintenanceActionId: null,
      userCredentialId: null, category: 'fleet', title: 'Exceso de velocidad',
      detail: `${u.code.toUpperCase()} va a ${u.velocidad + 12} km/h (límite 80)`,
      readAt: i > 2 ? hace(10) : null, dismissedAt: null, createdAt: hace(29 + i * 17),
    })),
    {
      id: uuid('alerta', 's-mnt-1'), vehicleId: UNIDAD_CARLOS.id, documentId: null, workOrderId: null, maintenanceActionId: null,
      userCredentialId: null, category: 'maintenance', title: `Cambio de aceite y filtro · ${UNIDAD_CARLOS.code.toUpperCase()}`,
      detail: 'Faltan 420 km para el servicio.', readAt: null, dismissedAt: null, createdAt: hace(140),
    },
  ]
}

// --- Mantenimiento programado ------------------------------------------------------
export const PLANES = [
  { clave: 'ace', code: 'ace-5000', serviceName: 'Cambio de aceite y filtro', description: 'Aceite 15W-40, filtro de aceite y de aire.', strategy: 'combined', intervalKm: 5000, intervalDays: 90, criticality: 'high' },
  { clave: 'fre', code: 'fre-20000', serviceName: 'Servicio de frenos', description: 'Pastillas, discos y líquido de frenos.', strategy: 'fixed', intervalKm: 20000, intervalDays: null, criticality: 'critical' },
  { clave: 'cau', code: 'cau-10000', serviceName: 'Rotación de cauchos', description: null, strategy: 'floating', intervalKm: 10000, intervalDays: null, criticality: 'medium' },
  { clave: 'sus', code: 'sus-30000', serviceName: 'Revisión de suspensión', description: null, strategy: 'combined', intervalKm: 30000, intervalDays: 180, criticality: 'medium' },
].map((p) => ({ ...p, id: uuid('plan', p.clave), enabled: true, archivedAt: null }))

export function coberturaDe(plan, u) {
  const r = azar(`cob-${plan.id}-${u.id}`)
  // Los frenos de la Unidad 01 se cambiaron hace 5 días (la orden resuelta de las capturas).
  const frenosCarlos = u.semillaId === 'veh-001' && plan.clave === 'fre'
  const recorrido = frenosCarlos ? 380 : Math.round(r() * plan.intervalKm * 1.02)
  const ultimo = u.km - recorrido
  const dias = frenosCarlos ? 5 : plan.intervalDays ? Math.round(r() * plan.intervalDays) : Math.round(20 + r() * 100)
  return {
    vehicleId: u.id,
    lastServiceOdometerKm: ultimo,
    nextDueOdometerKm: ultimo + plan.intervalKm,
    lastServiceAt: new Date(AHORA_SEMILLA - dias * DIA).toISOString(),
    nextDueAt: plan.intervalDays ? new Date(AHORA_SEMILLA + (plan.intervalDays - dias) * DIA).toISOString() : null,
    enabled: true,
  }
}

export const ACCIONES = (() => {
  const lista = []
  for (const plan of PLANES) {
    for (const u of UNIDADES) {
      const cob = coberturaDe(plan, u)
      const falta = cob.nextDueOdometerKm - u.km
      if (falta > plan.intervalKm * 0.12 && u.semillaId !== 'veh-001') continue
      if (u.semillaId === 'veh-001' && plan.clave !== 'ace') continue
      lista.push({
        id: uuid('accion', `${plan.clave}-${u.semillaId}`),
        vehicleId: u.id,
        planId: plan.id,
        workOrderId: null,
        kind: 'preventive',
        cycleOrdinal: Math.floor(u.km / plan.intervalKm),
        title: plan.serviceName,
        detail: plan.description,
        componentPosition: null,
        relevance: plan.criticality,
        status: 'pending',
        dueOdometerKm: u.semillaId === 'veh-001' ? u.km + 420 : cob.nextDueOdometerKm,
        dueAt: cob.nextDueAt,
        generatedBy: 'plan',
        costAmount: null,
        completedAt: null,
        createdAt: new Date(AHORA_SEMILLA - 3 * DIA).toISOString(),
      })
    }
  }
  return lista
})()

// --- Fotos de demostración (servidas como si fueran Cloudinary) ----------------------
// publicId → { archivo, titulo, etiqueta }. Solo fotos de vehículos con LICENCIA LIBRE
// (Marco: nada generado con IA ni sacado de las fotos de la web). Se registran solo si el
// archivo está en fotos/ (ver preparar_fotos.py); si falta, la orden sale sin fotos, que es
// mejor que con una mala.
export const FOTOS = new Map()
const DIR_FOTOS = join(AQUI, 'fotos')
// Las fotos de vehículos con licencia libre que prepara otro agente (créditos en
// comparativa/fotos-vehiculos/CREDITOS.md): <marca-modelo>-16x9.jpg y -4x3.jpg.
const RECORTES = join(RAIZ, 'comparativa', 'fotos-vehiculos', 'recortes')
/** Ruta completa de una foto de fotos/, o null si no está. */
const enFotos = (archivo) => (existsSync(join(DIR_FOTOS, archivo)) ? join(DIR_FOTOS, archivo) : null)
export function registrarFoto(publicId, archivo, titulo, etiqueta) {
  const ruta = archivo && (archivo.includes(':') || archivo.startsWith('/') ? (existsSync(archivo) ? archivo : null) : enFotos(archivo))
  if (!ruta) return
  FOTOS.set(publicId, { archivo: ruta, titulo, etiqueta })
}

const claveFoto = (t) =>
  String(t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
/**
 * La foto de un vehículo por marca y modelo («toyota-hilux»), o null. Primero la copia en
 * fotos/, después la carpeta de recortes. La 16:9 va primero: es la forma de la tarjeta de la
 * app (el render del catálogo mide 1024 × 559).
 */
export function fotoDeVehiculo(marca, modelo) {
  const base = `${claveFoto(marca)}-${claveFoto(modelo)}`
  for (const dir of [DIR_FOTOS, RECORTES]) {
    for (const sufijo of ['-16x9.jpg', '-16x9.png', '-4x3.jpg', '.png', '.jpg']) {
      const f = join(dir, base + sufijo)
      if (existsSync(f)) return f
    }
  }
  return null
}

// Fotos reales con licencia libre (comparativa/fotos-ordenes, créditos en su CREDITOS.md). Cada
// orden lleva solo la foto que cuadra con su falla, con un pie que dice lo que se ve; las que no
// tienen foto que les cuadre (motor, carrocería, freno de mano, luces de cruce…) van sin fotos.
const FOTO_DE_FALLA = {
  frenos: ['falla-2.jpg', 'Disco de freno delantero'],
  neumaticos: ['falla-1.jpg', 'Caucho gastado por el borde'],
}
for (const o of ORDENES) {
  const base = `fom/work-orders/${o.id}`
  const etiqueta = `fom_work_orders_${o.id}`
  let foto = FOTO_DE_FALLA[o.failureType]
  // El disco no dice nada del freno de mano.
  if (o.failureType === 'frenos' && /estacionamiento/i.test(o.description)) foto = null
  if (o.id === ORDEN_LUZ_ID) foto = ['luz-trasera.jpg', 'Luz trasera izquierda rota']
  if (!foto) continue
  registrarFoto(`${base}/work_order_opening/1`, foto[0], foto[1], etiqueta)
  // Cierre: la rueda montada otra vez (frenos y cauchos se cambian con la rueda quitada).
  if (o.status === 'cerrada' && FOTO_DE_FALLA[o.failureType]) registrarFoto(`${base}/work_order_closure/1`, 'taller.jpg', 'Rueda montada en el taller', etiqueta)
}
// Por si la app un día lee la foto propia de la unidad (hoy usa el render de su catálogo:
// capturar.mjs lo cambia por fotoDeVehiculo vía /__demo/foto-vehiculo).
for (const u of UNIDADES) registrarFoto(`fom/vehiculo/${u.id}/1`, fotoDeVehiculo(u.make, u.model), null, `fom_vehiculo_${u.id}`)
// T-188: DEMO_RECORTE=<ruta de un PNG con transparencia> guarda además el recorte sin fondo de la
// foto de la unidad de Carlos (`fom/vehiculo-sin-fondo/<id>/1`, el mismo n que la foto), como lo
// hace la web al subir una foto. Sin la variable, esa unidad solo tiene su foto con fondo.
if (process.env.DEMO_RECORTE) registrarFoto(`fom/vehiculo-sin-fondo/${UNIDAD_CARLOS.id}/1`, process.env.DEMO_RECORTE, null, `fom_vehiculo_sin_fondo_${UNIDAD_CARLOS.id}`)

export { s as semilla }
