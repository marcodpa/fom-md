// ============================================================
// ODT ASIGNADAS A LA PERSONA DE LA SESIÓN («Asignadas a ti»)
// ------------------------------------------------------------
// Lo mismo que hace la app en el taller: quien es responsable de una orden
// la inicia, la pausa, la reanuda y la entrega. Las rutas son las de la
// consola en fom-core (console-work-order-execution.controller.ts):
//   GET  /work-orders/:id/execution        responsable, eventos y tiempos
//   POST /work-orders/:id/execution-events inicio | pausa | reanudacion | entrega
//
// La consola NO tiene una lista de «mis ODT asignadas» (la app sí:
// GET /mobile/work-orders/assigned) y el listado de work-orders no trae el
// responsable ni admite filtrar por él. Por eso se parte de las órdenes que
// ya se listan, se miran solo las que están en taller y se pregunta por la
// ejecución de cada una:
//   · Quien no es supervisor solo recibe la ejecución de las órdenes que
//     tiene asignadas (el servidor responde 404 a las demás): si contesta,
//     es suya.
//   · Al supervisor el servidor le enseña todas: se compara el responsable
//     con su identificador (resuelto por su correo en la lista de gente,
//     como el detalle de la orden) o, si esa lista no está, con su nombre.
// Pedido para Juan: una ruta de consola igual a la de la app
// (GET /console/work-orders/assigned), o el responsable en el listado. Un
// conductor solo lista las órdenes de SU unidad: si le asignan una de otra
// unidad, la web no tiene cómo verla hasta que exista esa ruta.
//
// Sin API (modo demo) se usan órdenes de ejemplo guardadas aquí mismo.
// ============================================================
import { HAY_API, api, claveIdempotente } from './api'
import { esGestor, rolCanonico } from '../roles'
import { VEHICULOS } from './semilla'

/** Estados en los que la orden está en manos de su responsable. */
export const ESTADOS_DE_TALLER = ['asignada', 'en_ejecucion', 'pausada', 'en_calidad']

/** En qué va el trabajo, dicho para el responsable (además de los 3 estados visibles). Mismos textos que la app. */
export const MOMENTOS = {
  asignada: { t: 'Sin iniciar', ayuda: 'Te la asignaron. Inicia el trabajo cuando empieces.' },
  en_ejecucion: { t: 'Trabajo en curso', ayuda: 'El reloj está corriendo. Pausa si te detienes o entrega al terminar.' },
  pausada: { t: 'Trabajo pausado', ayuda: 'El trabajo está detenido. Reanúdalo cuando sigas.' },
  en_calidad: { t: 'Entregada: la revisa el supervisor', ayuda: 'Ya no tienes nada pendiente en esta orden.' },
}

// Los botones de cada momento, con los mismos textos que la app. Pausar y
// entregar piden nota: el servidor la exige (3 a 1000 letras) y no se rellena
// sola, porque el motivo de la pausa o lo que se hizo solo lo sabe quien trabaja.
const ACCIONES = {
  asignada: [{ accion: 'inicio', t: 'Iniciar trabajo' }],
  en_ejecucion: [
    { accion: 'entrega', t: 'Entregar', pideNota: 'Qué se hizo' },
    { accion: 'pausa', t: 'Pausar', sutil: true, pideNota: 'Motivo de la pausa' },
  ],
  pausada: [{ accion: 'reanudacion', t: 'Reanudar' }],
  en_calidad: [],
}
/** Las acciones que no salen sin su nota escrita. */
const CON_NOTA = { pausa: 'Escribe el motivo de la pausa', entrega: 'Cuenta qué se hizo antes de entregar' }
const SIGUIENTE = { inicio: 'en_ejecucion', pausa: 'pausada', reanudacion: 'en_ejecucion', entrega: 'en_calidad' }
const DESDE = { inicio: 'asignada', pausa: 'en_ejecucion', reanudacion: 'pausada', entrega: 'en_ejecucion' }

export function accionesDe(estado) {
  return ACCIONES[estado] ?? []
}

/** Cuándo se reportó una orden, en milisegundos; sin fecha válida, null. */
function reportadaEn(o) {
  const t = Date.parse(o?.creadaEn ?? '')
  return Number.isFinite(t) ? t : null
}

/**
 * Las órdenes de la MÁS NUEVA a la más vieja, por cuándo se reportaron: el
 * mismo orden en todas las listas de Mantenimiento (supervisor, conductor y
 * «Asignadas a ti»), igual que la app. Las que no traen fecha van al final y,
 * entre iguales, se respeta el orden en que llegaron. Devuelve una copia.
 */
export function masNuevasPrimero(odts) {
  return [...(odts ?? [])].sort((a, b) => {
    const ta = reportadaEn(a)
    const tb = reportadaEn(b)
    if (ta === tb) return 0
    if (ta === null) return 1
    if (tb === null) return -1
    return tb - ta
  })
}

