// Imágenes en Cloudinary: fotos de unidades, documentos y perfiles.
//
// FOM no guarda imágenes. Cada foto vive en Cloudinary bajo una DIRECCIÓN BASE que lleva el id de FOM de lo que
// retrata (`fom/vehiculo/<id>`, `fom/avatar/<userId>`, `fom/documento/<id>/<cara>`).
//
// Cloudinary NO deja sobrescribir en una subida sin firma (devuelve la foto que ya existe), así que reemplazar se
// hace con VERSIONES NUMERADAS: la primera foto es `<base>/1`, la siguiente `<base>/2`, y la vigente es la de número
// más alto. Para saber cuál es, se prueba si existen (una consulta liviana por foto, con búsqueda por saltos), así no
// hace falta la «lista de recursos» ni ningún dato en el servidor. Nada se borra: lo anterior solo deja de mostrarse.
//
// La subida usa un UPLOAD PRESET SIN FIRMA (unsigned): en el navegador no puede haber ningún secreto.
//   VITE_CLOUDINARY_CLOUD_NAME=<nombre de la nube>
//   VITE_CLOUDINARY_UPLOAD_PRESET=<preset unsigned, con Overwrite activado>

let nube = import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME || ''
let preset = import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET || ''

/** Solo para pruebas: fija las credenciales sin pasar por `.env`. */
export function configurarCloudinary(datos = {}) {
  nube = datos.nube ?? ''
  preset = datos.preset ?? ''
}

/** ¿Hay nube y preset en el entorno? Sin ellos la web lo dice y no sube nada. */
export function cloudinaryConfigurado() {
  return Boolean(nube && preset)
}

/** Dirección fija de cada foto. Subir otra con la misma dirección la reemplaza. */
export const ids = {
  vehiculo: (id) => `fom/vehiculo/${id}`,
  avatar: (userId) => `fom/avatar/${userId}`,
  /** Un documento tiene dos caras: «frente» y «reverso». */
  documento: (id, cara) => `fom/documento/${id}/${cara}`,
  /** La misma foto de la unidad sin fondo (T-179): `<base>/<n>` lleva el MISMO n que la original. */
  vehiculoSinFondo: (id) => `fom/vehiculo-sin-fondo/${id}`,
}

/** Etiquetas (tags) que también se ponen al subir: la app del conductor las usa para encontrar sus fotos. */
export const etiquetas = {
  documento: (id) => `fom_documento_${id}`,
  vehiculo: (id) => `fom_vehiculo_${id}`,
  avatar: (userId) => `fom_avatar_${userId}`,
  // Aparte de `fom_vehiculo_<id>`: quien busca las fotos de la unidad por etiqueta no debe confundirla con el recorte.
  vehiculoSinFondo: (id) => `fom_vehiculo_sin_fondo_${id}`,
}

// Cuando se reemplaza una foto, el navegador y la red de Cloudinary pueden seguir mostrando la anterior. Un número
// al final de la dirección fuerza a pedirla de nuevo; cambia al abrir la web y cada vez que se sube una foto aquí.
let version = Date.now()
let ultimaSubida = 0
const oyentes = new Set()
export function alCambiarFotos(f) {
  oyentes.add(f)
  return () => oyentes.delete(f)
}
function avisarCambio() {
  version = Date.now()
  ultimaSubida = version
  oyentes.forEach((f) => f(version))
}

// --- Versiones numeradas -----------------------------------------------------
const memoria = new Map() // base -> Promise<número de la foto vigente (0 si no hay)>

const pista = (base) => {
  try { return Number(globalThis.localStorage?.getItem(`fom_foto_${base}`)) || 0 } catch { return 0 }
}
const guardarPista = (base, n) => {
  try { globalThis.localStorage?.setItem(`fom_foto_${base}`, String(n)) } catch { /* sin almacenamiento: no pasa nada */ }
}

