import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { build } from 'vite'
import {
  configurarCloudinary, limpiarFoto, olvidarFotos, quitarMetadatos, subirImagen,
} from '../src/panel/datos/cloudinary.js'

// ============================================================
// T-176: las fotos salen sin ubicación
//  · antes de subir, la foto se vuelve a dibujar en un lienzo (sin EXIF,
//    girada, 1600 px de lado como mucho, calidad 0,85);
//  · sin lienzo, los metadatos se quitan byte a byte;
//  · los PDF no se tocan.
// Las imágenes son de verdad: 4×2 px que exportó Chrome desde un canvas.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const ruta = (r) => join(raiz, r).replace(/\\/g, '/')
const b64 = (s) => new Uint8Array(Buffer.from(s, 'base64'))

const JPEG = b64('/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAACAAQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAaEAEAAQUAAAAAAAAAAAAAAAAAAgQGNoKy/8QAFQEBAQAAAAAAAAAAAAAAAAAAAwj/xAAdEQAABgMBAAAAAAAAAAAAAAAAAgMFBnM1NrKz/9oADAMBAAIRAxEAPwCALxyOr04iAuOIa220JeZQMpz7hcr2Yf/Z')
const PNG = b64('iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAGElEQVR4AWI6w8DwH4QZGM78B2EmBjQAAAAA//+de3JTAAAABklEQVQDALMIBzGpKU1fAAAAAElFTkSuQmCC')
const WEBP = b64('UklGRkACAABXRUJQVlA4WAoAAAAgAAAAAwAAAQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZWUDggUgAAAHADAJ0BKgQAAgAAwBIlqAJ0ugFAA/ACtAP4BlAH6AAt2suogAD+/40bnB/gCx/+oLxDA7N//jJP/1BeIYHZv/4yT/aS5l3LfMPFLrzr190QAAA=')

const unir = (...partes) => new Uint8Array(Buffer.concat(partes.map((p) => Buffer.from(p))))
const contiene = (bytes, aguja) => Buffer.from(bytes).includes(Buffer.from(aguja))

/**
 * Un bloque EXIF como el de un teléfono: orientación 6 (girada) y GPS
 * (10° 39' 24" N, la plaza de Maracaibo). Big-endian, como lo escribe iOS.
 */
function exifConGps() {
  const tiff = Buffer.alloc(80)
  tiff.write('MM', 0, 'ascii'); tiff.writeUInt16BE(42, 2); tiff.writeUInt32BE(8, 4)
  // IFD0: 2 entradas — Orientation y el puntero al GPS.
  tiff.writeUInt16BE(2, 8)
  tiff.writeUInt16BE(0x0112, 10); tiff.writeUInt16BE(3, 12); tiff.writeUInt32BE(1, 14); tiff.writeUInt16BE(6, 18)
  tiff.writeUInt16BE(0x8825, 22); tiff.writeUInt16BE(4, 24); tiff.writeUInt32BE(1, 26); tiff.writeUInt32BE(38, 30)
  tiff.writeUInt32BE(0, 34)
  // IFD del GPS: GPSLatitudeRef = «N» y GPSLatitude = 10/1, 39/1, 2400/100.
  tiff.writeUInt16BE(2, 38)
  tiff.writeUInt16BE(0x0001, 40); tiff.writeUInt16BE(2, 42); tiff.writeUInt32BE(2, 44); tiff.write('N\0', 48, 'ascii')
  tiff.writeUInt16BE(0x0002, 52); tiff.writeUInt16BE(5, 54); tiff.writeUInt32BE(3, 56); tiff.writeUInt32BE(68, 60)
  tiff.writeUInt32BE(0, 64)
  const latitud = Buffer.alloc(24)
  ;[10, 1, 39, 1, 2400, 100].forEach((n, i) => latitud.writeUInt32BE(n, i * 4))
  return Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff.subarray(0, 68), latitud])
}
const GPS = exifConGps()
/** La latitud tal como queda escrita: si aparece, la ubicación viajó. */
const LATITUD = GPS.subarray(GPS.length - 24)

