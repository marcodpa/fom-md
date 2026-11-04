// ============================================================
// VENCIMIENTOS — la ÚNICA regla de cuándo un papel está vigente, por vencer
// o vencido. Todo el panel la usa; no se vuelve a escribir un 30, un 7 ni una
// división entre 86400000 en otro archivo (lo vigila test/regla-vencimientos.test.js).
//
// Es la misma regla que la app (src/lib/validate.ts, vigenciaDeFecha):
//  · La fecha guardada es el ÚLTIMO DÍA en que el papel vale. Vence el 31 de
//    agosto: sirve todo el 31 y está vencido el 1 de septiembre.
//  · Se cuentan DÍAS DE CALENDARIO LOCAL (de medianoche a medianoche), nunca
//    milisegundos: contar instantes daba «vencido» desde la primera hora del
//    propio día de vencimiento.
//  · Un 'AAAA-MM-DD' pelado lo lee JS como medianoche UTC, y en Venezuela
//    (UTC-4) cae la tarde anterior: se arma siempre como fecha local.
//  · Si el servidor ya trae `daysToExpiry`, se usa ese número tal cual.
// ============================================================

/** Desde cuántos días antes un papel cuenta como «por vencer». */
export const UMBRAL_POR_VENCER_DIAS = 30
/** Desde cuántos días antes un papel es urgente (atención inmediata). */
export const UMBRAL_URGENTE_DIAS = 7

const MS_POR_DIA = 86_400_000

/**
 * Fecha local a partir de 'AAAA-MM-DD' (o de un ISO con hora, tomando solo el
 * día, como la app), de un Date o de un número. Fecha inválida: Invalid Date.
 */
export function fechaLocal(valor) {
  if (typeof valor === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return new Date(valor)
}

const mediaNoche = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Días de calendario que faltan para `fecha` (0 = hoy, negativo = ya venció). NaN si la fecha no sirve. */
export function diasDeCalendario(fecha, hoy = new Date()) {
  const vence = fechaLocal(fecha)
  const ahora = fechaLocal(hoy)
  if (Number.isNaN(vence.getTime()) || Number.isNaN(ahora.getTime())) return NaN
  // round, no floor: un cambio de hora no debe mover el día.
  return Math.round((mediaNoche(vence) - mediaNoche(ahora)) / MS_POR_DIA)
}

/**
 * 'vencido' | 'por_vencer' | 'vigente' a partir de los días que faltan.
 * Hoy NO es vencido: el papel vale hasta el final del día. Sin número válido: null.
 */
export function clasificarVencimiento(dias) {
  if (dias == null || dias === '') return null
  const n = Number(dias)
  if (!Number.isFinite(n)) return null
  if (n < 0) return 'vencido'
  if (n <= UMBRAL_POR_VENCER_DIAS) return 'por_vencer'
  return 'vigente'
}

/** ¿Es de atención inmediata? Vencido, o vence en `UMBRAL_URGENTE_DIAS` días o menos. */
export function esUrgente(dias) {
  const n = Number(dias)
  return dias != null && dias !== '' && Number.isFinite(n) && n <= UMBRAL_URGENTE_DIAS
}