/** ¿Existe esa foto en Cloudinary? Consulta liviana (solo cabeceras). */
async function existe(publicId) {
  try {
    const r = await fetch(`https://res.cloudinary.com/${nube}/image/upload/${publicId}?p=${Date.now()}`, { method: 'HEAD' })
    return r.ok
  } catch {
    return false
  }
}

/** Busca el número más alto que existe: parte de lo último que se vio y avanza por saltos (1, 2, 4…) y luego afina. */
async function buscarUltima(base) {
  let n = pista(base)
  if (n > 0 && !(await existe(`${base}/${n}`))) n = 0
  if (n === 0) {
    if (!(await existe(`${base}/1`))) return 0
    n = 1
  }
  let paso = 1
  while (await existe(`${base}/${n + paso}`)) { n += paso; paso *= 2 }
  let bajo = n
  let alto = n + paso
  while (alto - bajo > 1) {
    const medio = Math.floor((bajo + alto) / 2)
    if (await existe(`${base}/${medio}`)) bajo = medio
    else alto = medio
  }
  return bajo
}

/** El número de la foto vigente de una dirección base (0 si todavía no hay ninguna). Se recuerda por sesión. */
export function ultimaVersion(base) {
  if (!nube || !base) return Promise.resolve(0)
  if (!memoria.has(base)) {
    memoria.set(base, buscarUltima(base).then((n) => { if (n) guardarPista(base, n); return n }))
  }
  return memoria.get(base)
}

/** La dirección completa de la foto vigente (`<base>/<n>`), o `null` si todavía no hay foto. */
export async function idVigente(base) {
  const n = await ultimaVersion(base)
  return n ? `${base}/${n}` : null
}

/** Olvida lo recordado (al cerrar sesión, y en las pruebas). */
export function olvidarFotos() {
  memoria.clear()
}

/** ¿Se subió una foto desde esta web hace poco? Justo después, Cloudinary tarda un instante en servirla. */
export function huboSubidaReciente(ms = 45_000) {
  return Date.now() - ultimaSubida < ms
}

// Quitar el fondo ya no lo hace Cloudinary (`e_background_removal` era un complemento de PAGO y estaba apagado): desde
// T-179 lo hace el propio navegador (src/panel/quitador) y el recorte se sube como otra foto, `ids.vehiculoSinFondo`.
// Estas dos quedan solo para quien todavía las llama (FotoFija y su prueba): nunca piden nada a Cloudinary AI.
export function quitarFondoDisponible() {
  return false
}
export function desactivarQuitarFondo() {}

/**
 * La URL pública optimizada. `ajuste: 'contener'` limita el tamaño sin recortar la imagen ni aumentar la resolución.
 * El valor predeterminado conserva el recorte de los avatares.
 */
export function urlDe(publicId, ancho = 480, alto = 0, { ajuste = 'recortar' } = {}) {
  if (!nube || !publicId) return ''
  const t = ['f_auto', 'q_auto', `w_${ancho}`, ...(alto ? [`h_${alto}`] : []),
    ...(alto && ajuste !== 'contener' ? ['c_fill', 'g_auto'] : ['c_limit'])].join(',')
  return `https://res.cloudinary.com/${nube}/image/upload/${t}/${publicId}?v=${version}`
}

/** La misma foto sin recortar, para abrirla completa. */
export function urlOriginal(publicId) {
  return nube && publicId ? `https://res.cloudinary.com/${nube}/image/upload/${publicId}?v=${version}` : ''
}

/** Lo más que se espera una subida antes de darla por perdida. */
const TIEMPO_LIMITE = 45_000
const MAX_MB = 10
const TIPOS = /^image\/(jpeg|png|webp|gif|heic|heif)$/i

/** Dice qué le pasa a un archivo que no se puede subir, o `null` si está bien. Con `permitirPdf`, también acepta PDF. */
export function problemaDelArchivo(archivo, { permitirPdf = false } = {}) {
  if (!archivo) return 'No hay archivo.'
  const esPdf = permitirPdf && /^application\/pdf$/i.test(archivo.type || '')
  if (!esPdf && !TIPOS.test(archivo.type || '')) {
    return permitirPdf
      ? `«${archivo.name}» no es una imagen ni un PDF (JPG, PNG, WebP, HEIC o PDF).`
      : `«${archivo.name}» no es una imagen (JPG, PNG, WebP o HEIC).`
  }
  if (archivo.size > MAX_MB * 1024 * 1024) return `«${archivo.name}» pesa más de ${MAX_MB} MB.`
  return null
}