/**
 * Segundos de trabajo efectivo: de cada inicio o reanudación hasta el evento
 * siguiente (o hasta `hasta` si sigue corriendo). La misma cuenta que el
 * servidor (`totals.productiveSeconds`).
 */
export function segundosTrabajados(eventos, hasta = new Date()) {
  const lista = [...(eventos ?? [])].sort((a, b) => new Date(a.en) - new Date(b.en))
  let total = 0
  for (let i = 0; i < lista.length; i += 1) {
    if (!['inicio', 'reanudacion'].includes(lista[i].tipo)) continue
    const fin = lista[i + 1]?.en ?? hasta
    total += Math.max(0, (new Date(fin).getTime() - new Date(lista[i].en).getTime()) / 1000)
  }
  return total
}

/** «Tiempo trabajado» en palabras: «Sin empezar», «12 min», «1 h 20 min». */
export function textoTiempo(segundos) {
  if (!Number.isFinite(segundos) || segundos <= 0) return 'Sin empezar'
  const m = Math.round(segundos / 60)
  if (m < 1) return 'Menos de 1 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h} h` : `${h} h ${r} min`
}

const normal = (t) => String(t ?? '').trim().toLowerCase()

/**
 * ¿El responsable vigente es la persona de la sesión? Con su identificador se
 * compara exacto. Si no es supervisor, que el servidor haya contestado ya lo
 * prueba. Solo al supervisor sin identificador se le compara por nombre.
 */
export function esMia(responsable, { yoId = null, perfil = null } = {}) {
  if (!responsable) return false
  if (yoId) return responsable.id === yoId
  if (!esGestor(perfil)) return true
  return Boolean(perfil?.nombre) && normal(responsable.nombre) === normal(perfil.nombre)
}

/** La ejecución del servidor, en los nombres del panel. */
export function presentarEjecucion(r) {
  const vigente = (r?.assignments ?? []).find((a) => !a.endedAt && (a.assignmentRole ?? 'responsable') === 'responsable')
    ?? (r?.assignments ?? []).find((a) => !a.endedAt) ?? null
  return {
    estado: r?.workOrder?.status ?? null,
    responsable: vigente ? { id: vigente.userId, nombre: vigente.displayName, desde: vigente.assignedAt } : null,
    eventos: (r?.events ?? []).map((e) => ({ tipo: e.eventKind, en: e.occurredAt, nota: e.note ?? '' })),
    segundos: Number(r?.totals?.productiveSeconds) || 0,
  }
}

/** Una tarjeta de «Asignadas a ti»: lo de la lista más lo de la ejecución. */
function armar(odt, ejecucion, medidoEn = Date.now()) {
  return {
    id: odt.id,
    estado: ejecucion.estado ?? odt.estado,
    vehiculoId: odt.vehiculoId ?? null,
    vehiculoNombre: odt.vehiculoNombre ?? '—',
    titulo: odt.descripcion ?? '',
    tipoFalla: odt.tipoFalla ?? null,
    prioridad: odt.prioridad ?? null,
    // Para ordenarlas de la más nueva a la más vieja, como el resto del módulo.
    creadaEn: odt.creadaEn ?? null,
    responsable: ejecucion.responsable,
    segundos: ejecucion.segundos,
    // Para que «Tiempo trabajado» siga contando en pantalla mientras corre.
    medidoEn,
  }
}

// Respuestas que quieren decir «esto no es para ti» o «no hay esa ruta»: la sección no aparece.
const NO_ES_PARA_TI = [403, 404, 501]

async function miIdentificador(perfil) {
  if (!perfil?.correo) return null
  try {
    const r = await api.usuarios({ limite: 200 })
    const yo = (r?.items ?? []).find((u) => normal(u.email) === normal(perfil.correo))
    return yo?.userId ?? null
  } catch {
    return null
  }
}

/** De a pocas a la vez: un supervisor puede tener muchas órdenes en taller. */
async function enTandas(lista, tam, fn) {
  const salida = []
  for (let i = 0; i < lista.length; i += tam) {
    salida.push(...(await Promise.allSettled(lista.slice(i, i + tam).map(fn))))
  }
  return salida
}

/**
 * Las ODT que la persona de la sesión tiene a su cargo, de las que ya se
 * listan. Devuelve `null` si el servidor no le deja ver la ejecución (403 o
 * ruta ausente): entonces la sección no se muestra.
 */