function segmentoJpeg(marca, datos) {
  const cabecera = Buffer.alloc(4)
  cabecera[0] = 0xff; cabecera[1] = marca; cabecera.writeUInt16BE(datos.length + 2, 2)
  return Buffer.concat([cabecera, datos])
}

/** La foto de Chrome con EXIF+GPS, un comentario y, tras el fin, una «segunda imagen» con EXIF (como las MPF del iPhone). */
function jpegConGps() {
  return unir(
    JPEG.subarray(0, 2),
    segmentoJpeg(0xe1, GPS),
    segmentoJpeg(0xfe, Buffer.from('Tomada en Maracaibo')),
    JPEG.subarray(2),
    Buffer.from([0xff, 0xd8]), segmentoJpeg(0xe1, GPS), Buffer.from([0xff, 0xd9]),
  )
}

function crc32(bytes) {
  let c = ~0
  for (const b of bytes) { c ^= b; for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)) }
  return (~c) >>> 0
}
function trozoPng(tipo, datos) {
  const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, crc])
}
/** El PNG de Chrome con un trozo eXIf (GPS) y un texto con el lugar, justo después de IHDR. */
function pngConGps() {
  const finIhdr = 8 + 12 + 13
  return unir(PNG.subarray(0, finIhdr), trozoPng('eXIf', GPS.subarray(6)), trozoPng('tEXt', Buffer.from('Location\0Maracaibo')), PNG.subarray(finIhdr))
}

/** El WebP de Chrome con un trozo EXIF al final y la bandera de EXIF encendida en VP8X. */
function webpConGps() {
  const exif = GPS.subarray(6) // sin la cabecera «Exif\0\0», como lo guarda WebP
  const cabecera = Buffer.alloc(8); cabecera.write('EXIF', 0, 'ascii'); cabecera.writeUInt32LE(exif.length, 4)
  const todo = Buffer.concat([Buffer.from(WEBP), cabecera, exif, exif.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)])
  todo.writeUInt32LE(todo.length - 8, 4)
  todo[20] |= 0x08
  return new Uint8Array(todo)
}

// ---------------------------------------------------------------- byte a byte

test('JPEG: sale sin EXIF, sin GPS, sin comentario y sin lo que venía tras el fin; la imagen queda idéntica', () => {
  const sucia = jpegConGps()
  assert.ok(contiene(sucia, 'Exif') && contiene(sucia, LATITUD), 'la prueba arranca con GPS')
  const limpia = quitarMetadatos(sucia, 'image/jpeg')
  assert.equal(contiene(limpia, 'Exif'), false)
  assert.equal(contiene(limpia, LATITUD), false)
  assert.equal(contiene(limpia, 'Maracaibo'), false)
  // Lo que queda es exactamente lo que exportó Chrome: JFIF, perfil de color, tablas e imagen.
  assert.deepEqual(Buffer.from(limpia), Buffer.from(JPEG))
  assert.ok(contiene(limpia, 'ICC_PROFILE'), 'el perfil de color se conserva')
})

test('PNG: fuera eXIf y los textos; el resto, idéntico', () => {
  const sucia = pngConGps()
  assert.ok(contiene(sucia, LATITUD))
  const limpia = quitarMetadatos(sucia, 'image/png')
  assert.equal(contiene(limpia, LATITUD), false)
  assert.equal(contiene(limpia, 'Maracaibo'), false)
  assert.deepEqual(Buffer.from(limpia), Buffer.from(PNG))
})

test('WebP: fuera el trozo EXIF, la bandera apagada y el tamaño del RIFF al día', () => {
  const sucia = webpConGps()
  assert.ok(contiene(sucia, LATITUD))
  const limpia = quitarMetadatos(sucia, 'image/webp')
  assert.equal(contiene(limpia, LATITUD), false)
  assert.equal(limpia[20] & 0x08, 0)
  assert.equal(Buffer.from(limpia).readUInt32LE(4), limpia.length - 8)
  assert.deepEqual(Buffer.from(limpia), Buffer.from(WEBP))
})

