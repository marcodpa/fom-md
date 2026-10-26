// ============================================================
// EL DÍA DE LA UNIDAD DEL CONDUCTOR (T-170): km recorridos hoy y tiempo en
// marcha, con el MISMO análisis del recorrido que usa el supervisor en el
// Centro de control (`analizar`): los km son la suma de los viajes y el tiempo
// en marcha, lo que duraron. Es el gemelo de `use-recorrido-hoy.ts` de la app.
// ============================================================
import { analizar } from './recorrido'

/** Medianoche de hoy en la hora del navegador (ms). */
export function inicioDeHoy(ahora = Date.now()) {
  const d = new Date(ahora)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Las horas que van de hoy, redondeadas hacia arriba: lo que se le pide al recorrido. */
export function horasDeHoy(ahora = Date.now()) {
  return Math.max(1, Math.ceil((ahora - inicioDeHoy(ahora)) / 3600000))
}

/**
 * Km y minutos en marcha de HOY a partir de las posiciones crudas (del más
 * antiguo al más reciente). Sin puntos de hoy, ceros: la unidad no salió.
 */
export function resumenDeHoy(puntos, ahora = Date.now()) {
  const desde = inicioDeHoy(ahora)
  const deHoy = (puntos ?? []).filter((p) => Date.parse(p?.hora) >= desde)
  const { viajes } = analizar(deHoy)
  return {
    km: viajes.reduce((s, v) => s + v.distanciaM, 0) / 1000,
    minutos: viajes.reduce((s, v) => s + v.minutos, 0),
  }
}

/** «42,6»; sin dato, «—». */
export function textoKm(km) {
  if (km == null || !Number.isFinite(km)) return '—'
  return (Math.round(km * 10) / 10).toFixed(1).replace('.', ',')
}

/**
 * El tiempo en marcha partido en cifra grande y unidad chica, como la maqueta:
 * «1 h 18» + «min», «45» + «min», «2» + «h». Sin dato, «—».
 */
export function partesTiempo(minutos) {
  if (minutos == null || !Number.isFinite(minutos)) return { cifra: '—', unidad: '' }
  const m = Math.round(minutos)
  if (m < 60) return { cifra: String(m), unidad: 'min' }
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? { cifra: `${h} h ${r}`, unidad: 'min' } : { cifra: String(h), unidad: 'h' }
}

/** «1 h 18 min»; sin dato, «—». */
export function textoTiempo(minutos) {
  const p = partesTiempo(minutos)
  return p.unidad ? `${p.cifra} ${p.unidad}` : p.cifra
}
