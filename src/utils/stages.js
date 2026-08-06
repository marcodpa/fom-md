// Línea de tiempo maestra de la intro cinematográfica.
// Todo se deriva de un progreso de scroll normalizado p ∈ [0, 1].

import cityData from '../assets/cabimas-city.json'

export const CABIMAS = [30, 0, 15]

// Dirección inicial de la avenida (normalizada). El recorrido real usa la
// polilínea de la ciudad; esto queda como respaldo.
const _len = Math.hypot(1, 0.2)
export const ROAD_DIR = [1 / _len, 0, 0.2 / _len]

export const TRUCK_START = 0.56

export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function smooth(t) {
  t = clamp01(t)
  return t * t * (3 - 2 * t)
}

export function range(p, a, b) {
  return clamp01((p - a) / (b - a))
}

// 0 antes de a, sube a→b, se mantiene 1 entre b→c, baja c→d
export function fade(p, a, b, c, d) {
  if (p <= a || p >= d) return 0
  if (p < b) return smooth(range(p, a, b))
  if (p > c) return 1 - smooth(range(p, c, d))
  return 1
}

// Recorrido total de la unidad, en unidades de escena.
export const TRUCK_TRAVEL = 26

export function truckDistance(p) {
  return smooth(range(p, TRUCK_START, 1)) * TRUCK_TRAVEL
}

// Avance normalizado 0→1. Los overlays de telemetría se enganchan a ESTO y no
// al progreso de scroll: así los datos van saliendo al ritmo real al que se
// mueve la camioneta, con su aceleración y su frenada, en vez de a un ritmo
// lineal que no concuerda con lo que se ve.
export function truckAdvance(p) {
  return smooth(range(p, TRUCK_START, 1))
}

export function truckSpeed(p) {
  // derivada aproximada, útil para efectos de movimiento
  const h = 0.004
  return (truckDistance(p + h) - truckDistance(Math.max(0, p - h))) / (2 * h)
}

// El vehículo sigue la polilínea REAL de la Avenida 4 Bella Vista (con su
// curva), remuestreada a paso constante en el generador de la ciudad.
const PATH = cityData.path
const PATH_STEP = cityData.pathStep || 0.35

export function truckPos(p, out = [0, 0, 0]) {
  const d = truckDistance(p)
  if (PATH && PATH.length > 1) {
    const f = d / PATH_STEP
    const i = Math.max(0, Math.min(PATH.length - 2, Math.floor(f)))
    const t = clamp01(f - i)
    const a = PATH[i]
    const b = PATH[i + 1]
    out[0] = a[0] + (b[0] - a[0]) * t
    out[1] = 0
    out[2] = a[1] + (b[1] - a[1]) * t
    return out
  }
  out[0] = CABIMAS[0] + ROAD_DIR[0] * d
  out[1] = 0
  out[2] = CABIMAS[2] + ROAD_DIR[2] * d
  return out
}

// Rumbo (rotación Y) para un modelo cuyo frente mira a +Z
export function truckHeading(p) {
  if (PATH && PATH.length > 1) {
    const f = truckDistance(p) / PATH_STEP
    const i = Math.max(0, Math.min(PATH.length - 2, Math.floor(f)))
    const a = PATH[i]
    const b = PATH[Math.min(PATH.length - 1, i + 1)]
    return Math.atan2(b[0] - a[0], b[1] - a[1])
  }
  return Math.atan2(ROAD_DIR[0], ROAD_DIR[2])
}

// Claves de cámara. `rel: true` = posición/mirada relativas al vehículo.
// La intro termina en un plano 3/4 del vehículo (sin entrar en él): la cámara
// se acerca durante la telemetría y retrocede levemente para el cierre.
const KEYS = [
  // Vista 3D a ras tipo Google Earth: la ciudad llena la pantalla y se pierde
  // en la niebla; nunca se ve el borde del mapa.
  { t: 0.0, pos: [12, 26, 62], look: [34, 4, 12], fov: 58, near: 0.1 },
  { t: 0.15, pos: [16, 26, 50], look: [32, 3, 14], fov: 55, near: 0.1 },
  { t: 0.3, pos: [17, 26, 44], look: [30, 2, 15], fov: 52, near: 0.1 },
  { t: 0.42, pos: [16, 20, 34], look: [30, 1, 15], fov: 51, near: 0.1 },
  { t: 0.54, pos: [24, 5, 20], look: [30, 0.5, 15], fov: 49, near: 0.1 },
  // La cámara se adelanta al vehículo y se acerca a escala real: lo vemos de
  // FRENTE avanzando hacia ella (distancias en decenas de metros, no en km).
  // pos = [derecha, arriba, adelante] respecto al vehículo. Adelante > 0 hace
  // que la cámara se anticipe y veamos la camioneta de FRENTE.
  { t: 0.66, rel: true, pos: [0.34, 0.4, 1.0], look: [0, 0.06, 0], fov: 50, near: 0.02 },
  { t: 0.78, rel: true, pos: [0.17, 0.13, 0.44], look: [0, 0.055, 0], fov: 46, near: 0.012 },
  { t: 0.87, rel: true, pos: [0.1, 0.088, 0.28], look: [0, 0.058, 0.1], fov: 44, near: 0.006 },
  // Cruza el parabrisas
  { t: 0.94, rel: true, pos: [0.02, 0.079, 0.12], look: [0.019, 0.07, 0.9], fov: 56, near: 0.0035 },
  // PUESTO DE CONDUCCIÓN.
  // OJO CON EL SIGNO DE pos[0]: NO es la derecha del vehículo, es la
  // IZQUIERDA. Con rumbo +Z, resolveKey manda pos[0]=+1 a +X, y el lado
  // derecho real de un vehículo que avanza hacia +Z es -X. El puesto de
  // conducción (ya espejado a la izquierda en VehicleScene) va por tanto en
  // pos[0] POSITIVO.
  // El avance va en POSITIVO: en una pick-up la cabina está por delante del
  // centro del vehículo y la batea ocupa la parte de atrás; con avance
  // negativo la cámara acababa entre los asientos traseros.
  // Retrasada respecto al ojo del conductor: la cámara se echa atrás para que
  // entre el salpicadero completo con la pantalla de infoentretenimiento, no
  // sólo el volante. Baja un pelín y mira algo más abajo para encuadrarla.
  { t: 1.0, rel: true, pos: [0.019, 0.076, 0.025], look: [0.019, 0.062, 1.4], fov: 66, near: 0.0022 },
]

