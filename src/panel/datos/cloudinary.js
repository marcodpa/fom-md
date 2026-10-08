// Imágenes en Cloudinary: documentos, fotos de perfil y fotos de las unidades.
//
// FOM no guarda imágenes: cada foto va a Cloudinary con una ETIQUETA que lleva el id de FOM de lo que
// retrata, y por esa etiqueta se vuelve a encontrar. Es la MISMA convención que usa la app del conductor
// (fom-driver: `fom_documento_<id>`, `fom_credencial_<tipo>_<userId>`, `fom_odt_<id>`, `fom_inspeccion_<id>`),
// así una foto subida desde la web se ve en la app y al revés.
//
// La subida usa un UPLOAD PRESET SIN FIRMA (unsigned): en el navegador no puede haber ningún secreto.
// Solo se pone en `.env`:
//   VITE_CLOUDINARY_CLOUD_NAME=<nombre de la nube>
//   VITE_CLOUDINARY_UPLOAD_PRESET=<preset unsigned>
// Para volver a leer las fotos por etiqueta, la cuenta debe tener activada la lista pública de recursos
// («Resource list» en Settings → Security → Restricted media types).

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

/** Etiquetas de Cloudinary, iguales a las de la app del conductor (y las nuevas, acordadas con ella). */
export const etiquetas = {
  documento: (id) => `fom_documento_${id}`,
  credencial: (tipo, userId) => `fom_credencial_${tipo}_${userId}`,
  orden: (id) => `fom_odt_${id}`,
  inspeccion: (id) => `fom_inspeccion_${id}`,
  /** Nuevas (la app aún no las usa): foto de perfil y fotos de la unidad. */
  avatar: (userId) => `fom_avatar_${userId}`,
  vehiculo: (id) => `fom_vehiculo_${id}`,
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
 * Sube UNA imagen y devuelve su URL pública (`secure_url`). Lanza un Error con el motivo si no se pudo: la
 * pantalla no debe decir «guardado» si la foto no llegó.
 */
export async function subirImagen(archivo, { carpeta, etiqueta, titulo } = {}) {
  if (!cloudinaryConfigurado()) throw new Error('Cloudinary no está configurado en esta web.')
  const mal = problemaDelArchivo(archivo)
  if (mal) throw new Error(mal)
  const cuerpo = new FormData()
  cuerpo.append('file', archivo)
  cuerpo.append('upload_preset', preset)
  // Pide el «token de borrado» (si el preset lo permite): con él se puede quitar la foto en los 10 minutos siguientes.
  cuerpo.append('return_delete_token', 'true')
  if (carpeta) cuerpo.append('folder', carpeta)
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
  if (json.delete_token && json.public_id) tokensDeBorrado.set(json.public_id, { token: json.delete_token, hasta: Date.now() + VIDA_TOKEN })
  return json.secure_url
}

// --- Quitar fotos ------------------------------------------------------------
// Borrar de verdad exige firmar la petición con el API secret, y ese secreto NO puede estar en el navegador.
// Lo que sí permite Cloudinary sin firma es el «token de borrado» que devuelve al subir: vale 10 minutos y solo
// para esa foto. Sirve para corregir un error al momento. Quitar una foto vieja requiere una ruta del servidor.
const VIDA_TOKEN = 9 * 60 * 1000
const tokensDeBorrado = new Map() // public_id -> { token, hasta }

/** ¿Esta foto se subió hace poco desde aquí, y todavía se puede quitar? */
export function puedeQuitarImagen(publicId) {
  const t = tokensDeBorrado.get(publicId)
  if (!t) return false
  if (Date.now() > t.hasta) { tokensDeBorrado.delete(publicId); return false }
  return true
}

/** Quita una foto recién subida. Lanza un Error con el motivo si no se pudo. */
export async function quitarImagen(publicId) {
  if (!puedeQuitarImagen(publicId)) throw new Error('Esta foto ya no se puede quitar desde aquí. Pídele al administrador que la borre.')
  const cuerpo = new FormData()
  cuerpo.append('token', tokensDeBorrado.get(publicId).token)
  let respuesta
  try {
    respuesta = await fetch(`https://api.cloudinary.com/v1_1/${nube}/delete_by_token`, { method: 'POST', body: cuerpo })
  } catch {
    throw new Error('No se pudo quitar la foto. Revisa tu conexión e inténtalo de nuevo.')
  }
  if (!respuesta.ok) throw new Error('Cloudinary no dejó quitar la foto.')
  tokensDeBorrado.delete(publicId)
  return true
}

// --- Fotos por etiqueta, con memoria ----------------------------------------
// Una lista de vehículos pide una foto por cada uno: se guarda lo ya pedido para no repetir la misma consulta.
const memoria = new Map() // etiqueta -> Promise<foto[]>

/** Las fotos de una etiqueta; pide a Cloudinary una sola vez salvo que se invalide. */
export function fotosDe(etiqueta) {
  if (!memoria.has(etiqueta)) memoria.set(etiqueta, listarImagenes(etiqueta))
  return memoria.get(etiqueta)
}

/** Después de subir o quitar: la próxima vez se vuelve a pedir. */
export function invalidarFotos(etiqueta) {
  memoria.delete(etiqueta)
}

/**
 * Las fotos con una etiqueta, de la más nueva a la más vieja. Si la cuenta tiene restringida la lista pública,
 * o no hay nube, devuelve vacío en vez de fallar.
 */
export async function listarImagenes(etiqueta) {
  if (!nube) return []
  try {
    const respuesta = await fetch(`https://res.cloudinary.com/${nube}/image/list/${encodeURIComponent(etiqueta)}.json`)
    if (!respuesta.ok) return []
    const json = await respuesta.json()
    return [...(json.resources ?? [])]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map((r) => ({
        id: r.public_id,
        url: `https://res.cloudinary.com/${nube}/image/upload/v${r.version}/${r.public_id}.${r.format}`,
        titulo: r.context?.custom?.caption ?? '',
        creadaEn: r.created_at,
      }))
  } catch {
    return []
  }
}

/** La misma imagen, recortada y comprimida por Cloudinary: miniaturas livianas en vez de la foto entera. */
export function miniatura(url, ancho = 320, alto = 0) {
  if (!url || !url.includes('/image/upload/')) return url
  const t = ['f_auto', 'q_auto', `w_${ancho}`, ...(alto ? [`h_${alto}`, 'c_fill'] : ['c_limit'])].join(',')
  return url.replace('/image/upload/', `/image/upload/${t}/`)
}
