import { useEffect, useRef, useSyncExternalStore } from 'react'
import { COLOR, ETIQUETA } from './catalogos.js'
import { fechaCorta, fechaHora } from './formato.js'
import { registrarCorte } from './avisosSinSenal.js'

// ============================================================
// LA SEÑAL DE UNA UNIDAD — una sola regla para toda la consola
// ------------------------------------------------------------
// Antes cada pantalla decidía por su cuenta y el mismo carro salía
// «Reportando» en una, «Sin señal» en otra y «En marcha» en una tercera.
// Ahora todas preguntan aquí (`estadoSenal`), y estadoUnidad.js solo le
// pone encima el nombre de la marcha.
//
// Dos fechas del servidor (fom.vehicle_live_state):
//   ultimoReporte (`lastReportAt`)   → último mensaje de CUALQUIER tipo,
//                                       también los latidos sin ubicación.
//   posicionEn    (`lastPositionAt`) → última posición válida.
// Un GPS que solo late tiene señal, pero no dice dónde está la unidad.
// La app copia estas mismas reglas y textos.
// ============================================================

const SEG_MS = 1000
const MIN_MS = 60_000

/** Cinco minutos sin ningún mensaje = Sin señal (`SIN_SENAL_MS` de la app). */
export const SIN_SENAL_MS = 5 * MIN_MS
/** Con mensajes, pero la última posición tiene media hora o más = Sin ubicación. */
export const SIN_UBICACION_MS = 30 * MIN_MS
/** Desde esta velocidad va «En marcha»: el mismo corte que usa el servidor para `motionState`. */
export const VEL_MARCHA_KMH = 3

const TONO = { verde: 'ok', ambar: 'warn', gris: 'mute' }

/** Milisegundos desde una fecha; `Infinity` si no hay (o no se entiende). */
export function msSinReportar(fecha, ahora = Date.now()) {
  if (!fecha) return Infinity
  const t = new Date(fecha).getTime()
  if (!Number.isFinite(t)) return Infinity
  // Un reloj adelantado en el equipo no debe dar tiempos negativos.
  return Math.max(0, ahora - t)
}

/** ¿El equipo sigue transmitiendo? Último mensaje de hace menos de 5 min (`transmitiendo()` de la app). */
export function transmitiendo(ultimoReporte, ahora = Date.now()) {
  return msSinReportar(ultimoReporte, ahora) < SIN_SENAL_MS
}

/**
 * «hace 40 s» · «hace 12 min» · «hace 3 h» · «hace 2 d» · «desde el 12 sep» (30 días o más,
 * con el año si no es el de ahora) · «Nunca reportó» si no hay fecha. El único «hace cuánto»
 * de la consola: `desde` (formato.js), los GPS y el SOS lo usan.
 */