// --- Fotos sin ubicación -----------------------------------------------------
// Una foto de teléfono lleva EXIF: dónde se tomó (GPS), con qué equipo y cuándo. Antes de subirla se vuelve a dibujar
// en un lienzo, que solo guarda los píxeles: sale sin EXIF, derecha (se respeta la orientación que traía) y con 1600 px
// de lado como mucho. Si el navegador no puede dibujarla, se le quitan los metadatos byte a byte; si tampoco, no se
// sube. Los PDF (y lo que no es JPEG, PNG o WebP) pasan tal cual.

const LADO_MAXIMO = 1600
const CALIDAD = 0.85
const REDIBUJABLES = /^image\/(jpeg|png|webp)$/i
const EXTENSIONES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
// Lo ya limpiado no se vuelve a re-codificar (archivos.js limpia antes de elegir servidor o Cloudinary).
const limpias = new WeakSet()

function unir(partes) {
  const total = partes.reduce((s, p) => s + p.length, 0)
  const salida = new Uint8Array(total)
  let i = 0
  for (const p of partes) { salida.set(p, i); i += p.length }
  return salida
}
const ascii = (b, i, n) => String.fromCharCode(...b.subarray(i, i + n))
const malFormada = () => new Error('La imagen no tiene un formato que se pueda leer.')

/** JPEG: fuera APP1 (EXIF y XMP, con el GPS), APP2 que no sea perfil de color, APP3–APP15, comentarios y lo que venga tras el fin. */
function jpegSinMetadatos(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) throw malFormada()
  const partes = [b.subarray(0, 2)]
  let i = 2
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) throw malFormada()
    const marca = b[i + 1]
    if (marca === 0xff) { i += 1; continue } // relleno entre marcas
    if (marca === 0xd9) { partes.push(b.subarray(i, i + 2)); return unir(partes) } // fin de la imagen
    if ((marca >= 0xd0 && marca <= 0xd7) || marca === 0x01) { partes.push(b.subarray(i, i + 2)); i += 2; continue }
    if (i + 4 > b.length) throw malFormada()
    const fin = i + 2 + ((b[i + 2] << 8) | b[i + 3])
    if (fin > b.length || fin < i + 4) throw malFormada()
    const perfilDeColor = marca === 0xe2 && ascii(b, i + 4, 11) === 'ICC_PROFILE'
    const quitar = marca === 0xe1 || (marca === 0xe2 && !perfilDeColor) || (marca >= 0xe3 && marca <= 0xef) || marca === 0xfe
    if (!quitar) partes.push(b.subarray(i, fin))
    i = fin
    if (marca === 0xda) {
      // Datos de la imagen: siguen hasta una marca de verdad (FF seguido de algo que no es 00 ni un reinicio).
      let j = i
      while (j + 1 < b.length && !(b[j] === 0xff && b[j + 1] !== 0x00 && !(b[j + 1] >= 0xd0 && b[j + 1] <= 0xd7))) j += 1
      if (j + 1 >= b.length) throw malFormada()
      partes.push(b.subarray(i, j))
      i = j
    }
  }
  throw malFormada()
}

/** PNG: fuera los trozos de EXIF, textos y fecha. */
const QUITAR_PNG = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'])
function pngSinMetadatos(b) {
  if (ascii(b, 1, 3) !== 'PNG' || b[0] !== 0x89) throw malFormada()
  const partes = [b.subarray(0, 8)]
  let i = 8
  while (i + 12 <= b.length) {
    const largo = ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3]
    const tipo = ascii(b, i + 4, 4)
    const fin = i + 12 + largo
    if (fin > b.length) throw malFormada()
    if (!QUITAR_PNG.has(tipo)) partes.push(b.subarray(i, fin))
    i = fin
    if (tipo === 'IEND') return unir(partes)
  }
  throw malFormada()
}

