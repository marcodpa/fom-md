// Geometría de la avenida por la que circula la unidad. Vive aparte porque la
// consumen dos escenas: el mobiliario de calle y las farolas del set de props.

import * as THREE from 'three'
import cityData from '../assets/cabimas-city.json'
import { m } from './cityTextures'

const PATH = cityData.path
const STEP = cityData.pathStep || 0.35

export const PATH_LEN = (PATH.length - 1) * STEP

// Prolongación recta de la polilínea por sus dos extremos, SÓLO para la
// geometría de la vía: la calzada, las aceras y los bordillos tienen que
// salirse de cuadro en vez de cortarse en seco a mitad de ciudad. El
// recorrido del vehículo sigue usando PATH sin tocar, así que ni truckPos ni
// la colocación de farolas cambian de origen.
const RIBBON_EXT = 14

function extendPath(path, ext) {
  const dir = (from, to) => {
    const dx = to[0] - from[0]
    const dz = to[1] - from[1]
    const l = Math.hypot(dx, dz) || 1
    return [dx / l, dz / l]
  }
  const a = path[0]
  const b = path[path.length - 1]
  const d0 = dir(path[1], a) // hacia fuera por el inicio
  const dn = dir(path[path.length - 2], b) // hacia fuera por el final
  return [
    [a[0] + d0[0] * ext, a[1] + d0[1] * ext],
    ...path,
    [b[0] + dn[0] * ext, b[1] + dn[1] * ext],
  ]
}

export const RIBBON_PATH = extendPath(PATH, RIBBON_EXT)

export const AVENUE_HW = 0.275 // media calzada (0.55 u ≈ 12 m: 4 carriles)
export const CURB_W = m(0.35)
export const WALK_W = m(3.2)

// Punto de la avenida a `d` unidades del inicio, con su tangente, su normal a
// la derecha del sentido de marcha y su rumbo.
export function sampleAt(d) {
  const f = d / STEP
  const i = Math.max(0, Math.min(PATH.length - 2, Math.floor(f)))
  const t = Math.max(0, Math.min(1, f - i))
  const a = PATH[i]
  const b = PATH[i + 1]
  const x = a[0] + (b[0] - a[0]) * t
  const z = a[1] + (b[1] - a[1]) * t
  let dx = b[0] - a[0]
  let dz = b[1] - a[1]
  const len = Math.hypot(dx, dz) || 1
  dx /= len
  dz /= len
  return { x, z, dx, dz, nx: -dz, nz: dx, yaw: Math.atan2(dx, dz) }
}

// Cinta paralela a la avenida, desplazada `offset` de su eje. Las UV son de
// calzada: u recorre el ancho (0 a 1) y v avanza con la longitud de arco, que
// es lo que esperan las texturas de vía. `flip` invierte u para que el
// bordillo de la textura de acera caiga siempre del lado de la calzada.
export function offsetRibbon(offset, width, y, tile = 0, flip = false) {
  const pos = []
  const uv = []
  const hw = width / 2
  let acc = 0
  for (let i = 0; i < RIBBON_PATH.length - 1; i++) {
    const a = RIBBON_PATH[i]
    const b = RIBBON_PATH[i + 1]
    let dx = b[0] - a[0]
    let dz = b[1] - a[1]
    const len = Math.hypot(dx, dz) || 1
    const nx = -dz / len
    const nz = dx / len
    const ax = a[0] + nx * offset
    const az = a[1] + nz * offset
    const bx = b[0] + nx * offset
    const bz = b[1] + nz * offset
    const va = tile ? acc / tile : 0
    acc += len
    const vb = tile ? acc / tile : 0
    const u0 = flip ? 1 : 0
    const u1 = flip ? 0 : 1
    const q = [
      [ax + nx * hw, y, az + nz * hw, u0, va],
      [ax - nx * hw, y, az - nz * hw, u1, va],
      [bx + nx * hw, y, bz + nz * hw, u0, vb],
      [bx - nx * hw, y, bz - nz * hw, u1, vb],
    ]
    for (const t of [q[0], q[2], q[1], q[1], q[2], q[3]]) {
      pos.push(t[0], t[1], t[2])
      uv.push(t[3], t[4])
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.computeVertexNormals()
  return geo
}
