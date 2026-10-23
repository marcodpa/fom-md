// ============================================================
// FILTRO DE FECHA — «Hoy», «7 días», «30 días», «Todo» o un rango propio
// ------------------------------------------------------------
// Lo usa Mantenimiento para quedarse con las órdenes REPORTADAS en esos días
// (su `creadaEn`, la misma fecha que se ve en la tarjeta y que ordena la
// lista). La app hace la misma cuenta en src/utils/filtro-fecha.ts.
//
// La consola de FOM no admite filtrar las work-orders por fecha (solo status,
// vehicleId, limit y offset): se filtra aquí, sobre la lista ya cargada.
// Pedido para Juan: `createdFrom` / `createdTo` en GET /console/work-orders.
//
// Los días se cuentan en hora LOCAL: «Hoy» es desde las 00:00 de aquí, y
// «7 días» es hoy y los 6 anteriores, enteros.
// ============================================================
import { instante } from './orden.js'
import { fechaCorta } from './formato.js'

/** Los atajos, en el orden en que se ofrecen. `''` = todas las fechas. */
export const ATAJOS_FECHA = [
  { clave: 'hoy', t: 'Hoy', dias: 1 },
  { clave: '7d', t: 'Últimos 7 días', corto: '7 días', dias: 7 },
  { clave: '30d', t: 'Últimos 30 días', corto: '30 días', dias: 30 },
  { clave: '', t: 'Todas las fechas', corto: 'Todo' },
]

/** Sin filtro: lo que arranca la pantalla. */
export const SIN_FECHA = { atajo: '', desde: '', hasta: '' }

const RE_DIA = /^\d{4}-\d{2}-\d{2}$/

/** 00:00 locales del día de `ms`, menos `atras` días. */
function inicioDelDia(ms, atras = 0) {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - atras).getTime()
}

/** `AAAA-MM-DD` de un día en hora local (lo que espera un <input type="date">). */
export function diaLocal(ms = Date.now()) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Cuánto falta (ms) para las 00:00 locales del día siguiente a `ahora`: a esa
 * hora «Hoy» y «7 días» cambian y la pantalla vuelve a filtrar.
 */
export function msHastaMedianoche(ahora = Date.now()) {
  return Math.max(1, inicioDelDia(ahora, -1) - ahora)
}

/**
 * El tramo que deja pasar el filtro, en milisegundos: `desde` incluido y
 * `hasta` excluido; `null` = sin límite por ese lado. Un rango escrito al
 * revés se da la vuelta en vez de dejar la lista vacía.
 */
export function rangoDeFecha(valor = SIN_FECHA, ahora = Date.now()) {
  const v = valor ?? SIN_FECHA
  const atajo = ATAJOS_FECHA.find((a) => a.clave && a.clave === v.atajo)
  if (atajo) return { desde: inicioDelDia(ahora, atajo.dias - 1), hasta: null }
  if (v.atajo !== 'rango') return { desde: null, hasta: null }
  let desde = RE_DIA.test(v.desde ?? '') ? instante(v.desde) : null
  let hasta = RE_DIA.test(v.hasta ?? '') ? instante(v.hasta) : null
  if (desde != null && hasta != null && desde > hasta) [desde, hasta] = [hasta, desde]
  // «Hasta el 20» incluye todo el 20: se corta a las 00:00 del 21.
  if (hasta != null) hasta = inicioDelDia(hasta, -1)
  return { desde, hasta }
}

/** ¿Hay algún filtro de fecha puesto? */
export function hayFiltroFecha(valor) {
  const r = rangoDeFecha(valor)
  return r.desde != null || r.hasta != null
}

/** ¿La fecha cae en el tramo? Sin filtro pasa todo; con filtro, lo que no trae fecha se queda fuera. */
export function enRangoFecha(fecha, rango) {
  if (!rango || (rango.desde == null && rango.hasta == null)) return true
  const ms = instante(fecha)
  if (ms == null) return false
  if (rango.desde != null && ms < rango.desde) return false
  if (rango.hasta != null && ms >= rango.hasta) return false
  return true
}

/**
 * Las de la lista que caen en el filtro, por la fecha que dice `fechaDe`
 * (campo o función). No reordena: la lista sigue de la más nueva a la más vieja.
 */
export function filtrarPorFecha(lista, valor, { fechaDe = 'creadaEn', ahora = Date.now() } = {}) {
  const rango = rangoDeFecha(valor, ahora)
  if (rango.desde == null && rango.hasta == null) return [...(lista ?? [])]
  const leer = typeof fechaDe === 'function' ? fechaDe : (x) => x?.[fechaDe]
  return (lista ?? []).filter((x) => enRangoFecha(leer(x), rango))
}

/** Lo que dice el botón con el filtro puesto: «Hoy», «7 días», «3 oct – 20 oct», «Desde 3 oct». */
export function textoFiltroFecha(valor) {
  const v = valor ?? SIN_FECHA
  const atajo = ATAJOS_FECHA.find((a) => a.clave && a.clave === v.atajo)
  if (atajo) return atajo.corto ?? atajo.t
  if (v.atajo !== 'rango') return ''
  let [a, b] = [RE_DIA.test(v.desde ?? '') ? v.desde : '', RE_DIA.test(v.hasta ?? '') ? v.hasta : '']
  if (a && b && a > b) [a, b] = [b, a]
  if (a && b) return a === b ? fechaCorta(a) : `${fechaCorta(a)} – ${fechaCorta(b)}`
  if (a) return `Desde ${fechaCorta(a)}`
  if (b) return `Hasta ${fechaCorta(b)}`
  return ''
}
