// Kilómetros recorridos calculados desde las posiciones del GPS.
// Funciones puras. Entran puntos {lat, lng, hora, velocidadKmh?} CRUDOS, en cualquier orden.
//
// Por qué se calcula: muchos equipos no mandan lectura de odómetro (queda «Sin dato»), y el que sí la manda
// solo da el total acumulado, no cuánto se recorrió hoy o esta semana. Sumar tramos de GPS crudo daría de más
// (un GPS parado «baila» y suma metros sin ir a ninguna parte), así que antes se quitan los saltos y se
// colapsa la quietud, que es lo mismo que se hace para dibujar el recorrido.

import { compactarQuietud, distanciaM, quitarSaltos } from './recorrido.js'

const dia = (p) => String(p.hora ?? '').slice(0, 10)
const ordenar = (puntos) => [...(puntos ?? [])].filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.hora).sort((a, b) => Date.parse(a.hora) - Date.parse(b.hora))

/** Kilómetros que suman los tramos entre puntos limpios (sin saltos ni deriva de un GPS parado). */
export function kmRecorridos(puntos) {
  const limpios = compactarQuietud(quitarSaltos(ordenar(puntos)))
  let m = 0
  for (let i = 1; i < limpios.length; i++) m += distanciaM(limpios[i - 1], limpios[i])
  return m / 1000
}

/** Km por día (`YYYY-MM-DD`, tal como llega la hora del servidor). Un día sin puntos no aparece. */
export function kmPorDia(puntos) {
  const grupos = new Map()
  for (const p of ordenar(puntos)) grupos.set(dia(p), [...(grupos.get(dia(p)) ?? []), p])
  return [...grupos.entries()].map(([fecha, ps]) => ({ fecha, km: kmRecorridos(ps) }))
}

/**
 * Lo que se le dice al supervisor sobre el kilometraje de una unidad:
 *  - `lectura`: lo que marca el equipo, si manda odómetro. Es el total real y manda siempre.
 *  - `recorridoKm`: lo calculado del GPS en el lapso que se pidió (no es el odómetro total).
 *  - `hoyKm`: lo calculado del día `hoy`.
 */
export function resumenKm({ lectura = null, puntos = [], hoy }) {
  const porDia = kmPorDia(puntos)
  return {
    lectura: Number.isFinite(lectura) ? lectura : null,
    recorridoKm: porDia.reduce((s, d) => s + d.km, 0),
    hoyKm: porDia.find((d) => d.fecha === hoy)?.km ?? 0,
    dias: porDia.length,
  }
}