const _tp = [0, 0, 0]

function resolveKey(key, p, out) {
  if (key.rel) {
    // Offsets en el MARCO DEL VEHÍCULO: x = derecha, y = arriba, z = adelante.
    // Así la cámara se mantiene delante aunque la avenida describa su curva.
    truckPos(p, _tp)
    const h = truckHeading(p)
    const c = Math.cos(h)
    const s = Math.sin(h)
    const px = key.pos[0] * c + key.pos[2] * s
    const pz = -key.pos[0] * s + key.pos[2] * c
    const lx = key.look[0] * c + key.look[2] * s
    const lz = -key.look[0] * s + key.look[2] * c
    out[0] = _tp[0] + px
    out[1] = _tp[1] + key.pos[1]
    out[2] = _tp[2] + pz
    out[3] = _tp[0] + lx
    out[4] = _tp[1] + key.look[1]
    out[5] = _tp[2] + lz
  } else {
    out[0] = key.pos[0]
    out[1] = key.pos[1]
    out[2] = key.pos[2]
    out[3] = key.look[0]
    out[4] = key.look[1]
    out[5] = key.look[2]
  }
  return out
}

const _a = [0, 0, 0, 0, 0, 0]
const _b = [0, 0, 0, 0, 0, 0]

export function cameraState(p, out) {
  p = clamp01(p)
  let i = 0
  while (i < KEYS.length - 2 && p > KEYS[i + 1].t) i++
  const ka = KEYS[i]
  const kb = KEYS[i + 1]
  const t = smooth(range(p, ka.t, kb.t))
  resolveKey(ka, p, _a)
  resolveKey(kb, p, _b)
  for (let j = 0; j < 6; j++) out[j] = _a[j] + (_b[j] - _a[j]) * t
  out[6] = ka.fov + (kb.fov - ka.fov) * t
  // El plano cercano viaja con la cámara. Fijo en 0.1 recortaría toda la
  // cabina (el salpicadero queda a 0.5 m del ojo = 0.023 u); fijo en 0.002
  // para toda la intro arruinaría la precisión de profundidad en el plano
  // aéreo, donde las calcomanías de calle se separan por milésimas.
  out[7] = ka.near + (kb.near - ka.near) * t
  return out
}

// Generador determinista (misma ciudad en cada carga)
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const DISTRICTS = [
  { name: 'Maracaibo', pos: [-62, 0, -30], radius: 24, density: 1, maxH: 17, vehicles: 10 },
  { name: 'Cabimas', pos: [30, 0, 15], radius: 17, density: 0.8, maxH: 11, vehicles: 8 },
  { name: 'Ciudad Ojeda', pos: [54, 0, -26], radius: 13, density: 0.6, maxH: 9, vehicles: 5 },
  { name: 'Lagunillas', pos: [78, 0, -50], radius: 11, density: 0.5, maxH: 7, vehicles: 3 },
]

// Lago de Maracaibo (franja entre la capital y la Costa Oriental)
export const LAKE = { minX: -42, maxX: 6, minZ: -95, maxZ: 95 }

export function inLake(x, z) {
  return x > LAKE.minX && x < LAKE.maxX && z > LAKE.minZ && z < LAKE.maxZ
}

// Distancia de un punto a la línea de la Avenida Intercomunal
export function distToAvenue(x, z) {
  const dx = x - CABIMAS[0]
  const dz = z - CABIMAS[2]
  const t = dx * ROAD_DIR[0] + dz * ROAD_DIR[2]
  const px = CABIMAS[0] + ROAD_DIR[0] * t
  const pz = CABIMAS[2] + ROAD_DIR[2] * t
  return Math.hypot(x - px, z - pz)
}