test('un archivo que no es lo que dice no se «limpia» a medias: se rechaza', () => {
  assert.throws(() => quitarMetadatos(Buffer.from('no soy una foto'), 'image/jpeg'), /formato/)
  assert.throws(() => quitarMetadatos(JPEG.subarray(0, 40), 'image/jpeg'), /formato/)
  assert.throws(() => quitarMetadatos(PNG, 'image/gif'), /formato/)
})

// ---------------------------------------------------------------- limpiarFoto

test('limpiarFoto sin lienzo (fuera del navegador): la foto con GPS sale sin GPS y con su nombre', async () => {
  const foto = new File([jpegConGps()], 'disco.jpg', { type: 'image/jpeg' })
  const limpia = await limpiarFoto(foto)
  assert.notEqual(limpia, foto)
  assert.equal(limpia.name, 'disco.jpg')
  assert.equal(limpia.type, 'image/jpeg')
  const bytes = new Uint8Array(await limpia.arrayBuffer())
  assert.equal(contiene(bytes, LATITUD), false)
  assert.equal(contiene(bytes, 'Exif'), false)
  // Ya limpia: no se vuelve a tocar.
  assert.equal(await limpiarFoto(limpia), limpia)
})

test('los PDF (y lo que no es JPEG, PNG o WebP) pasan tal cual', async () => {
  const pdf = new File([Buffer.from('%PDF-1.4 Exif GPS')], 'factura.pdf', { type: 'application/pdf' })
  assert.equal(await limpiarFoto(pdf), pdf)
  const gif = new File([Buffer.from('GIF89a')], 'a.gif', { type: 'image/gif' })
  assert.equal(await limpiarFoto(gif), gif)
})

test('si no se puede leer la foto, no se sube con la ubicación: se dice claro', async () => {
  const rota = new File([Buffer.from('nada que ver')], 'rota.jpg', { type: 'image/jpeg' })
  await assert.rejects(limpiarFoto(rota), /No pudimos preparar «rota\.jpg»/)
})

/** Un navegador de mentira: `createImageBitmap` y `OffscreenCanvas`, anotando lo que se les pide. */
function navegadorFalso({ ancho, alto, tipoSalida = null }) {
  const notas = {}
  globalThis.createImageBitmap = async (blob, opciones) => {
    notas.opciones = opciones
    return { width: ancho, height: alto, close: () => { notas.cerrado = true } }
  }
  globalThis.OffscreenCanvas = class {
    constructor(w, h) { notas.lienzo = [w, h] }
    getContext() { return { drawImage: (_f, x, y, w, h) => { notas.dibujo = [x, y, w, h] } } }
    async convertToBlob({ type, quality }) {
      notas.salida = { type, quality }
      return new Blob([Buffer.from('pixeles')], { type: tipoSalida ?? type })
    }
  }
  return {
    notas,
    restaurar: () => { delete globalThis.createImageBitmap; delete globalThis.OffscreenCanvas },
  }
}

test('en el navegador se redibuja: orientación del EXIF, 1600 px de lado como mucho y calidad 0,85', async (t) => {
  const nav = navegadorFalso({ ancho: 3000, alto: 4000 }) // ya girada: vertical
  t.after(nav.restaurar)
  const limpia = await limpiarFoto(new File([jpegConGps()], 'frente.jpg', { type: 'image/jpeg' }))
  assert.deepEqual(nav.notas.opciones, { imageOrientation: 'from-image' })
  assert.deepEqual(nav.notas.lienzo, [1200, 1600])
  assert.deepEqual(nav.notas.dibujo, [0, 0, 1200, 1600])
  assert.deepEqual(nav.notas.salida, { type: 'image/jpeg', quality: 0.85 })
  assert.equal(nav.notas.cerrado, true)
  assert.equal(limpia.type, 'image/jpeg')
  assert.equal(Buffer.from(await limpia.arrayBuffer()).toString(), 'pixeles')
})

test('una foto pequeña no se agranda, y si el navegador no escribe WebP el nombre dice .png', async (t) => {
  const nav = navegadorFalso({ ancho: 800, alto: 600, tipoSalida: 'image/png' })
  t.after(nav.restaurar)
  const limpia = await limpiarFoto(new File([webpConGps()], 'luz.trasera.webp', { type: 'image/webp' }))
  assert.deepEqual(nav.notas.lienzo, [800, 600])
  assert.equal(limpia.type, 'image/png')
  assert.equal(limpia.name, 'luz.trasera.png')
})