export async function listarAsignadas({ odts = [], perfil = null } = {}) {
  if (!HAY_API) return demo.listar(perfil)
  const candidatas = odts.filter((o) => ESTADOS_DE_TALLER.includes(o.estado))
  if (candidatas.length === 0) return []
  const yoId = esGestor(perfil) ? await miIdentificador(perfil) : null
  const medidoEn = Date.now()
  const respuestas = await enTandas(candidatas, 6, (o) => api.ejecucionOdt(o.id))
  const mias = []
  const fallos = []
  respuestas.forEach((r, i) => {
    if (r.status === 'rejected') {
      fallos.push(r.reason)
      return
    }
    const ejecucion = presentarEjecucion(r.value)
    if (esMia(ejecucion.responsable, { yoId, perfil }) && ESTADOS_DE_TALLER.includes(ejecucion.estado ?? candidatas[i].estado)) {
      mias.push(armar(candidatas[i], ejecucion, medidoEn))
    }
  })
  if (mias.length) return masNuevasPrimero(mias)
  const otro = fallos.find((e) => !NO_ES_PARA_TI.includes(e?.estado))
  if (otro) throw otro
  return fallos.some((e) => e?.estado === 403 || e?.estado === 501) ? null : []
}

/**
 * Inicio, pausa, reanudación o entrega. Viaja con el estado que se vio para
 * no pisar a nadie y con una clave propia por si la petición se repite.
 */
export async function registrarEvento(item, accion, nota = '') {
  const texto = String(nota ?? '').trim()
  if (CON_NOTA[accion] && texto.length < 3) throw new Error(`${CON_NOTA[accion]} (al menos 3 letras).`)
  // Iniciar y reanudar no piden nota: si no la hay, no viaja.
  const final = texto.length >= 3 ? texto : undefined
  if (!HAY_API) return demo.evento(item.id, accion, final ?? '')
  const r = await api.ejecutarOdt(item.id, {
    clientEventId: claveIdempotente(),
    action: accion,
    expectedStatus: item.estado,
    note: final,
  })
  return { estado: r?.event?.toStatus ?? SIGUIENTE[accion] }
}

// ---------------- Modo demo ----------------
// Dos órdenes para el conductor de prueba: una por empezar y una pausada con
// tiempo ya trabajado. Viven en memoria mientras la pestaña está abierta.

const hace = (min) => new Date(Date.now() - min * 60_000).toISOString()

function semillaDemo(perfil) {
  const v = VEHICULOS.find((x) => x.conductorPrincipalId === perfil?.id) ?? VEHICULOS[0]
  const unidad = v ? `${v.alias} · ${v.placa}` : 'Unidad 01'
  const responsable = { id: perfil?.id ?? 'demo', nombre: perfil?.nombre ?? 'Conductor de prueba', desde: hace(180) }
  return [
    { id: 'odt-asig-demo-1', estado: 'asignada', vehiculoId: v?.id ?? null, vehiculoNombre: unidad, titulo: 'Cambiar las pastillas de freno delanteras: chillan al frenar.', tipoFalla: 'frenos', prioridad: 'alta', creadaEn: hace(240), responsable, eventos: [] },
    { id: 'odt-asig-demo-2', estado: 'pausada', vehiculoId: v?.id ?? null, vehiculoNombre: unidad, titulo: 'Revisar la luz de cruce derecha, se apaga sola.', tipoFalla: 'electrico', prioridad: 'media', creadaEn: hace(1440), responsable,
      eventos: [{ tipo: 'inicio', en: hace(170), nota: '' }, { tipo: 'pausa', en: hace(90), nota: 'Falta el repuesto' }] },
  ]
}

const demo = {
  porPersona: new Map(),
  de(perfil) {
    const clave = perfil?.id ?? 'demo'
    if (!this.porPersona.has(clave)) this.porPersona.set(clave, rolCanonico(perfil?.rol) === 'conductor' ? semillaDemo(perfil) : [])
    return this.porPersona.get(clave)
  },
  async listar(perfil) {
    const ahora = Date.now()
    return masNuevasPrimero(this.de(perfil)
      .filter((o) => ESTADOS_DE_TALLER.includes(o.estado))
      .map(({ eventos, ...o }) => ({ ...o, segundos: segundosTrabajados(eventos, new Date(ahora)), medidoEn: ahora })))
  },
  async evento(id, accion, nota) {
    for (const lista of this.porPersona.values()) {
      const o = lista.find((x) => x.id === id)
      if (!o) continue
      if (o.estado !== DESDE[accion]) throw new Error('Alguien más cambió esto mientras lo mirabas. Recarga y vuelve a intentarlo.')
      o.eventos.push({ tipo: accion, en: new Date().toISOString(), nota })
      o.estado = SIGUIENTE[accion]
      return { estado: o.estado }
    }
    throw new Error('Ese elemento ya no existe.')
  },
}

/** Solo para pruebas: vuelve las órdenes de ejemplo a su estado inicial. */
export function reiniciarDemo() {
  demo.porPersona.clear()
}
