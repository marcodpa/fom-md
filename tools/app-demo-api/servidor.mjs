// SERVIDOR FALSO de la API móvil de FOM, con datos de DEMOSTRACIÓN (T-147).
//
// Para sacar capturas de la app real (fom-driver-juan) sin tocar el servidor de verdad: los
// datos de clientes no pueden salir en la web pública. Responde las rutas de
// `/api/v1/mobile/*` con la forma que leen los servicios de la app, y además hace de
// «Cloudinary» para las fotos de la demo (ver capturar.mjs, que desvía ahí las peticiones).
//
//   node tools/app-demo-api/servidor.mjs            (puerto 8790; PUERTO=xxxx para otro)
//
// Entra cualquiera de las dos cuentas con cualquier clave:
//   conductor@fom.com.ve  → Carlos Méndez, conductor de la Unidad 01 (Z69FC7W)
//   supervisor@fom.com.ve → Yeison Márquez, supervisor de Transporte Lago Sur
//
// Modo de la inspección de HOY de la Unidad 01 (para las capturas):
//   GET /__demo/modo?inspeccion=pendiente|aprobada|observaciones|bloqueada
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

import * as D from './datos.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const PUERTO = Number(process.env.PUERTO ?? 8790)
const VERSION = '/api/v1/mobile'

// --- Estado de la demo ---------------------------------------------------------------
const sesiones = new Map() // token → { personaId, tipo }
const modo = { inspeccion: 'pendiente' }
const inspeccionesNuevas = [] // las que se envían desde la app mientras corre
const leidas = new Set()
const descartadas = new Set()

function inspeccionDeHoyCarlos() {
  const u = D.UNIDAD_CARLOS
  const carlos = D.personaPorSemilla['usr-002']
  const hoy = diaHoy()
  const base = {
    id: D.uuid('insp', 'insp-hoy-carlos'),
    kind: 'daily',
    inspectionDate: hoy,
    location: u.ubicacion,
    submittedAt: new Date(Date.now() - 38 * 60000).toISOString(),
    vehicleId: u.id,
    vehicleCode: u.code,
    vehiclePlate: u.plate,
    driverName: carlos.nombre,
    driverUserId: carlos.id,
    templateName: D.FORMATO_NOMBRE,
  }
  const luces = D.itemPorNombre('Luces delanteras y traseras')
  const cruces = D.itemPorNombre('Cruces y direccionales')
  const pedal = D.itemPorNombre('Pedal y respuesta de frenos')
  if (modo.inspeccion === 'aprobada') return { ...base, result: 'aprobada', fijos: {} }
  if (modo.inspeccion === 'observaciones')
    return { ...base, result: 'aprobada_con_observaciones', fijos: { [cruces.id]: 'observacion' }, notas: { [cruces.id]: 'La direccional derecha parpadea rápido.' } }
  if (modo.inspeccion === 'bloqueada')
    return {
      ...base,
      result: 'bloqueada',
      fijos: { [luces.id]: 'falla', [cruces.id]: 'observacion', [pedal.id]: 'falla' },
      notas: { [luces.id]: 'No enciende la luz trasera izquierda.', [cruces.id]: 'La direccional derecha parpadea rápido.', [pedal.id]: 'El pedal llega casi al piso.' },
    }
  return null
}

function todasLasInspecciones() {
  const hoyCarlos = inspeccionDeHoyCarlos()
  return [...inspeccionesNuevas, ...(hoyCarlos ? [hoyCarlos] : []), ...D.INSPECCIONES].sort(
    (a, b) => b.inspectionDate.localeCompare(a.inspectionDate) || (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''),
  )
}
const inspeccionFom = ({ observaciones, fallasCriticas, fijos, notas, ...i }) => i

function diaHoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// --- Respuestas -------------------------------------------------------------------------
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS,HEAD',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type,Accept,Cache-Control,Idempotency-Key,X-Step-Up-Token,X-Fom-Step-Up',
  'Access-Control-Max-Age': '600',
}
function json(res, estado, cuerpo) {
  res.writeHead(estado, { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(cuerpo))
}
const error = (res, estado, code, message) => json(res, estado, { statusCode: estado, code, message })
// Las rutas que la demo no publica contestan como nginx: HTML. La app lo trata como «no publicado».
function noPublicada(res) {
  res.writeHead(404, { ...CORS, 'Content-Type': 'text/html' })
  res.end('<html><body>404 Not Found</body></html>')
}

function lista(items, q, extra = {}) {
  const limit = Math.min(Number(q.get('limit') ?? 50) || 50, 500)
  const offset = Number(q.get('offset') ?? 0) || 0
  const pagina = items.slice(offset, offset + limit)
  return { items: pagina, page: { limit, offset, count: pagina.length, total: items.length }, ...extra }
}

function emitirSesion(persona) {
  const acceso = `demo-${randomUUID()}`
  const refresco = `demo-r-${randomUUID()}`
  sesiones.set(acceso, { personaId: persona.id, tipo: 'acceso' })
  sesiones.set(refresco, { personaId: persona.id, tipo: 'refresco' })
  return {
    accessToken: acceso,
    refreshToken: refresco,
    expiresAt: new Date(Date.now() + 12 * 3600000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    mustChangePassword: false,
  }
}

async function cuerpoDe(req) {
  const trozos = []
  for await (const t of req) trozos.push(t)
  const texto = Buffer.concat(trozos).toString('utf8')
  try {
    return texto ? JSON.parse(texto) : {}
  } catch {
    return {}
  }
}

// --- «Cloudinary» de la demo --------------------------------------------------------------
function cloudinary(req, res, ruta) {
  // /__cloudinary/image/list/<etiqueta>.json
  const lista = ruta.match(/^\/__cloudinary\/image\/list\/(.+)\.json$/)
  if (lista) {
    const etiqueta = decodeURIComponent(lista[1])
    const resources = [...D.FOTOS]
      .filter(([, f]) => f.etiqueta === etiqueta)
      .map(([publicId, f], i) => ({
        public_id: publicId,
        version: 1,
        format: f.archivo.endsWith('.png') ? 'png' : 'jpg',
        created_at: new Date(Date.now() - (100 - i) * 60000).toISOString(),
        ...(f.titulo ? { context: { custom: { caption: f.titulo } } } : {}),
      }))
    return json(res, 200, { resources })
  }
  // /__cloudinary/image/upload/[transformación/][v123/]<publicId>[.ext]
  const m = ruta.match(/^\/__cloudinary\/image\/upload\/(.+)$/)
  if (!m) return noPublicada(res)
  const partes = decodeURIComponent(m[1]).split('/')
  while (partes.length && (/^[a-z]{1,2}_/.test(partes[0]) && partes[0].includes(',') || /^[a-z]_[a-z0-9]+$/.test(partes[0]) || /^v\d+$/.test(partes[0]))) partes.shift()
  const publicId = partes.join('/').replace(/\.(jpg|jpeg|png|webp|pdf)$/i, '')
  const foto = D.FOTOS.get(publicId)
  if (!foto) {
    res.writeHead(404, CORS)
    return res.end()
  }
  const archivo = foto.archivo
  const tipo = archivo.endsWith('.png') ? 'image/png' : 'image/jpeg'
  res.writeHead(200, { ...CORS, 'Content-Type': tipo, 'Cache-Control': 'no-store' })
  if (req.method === 'HEAD') return res.end()
  res.end(readFileSync(archivo))
}

// --- Traductores --------------------------------------------------------------------------
const ordenFom = ({ asignadaA, asignadaEn, ...o }) => o
const conductoresDe = () =>
  D.UNIDADES.filter((u) => u.conductorId).map((u) => ({
    userId: u.conductorId,
    displayName: u.conductorNombre,
    role: 'principal',
    vehicleId: u.id,
    assignmentId: D.uuid('asignacion', u.semillaId),
    validFrom: new Date(D.AHORA_SEMILLA - 220 * 86400000).toISOString(),
  }))

function filaDirectorio(p) {
  const u = D.UNIDADES.find((x) => x.conductorId === p.id)
  const docs = D.DOCUMENTOS.filter((d) => d.holderUserId === p.id).sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))
  return {
    userId: p.id,
    displayName: p.nombre,
    email: p.email,
    role: p.rolFom,
    status: 'active',
    nationalId: p.cedula,
    identification: null,
    phone: p.telefono,
    vehicleId: u?.id ?? null,
    vehicleCode: u?.code ?? null,
    vehiclePlate: u?.plate ?? null,
    assignmentRole: u ? 'principal' : null,
    nextDocumentType: docs[0]?.documentType ?? null,
    nextDocumentExpiresOn: docs[0]?.expiresOn ?? null,
  }
}

