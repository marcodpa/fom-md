// ============================================================
// LOGOS DE EMPRESA
// ------------------------------------------------------------
// Regla de Marco: cada empresa tiene su propio logo y se ve de una vez al
// entrar; FOM Operations usa el logo de FOM.
//
// DOS SITIOS donde puede vivir el logo, igual que las demás fotos de FOM:
//  1. El almacén del servidor: un objeto (`purpose: tenant_logo`) que la
//     empresa referencia con `logoObjectId` (`fom.tenants.logo_object_id`).
//     Subirlo son tres pasos, los mismos que la app: pedir una carga, subir
//     los bytes a la URL que devuelve, y darla por completa.
//  2. Cloudinary: en producción ese almacén sigue APAGADO (503
//     `object_storage_unavailable`) y el servidor no tiene ningún campo para
//     guardar una URL (`logoObjectId` solo acepta un objeto disponible). Por eso,
//     si el almacén falla, el logo va a Cloudinary bajo una dirección fija que
//     lleva el id de la empresa (`fom/logo-empresa/<id>/<n>`, con versiones
//     numeradas como las fotos de unidades y perfiles). No hay que guardar nada
//     en el servidor: quien muestre el logo calcula la dirección con el id.
//
// Estas rutas no se reescriben por empresa (`empresaContexto: null`): la
// empresa ya viaja en el camino como `parentId`.
// ============================================================
import { HAY_API, api, pedir } from './api'
import { cloudinaryConfigurado, idVigente, subirImagen, urlDe } from './cloudinary'
import { textoDeError } from './responsableEmpresa'

const CONSOLA = '/api/v1/console'
const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp']
const PESO_MAXIMO = 2 * 1024 * 1024
export const CODIGO_FOM = 'fom-operations'

// --- Qué logo tiene cada ente (una lectura, cacheada un minuto) ---------
let entes = null
let entesDesde = 0

export async function logosDeEntes() {
  if (entes && Date.now() - entesDesde < 60_000) return entes
  const r = await api.entes({ limite: 100 })
  entes = new Map(
    (r?.items ?? []).map((t) => [t.id, { logoObjectId: t.logoObjectId ?? null, codigo: t.code ?? null, nombre: t.name ?? '' }]),
  )
  entesDesde = Date.now()
  return entes
}

export function olvidarLogos() {
  entes = null
}

// --- La imagen en sí: una URL de objeto por logo, reutilizada -----------
const urls = new Map()

export function urlDeLogo(tenantId, objectId) {
  if (!tenantId || !objectId) return Promise.resolve(null)
  if (!urls.has(objectId)) {
    urls.set(
      objectId,
      (async () => {
        try {
          const r = await pedir(`${CONSOLA}/tenants/${tenantId}/objects/${objectId}/downloads`, {
            metodo: 'POST',
            cuerpo: {},
            idempotente: true,
            empresaContexto: null,
          })
          const peticion = r?.request
          if (!peticion?.url) return null
          const respuesta = await fetch(peticion.url, {
            method: peticion.method || 'GET',
            headers: peticion.requiredHeaders || {},
          })
          if (!respuesta.ok) return null
          return URL.createObjectURL(await respuesta.blob())
        } catch {
          return null
        }
      })(),
    )
  }
  return urls.get(objectId)
}

// --- El logo en Cloudinary ----------------------------------------------
/** Dirección fija del logo de una empresa en Cloudinary (sin el número de versión). */
export const direccionLogo = (tenantId) => `fom/logo-empresa/${tenantId}`
const etiquetaLogo = (tenantId) => `fom_logo_empresa_${tenantId}`

/** La URL del logo de la empresa en Cloudinary, o `null` si todavía no tiene (o no hay Cloudinary). */
export async function urlLogoEnNube(tenantId, ancho = 256) {
  if (!tenantId || !cloudinaryConfigurado()) return null
  try {
    const id = await idVigente(direccionLogo(tenantId))
    return id ? urlDe(id, ancho, 0, { ajuste: 'contener' }) : null
  } catch {
    return null
  }
}