export function haceCuanto(fecha, ahora = Date.now()) {
  const ms = msSinReportar(fecha, ahora)
  if (ms === Infinity) return 'Nunca reportó'
  const seg = Math.floor(ms / SEG_MS)
  if (seg < 60) return `hace ${seg} s`
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d} d`
  const dia = new Date(fecha)
  const otroAnio = dia.getFullYear() !== new Date(ahora).getFullYear()
  return `desde el ${fechaCorta(fecha)}${otroAnio ? ` ${dia.getFullYear()}` : ''}`
}

const fechaValida = (x) => (x && Number.isFinite(new Date(x).getTime()) ? x : null)

/**
 * LA REGLA. Cuatro estados, en este orden:
 *   sin_gps       → nunca reportó (o no tiene equipo). Gris.
 *   sin_senal     → el último mensaje tiene 5 min o más. Gris. Sin marcha ni velocidad: son viejas.
 *   sin_ubicacion → hay mensajes, pero la última posición falta o tiene 30 min o más. Ámbar.
 *   reportando    → mensaje y posición recientes. Verde. Solo aquí hay marcha:
 *                   «En marcha» con ≥3 km/h o `motionState` en_marcha; si no, «Detenida».
 *
 * Devuelve { clave, etiqueta, texto, color, tono, ultimoReporte, posicionEn, hace, marcha, velocidadKmh }.
 * `etiqueta` es el nombre corto («Sin señal»); `texto`, el de la pastilla («Sin señal · hace 12 min»).
 */
export function estadoSenal(v, ahora = Date.now()) {
  const ultimoReporte = fechaValida(v?.ultimoReporte)
  const posicionEn = fechaValida(v?.posicionEn)
  const hace = haceCuanto(ultimoReporte, ahora)
  const base = { ultimoReporte, posicionEn, hace, marcha: null, velocidadKmh: null }
  const pinta = (clave, etiqueta, texto = etiqueta) =>
    ({ ...base, clave, etiqueta, texto, color: COLOR.conexion[clave], tono: TONO[COLOR.conexion[clave]] })

  if (!ultimoReporte) return pinta('sin_gps', v?.sinGps === true ? 'Sin GPS' : ETIQUETA.conexion.sin_gps)
  if (msSinReportar(ultimoReporte, ahora) >= SIN_SENAL_MS) {
    return pinta('sin_senal', ETIQUETA.conexion.sin_senal, `${ETIQUETA.conexion.sin_senal} · ${hace}`)
  }
  if (msSinReportar(posicionEn, ahora) >= SIN_UBICACION_MS) {
    const ultima = posicionEn ? `última ${haceCuanto(posicionEn, ahora)}` : 'nunca'
    return pinta('sin_ubicacion', ETIQUETA.conexion.sin_ubicacion, `${ETIQUETA.conexion.sin_ubicacion} · ${ultima}`)
  }
  const vel = Number.isFinite(v?.velocidadKmh) ? v.velocidadKmh : null
  const marcha = (vel != null && vel >= VEL_MARCHA_KMH) || v?.estadoMarcha === 'en_marcha' ? 'en_marcha' : 'parada'
  return { ...pinta('reportando', ETIQUETA.marcha_estado[marcha]), marcha, velocidadKmh: vel }
}

/** ¿Se ve la unidad callada o sin equipo? (gris en mapa y listas). */
export const esCallada = (s) => s?.clave === 'sin_senal' || s?.clave === 'sin_gps'

/**
 * La unidad con su señal al día (`senal`), recalculada a la hora de ahora para que pase sola a
 * «Sin señal» sin esperar otra lectura. Por compatibilidad deja también `conectado` (reportando o
 * sin ubicación) y `conexion` (la clave). Si nada cambia, devuelve el MISMO objeto: los textos con
 * «hace X» se piden a `estadoSenal(v, ahora)`, que sí cambian cada minuto.
 */
export function conSenalAlDia(v, ahora = Date.now()) {
  if (!v) return v
  const senal = estadoSenal(v, ahora)
  const conectado = senal.clave === 'reportando' || senal.clave === 'sin_ubicacion'
  const antes = v.senal
  if (antes && antes.clave === senal.clave && antes.marcha === senal.marcha && antes.ultimoReporte === senal.ultimoReporte
    && antes.posicionEn === senal.posicionEn && antes.velocidadKmh === senal.velocidadKmh
    && v.conectado === conectado && v.conexion === senal.clave) return v
  return { ...v, senal, conectado, conexion: senal.clave }
}

/** Anota en la campana el corte de cada unidad que está Sin señal (solo esas). Va en un efecto, no al pintar. */
export function anotarCortes(lista, ahora = Date.now()) {
  for (const v of lista ?? []) {
    const s = estadoSenal(v, ahora)
    if (s.clave === 'sin_senal') registrarCorte(v, new Date(s.ultimoReporte).getTime() + SIN_SENAL_MS, ahora)
  }
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

// ------------------------------------------------------------
// EL RELOJ DEL MINUTO
// Un solo temporizador para toda la consola (antes cada pantalla tenía el suyo). Se
// detiene con la pestaña en segundo plano —nadie mira «hace 12 min»— y al volver da la
// hora al instante. Sin nadie suscrito no corre.
// ------------------------------------------------------------
const oyentes = new Set()
let horaDelReloj = Date.now()
let temporizador = 0

function dar(hora) {
  horaDelReloj = hora
  oyentes.forEach((avisar) => avisar())
}
const alVolver = () => { if (typeof document === 'undefined' || !document.hidden) dar(Date.now()) }

function suscribirReloj(avisar) {
  oyentes.add(avisar)
  if (oyentes.size === 1) {
    horaDelReloj = Date.now()
    temporizador = setInterval(() => { if (typeof document === 'undefined' || !document.hidden) dar(Date.now()) }, MIN_MS)
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', alVolver)
  }
  return () => {
    oyentes.delete(avisar)
    if (oyentes.size === 0) {
      clearInterval(temporizador)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', alVolver)
    }
  }
}

/** La hora del último tic. Sin nadie suscrito (primer pintado) no hay tic: se renueva si pasó un minuto. */
function horaActual() {
  if (oyentes.size === 0 && Date.now() - horaDelReloj >= MIN_MS) horaDelReloj = Date.now()
  return horaDelReloj
}

/**
 * La hora de ahora, renovada cada minuto sin pedir nada al servidor: basta para que
 * «hace 12 min» pase solo a «hace 13 min» con la pantalla abierta.
 *
 * OJO: re-renderiza a quien la use cada minuto. En una pantalla entera conviene usarla
 * solo en el componente que muestra el tiempo, y para recalcular la señal de una flota,
 * `useUnidadesAlDia` (que solo vuelve a pintar cuando una unidad cambia de verdad).
 */
export function useMinuto() {
  return useSyncExternalStore(suscribirReloj, horaActual, Date.now)
}

/**
 * La flota con la señal y la marcha al día (`conSenalAlDia`), recalculada con el reloj del
 * minuto. Devuelve el MISMO arreglo mientras ninguna unidad haya cambiado de estado (a los 5
 * min sin mensajes pasa a sin señal; a los 30 sin posición, a sin ubicación): la pantalla no se
 * vuelve a pintar cada minuto para nada, y el mapa no rehace sus marcadores. Las unidades que se
 * quedan Sin señal se anotan en la campana después de pintar, no mientras.
 */
export function useUnidadesAlDia(lista) {
  const memo = useRef({ lista: null, hora: 0, salida: null })
  const leer = () => {
    const hora = horaActual()
    const m = memo.current
    if (m.lista === lista && m.hora === hora && m.salida) return m.salida
    // Con la misma lista se recalcula sobre lo ya calculado: si nada cambió, sale el mismo objeto.
    const misma = m.lista === lista && m.salida
    const nueva = (lista ?? []).map((v, i) => conSenalAlDia(misma ? m.salida[i] : v, hora))
    const igual = misma && m.salida.length === nueva.length && nueva.every((v, i) => v === m.salida[i])
    memo.current = { lista, hora, salida: igual ? m.salida : nueva }
    return memo.current.salida
  }
  const salida = useSyncExternalStore(suscribirReloj, leer, leer)
  useEffect(() => { anotarCortes(salida, horaActual()) }, [salida])
  return salida
}