test('si el navegador no puede dibujarla, se limpia byte a byte', async (t) => {
  globalThis.createImageBitmap = async () => { throw new Error('no se pudo decodificar') }
  t.after(() => { delete globalThis.createImageBitmap })
  const limpia = await limpiarFoto(new File([pngConGps()], 'caucho.png', { type: 'image/png' }))
  assert.deepEqual(Buffer.from(await limpia.arrayBuffer()), Buffer.from(PNG))
})

// ---------------------------------------------------------------- subidas

function nubeQueGuarda() {
  const subidas = []
  const original = globalThis.fetch
  globalThis.fetch = async (url, op = {}) => {
    if (op.method === 'HEAD') return { ok: false }
    if (String(url).endsWith('/image/upload')) {
      const archivo = op.body.get('file')
      subidas.push({ id: op.body.get('public_id'), nombre: archivo.name, bytes: new Uint8Array(await archivo.arrayBuffer()) })
      return { ok: true, json: async () => ({ secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${op.body.get('public_id')}.jpg` }) }
    }
    throw new Error(`llamada inesperada: ${url}`)
  }
  return { subidas, restaurar: () => { globalThis.fetch = original } }
}

test('subirImagen: lo que llega a Cloudinary va sin GPS', async (t) => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  olvidarFotos()
  const nube = nubeQueGuarda()
  t.after(() => { nube.restaurar(); configurarCloudinary({}) })
  await subirImagen(new File([jpegConGps()], 'frente.jpg', { type: 'image/jpeg' }), { publicId: 'fom/vehiculo/v1' })
  assert.equal(nube.subidas.length, 1)
  assert.equal(contiene(nube.subidas[0].bytes, LATITUD), false)
  assert.equal(contiene(nube.subidas[0].bytes, 'Exif'), false)
})

/** `archivos.js` compilado con Vite (lee `import.meta.env`), con su cloudinary.js en el mismo paquete. */
async function archivosCompilado() {
  const ENTRADA = 'virtual:prueba-t176-archivos'
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify('') },
    plugins: [{
      name: 'entrada-prueba',
      resolveId: (id) => (id.endsWith(ENTRADA) ? '\0' + ENTRADA : null),
      load: (id) => (id === '\0' + ENTRADA
        ? `export { subirArchivo } from '${ruta('src/panel/datos/archivos.js')}'
           export { configurarCloudinary, olvidarFotos } from '${ruta('src/panel/datos/cloudinary.js')}'`
        : null),
    }],
    build: { write: false, minify: false, lib: { entry: ENTRADA, formats: ['es'], fileName: 'prueba' } },
  })
  const codigo = salida[0].output.find((o) => o.type === 'chunk').code
  return import('data:text/javascript;base64,' + Buffer.from(`${codigo}
// ${Math.random()}`).toString('base64'))
}

test('subirArchivo (órdenes y documentos): la foto va sin GPS y el PDF va igual', async (t) => {
  const m = await archivosCompilado()
  m.configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  m.olvidarFotos()
  const nube = nubeQueGuarda()
  t.after(nube.restaurar)

  const foto = new File([jpegConGps()], 'disco de freno.jpg', { type: 'image/jpeg' })
  const r = await m.subirArchivo({ coleccion: 'work-orders', padreId: 'odt-1', proposito: 'work_order_opening', archivo: foto })
  assert.equal(r.via, 'cloudinary')
  assert.equal(contiene(nube.subidas[0].bytes, LATITUD), false)
  assert.equal(contiene(nube.subidas[0].bytes, 'Exif'), false)
  assert.equal(nube.subidas[0].nombre, 'disco de freno.jpg')

  const pdf = Buffer.from('%PDF-1.4 con Exif y GPS de mentira')
  await m.subirArchivo({ coleccion: 'documents', padreId: 'doc-1', proposito: 'document_file', archivo: new File([pdf], 'poliza.pdf', { type: 'application/pdf' }) })
  assert.deepEqual(Buffer.from(nube.subidas[1].bytes), pdf)
})