/** WebP: fuera los trozos EXIF y XMP, y se apagan sus banderas en VP8X. */
function webpSinMetadatos(b) {
  if (ascii(b, 0, 4) !== 'RIFF' || ascii(b, 8, 4) !== 'WEBP') throw malFormada()
  const partes = []
  let i = 12
  while (i + 8 <= b.length) {
    const tipo = ascii(b, i, 4)
    const largo = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0
    if (i + 8 + largo > b.length) throw malFormada()
    const fin = Math.min(b.length, i + 8 + largo + (largo & 1)) // los trozos impares llevan un byte de relleno
    if (tipo !== 'EXIF' && tipo !== 'XMP ') {
      const trozo = b.slice(i, fin)
      if (tipo === 'VP8X') trozo[8] &= ~0x0c
      partes.push(trozo)
    }
    i = fin
  }
  const cuerpo = unir(partes)
  const salida = new Uint8Array(12 + cuerpo.length)
  salida.set(b.subarray(0, 12))
  new DataView(salida.buffer).setUint32(4, 4 + cuerpo.length, true)
  salida.set(cuerpo, 12)
  return salida
}

/** Los mismos bytes de imagen sin metadatos. Lanza si el archivo no es el formato que dice. */
export function quitarMetadatos(bytes, tipo) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const t = String(tipo || '').toLowerCase()
  if (t === 'image/jpeg') return jpegSinMetadatos(b)
  if (t === 'image/png') return pngSinMetadatos(b)
  if (t === 'image/webp') return webpSinMetadatos(b)
  throw malFormada()
}

/** La imagen lista para dibujar, ya girada según su EXIF. `null` si este navegador no puede leerla. */
async function decodificar(archivo) {
  if (typeof globalThis.createImageBitmap === 'function') {
    try {
      const mapa = await globalThis.createImageBitmap(archivo, { imageOrientation: 'from-image' })
      return { fuente: mapa, ancho: mapa.width, alto: mapa.height, cerrar: () => mapa.close?.() }
    } catch {
      /* navegadores viejos no aceptan la opción: se prueba con <img> */
    }
  }
  if (typeof globalThis.Image !== 'function' || typeof globalThis.URL?.createObjectURL !== 'function') return null
  const url = URL.createObjectURL(archivo)
  const img = new globalThis.Image()
  try {
    img.src = url
    await img.decode()
  } catch {
    URL.revokeObjectURL(url)
    return null
  }
  // <img> ya respeta la orientación del EXIF (image-orientation: from-image).
  return { fuente: img, ancho: img.naturalWidth, alto: img.naturalHeight, cerrar: () => URL.revokeObjectURL(url) }
}

function crearLienzo(ancho, alto) {
  if (typeof globalThis.document?.createElement === 'function') {
    const lienzo = globalThis.document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    return lienzo
  }
  if (typeof globalThis.OffscreenCanvas === 'function') return new globalThis.OffscreenCanvas(ancho, alto)
  return null
}

function aBlob(lienzo, tipo, calidad) {
  if (typeof lienzo.convertToBlob === 'function') return lienzo.convertToBlob({ type: tipo, quality: calidad })
  return new Promise((listo) => lienzo.toBlob(listo, tipo, calidad))
}

/** Vuelve a dibujar la imagen en un lienzo (solo píxeles). `null` si no se pudo. */
async function redibujar(archivo, tipo, lado, calidad) {
  const imagen = await decodificar(archivo)
  if (!imagen) return null
  try {
    if (!imagen.ancho || !imagen.alto) return null
    const escala = Math.min(1, lado / Math.max(imagen.ancho, imagen.alto))
    const ancho = Math.max(1, Math.round(imagen.ancho * escala))
    const alto = Math.max(1, Math.round(imagen.alto * escala))
    const lienzo = crearLienzo(ancho, alto)
    const ctx = lienzo?.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(imagen.fuente, 0, 0, ancho, alto)
    const blob = await aBlob(lienzo, tipo, calidad)
    return blob?.size ? blob : null
  } finally {
    imagen.cerrar()
  }
}