function resumen() {
  const ordenes = D.ORDENES
  const agrupado = (s) => (['cerrada', 'cancelada'].includes(s) ? 'cerrada' : s === 'abierta' ? 'abierta' : 'en_revision')
  const hoy = diaHoy()
  const hechasHoy = new Set(todasLasInspecciones().filter((i) => i.inspectionDate === hoy).map((i) => i.vehicleId))
  const venc = (d) => Math.round((Date.parse(`${d.expiresOn}T12:00:00`) - Date.now()) / 86400000)
  return {
    odtAbiertas: ordenes.filter((o) => agrupado(o.status) === 'abierta').length,
    odtEnRevision: ordenes.filter((o) => agrupado(o.status) === 'en_revision').length,
    odtCerradas: ordenes.filter((o) => agrupado(o.status) === 'cerrada').length,
    inspeccionesHoy: hechasHoy.size,
    inspeccionesPendientes: D.UNIDADES.length - hechasHoy.size,
    docsVencidos: D.DOCUMENTOS.filter((d) => venc(d) < 0).length,
    docsPorVencer: D.DOCUMENTOS.filter((d) => venc(d) >= 0 && venc(d) <= 30).length,
    alertasSinLeer: D.AVISOS.filter((a) => !a.readAt && !leidas.has(a.id)).length,
  }
}

