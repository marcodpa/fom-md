// Análisis del recorrido de una unidad: paradas, viajes y cola reciente.
// Funciones puras (sin red ni DOM) para poder probarlas y usarlas desde cualquier mapa.
//
// Entran puntos {lat, lng, hora, velocidadKmh?} en orden del más antiguo al más reciente.
// OJO: aquí deben entrar los puntos CRUDOS. El trazado que se dibuja ya pasó por el filtro
// de deriva (repoApi.sinDeriva), que borra los puntos de un GPS parado; con ellos fuera, el
// tiempo que estuvo estacionada la unidad desaparece.

/** Una unidad que se queda en el mismo sitio al menos esto (minutos) está estacionada. */
export const MIN_PARADA_MIN = 5
/** «El mismo sitio»: radio, en metros, alrededor del punto donde empezó la parada. */
export const RADIO_PARADA_M = 60
/** Un viaje más corto que esto (metros) es ruido del GPS, no un viaje. */
const MIN_VIAJE_M = 150
/** Ventana de la cola que se muestra sin pedir el recorrido completo. */
export const COLA_MIN = 5

const RADIO_TIERRA_M = 6371000
const rad = (g) => (g * Math.PI) / 180

/** Distancia en metros entre dos puntos (fórmula de haversine). */
export function distanciaM(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

const tiempo = (p) => Date.parse(p.hora)
const minutosEntre = (a, b) => Math.max(0, (tiempo(b) - tiempo(a)) / 60000)

function validos(puntos) {
  return (puntos ?? [])
    .filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(tiempo(p)))
    .sort((a, b) => tiempo(a) - tiempo(b))
}

function largo(puntos) {
  let m = 0
  for (let i = 1; i < puntos.length; i++) m += distanciaM(puntos[i - 1], puntos[i])
  return m
}

/**
 * Busca los tramos en que la unidad no salió de un radio de `radioM` durante al menos
 * `minParadaMin` minutos. Devuelve cada parada con su sitio (centro de los puntos),
 * cuándo empezó y terminó, cuánto duró, y los índices de los puntos que abarca.
 */
export function detectarParadas(puntos, { minParadaMin = MIN_PARADA_MIN, radioM = RADIO_PARADA_M } = {}) {
  const p = validos(puntos)
  const paradas = []
  let i = 0
  while (i < p.length) {
    let j = i
    while (j + 1 < p.length && distanciaM(p[i], p[j + 1]) <= radioM) j++
    if (j > i && minutosEntre(p[i], p[j]) >= minParadaMin) {
      const tramo = p.slice(i, j + 1)
      const lat = tramo.reduce((s, x) => s + x.lat, 0) / tramo.length
      const lng = tramo.reduce((s, x) => s + x.lng, 0) / tramo.length
      paradas.push({
        lat,
        lng,
        desde: p[i].hora,
        hasta: p[j].hora,
        minutos: minutosEntre(p[i], p[j]),
        primero: i,
        ultimo: j,
      })
      i = j + 1
    } else {
      i++
    }
  }
  return { puntos: p, paradas }
}

/**
 * Parte el recorrido en viajes (de parada a parada). Cada viaje trae su inicio y su fin;
 * `fin.enCurso` es cierto cuando el viaje llega hasta el último punto y la unidad no está
 * estacionada: sigue en camino, no ha «terminado».
 */
export function analizar(puntos, opciones) {
  const { puntos: p, paradas } = detectarParadas(puntos, opciones)
  const viajes = []
  const cortes = []
  let desde = 0
  for (const s of paradas) {
    cortes.push([desde, s.primero])
    desde = s.ultimo
  }
  cortes.push([desde, p.length - 1])

  for (const [a, b] of cortes) {
    if (b <= a) continue
    const tramo = p.slice(a, b + 1)
    const distancia = largo(tramo)
    if (distancia < MIN_VIAJE_M) continue
    const ultimo = tramo.at(-1)
    viajes.push({
      numero: viajes.length + 1,
      puntos: tramo,
      distanciaM: distancia,
      minutos: minutosEntre(tramo[0], ultimo),
      inicio: { lat: tramo[0].lat, lng: tramo[0].lng, hora: tramo[0].hora },
      fin: { lat: ultimo.lat, lng: ultimo.lng, hora: ultimo.hora, enCurso: b === p.length - 1 },
    })
  }
  return { puntos: p, paradas, viajes }
}

/** Los últimos `min` minutos de recorrido, contados hasta el último punto conocido. */
export function ultimosMinutos(puntos, min = COLA_MIN) {
  const p = validos(puntos)
  if (p.length === 0) return []
  const corte = tiempo(p.at(-1)) - min * 60000
  const cola = p.filter((x) => tiempo(x) >= corte)
  // Con un solo punto no hay línea que dibujar; se suma el anterior si lo hay.
  return cola.length < 2 && p.length >= 2 ? p.slice(-2) : cola
}

/** El punto del trazado más cercano a un lugar (donde se hizo clic). */
export function puntoEnRuta(puntos, lugar) {
  let mejor = null
  let mejorD = Infinity
  puntos.forEach((x, indice) => {
    const d = distanciaM(x, lugar)
    if (d < mejorD) {
      mejorD = d
      mejor = { ...x, indice, distanciaM: d }
    }
  })
  return mejor
}

/** Resumen de una lista de viajes y paradas para el encabezado del recorrido. */
export function resumen({ viajes = [], paradas = [] }) {
  return {
    viajes: viajes.length,
    km: viajes.reduce((s, v) => s + v.distanciaM, 0) / 1000,
    paradas: paradas.length,
    minutosParada: paradas.reduce((s, x) => s + x.minutos, 0),
  }
}