function comoArchivo(blob, original) {
  const tipo = blob.type || original.type
  const nombre = String(original.name || 'foto')
  // Si el navegador no sabe escribir WebP, entrega PNG: el nombre lo dice.
  const final = tipo === original.type || !EXTENSIONES[tipo] ? nombre : nombre.replace(/(\.[^.]*)?$/u, `.${EXTENSIONES[tipo]}`)
  return new File([blob], final, { type: tipo, lastModified: Date.now() })
}

/**
 * La foto lista para subir: sin EXIF (GPS, equipo, fecha), con la orientación aplicada y como mucho `lado` px de
 * lado. Los PDF y otros tipos se devuelven tal cual. Lanza si no se puede limpiar: mejor no subirla que subirla con
 * la ubicación.
 */
export async function limpiarFoto(archivo, { lado = LADO_MAXIMO, calidad = CALIDAD } = {}) {
  if (!REDIBUJABLES.test(archivo?.type || '')) return archivo
  // Solo un Blob tiene bytes que limpiar (las pruebas de subida usan objetos sueltos).
  if (typeof Blob === 'undefined' || !(archivo instanceof Blob)) return archivo
  if (limpias.has(archivo)) return archivo
  const tipo = archivo.type.toLowerCase()
  let limpio = null
  try {
    limpio = await redibujar(archivo, tipo, lado, calidad)
  } catch {
    limpio = null
  }
  if (!limpio) {
    try {
      limpio = new Blob([quitarMetadatos(new Uint8Array(await archivo.arrayBuffer()), tipo)], { type: tipo })
    } catch {
      throw new Error(`No pudimos preparar «${archivo.name}» para subirla. Prueba con otra foto.`)
    }
  }
  const final = comoArchivo(limpio, archivo)
  limpias.add(final)
  return final
}

/**
 * Sube UNA imagen como la versión siguiente de su dirección base (`publicId`) y la deja como la vigente. Lanza un
 * Error con el motivo si no se pudo: la pantalla no debe decir «guardado» si la foto no llegó.
 */
