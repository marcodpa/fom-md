// Texturas de ciudad generadas en canvas: cero peso de descarga y se ven
// mucho más reales que un color plano cuando la cámara baja a nivel de calle.
//
// ESCALA: el vehículo mide 0.24 u y una Hilux real 5.3 m, así que
// 1 unidad de escena ≈ 22 m. Todos los tamaños de aquí usan esa referencia.

import * as THREE from 'three'
import { mulberry32 } from './stages'

export const U = 22.2 // metros por unidad de escena
export const m = (meters) => meters / U

// Color por encima de 1 (HDR). El bloom corre antes del tone mapping, así que
// sólo lo que emite >1 cruza el umbral: es como se distingue una farola
// encendida de una carrocería roja bien iluminada.
export function hdrGlow(hex, k = 2.4) {
  return new THREE.Color(hex).multiplyScalar(k)
}

function canvas(size) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  return c
}

function finish(c, aniso = 8) {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.anisotropy = aniso
  t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}

// Asfalto: color y normal a partir del mismo ruido. Con las farolas encima,
// el brillo especular sobre la calzada es lo que la hace parecer real.
export function makeAsphaltTextures(seed = 37) {
  const S = 256
  const rng = mulberry32(seed)
  const col = canvas(S)
  const nrm = canvas(S)
  const g = col.getContext('2d')
  const n = nrm.getContext('2d')

  g.fillStyle = '#3a4152'
  g.fillRect(0, 0, S, S)

  const height = new Float32Array(S * S)
  for (let i = 0; i < 26000; i++) {
    const x = (rng() * S) | 0
    const y = (rng() * S) | 0
    const r = 1 + rng() * 2.2
    const v = rng()
    height[y * S + x] = v
    g.fillStyle = `rgba(${(v * 90 + 30) | 0},${(v * 96 + 36) | 0},${(v * 112 + 48) | 0},0.5)`
    g.beginPath()
    g.arc(x, y, r, 0, 6.2832)
    g.fill()
  }
  // parches de reasfaltado y manchas de rodadura
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(28,34,46,${0.12 + rng() * 0.18})`
    g.beginPath()
    g.ellipse(rng() * S, rng() * S, 18 + rng() * 46, 10 + rng() * 30, rng() * 3.14, 0, 6.2832)
    g.fill()
  }

  // normal map a partir del campo de alturas (Sobel simplificado)
  const img = n.createImageData(S, S)
  const at = (x, y) => height[((y + S) % S) * S + ((x + S) % S)]
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = at(x + 1, y) - at(x - 1, y)
      const dy = at(x, y + 1) - at(x, y - 1)
      const i = (y * S + x) * 4
      img.data[i] = 128 + dx * 90
      img.data[i + 1] = 128 + dy * 90
      img.data[i + 2] = 255
      img.data[i + 3] = 255
    }
  }
  n.putImageData(img, 0, 0)

  const map = finish(col, 16)
  const normalMap = new THREE.CanvasTexture(nrm)
  normalMap.wrapS = THREE.RepeatWrapping
  normalMap.wrapT = THREE.RepeatWrapping
  normalMap.anisotropy = 16
  normalMap.needsUpdate = true

  return { map, normalMap }
}

// Charco de luz de una farola (aditivo sobre la calzada).
export function makeLightPoolTexture() {
  const S = 128
  const c = canvas(S)
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  // Contenido: un charco por farola, y se solapan. Con alfa alto la calle
  // entera vira a naranja y se pierde la noche azul.
  grd.addColorStop(0, 'rgba(255,240,216,0.44)')
  grd.addColorStop(0.35, 'rgba(250,232,198,0.13)')
  grd.addColorStop(1, 'rgba(245,225,190,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, S, S)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}
