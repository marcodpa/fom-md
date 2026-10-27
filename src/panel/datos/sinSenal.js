import { useEffect, useState } from 'react'
import { fechaCorta, fechaHora } from './formato.js'
import { marchaPorPosicion } from './movimiento.js'
import { registrarCorte } from './avisosSinSenal.js'

// ============================================================
// SIN SEÑAL — cuánto lleva callado el GPS de una unidad
// ------------------------------------------------------------
// El tiempo se cuenta desde `ultimoReporte` (lo que la API llama
// `lastReportAt`): es la fecha con la que ya se decide si una unidad tiene
// señal. La app copia estas mismas funciones y textos, para que web y app
// digan lo mismo de la misma unidad.
// ============================================================

const MIN_MS = 60_000
const HORA_MIN = 60
const DIA_MIN = 24 * HORA_MIN
const MES_MIN = 30 * DIA_MIN

/**
 * Cuánto puede pasar sin un reporte antes de dar el equipo por callado: la MISMA regla de la
 * app (`SIN_SENAL_MS` en use-flota-fom.ts). Los GPS emiten cada pocos segundos con la unidad
 * encendida: cinco minutos aguantan un bache de cobertura sin pintar de verde una unidad apagada.
 */
export const SIN_SENAL_MS = 5 * MIN_MS

/** Milisegundos desde el último reporte; `Infinity` si nunca reportó (o la fecha no se entiende). */
export function msSinReportar(ultimoReporte, ahora = Date.now()) {
  if (!ultimoReporte) return Infinity
  const t = new Date(ultimoReporte).getTime()
  if (!Number.isFinite(t)) return Infinity
  // Un reloj adelantado en el equipo no debe dar tiempos negativos.
  return Math.max(0, ahora - t)
}

/** ¿El equipo sigue transmitiendo? Último reporte de hace menos de 5 min (`transmitiendo()` de la app). */
export function transmitiendo(ultimoReporte, ahora = Date.now()) {
  return msSinReportar(ultimoReporte, ahora) < SIN_SENAL_MS
}

/**
 * La unidad con `conectado`/`conexion` recalculados a la hora de ahora, para que pase sola a
 * «Sin señal» sin esperar otra lectura del servidor. Solo en las unidades que traen la señal
 * (las del servidor, con `conectado` booleano): la demostración no la lleva y sus horas son
 * fijas, así que se deja como está. Si nada cambia, devuelve el MISMO objeto.
 *
 * De paso: si reporta, decide «En marcha» o «Detenida» por su posición (movimiento.js); si se
 * calló, anota el aviso de «GPS sin señal» para la campana (avisosSinSenal.js).
 */
export function conSenalAlDia(v, ahora = Date.now()) {
  if (!v || typeof v.conectado !== 'boolean') return v
  const conectado = transmitiendo(v.ultimoReporte, ahora)
  const conexion = conectado ? 'reportando' : 'sin_senal'
  let estadoMarcha = v.estadoMarcha
  if (conectado) estadoMarcha = marchaPorPosicion(v, ahora) ?? v.estadoMarcha
  else registrarCorte(v, new Date(v.ultimoReporte).getTime() + SIN_SENAL_MS, ahora)
  if (conectado === v.conectado && conexion === v.conexion && estadoMarcha === v.estadoMarcha) return v
  return { ...v, conectado, conexion, estadoMarcha }
}

/**
 * «hace 12 min» · «hace 2 h 15 min» · «hace 3 d 4 h» · «desde el 12 sep» · «nunca reportó».
 * Un mes o más ya no se cuenta en días: se dice la fecha, con el año si no es el de ahora.
 */
export function tiempoSinSenal(ultimoReporte, ahora = Date.now()) {
  const ms = msSinReportar(ultimoReporte, ahora)
  if (ms === Infinity) return 'nunca reportó'
  const min = Math.floor(ms / MIN_MS)
  if (min < 1) return 'hace menos de 1 min'
  if (min < HORA_MIN) return `hace ${min} min`
  if (min < DIA_MIN) {
    const h = Math.floor(min / HORA_MIN)
    const m = min % HORA_MIN
    return m ? `hace ${h} h ${m} min` : `hace ${h} h`
  }
  if (min < MES_MIN) {
    const d = Math.floor(min / DIA_MIN)
    const h = Math.floor((min % DIA_MIN) / HORA_MIN)
    return h ? `hace ${d} d ${h} h` : `hace ${d} d`
  }
  const fecha = new Date(ultimoReporte)
  const otroAnio = fecha.getFullYear() !== new Date(ahora).getFullYear()
  return `desde el ${fechaCorta(ultimoReporte)}${otroAnio ? ` ${fecha.getFullYear()}` : ''}`
}

/** «Sin señal · hace 2 h 15 min» / «Sin señal · nunca reportó». */
export function textoSinSenal(ultimoReporte, ahora = Date.now()) {
  return `Sin señal · ${tiempoSinSenal(ultimoReporte, ahora)}`
}

/** La línea chica de la ficha: «Último reporte: 21 oct, 9:42 a. m.»; `null` si nunca reportó. */
export function textoUltimoReporte(ultimoReporte) {
  if (!ultimoReporte || !Number.isFinite(new Date(ultimoReporte).getTime())) return null
  return `Último reporte: ${fechaHora(ultimoReporte)}`
}

/**
 * Ordena las unidades sin señal de más tiempo callada a menos (las que nunca reportaron,
 * primero) SIN mover a las demás: cada una ocupa uno de los puestos que ya tenían las sin
 * señal. Así la lista conserva su orden y sus grupos, y dentro de ellos manda el silencio.
 */
export function ordenarSinSenal(lista, esSinSenal, ahora = Date.now()) {
  const puestos = []
  const calladas = []
  lista.forEach((v, i) => {
    if (esSinSenal(v)) {
      puestos.push(i)
      calladas.push(v)
    }
  })
  if (calladas.length < 2) return lista
  // Dos «nunca reportó» dan Infinity − Infinity = NaN: se toman como empate (orden estable).
  calladas.sort((a, b) => msSinReportar(b.ultimoReporte, ahora) - msSinReportar(a.ultimoReporte, ahora) || 0)
  const salida = [...lista]
  puestos.forEach((p, i) => { salida[p] = calladas[i] })
  return salida
}

/**
 * La hora de ahora, renovada cada minuto sin pedir nada al servidor: basta para que
 * «hace 12 min» pase solo a «hace 13 min» con la pantalla abierta.
 */
export function useMinuto() {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), MIN_MS)
    return () => clearInterval(id)
  }, [])
  return ahora
}