export async function subirImagen(archivo, { publicId: base, etiqueta, titulo, permitirPdf = false } = {}) {
  if (!cloudinaryConfigurado()) throw new Error('Cloudinary no está configurado en esta web.')
  if (!base) throw new Error('Falta saber a qué pertenece la foto.')
  const mal = problemaDelArchivo(archivo, { permitirPdf })
  if (mal) throw new Error(mal)
  // Sin EXIF: la foto no viaja con el lugar donde se tomó.
  const limpio = await limpiarFoto(archivo)

  let n = (await ultimaVersion(base)) + 1
  // Si alguien subió otra foto al mismo tiempo, Cloudinary devuelve la que ya existía (`existing`): se pasa a la siguiente.
  for (let intento = 0; intento < 4; intento += 1, n += 1) {
    const cuerpo = new FormData()
    cuerpo.append('file', limpio)
    cuerpo.append('upload_preset', preset)
    cuerpo.append('public_id', `${base}/${n}`)
    if (etiqueta) cuerpo.append('tags', etiqueta)
    // `|` y `=` separan los pares del contexto: dentro de un título lo romperían.
    if (titulo) cuerpo.append('context', `caption=${String(titulo).replace(/[|=]/g, ' ')}`)

    const corte = new AbortController()
    const reloj = setTimeout(() => corte.abort(), TIEMPO_LIMITE)
    let respuesta
    try {
      respuesta = await fetch(`https://api.cloudinary.com/v1_1/${nube}/image/upload`, { method: 'POST', body: cuerpo, signal: corte.signal })
    } catch {
      throw new Error('No se pudo subir la foto. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      clearTimeout(reloj)
    }
    if (!respuesta.ok) {
      const detalle = await respuesta.json().then((j) => j?.error?.message).catch(() => null)
      throw new Error(detalle ? `Cloudinary rechazó la foto: ${detalle}` : 'Cloudinary rechazó la foto.')
    }
    const json = await respuesta.json()
    if (json.existing) continue
    if (!json.secure_url) throw new Error('Cloudinary no devolvió la dirección de la foto.')
    // La nueva es la vigente: se recuerda sin tener que volver a buscarla.
    memoria.set(base, Promise.resolve(n))
    guardarPista(base, n)
    avisarCambio()
    return json.secure_url
  }
  throw new Error('No se pudo guardar la foto: hubo cambios al mismo tiempo. Inténtalo de nuevo.')
}

// --- Recortes sin fondo (T-179) ------------------------------------------------
// El navegador quita el fondo (src/panel/quitador) y el recorte se guarda en `fom/vehiculo-sin-fondo/<id>/<n>`, con el
// MISMO n que la foto original: así se sabe de qué foto es, y si luego se sube otra original sin recortarla, el
// recorte viejo deja de valer solo (no se borra nada). Es un WebP con transparencia que sale de un lienzo: sin EXIF.

/** ¿Existe esa foto en Cloudinary? Una consulta liviana (solo cabeceras). */
export function existeFoto(publicId) {
  if (!nube || !publicId) return Promise.resolve(false)
  return existe(publicId)
}

/**
 * Sube el recorte sin fondo de la foto `n` de la unidad. Lanza un Error en llano si no se pudo.
 * No pasa por `limpiarFoto`: ya son solo píxeles de un lienzo, y volver a codificarlo le bajaría la calidad.
 */
export async function subirRecorte(blob, { vehiculoId, n, titulo } = {}) {
  if (!cloudinaryConfigurado()) throw new Error('Cloudinary no está configurado en esta web.')
  if (!vehiculoId || !n) throw new Error('Falta saber de qué foto es el recorte.')
  if (!blob?.size) throw new Error('El recorte salió vacío.')
  const base = ids.vehiculoSinFondo(vehiculoId)
  const cuerpo = new FormData()
  const extension = /png/i.test(blob.type) ? 'png' : 'webp'
  cuerpo.append('file', blob, `sin-fondo-${n}.${extension}`)
  cuerpo.append('upload_preset', preset)
  cuerpo.append('public_id', `${base}/${n}`)
  cuerpo.append('tags', etiquetas.vehiculoSinFondo(vehiculoId))
  if (titulo) cuerpo.append('context', `caption=${String(titulo).replace(/[|=]/g, ' ')} sin fondo`)

  const corte = new AbortController()
  const reloj = setTimeout(() => corte.abort(), TIEMPO_LIMITE)
  let respuesta
  try {
    respuesta = await fetch(`https://api.cloudinary.com/v1_1/${nube}/image/upload`, { method: 'POST', body: cuerpo, signal: corte.signal })
  } catch {
    throw new Error('No se pudo guardar la foto sin fondo. Revisa tu conexión e inténtalo de nuevo.')
  } finally {
    clearTimeout(reloj)
  }
  if (!respuesta.ok) {
    const detalle = await respuesta.json().then((j) => j?.error?.message).catch(() => null)
    throw new Error(detalle ? `Cloudinary rechazó la foto sin fondo: ${detalle}` : 'Cloudinary rechazó la foto sin fondo.')
  }
  const json = await respuesta.json()
  // Una subida sin firma no reemplaza: si ya había recorte de esa foto, se queda el que había.
  if (json.existing) throw new Error('Esta foto ya tenía su versión sin fondo. Para cambiarla, sube la foto otra vez.')
  if (!json.secure_url) throw new Error('Cloudinary no devolvió la dirección de la foto sin fondo.')
  // Los recortes no siguen la cuenta 1, 2, 3… (solo hay de las fotos que se recortaron): no se usa `ultimaVersion`.
  avisarCambio()
  return `${base}/${n}`
}
