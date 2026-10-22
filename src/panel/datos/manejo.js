// ============================================================
// MANEJO — tono, texto y cifras del score de manejo (política driving-v1).
// ------------------------------------------------------------
// Una sola fuente para la tabla del Resumen, la ficha de la persona, Mi perfil,
// Mi unidad, la ficha del vehículo y la lista de Usuarios: así «49 · Atención»
// sale igual en todas partes. La app copia estas funciones tal cual.
// El score lo calcula el servidor; aquí no se calcula nada, solo se dice.
// ============================================================
import * as f from './formato.js'

/** Períodos que se pueden elegir (días hacia atrás desde hoy). */
export const DIAS_MANEJO = [7, 30] // el servidor solo acepta 7, 30 o 90 días (28 da error 400)

/** Calificación del servidor → color de la pastilla (los de `Tag`). */
export const TONO_MANEJO = { green: 'verde', yellow: 'ambar', red: 'rojo', unavailable: 'gris' }
/** Calificación del servidor → palabra que acompaña al número. */
export const TEXTO_MANEJO = { green: 'Seguro', yellow: 'Puede mejorar', red: 'Atención', unavailable: 'Sin km' }

const indiceValido = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100

/**
 * La calificación del score: la que manda el servidor (`rating`). Si no la trae pero hay índice,
 * se usa la misma escala del semáforo de la empresa: 85 o más «green», 70 a 84 «yellow», menos de 70 «red».
 * Sin índice (o sin km) es «unavailable».
 */
export function calificacionManejo(score) {
  if (!score || score.rating === 'unavailable' || !indiceValido(score.indice)) return 'unavailable'
  if (TONO_MANEJO[score.rating]) return score.rating
  if (score.indice >= 85) return 'green'
  if (score.indice >= 70) return 'yellow'
  return 'red'
}

/** Color de la pastilla: verde | ambar | rojo | gris. */
export function tonoManejo(score) {
  return TONO_MANEJO[calificacionManejo(score)]
}

/** Texto de la pastilla: «49 · Atención», o «Sin km» cuando no hay índice. */
export function etiquetaManejo(score) {
  const c = calificacionManejo(score)
  return c === 'unavailable' ? TEXTO_MANEJO.unavailable : `${f.numero(score.indice)} · ${TEXTO_MANEJO[c]}`
}

const cifra = (n) => (typeof n === 'number' && Number.isFinite(n) ? f.numero(n) : '—')

/**
 * Las 6 cifras del bloque, en el orden de la tabla del Resumen:
 * Score · Por 100 km · Frenadas · Aceleraciones · Excesos · Km. «—» es sin dato, no cero.
 */
export function cifrasManejo(score) {
  const indice = calificacionManejo(score) === 'unavailable' ? null : score.indice
  return [
    { clave: 'score', etiqueta: 'Score', valor: cifra(indice) },
    { clave: 'por100', etiqueta: 'Por 100 km', valor: cifra(score?.eventosPor100) },
    { clave: 'frenadas', etiqueta: 'Frenadas', valor: cifra(score?.frenadas) },
    { clave: 'aceleraciones', etiqueta: 'Aceleraciones', valor: cifra(score?.aceleraciones) },
    { clave: 'excesos', etiqueta: 'Excesos', valor: cifra(score?.excesos) },
    { clave: 'km', etiqueta: 'Km', valor: cifra(Number.isFinite(score?.km) ? Math.round(score.km) : null) },
  ]
}

/** Frenadas + aceleraciones + excesos del período; null si el servidor no los entregó. */
export function eventosManejo(score) {
  const n = [score?.frenadas, score?.aceleraciones, score?.excesos]
  return n.every((x) => typeof x === 'number' && Number.isFinite(x)) ? n[0] + n[1] + n[2] : null
}

/** El score de una persona dentro del ranking de la empresa; null si no aparece. */
export function manejoDe(ranking, userId) {
  if (!Array.isArray(ranking) || !userId) return null
  return ranking.find((s) => s.id === userId) ?? null
}
