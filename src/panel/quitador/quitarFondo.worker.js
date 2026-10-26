// ============================================================
// EL TRABAJADOR que quita el fondo (T-179), aparte de la página.
// ------------------------------------------------------------
// Corre en un Web Worker para no congelar la web: IS-Net tarda unos 6 s con
// la tarjeta gráfica (WebGPU) y 30–40 s solo con el procesador (WASM).
//
// El modelo y el motor se sirven desde NUESTRA web (/modelos/ y /ort/, ver
// scripts/bajar-modelo.mjs): la foto no sale del equipo y no se depende de
// ningún CDN ajeno. Se bajan una vez con barra de progreso real y se guardan
// en la caché del navegador (Cache Storage); las siguientes veces ya están.
//
// Sin COOP/COEP la página no está «aislada», así que WASM va con 1 hilo.
//
// Mensajes:  ← { tipo: 'quitar', archivo, base }
//            → { tipo: 'progreso', fase: 'bajando', llevado, total }
//            → { tipo: 'progreso', fase: 'quitando', proveedor }
//            → { tipo: 'listo', blob, avisos, tiempos, proveedor, cobertura }
//            → { tipo: 'error', motivo }
// ============================================================

import * as ort from 'onnxruntime-web/webgpu'
import { LIENZO, caja, encaje, limpiar, normalizar, revisar } from './mascara'

const CACHE = 'fom-quitador-fondo-v1'
// La `v` cambia si cambia el archivo (huella en scripts/bajar-modelo.mjs y versión de onnxruntime-web):
// así ni la caché del navegador ni la del servidor sirven uno viejo.
const ARCHIVOS = {
  modelo: 'modelos/isnet-fp16.onnx?v=fbb5c080',
  motor: 'ort/ort-wasm-simd-threaded.asyncify.wasm?v=1.30.0',
}
/** Lado de entrada de IS-Net y de la foto de trabajo (como la que se sube). */
const LADO_RED = 1024
const LADO_TRABAJO = 1600

ort.env.logLevel = 'error'
ort.env.wasm.numThreads = 1

let sesion = null // Promise<{ sesion, proveedor }>

/** Error con un motivo que la ventana sabe contar en llano. */
const fallo = (motivo, detalle) => Object.assign(new Error(detalle || motivo), { motivo })

/**
 * Baja un archivo de nuestra web con progreso, o lo saca de la caché si ya se
 * bajó antes. Si el servidor devuelve la página (falta el archivo), se avisa.
 */
async function obtener(url, alAvanzar) {
  let cache = null
  try { cache = await caches.open(CACHE) } catch { /* sin Cache Storage (http): se baja cada vez */ }
  const guardada = await cache?.match(url).catch(() => null)
  if (guardada) {
    const datos = await guardada.arrayBuffer()
    alAvanzar(datos.byteLength, datos.byteLength)
    return datos
  }
  let r
  try {
    r = await fetch(url)
  } catch {
    throw fallo('red')
  }
  const tipo = r.headers.get('content-type') || ''
  if (!r.ok || /text\/html/i.test(tipo)) throw fallo('falta', `No está ${url} en el servidor (${r.status}).`)
  const total = Number(r.headers.get('content-length')) || 0
  alAvanzar(0, total)
  const lector = r.body.getReader()
  const trozos = []
  let llevado = 0
  for (;;) {
    let paso
    try { paso = await lector.read() } catch { throw fallo('red') }
    if (paso.done) break
    trozos.push(paso.value)
    llevado += paso.value.length
    alAvanzar(llevado, total)
  }
  const datos = new Uint8Array(llevado)
  let i = 0
  for (const t of trozos) { datos.set(t, i); i += t.length }
  // Se guarda para la próxima vez; si no cabe, no pasa nada.
  await cache?.put(url, new Response(datos, { headers: { 'content-type': tipo || 'application/octet-stream' } })).catch(() => {})
  return datos.buffer
}

async function prepararSesion(base) {
  // Las dos descargas a la vez, con una sola barra.
  const avance = { modelo: [0, 0], motor: [0, 0] }
  let ultimo = 0
  const contar = (cual) => (llevado, total) => {
    avance[cual] = [llevado, total]
    const l = avance.modelo[0] + avance.motor[0]
    const t = avance.modelo[1] && avance.motor[1] ? avance.modelo[1] + avance.motor[1] : 0
    // Unas diez veces por segundo basta para que la barra avance suave.
    const ahora = performance.now()
    if (ahora - ultimo < 100 && l !== t) return
    ultimo = ahora
    self.postMessage({ tipo: 'progreso', fase: 'bajando', llevado: l, total: t })
  }
  const [modelo, motor] = await Promise.all([
    obtener(base + ARCHIVOS.modelo, contar('modelo')),
    obtener(base + ARCHIVOS.motor, contar('motor')),
  ])
  ort.env.wasm.wasmBinary = motor
  const opciones = { graphOptimizationLevel: 'all' }
  // WebGPU si la tarjeta lo permite; si no (o falla al crear), el procesador.
  if (self.navigator?.gpu) {
    try {
      const adaptador = await self.navigator.gpu.requestAdapter()
      if (adaptador) {
        const s = await ort.InferenceSession.create(new Uint8Array(modelo), { ...opciones, executionProviders: ['webgpu'] })
        return { sesion: s, proveedor: 'webgpu' }
      }
    } catch { /* sin WebGPU utilizable: se sigue con WASM */ }
  }
  const s = await ort.InferenceSession.create(new Uint8Array(modelo), { ...opciones, executionProviders: ['wasm'] })
  return { sesion: s, proveedor: 'wasm' }
}