// --- Subir el logo de una empresa --------------------------------------
async function sha256Hex(bytes) {
  const resumen = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function esperarDisponible(tenantId, objectId) {
  // El objeto entra en cuarentena hasta que el servidor lo revisa. Se espera
  // un rato corto; si no llega, se intenta igual y el servidor decide.
  for (let i = 0; i < 8; i += 1) {
    try {
      const r = await pedir(`${CONSOLA}/tenants/${tenantId}/objects`, { empresaContexto: null })
      const o = (r?.items ?? []).find((x) => x.id === objectId)
      if (o && (o.status === 'available' || o.availableAt)) return true
      if (o && o.rejectionCode) throw new Error(`El servidor rechazó el archivo (${o.rejectionCode}).`)
    } catch (e) {
      if (/rechazó/u.test(e?.message || '')) throw e
    }
    await new Promise((fin) => setTimeout(fin, 1500))
  }
  return false
}

// Si el servidor ya dijo que su almacén está apagado, no se le vuelve a preguntar en esta sesión.
let almacenApagado = false
/** Solo para pruebas: vuelve a preguntarle al servidor. */
export function olvidarAlmacenApagado() {
  almacenApagado = false
}
const esApagado = (e) => e?.estado === 503 || /object_storage_unavailable/u.test(String(e?.message || ''))

/** Los tres pasos del servidor. Devuelve el id del objeto, o lanza el error del servidor. */
async function subirAlServidor(tenantId, archivo) {
  const bytes = await archivo.arrayBuffer()
  const alta = await pedir(`${CONSOLA}/tenants/${tenantId}/uploads`, {
    metodo: 'POST',
    idempotente: true,
    empresaContexto: null,
    cuerpo: {
      contentType: archivo.type,
      byteSize: archivo.size,
      checksumSha256: await sha256Hex(bytes),
      purpose: 'tenant_logo',
    },
  })
  const subida = alta?.upload
  const peticion = subida?.request
  if (!subida?.id || !peticion?.url) throw new Error('El servidor no dijo dónde subir el archivo.')

  const puesta = await fetch(peticion.url, {
    method: peticion.method || 'PUT',
    headers: { 'content-type': archivo.type, ...(peticion.requiredHeaders || {}) },
    body: bytes,
  })
  if (!puesta.ok) throw new Error(`No se pudo subir el archivo (respuesta ${puesta.status}).`)

  const fin = await pedir(`${CONSOLA}/uploads/${subida.id}/complete`, { metodo: 'POST', cuerpo: {}, empresaContexto: null })
  const objectId = fin?.object?.id ?? subida.id

  await esperarDisponible(tenantId, objectId)
  await api.actualizarEnte(tenantId, { logoObjectId: objectId })
  urls.delete(objectId)
  return objectId
}

/**
 * Sube el logo de una empresa. Primero al almacén del servidor (como la app); si está apagado, a
 * Cloudinary. Devuelve `{ via: 'servidor', id }` o `{ via: 'cloudinary', url }`. Los errores salen ya en
 * español llano: el código crudo del servidor (`object_storage_unavailable`) nunca llega a la pantalla.
 */
export async function subirLogoDeEmpresa(tenantId, archivo, { hayApi = HAY_API, alServidor = subirAlServidor } = {}) {
  if (!tenantId) throw new Error('Falta saber de qué empresa es el logo.')
  if (!archivo) throw new Error('Elige un archivo de imagen.')
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) throw new Error('El logo tiene que ser PNG, JPG o WebP.')
  if (archivo.size > PESO_MAXIMO) throw new Error('El logo no puede pesar más de 2 MB.')

  try {
    if (hayApi && !almacenApagado) {
      try {
        const id = await alServidor(tenantId, archivo)
        olvidarLogos()
        return { via: 'servidor', id }
      } catch (e) {
        if (!esApagado(e)) throw e
        almacenApagado = true
      }
    }
    if (!cloudinaryConfigurado()) {
      throw new Error('Por ahora no hay dónde guardar el logo: el almacén del servidor está apagado y Cloudinary no está configurado en esta web.')
    }
    const url = await subirImagen(archivo, {
      publicId: direccionLogo(tenantId),
      etiqueta: etiquetaLogo(tenantId),
      titulo: 'Logo de la empresa',
    })
    return { via: 'cloudinary', url }
  } catch (e) {
    throw new Error(textoDeError(e, 'No se pudo guardar el logo. Inténtalo de nuevo.'))
  }
}