// --- Rutas ----------------------------------------------------------------------------------
async function atender(req, res, url) {
  const q = url.searchParams
  let ruta = url.pathname.slice(VERSION.length) || '/'
  const metodo = req.method

  // Autenticación sin sesión
  if (ruta === '/auth/login' && metodo === 'POST') {
    const { email } = await cuerpoDe(req)
    const semillaId = D.CUENTAS[String(email ?? '').trim().toLowerCase()]
    if (!semillaId) return error(res, 401, 'invalid_credentials', 'Invalid credentials')
    return json(res, 200, emitirSesion(D.personaPorSemilla[semillaId]))
  }
  if (ruta === '/auth/refresh' && metodo === 'POST') {
    const { refreshToken } = await cuerpoDe(req)
    const s = sesiones.get(refreshToken)
    if (!s || s.tipo !== 'refresco') return error(res, 401, 'invalid_refresh_token', 'Invalid refresh token')
    sesiones.delete(refreshToken)
    return json(res, 200, emitirSesion(D.personaPorId[s.personaId]))
  }
  if (ruta.startsWith('/auth/password-recovery')) return json(res, 200, {})

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  const sesion = sesiones.get(token)
  if (!sesion || sesion.tipo !== 'acceso') return error(res, 401, 'invalid_access_token', 'Invalid access token')
  const yo = D.personaPorId[sesion.personaId]
  const esConductor = yo.rolFom === 'conductor'
  const miUnidad = D.UNIDADES.find((u) => u.conductorId === yo.id) ?? null
  const soloGestor = () => (esConductor ? error(res, 403, 'forbidden', 'Insufficient role') : null)

  // Las rutas «de otro ente» con el ente propio son las mismas que las de la sesión.
  const deEnte = ruta.match(/^\/tenants\/([^/]+)(\/.*)$/)
  if (deEnte && deEnte[1] === D.ENTE_ID && !/^\/(relationships|driver-metrics|vehicles$)/.test(deEnte[2])) ruta = deEnte[2]
  else if (deEnte && deEnte[1] !== D.ENTE_ID) {
    if (deEnte[2] === '/relationships') return json(res, 200, lista([], q))
    return error(res, 404, 'not_found', 'Tenant not found')
  }

  if (ruta === '/auth/logout') {
    sesiones.delete(token)
    return json(res, 200, {})
  }
  if (ruta === '/auth/me') {
    return json(res, 200, {
      user: { id: yo.id, email: yo.email, displayName: yo.nombre },
      tenant: { id: D.ENTE_ID, name: 'Transporte Lago Sur, C.A.', role: yo.rolFom },
      session: { id: D.uuid('sesion', `web-${yo.semillaId}`), deviceName: 'Demo', platform: 'web', appVersion: '1.0.0' },
    })
  }
  if (ruta === '/auth/step-up') return json(res, 200, { stepUpToken: `demo-${randomUUID()}`, expiresAt: new Date(Date.now() + 300000).toISOString() })

  // Entes y áreas
  if (ruta === '/tenants') return json(res, 200, lista(esConductor ? D.ENTES.filter((e) => e.id === D.ENTE_ID) : D.ENTES, q))
  if (deEnte && deEnte[2] === '/relationships') {
    const compania = D.ENTES.find((e) => e.category === 'compania')
    return json(res, 200, lista([{ id: D.uuid('asignacion', 'rel-1'), companyTenantId: compania.id, contractorTenantId: D.ENTE_ID, endedAt: null }], q))
  }
  if (ruta === '/areas') return json(res, 200, lista(D.AREAS, q))

  // Perfil propio
  if (ruta === '/profile' && metodo === 'GET') {
    return json(res, 200, {
      profile: { nationalId: yo.cedula, identification: null, phone: yo.telefono, address: yo.direccion, birthDate: yo.nacimiento, profileComplete: true },
    })
  }
  if (ruta === '/profile/credentials' && metodo === 'GET') {
    const items = []
    if (yo.licenciaNumero) items.push({ id: D.uuid('credencial', `lic-${yo.semillaId}`), kind: 'driver_license', number: yo.licenciaNumero, category: yo.licenciaCategoria, expiresAt: `${yo.licenciaVence}T00:00:00.000Z`, current: true })
    if (yo.cartaMedicaVence) items.push({ id: D.uuid('credencial', `med-${yo.semillaId}`), kind: 'medical_certificate', number: null, category: null, expiresAt: `${yo.cartaMedicaVence}T00:00:00.000Z`, current: true })
    return json(res, 200, { items })
  }
  if (ruta === '/profile/documents' && metodo === 'GET') {
    const ced = D.DOCUMENTOS.find((d) => d.holderUserId === yo.id && d.documentType === 'cedula_identidad')
    return json(res, 200, lista(ced ? [{ id: ced.id, documentType: ced.documentType, expiresOn: ced.expiresOn, status: 'active' }] : [], q))
  }

  // Gente
  if (ruta === '/directory') return soloGestor() ?? json(res, 200, lista(D.PERSONAS.map(filaDirectorio), q))
  if (ruta === '/users') return soloGestor() ?? json(res, 200, lista(D.PERSONAS.map(filaDirectorio), q))
  if (ruta === '/drivers/me') {
    return json(res, 200, lista(miUnidad ? [{ assignmentId: D.uuid('asignacion', miUnidad.semillaId), role: 'principal', vehicleId: miUnidad.id, vehicleCode: miUnidad.code, vehiclePlate: miUnidad.plate }] : [], q))
  }
  if (ruta === '/drivers') {
    if (esConductor) return error(res, 403, 'forbidden', 'Insufficient role')
    const v = q.get('vehicleId')
    return json(res, 200, lista(conductoresDe().filter((a) => !v || a.vehicleId === v), q))
  }
  const eventos = ruta.match(/^\/drivers\/([^/]+)\/driving-events$/)
  if (eventos) {
    const p = D.personaPorId[eventos[1]]
    if (!p) return error(res, 404, 'not_found', 'Driver not found')
    if (esConductor && p.id !== yo.id) return error(res, 403, 'forbidden', 'Insufficient role')
    const dias = Number(q.get('days') ?? 7)
    return json(res, 200, { items: D.eventosDe(p, dias).slice(0, Number(q.get('limit') ?? 100)) })
  }
  if (ruta === '/driver-sessions/current') {
    return json(res, 200, { session: miUnidad ? { id: D.uuid('sesion', `cond-${yo.semillaId}`), vehicleId: miUnidad.id, assignmentRole: 'principal', status: 'active' } : null })
  }

  // Índice de manejo
  if (ruta === '/driver-metrics/me') {
    return json(res, 200, { metric: D.metricaConductor(yo, q.get('from'), q.get('to')) })
  }
  if (deEnte && deEnte[2] === '/driver-metrics') {
    if (esConductor) return error(res, 403, 'forbidden', 'Insufficient role')
    const uid = q.get('userId')
    const filas = D.PERSONAS.filter((p) => p.rolFom === 'conductor' && (!uid || p.id === uid)).map((p) => D.metricaConductor(p, q.get('from'), q.get('to')))
    return json(res, 200, lista(filas, q))
  }

  // Unidades
  if (ruta === '/vehicles' && metodo === 'GET') {
    const propias = esConductor ? (miUnidad ? [miUnidad] : []) : D.UNIDADES
    return json(res, 200, { vehicles: propias.map(D.vehiculoFom), page: { total: propias.length } })
  }
  if (deEnte && deEnte[2] === '/vehicles' && metodo === 'GET') {
    if (esConductor) return error(res, 403, 'forbidden', 'Insufficient role')
    return json(res, 200, {
      vehicles: D.UNIDADES.map((u) => ({ ...D.vehiculoFom(u), latestPosition: D.posicionDe(u) })),
      page: { total: D.UNIDADES.length },
    })
  }
  const unidad = ruta.match(/^\/vehicles\/([^/]+)(\/.*)?$/)
  if (unidad) {
    const u = D.unidadPorId[unidad[1]]
    if (!u) return error(res, 404, 'not_found', 'Vehicle not found')
    const resto = unidad[2] ?? ''
    if (resto === '' && metodo === 'GET') return json(res, 200, D.vehiculoFom(u))
    if (resto === '/position/latest') return json(res, 200, { position: D.posicionDe(u) })
    if (resto === '/positions') {
      const desde = q.get('from')
      const hasta = q.get('to')
      const filas = D.recorridoDe(u).filter((p) => (!desde || p.eventTime >= desde) && (!hasta || p.eventTime <= hasta))
      return json(res, 200, { positions: filas.slice(0, Number(q.get('limit') ?? 5000)) })
    }
    if (resto === '/odometer') return json(res, 200, lista([{ odometerKm: u.km, recordedAt: D.alDia(u.ultimoReporte), source: 'gps' }], q))
    if (resto === '/daily-metrics') {
      const filas = D.diasEntre(q.get('from'), q.get('to')).map((f) => D.metricaDelDia(u, f)).filter(Boolean)
      return json(res, 200, lista(filas, q))
    }
    if (resto === '/inspection-templates') return json(res, 200, { items: [D.formatoPara(u)] })
    if (resto === '/inspections' && metodo === 'POST') return enviarInspeccion(req, res, u, yo)
    if (resto === '/work-orders' && metodo === 'POST') {
      const b = await cuerpoDe(req)
      const nueva = {
        id: D.uuid('odt', `odt-${800 + D.ORDENES.length}`), status: 'abierta', kind: 'correctiva', description: b.description ?? '',
        severity: b.severity ?? 'media', failureType: b.failureType ?? null, location: b.location ?? u.ubicacion, resolutionNote: null,
        resolutionCost: null, resolvedAt: null, createdAt: new Date().toISOString(), vehicleId: u.id, vehicleCode: u.code,
        vehiclePlate: u.plate, createdByName: yo.nombre, maintenanceActionId: null, asignadaA: null, asignadaEn: null,
      }
      D.ORDENES.unshift(nueva)
      return json(res, 201, { workOrderId: nueva.id })
    }
    if (resto === '/driver-sessions' && metodo === 'POST') return json(res, 201, { sessionId: D.uuid('sesion', `cond-${yo.semillaId}`) })
    if (metodo !== 'GET') return json(res, 200, {})
    return noPublicada(res)
  }

  // Órdenes de trabajo
  if (ruta === '/work-orders/assigned') {
    const mias = D.ORDENES.filter((o) => o.asignadaA === yo.id).map((o) => ({ ...ordenFom(o), assignedAt: o.asignadaEn }))
    return json(res, 200, lista(mias, q))
  }
  if (ruta === '/work-orders' && metodo === 'GET') {
    const v = q.get('vehicleId')
    const st = q.get('status')
    let filas = D.ORDENES.filter((o) => (!v || o.vehicleId === v) && (!st || o.status === st))
    if (esConductor) filas = filas.filter((o) => o.vehicleId === miUnidad?.id)
    return json(res, 200, lista(filas.map(ordenFom), q))
  }
  if (ruta === '/work-orders' && metodo === 'POST') {
    const b = await cuerpoDe(req)
    const u = D.unidadPorId[b.vehicleId] ?? D.UNIDAD_CARLOS
    const nueva = {
      id: D.uuid('odt', `odt-${800 + D.ORDENES.length}`), status: 'abierta', kind: b.kind ?? 'correctiva', description: b.description ?? '',
      severity: b.severity ?? 'media', failureType: b.failureType ?? null, location: b.location ?? u.ubicacion, resolutionNote: null,
      resolutionCost: null, resolvedAt: null, createdAt: new Date().toISOString(), vehicleId: u.id, vehicleCode: u.code,
      vehiclePlate: u.plate, createdByName: yo.nombre, maintenanceActionId: b.maintenanceActionId ?? null, asignadaA: null, asignadaEn: null,
    }
    D.ORDENES.unshift(nueva)
    return json(res, 201, { workOrderId: nueva.id, workOrder: ordenFom(nueva) })
  }
  const orden = ruta.match(/^\/work-orders\/([^/]+)(\/.*)?$/)
  if (orden) {
    const o = D.ORDENES.find((x) => x.id === orden[1])
    if (!o) return error(res, 404, 'not_found', 'Work order not found')
    const resto = orden[2] ?? ''
    if (resto === '') return json(res, 200, { workOrder: ordenFom(o), events: D.eventosDeOrden(o) })
    if (resto === '/execution') {
      const p = o.asignadaA ? D.personaPorId[o.asignadaA] : null
      return json(res, 200, {
        workOrder: { id: o.id, status: o.status, vehicleId: o.vehicleId, vehicleCode: o.vehicleCode },
        assignments: p ? [{ userId: p.id, displayName: p.nombre, assignedAt: o.asignadaEn, endedAt: null }] : [],
        events: [],
        totals: { productiveSeconds: 0, pausedSeconds: 0 },
      })
    }
    if (resto === '/status' && metodo === 'POST') {
      const b = await cuerpoDe(req)
      if (b.toStatus || b.status) o.status = b.toStatus ?? b.status
      return json(res, 200, { workOrder: ordenFom(o) })
    }
    if (metodo !== 'GET') return json(res, 200, {})
    return noPublicada(res)
  }

  // Inspecciones
  if (ruta === '/inspections') {
    const v = q.get('vehicleId')
    let filas = todasLasInspecciones().filter((i) => !v || i.vehicleId === v)
    if (esConductor) filas = filas.filter((i) => i.vehicleId === miUnidad?.id)
    return json(res, 200, lista(filas.map(inspeccionFom), q))
  }
  const insp = ruta.match(/^\/inspections\/([^/]+)$/)
  if (insp) {
    const i = todasLasInspecciones().find((x) => x.id === insp[1])
    if (!i) return error(res, 404, 'not_found', 'Inspection not found')
    return json(res, 200, { inspection: inspeccionFom(i), findings: i.hallazgos ?? D.hallazgosDe(i) })
  }

  // Documentos
  if (ruta === '/documents' && metodo === 'GET') {
    const v = q.get('vehicleId')
    let filas = D.DOCUMENTOS.filter((d) => !v || d.vehicleId === v)
    if (esConductor) filas = filas.filter((d) => d.vehicleId === miUnidad?.id || d.holderUserId === yo.id)
    return json(res, 200, lista(filas, q))
  }

  // Avisos, alertas, emergencias
  if (ruta === '/summary') return json(res, 200, resumen())
  if (ruta === '/notifications') {
    if (esConductor) return json(res, 200, lista([], q))
    const solo = q.get('unreadOnly') === 'true'
    const filas = D.AVISOS.filter((a) => !descartadas.has(a.id))
      .map((a) => ({ ...a, readAt: a.readAt ?? (leidas.has(a.id) ? new Date().toISOString() : null) }))
      .filter((a) => !solo || !a.readAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return json(res, 200, lista(filas, q))
  }
  const aviso = ruta.match(/^\/(notifications|alerts)\/([^/]+)\/(read|dismiss)$/)
  if (aviso) {
    ;(aviso[3] === 'read' ? leidas : descartadas).add(aviso[2])
    return json(res, 200, {})
  }
  if (ruta === '/alerts') {
    const filas = D.alertasPara(yo)
      .filter((a) => !descartadas.has(a.id))
      .map((a) => (leidas.has(a.id) && !a.readAt ? { ...a, readAt: new Date().toISOString() } : a))
    return json(res, 200, lista(filas, q))
  }
  if (ruta === '/alert-rules') return json(res, 200, lista([], q))
  if (ruta === '/emergencies' && metodo === 'GET') return json(res, 200, lista([], q))
  if (ruta === '/notices' && metodo === 'POST') return json(res, 201, { noticeId: randomUUID() })

  // Mantenimiento programado
  if (ruta === '/maintenance/plans') return json(res, 200, lista(D.PLANES.map(({ clave, ...p }) => p), q))
  const plan = ruta.match(/^\/maintenance\/plans\/([^/]+)$/)
  if (plan && metodo === 'GET') {
    const p = D.PLANES.find((x) => x.id === plan[1])
    if (!p) return error(res, 404, 'not_found', 'Plan not found')
    const { clave, ...fila } = p
    return json(res, 200, { ...fila, vehicles: D.UNIDADES.map((u) => D.coberturaDe(p, u)) })
  }
  if (ruta === '/maintenance/actions') {
    const v = q.get('vehicleId')
    let filas = D.ACCIONES.filter((a) => !v || a.vehicleId === v)
    if (esConductor) filas = filas.filter((a) => a.vehicleId === miUnidad?.id)
    return json(res, 200, lista(filas, q))
  }
  const accion = ruta.match(/^\/maintenance\/actions\/([^/]+)$/)
  if (accion && metodo === 'GET') {
    const a = D.ACCIONES.find((x) => x.id === accion[1])
    return a ? json(res, 200, { action: a }) : error(res, 404, 'not_found', 'Action not found')
  }

  // GPS
  if (ruta === '/gps-devices') {
    if (esConductor) return error(res, 403, 'forbidden', 'Insufficient role')
    return json(res, 200, {
      devices: D.UNIDADES.map((u) => ({
        id: D.uuid('gps', u.semillaId), imei: u.gps.imei, simPhone: u.gps.linea.replace(/\s+/g, ''), iccid: `8958${u.gps.imei.slice(0, 15)}`,
        carrier: 'Movistar', apn: 'internet.movistar.ve', manufacturer: u.gps.modelo.split(' ')[0], model: u.gps.modelo.split(' ').slice(1).join(' '),
        protocolFamily: 'teltonika', transport: 'tcp', status: 'installed', storageLocation: null,
        lastConnectionAt: D.alDia(u.ultimoReporte), connected: true, vehicleId: u.id, vehicleCode: u.code, vehiclePlate: u.plate,
      })),
    })
  }
  if (ruta === '/gps-devices/unpaired') return json(res, 200, { devices: [] })

  // Cualquier otra escritura: se acepta sin hacer nada (la demo no guarda).
  if (metodo !== 'GET') return json(res, 200, {})
  return noPublicada(res)
}

async function enviarInspeccion(req, res, u, yo) {
  const b = await cuerpoDe(req)
  const items = new Map(D.formatoPara(u).items.map((it) => [it.id, it]))
  const respuestas = Array.isArray(b.answers) ? b.answers : []
  const fallaCritica = respuestas.some((r) => r.itemState === 'falla' && items.get(r.templateItemId)?.isCritical)
  const conAlgo = respuestas.some((r) => r.itemState !== 'conforme')
  const result = fallaCritica ? 'bloqueada' : conAlgo ? 'aprobada_con_observaciones' : 'aprobada'
  const id = randomUUID()
  inspeccionesNuevas.unshift({
    id, kind: 'daily', result, inspectionDate: diaHoy(), location: b.location ?? u.ubicacion, submittedAt: new Date().toISOString(),
    vehicleId: u.id, vehicleCode: u.code, vehiclePlate: u.plate, driverName: yo.nombre, driverUserId: yo.id, templateName: D.FORMATO_NOMBRE,
    hallazgos: respuestas.map((r, n) => {
      const it = items.get(r.templateItemId)
      return { id: randomUUID(), templateItemId: r.templateItemId, category: it?.category ?? '', name: it?.name ?? '', displayOrder: it?.displayOrder ?? n, itemState: r.itemState, isCritical: !!it?.isCritical, note: r.note ?? null }
    }),
  })
  return json(res, 201, { inspectionId: id, result, workOrderIds: [] })
}

// --- Servidor ----------------------------------------------------------------------------
const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`)
  const inicio = Date.now()
  res.on('finish', () => {
    if (process.env.SILENCIO !== '1') console.log(`${req.method} ${url.pathname}${url.search} → ${res.statusCode} (${Date.now() - inicio} ms)`)
  })
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS)
      return res.end()
    }
    if (url.pathname === '/__demo/modo') {
      if (url.searchParams.get('inspeccion')) modo.inspeccion = url.searchParams.get('inspeccion')
      return json(res, 200, modo)
    }
    // La foto de un vehículo por marca y modelo (capturar.mjs la pone en lugar del render
    // del catálogo de la app). 404 si todavía no hay foto con licencia para él.
    if (url.pathname === '/__demo/foto-vehiculo') {
      const f = D.fotoDeVehiculo(url.searchParams.get('marca'), url.searchParams.get('modelo'))
      if (!f) return noPublicada(res)
      res.writeHead(200, { ...CORS, 'Content-Type': f.endsWith('.png') ? 'image/png' : 'image/jpeg', 'Cache-Control': 'no-store' })
      return res.end(readFileSync(f))
    }
    if (url.pathname.startsWith('/__cloudinary/')) return cloudinary(req, res, url.pathname)
    if (!url.pathname.startsWith(VERSION)) return noPublicada(res)
    await atender(req, res, url)
  } catch (e) {
    console.error(e)
    if (!res.headersSent) error(res, 500, 'demo_error', String(e?.message ?? e))
  }
})
servidor.listen(PUERTO, () => {
  console.log(`Servidor falso de FOM (demo) en http://localhost:${PUERTO}  ·  PID ${process.pid}`)
  console.log('Cuentas: conductor@fom.com.ve · supervisor@fom.com.ve (cualquier clave)')
})
