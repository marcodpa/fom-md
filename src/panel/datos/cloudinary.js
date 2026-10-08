// Imágenes en Cloudinary: fotos de unidades, documentos y perfiles.
//
// FOM no guarda imágenes. Cada foto vive en Cloudinary con una DIRECCIÓN FIJA que lleva el id de FOM de lo que
// retrata (`fom/vehiculo/<id>`, `fom/avatar/<userId>`, `fom/documento/<id>/<cara>`). Subir otra foto con la misma
// dirección la REEMPLAZA (el preset debe tener «Overwrite» activo) y no se borra nada. Como la dirección se conoce de
// antemano, no hace falta consultar listas: la cuenta puede tener bloqueada la «lista de recursos» y todo funciona.
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
}

/** Etiquetas (tags) que también se ponen al subir: la app del conductor las usa para encontrar sus fotos. */
export const etiquetas = {
  documento: (id) => `fom_documento_${id}`,
  vehiculo: (id) => `fom_vehiculo_${id}`,
  avatar: (userId) => `fom_avatar_${userId}`,
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

/** ¿Se subió una foto desde esta web hace poco? Justo después, Cloudinary tarda un instante en servirla. */
export function huboSubidaReciente(ms = 45_000) {
  return Date.now() - ultimaSubida < ms
}

/** La URL pública de una foto por su dirección fija, ya recortada y comprimida por Cloudinary. */
export function urlDe(publicId, ancho = 480, alto = 0) {
  if (!nube || !publicId) return ''
  const t = ['f_auto', 'q_auto', `w_${ancho}`, ...(alto ? [`h_${alto}`, 'c_fill'] : ['c_limit'])].join(',')
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

/** Dice qué le pasa a un archivo que no se puede subir, o `null` si está bien. */
export function problemaDelArchivo(archivo) {
  if (!archivo) return 'No hay archivo.'
  if (!TIPOS.test(archivo.type || '')) return `«${archivo.name}» no es una imagen (JPG, PNG, WebP o HEIC).`
  if (archivo.size > MAX_MB * 1024 * 1024) return `«${archivo.name}» pesa más de ${MAX_MB} MB.`
  return null
}

/**
 * Sube UNA imagen a su dirección fija (`publicId`) y la deja como la vigente. Lanza un Error con el motivo si no se
 * pudo: la pantalla no debe decir «guardado» si la foto no llegó.
 */
export async function subirImagen(archivo, { publicId, etiqueta, titulo } = {}) {
  if (!cloudinaryConfigurado()) throw new Error('Cloudinary no está configurado en esta web.')
  if (!publicId) throw new Error('Falta saber a qué pertenece la foto.')
  const mal = problemaDelArchivo(archivo)
  if (mal) throw new Error(mal)
  const cuerpo = new FormData()
  cuerpo.append('file', archivo)
  cuerpo.append('upload_preset', preset)
  cuerpo.append('public_id', publicId)
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
  if (!json.secure_url) throw new Error('Cloudinary no devolvió la dirección de la foto.')
  avisarCambio()
  return json.secure_url
}
