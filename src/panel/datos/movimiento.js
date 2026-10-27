// ============================================================
// MARCHA POR POSICIÓN — «En marcha» o «Detenida» de una unidad que SÍ reporta
// ------------------------------------------------------------
// Regla de Marco: el GPS siempre tiene corriente, así que si reporta pero su
// posición no cambia hace más de 3 minutos, el carro está apagado = Detenida.
// Si la posición cambia, va en marcha.
//
// La API no trae «última vez que se movió»: `motionState` sale de la velocidad
// y, mientras la base no la guarde, llega nulo. Por eso se decide aquí, en el
// cliente, con lo que se ve: la última posición de cada unidad y desde cuándo
// no cambia. Sirve lo que la pantalla alcanza a ver (cada lectura de la flota).
// ============================================================

/** Cuánto tiempo quieta (misma posición) hace falta para decir «Detenida». */
export const DETENIDA_MS = 3 * 60_000

/** El ruido normal del GPS parado (unos metros) no cuenta como moverse. */
const SALTO_M = 25

const vistos = new Map() // id de unidad → { lat, lng, movidoEn, desde }

/** Olvida lo visto (para las pruebas). */
export function olvidarMovimiento() {
  vistos.clear()
}

/** Distancia aproximada en metros entre dos puntos cercanos. */
function metros(a, b) {
  const kmLat = 111.32
  const dLat = (b.lat - a.lat) * kmLat
  const dLng = (b.lng - a.lng) * kmLat * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
  return Math.hypot(dLat, dLng) * 1000
}

/**
 * La marcha de una unidad que reporta: 'en_marcha', 'parada', o `null` si todavía
 * no se puede afirmar nada (primera lectura, sin velocidad). Cada llamada con la
 * misma lectura da lo mismo: solo guarda la posición cuando cambia.
 */
export function marchaPorPosicion(v, ahora = Date.now()) {
  if (!v?.id) return null
  const hayPosicion = Number.isFinite(v.lat) && Number.isFinite(v.lng)
  let h = vistos.get(v.id)
  if (hayPosicion) {
    if (!h) {
      h = { lat: v.lat, lng: v.lng, movidoEn: null, desde: ahora }
      vistos.set(v.id, h)
    } else if (metros(h, v) > SALTO_M) {
      h.lat = v.lat
      h.lng = v.lng
      h.movidoEn = ahora
      h.desde = ahora
    }
  }
  // Con velocidad real, va rodando.
  if (Number.isFinite(v.velocidadKmh) && v.velocidadKmh > 0) {
    if (h) h.movidoEn = ahora
    return 'en_marcha'
  }
  // Su posición cambió hace poco: sigue en marcha (un semáforo no la detiene).
  if (h?.movidoEn != null && ahora - h.movidoEn < DETENIDA_MS) return 'en_marcha'
  // Lo que ya dice el servidor, si lo dice.
  if (v.estadoMarcha === 'en_marcha' || v.estadoMarcha === 'parada') return v.estadoMarcha
  // Sin dato del servidor: la posición lleva 3 minutos o más sin cambiar.
  if (h && ahora - (h.movidoEn ?? h.desde) >= DETENIDA_MS) return 'parada'
  return null
}
