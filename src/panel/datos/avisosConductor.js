// ============================================================
// AVISOS DEL CONDUCTOR — la campana y la lista, igual que la app
// ------------------------------------------------------------
// Copia de notiConductorService.ts de FOM-DRIVER: el número de la campana
// del conductor NO son los avisos de toda la empresa, son tres buzones suyos:
//
//  - unidad   → lo que el sistema pidió para SU unidad y sigue sin atenderse
//               (vencido), o ya se hizo; y los papeles de la unidad por vencer.
//  - odt      → las órdenes de SU unidad que reportó ÉL.
//  - personal → sus papeles por vencer o vencidos.
//
// Lo leído y lo descartado se guardan en el navegador, por usuario y con la
// misma clave que la app (`notis:<usuario>`). Aquí no hay red ni React: así
// se prueba con `node --test`.
// ============================================================

import { estadoVisible } from './historial-odt.js'
import { etiqueta } from './catalogos.js'
import { nombreDocumentoUsuario } from './perfilUsuario.js'

/** Los tres buzones, con el nombre y el vacío de la app (mis-notificaciones.tsx). */
export const BUZONES = [
  { id: 'unidad', texto: 'Mi unidad', icono: 'flota', vacio: 'El sistema no pide mantenimiento para tu unidad por ahora.' },
  { id: 'odt', texto: 'Órdenes', icono: 'inspeccion', vacio: 'No has reportado fallas de esta unidad.' },
  { id: 'personal', texto: 'Personal', icono: 'perfil', vacio: 'Tus documentos y tu perfil están al día.' },
]

// --- Lo leído y lo descartado, por usuario --------------------------------

/** Dónde se guarda lo de cada usuario: la misma clave que la app. */
export const claveAvisos = (usuario) => `notis:${usuario}`

function almacenPorDefecto() {
  try { return globalThis.localStorage ?? null } catch { return null }
}

/** `{ [avisoId]: { leida, descartada } }` de este usuario; vacío si no hay nada o no se puede leer. */
export function leerEstadoAvisos(usuario, almacen = almacenPorDefecto()) {
  if (!usuario || !almacen) return {}
  try {
    const guardado = JSON.parse(almacen.getItem(claveAvisos(usuario)) || '{}')
    return guardado && typeof guardado === 'object' ? guardado : {}
  } catch {
    return {}
  }
}

/** Aplica el mismo cambio a varios avisos y lo guarda. Devuelve el estado nuevo. */
export function guardarEstadoAvisos(usuario, ids, cambio, almacen = almacenPorDefecto()) {
  const estado = leerEstadoAvisos(usuario, almacen)
  for (const id of ids) estado[id] = { leida: false, descartada: false, ...estado[id], ...cambio }
  try {
    almacen?.setItem(claveAvisos(usuario), JSON.stringify(estado))
  } catch {
    // Sin almacenamiento, lo leído dura lo que dure la página.
  }
  return estado
}

// --- Armar los buzones -----------------------------------------------------

const plano = (t) => String(t ?? '').trim().toLowerCase()

/** El servicio de una orden del sistema: lo que va antes de «:» (igual que Mantenimiento). */
function servicioDe(descripcion = '') {
  const texto = String(descripcion ?? '')
  const corte = texto.indexOf(':')
  const cabeza = corte > 0 ? texto.slice(0, corte).trim() : ''
  return cabeza && cabeza.length <= 60 ? cabeza : 'Mantenimiento programado'
}