async function leerFoto(archivo) {
  try {
    return await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    try { return await createImageBitmap(archivo) } catch { throw fallo('foto') }
  }
}

/** La foto reducida a 1024 × 1024 como la espera IS-Net: (valor/255 − 0,5), canales separados. */
function aTensor(foto) {
  const n = LADO_RED
  const lienzo = new OffscreenCanvas(n, n)
  const g = lienzo.getContext('2d', { willReadFrequently: true })
  g.imageSmoothingQuality = 'high'
  g.drawImage(foto, 0, 0, n, n)
  const px = g.getImageData(0, 0, n, n).data
  const datos = new Float32Array(3 * n * n)
  for (let p = 0, i = 0; p < n * n; p++, i += 4) {
    datos[p] = px[i] / 255 - 0.5
    datos[n * n + p] = px[i + 1] / 255 - 0.5
    datos[2 * n * n + p] = px[i + 2] / 255 - 0.5
  }
  return new ort.Tensor('float32', datos, [1, 3, n, n])
}

/** La foto con la máscara como transparencia, recortada a la unidad y puesta en el lienzo 8:5 con su sombra. */
async function componer(foto, mascara) {
  const n = LADO_RED
  const c = caja(mascara, n)
  if (!c) throw fallo('vacia')
  // La máscara como canal alfa.
  const lienzoMascara = new OffscreenCanvas(n, n)
  const gm = lienzoMascara.getContext('2d')
  const im = gm.createImageData(n, n)
  for (let p = 0; p < n * n; p++) {
    im.data[p * 4] = 255
    im.data[p * 4 + 1] = 255
    im.data[p * 4 + 2] = 255
    im.data[p * 4 + 3] = Math.round(mascara[p] * 255)
  }
  gm.putImageData(im, 0, 0)
  // La foto a tamaño de trabajo, solo donde la máscara deja ver.
  const escala = Math.min(1, LADO_TRABAJO / Math.max(foto.width, foto.height))
  const W = Math.round(foto.width * escala)
  const H = Math.round(foto.height * escala)
  const trabajo = new OffscreenCanvas(W, H)
  const gt = trabajo.getContext('2d')
  gt.imageSmoothingQuality = 'high'
  gt.drawImage(foto, 0, 0, W, H)
  gt.globalCompositeOperation = 'destination-in'
  gt.drawImage(lienzoMascara, 0, 0, W, H)
  // La caja de la unidad, de la máscara (1024) a la foto de trabajo.
  const sx = Math.max(0, Math.floor((c.x0 / n) * W))
  const sy = Math.max(0, Math.floor((c.y0 / n) * H))
  const sw = Math.min(W, Math.ceil((c.x1 / n) * W)) - sx
  const sh = Math.min(H, Math.ceil((c.y1 / n) * H)) - sy
  const e = encaje(sw, sh)
  const final = new OffscreenCanvas(LIENZO.ancho, LIENZO.alto)
  const g = final.getContext('2d')
  // Sombra de contacto: una elipse suave bajo las ruedas, como las del catálogo.
  g.save()
  const rx = e.ancho * 0.5
  const ry = Math.max(8, e.ancho * 0.045)
  g.translate(e.x + e.ancho / 2, e.suelo - ry * 0.35)
  g.scale(1, ry / rx)
  const sombra = g.createRadialGradient(0, 0, 0, 0, 0, rx)
  sombra.addColorStop(0, 'rgba(0,0,0,0.55)')
  sombra.addColorStop(0.6, 'rgba(0,0,0,0.25)')
  sombra.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = sombra
  g.beginPath()
  g.arc(0, 0, rx, 0, Math.PI * 2)
  g.fill()
  g.restore()
  g.imageSmoothingQuality = 'high'
  g.drawImage(trabajo, sx, sy, sw, sh, e.x, e.y, e.ancho, e.alto)
  // WebP con transparencia; el navegador que no sabe escribir WebP entrega PNG.
  return final.convertToBlob({ type: 'image/webp', quality: 0.9 })
}

async function quitar(archivo, base) {
  const tiempos = {}
  let t0 = performance.now()
  if (!sesion) sesion = prepararSesion(base)
  let lista
  try {
    lista = await sesion
  } catch (e) {
    sesion = null // la próxima vez se reintenta desde cero
    throw e
  }
  tiempos.preparar = performance.now() - t0
  self.postMessage({ tipo: 'progreso', fase: 'quitando', proveedor: lista.proveedor })

  t0 = performance.now()
  const foto = await leerFoto(archivo)
  try {
    const entrada = aTensor(foto)
    const res = await lista.sesion.run({ [lista.sesion.inputNames[0]]: entrada })
    const salida = res[lista.sesion.outputNames[0]]
    tiempos.red = performance.now() - t0
    t0 = performance.now()
    const mascara = normalizar(salida.data)
    for (const t of Object.values(res)) t.dispose?.()
    const { cobertura } = limpiar(mascara, LADO_RED)
    const avisos = revisar(mascara, LADO_RED, cobertura)
    const blob = await componer(foto, mascara)
    tiempos.armar = performance.now() - t0
    return { blob, avisos, tiempos, proveedor: lista.proveedor, cobertura }
  } finally {
    foto.close?.()
  }
}

self.onmessage = async (e) => {
  const { tipo, archivo, base } = e.data || {}
  if (tipo !== 'quitar') return
  try {
    const r = await quitar(archivo, base)
    self.postMessage({ tipo: 'listo', ...r })
  } catch (err) {
    self.postMessage({ tipo: 'error', motivo: err?.motivo || 'otro', detalle: String(err?.message || err) })
  }
}
