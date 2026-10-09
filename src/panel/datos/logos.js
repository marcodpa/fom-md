// ============================================================
// LOGOS DE EMPRESA
// ------------------------------------------------------------
// Regla de Marco: cada empresa tiene su propio logo y se ve de una vez al
// entrar; FOM Operations usa el logo de FOM. El servidor guarda el logo
// como un objeto de almacenamiento (`purpose: tenant_logo`) y referencia su
// id en `fom.tenants.logo_object_id`. Subirlo son tres pasos, los mismos
// que la app: pedir una carga, subir los bytes a la URL que devuelve, y
// darla por completa. Luego la empresa apunta al objeto.
//
// Estas rutas no se reescriben por empresa (`empresaContexto: null`): la
// empresa ya viaja en el camino como `parentId`.
// ============================================================
import { api, pedir } from './api'

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

export async function subirLogoDeEmpresa(tenantId, archivo) {
  if (!archivo) throw new Error('Elige un archivo de imagen.')
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) throw new Error('El logo tiene que ser PNG, JPG o WebP.')
  if (archivo.size > PESO_MAXIMO) throw new Error('El logo no puede pesar más de 2 MB.')

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
  olvidarLogos()
  return objectId
}