/** «05/2027»: un papel vence EN un mes, como en la app (formatVencimiento). */
function mesDeVencimiento(iso) {
  if (!iso) return 'fecha sin dato'
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? new Date(`${iso}T00:00:00`) : new Date(iso)
  if (Number.isNaN(d.getTime())) return 'fecha sin dato'
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/** Hoy a las 7:05: la hora de las alertas que se calculan cada día (como la app). */
function hoyAlas(ahora) {
  const d = new Date(ahora)
  d.setHours(7, 5, 0, 0)
  return d.toISOString()
}

/** Una orden que levantó el sistema (preventivo por regla), no una persona. */
const esDelSistema = (o) => o.tipo === 'preventiva' && !o.creadorId

/**
 * ¿La reportó él? Por su id si la orden lo trae; si no, por el nombre (la app
 * compara el nombre del autor porque FOM solo manda eso).
 */
function laReportoEl(o, personaId, nombre) {
  if (o.creadorId && personaId) return o.creadorId === personaId
  return Boolean(nombre) && plano(o.creadorNombre) === plano(nombre)
}

/** Lo sin leer primero y, dentro, de lo más nuevo a lo más viejo. */
export function ordenarAvisos(lista) {
  return [...lista].sort((a, b) => {
    if (a.leida !== b.leida) return a.leida ? 1 : -1
    return String(b.creadaEn ?? '').localeCompare(String(a.creadaEn ?? ''))
  })
}

/**
 * Los tres buzones del conductor y cuántos avisos siguen sin leer (el número
 * de la campana), con la misma regla que `armarPanel` de la app.
 *
 * `ordenes` son las de su unidad; `documentos`, los que el servidor le deje
 * ver (se quedan solo los suyos y los de su unidad).
 */
export function armarBuzonesConductor({ nombre = '', personaId = null, vehiculoId = null, ordenes = [], documentos = [], estado = {}, ahora = new Date() } = {}) {
  const leidaEn = (id) => Boolean(estado[id]?.leida)
  const sigue = (n) => !estado[n.id]?.descartada
  const deLaUnidad = vehiculoId ? (ordenes ?? []).filter((o) => o.vehiculoId === vehiculoId) : []

  // BUZÓN UNIDAD: lo que el sistema YA pidió y nadie atendió (vencido) o lo que
  // ya se hizo. Lo que está en curso no avisa: vive en Mantenimiento.
  const delSistema = deLaUnidad
    .filter(esDelSistema)
    .map((o) => ({ o, grupo: estadoVisible(o.estado).clave }))
    .filter(({ o, grupo }) => grupo === 'resuelta' || o.estado === 'abierta')
    .map(({ o, grupo }) => {
      const realizada = grupo === 'resuelta'
      const id = `u-${o.id}`
      const titulo = servicioDe(o.descripcion)
      return {
        id,
        buzon: 'unidad',
        titulo: realizada ? `${titulo} · realizado` : titulo,
        detalle: o.descripcion ?? '',
        generadoPor: 'Sistema · regla de mantenimiento',
        creadaEn: o.creadaEn ?? '',
        tono: realizada ? 'exito' : o.prioridad === 'alta' ? 'peligro' : o.prioridad === 'baja' ? 'info' : 'aviso',
        // Las realizadas ya no piden atención; las pendientes, hasta abrirlas.
        leida: realizada || leidaEn(id),
        destino: { tipo: 'accion', id: o.id },
      }
    })

  // Los papeles por vencer o vencidos: los suyos van a Personal; los de su
  // unidad, a Mi unidad. Sin su id no se le atribuye ningún papel personal.
  const papeles = (documentos ?? []).filter((d) => d.estado === 'vencido' || d.estado === 'por_vencer')
  const avisoDePapel = (d, buzon) => {
    const id = `al-doc-${d.id}`
    const tipo = nombreDocumentoUsuario(d.tipo)
    return {
      id,
      buzon,
      titulo: d.estado === 'vencido' ? `${tipo} vencido` : `${tipo} por vencer`,
      detalle: `${buzon === 'unidad' ? 'Documento de tu unidad' : 'Tu documento'} vence en ${mesDeVencimiento(d.venceEn)}. Tenlo al día.`,
      generadoPor: 'Sistema',
      creadaEn: hoyAlas(ahora),
      tono: d.estado === 'vencido' ? 'peligro' : 'aviso',
      leida: leidaEn(id),
      destino: { tipo: 'documento', id: d.id },
    }
  }
  const papelesUnidad = vehiculoId
    ? papeles.filter((d) => d.ambito === 'vehiculo' && d.vehiculoId === vehiculoId).map((d) => avisoDePapel(d, 'unidad'))
    : []
  const personal = personaId
    ? papeles.filter((d) => d.ambito === 'persona' && (d.personaId ?? d.userId) === personaId).map((d) => avisoDePapel(d, 'personal'))
    : []

  // BUZÓN ÓRDENES: solo las de ESTA unidad que reportó él.
  const odt = deLaUnidad
    .filter((o) => !esDelSistema(o) && laReportoEl(o, personaId, nombre))
    .map((o) => {
      const grupo = estadoVisible(o.estado).clave
      const id = `o-${o.id}`
      return {
        id,
        buzon: 'odt',
        titulo: o.tipoFalla ? `Falla: ${etiqueta('tipo_falla', o.tipoFalla) || o.tipoFalla}` : 'Falla reportada',
        detalle: o.descripcion ?? '',
        generadoPor: o.creadorNombre ? `Reportada por ${o.creadorNombre}` : 'Sistema',
        creadaEn: o.creadaEn ?? '',
        tono: grupo === 'resuelta' ? 'exito' : grupo === 'revision' ? 'info' : 'aviso',
        // «Abierta» = la acaba de reportar él: no es novedad, nace leída. Lo
        // que sí avisa es que el taller la tomó (en revisión).
        leida: grupo === 'resuelta' || grupo === 'abierta' || leidaEn(id),
        destino: { tipo: 'orden', id: o.id },
      }
    })

  const buzones = {
    unidad: ordenarAvisos([...delSistema, ...papelesUnidad].filter(sigue)),
    odt: ordenarAvisos(odt.filter(sigue)),
    personal: ordenarAvisos(personal.filter(sigue)),
  }
  const noLeidas = [...buzones.unidad, ...buzones.odt, ...buzones.personal].filter((n) => !n.leida).length
  return { buzones, noLeidas }
}

/** La ruta del panel a la que lleva tocar un aviso. */
export function rutaDeAviso(aviso) {
  const destino = aviso?.destino
  if (destino?.tipo === 'documento') return '/panel/mi-perfil?vista=documentos'
  if (destino?.tipo === 'orden' || destino?.tipo === 'accion') return '/panel/mantenimiento'
  return null
}
