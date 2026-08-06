// Corredor de la avenida por donde circula la unidad.
//
// Sólo estas manzanas se ven a nivel de calle, así que son las únicas que se
// sustituyen por modelos 3D reales: el resto de la ciudad sigue resuelto con
// cajas instanciadas, que es lo que permite dibujar 3.400 edificios.

import cityData from '../assets/cabimas-city.json'

// 2.2 u ≈ 49 m del eje: primera Y segunda fila a ambos lados, que es todo lo
// que entra en cuadro a nivel de calle. No pesa porque sólo se dibujan los
// que caen en la ventana móvil alrededor del vehículo (ver RealBuildings).
export const CORRIDOR_R = 2.2

const PATH = cityData.path
const STEP = cityData.pathStep || 0.35

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2))
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t))
}

// Distancia al recorrido, rumbo de la calle y posición a lo largo de él.
// `s` está en las mismas unidades que truckDistance(), así que sirve para
// saber si un edificio queda por delante o por detrás del vehículo.
export function nearestOnPath(x, z) {
  let best = Infinity
  let yaw = 0
  let s = 0
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i]
    const b = PATH[i + 1]
    const d = distToSegment(x, z, a[0], a[1], b[0], b[1])
    if (d < best) {
      best = d
      yaw = Math.atan2(b[0] - a[0], b[1] - a[1])
      // proyección sobre el segmento → avance dentro de él
      const dx = b[0] - a[0]
      const dz = b[1] - a[1]
      const len2 = dx * dx + dz * dz
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / len2))
      s = (i + t) * STEP
    }
  }
  return { dist: best, yaw, s }
}

// Partición única de la ciudad. El corredor se dibuja de DOS maneras según la
// distancia de cámara: como cajas en el plano aéreo (barato, y así la avenida
// no queda pelada) y como modelos 3D reales en el plano de calle. Nunca las
// dos a la vez.
const near = []
const far = []
for (const b of cityData.buildings) {
  const { dist, yaw, s } = nearestOnPath(b[0], b[1])
  if (dist < CORRIDOR_R) near.push({ b, yaw, dist, s })
  else far.push(b)
}

export const corridorBuildings = near

export const distantBuildings = far

// VENTANA de detalle, en unidades de recorrido (las de truckDistance).
// Dentro de ella mandan los modelos 3D reales; fuera, las cajas. Las dos
// mallas consultan este mismo rango cada frame, así que el relevo no deja
// hueco ni dibuja nada dos veces, y no hace falta un salto global de calidad
// que se notaría justo cuando la cámara está encima del vehículo.
const AHEAD = 15 // lo que alcanza la vista avenida abajo
const BEHIND = 3.5 // lo que queda por detrás de la cámara

export function detailWindow(d, out = [0, 0]) {
  out[0] = d - BEHIND
  out[1] = d + AHEAD
  return out
}
