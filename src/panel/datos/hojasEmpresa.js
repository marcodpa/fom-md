// ============================================================
// DÓNDE SE GUARDA LA HOJA DE CADA EMPRESA (adaptador `hojasEmpresa`)
// ------------------------------------------------------------
// Una hoja guardada es { mapa, paginas }: el mapa (dónde va cada marca, ver
// hojaEmpresa.js) y la imagen de cada página. Va asociada al código y la
// versión de la plantilla de inspección que salió de ella.
//
// El servidor todavía no tiene dónde guardar esto: lo ideal es un campo en
// la plantilla (p. ej. `printSheet`, que añadiría Juan en fom-core).
// Mientras tanto, dos almacenes con la misma forma:
//  · local: en este navegador (localStorage). Es el de la demostración, y el
//    de respaldo cuando no hay Cloudinary.
//  · Cloudinary: cada página en `fom/hoja/<empresa>/<codigo>-v<version>/<n>`
//    (versiones numeradas, nada se sobrescribe) y el mapa como archivo JSON
//    («raw») en `.../mapa/<n>.json`. Si el preset sin firma no admite
//    archivos raw, el mapa se queda en este navegador marcado como
//    PROVISIONAL: la hoja se imprime bien aquí, pero en otra computadora la
//    inspección sale con la planilla de siempre.
// ============================================================
import { CONECTADO } from './repo'
import { empresaGestionActualId } from './api'
import { sesionActual } from '../auth'
import { cloudinaryConfigurado, idVigente, subirImagen, urlDe } from './cloudinary'

const NUBE = import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME || ''
const PRESET = import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET || ''

/** La empresa en la que se está trabajando (la del admin FOM es la que eligió). */
export const empresaActual = () => empresaGestionActualId() || sesionActual()?.perfil?.empresaId || 'demo'

const limpio = (t) => String(t ?? '').replace(/[^a-zA-Z0-9._-]+/gu, '-')
const claveHoja = (empresa, codigo, version) => `fom_hoja_${limpio(empresa)}_${limpio(codigo)}_v${Number(version)}`
const claveIndice = (empresa) => `fom_hojas_${limpio(empresa)}`
export const carpetaHoja = (empresa, codigo, version) => `fom/hoja/${limpio(empresa)}/${limpio(codigo)}-v${Number(version)}`

function leerJson(almacen, clave) {
  try {
    const t = almacen?.getItem(clave)
    return t ? JSON.parse(t) : null
  } catch {
    return null
  }
}

// --- En este navegador ------------------------------------------------------

/**
 * Almacén local. `almacen` es localStorage (o uno en memoria en las pruebas).
 * Guarda la hoja entera (imágenes incluidas, como JPEG) y un índice por
 * empresa para saber qué plantillas tienen hoja.
 */
export function crearAlmacenLocal(almacen = globalThis.localStorage) {
  const indice = (empresa) => leerJson(almacen, claveIndice(empresa)) ?? []
  const anotar = (empresa, entrada) => {
    const resto = indice(empresa).filter((e) => !(e.codigo === entrada.codigo && Number(e.version) === Number(entrada.version)))
    try { almacen.setItem(claveIndice(empresa), JSON.stringify([entrada, ...resto])) } catch { /* el índice es solo una ayuda */ }
  }
  return {
    tipo: 'local',
    indice,
    anotar,
    async guardar({ empresa, codigo, version, nombre, paginas, mapa, provisional = false }) {
      const registro = { mapa, paginas, guardadaEn: new Date().toISOString(), provisional }
      try {
        almacen.setItem(claveHoja(empresa, codigo, version), JSON.stringify(registro))
      } catch {
        throw new Error('No cabe la hoja en el almacenamiento de este navegador. Prueba con una imagen más liviana o borra hojas de prueba.')
      }
      anotar(empresa, { codigo, version: Number(version), nombre, guardadaEn: registro.guardadaEn, provisional, donde: 'local' })
      return { donde: 'local', provisional }
    },
    async leer({ empresa, codigo, version }) {
      const r = leerJson(almacen, claveHoja(empresa, codigo, version))
      return r?.mapa && r?.paginas?.length ? r : null
    },
  }
}

// --- En Cloudinary ---------------------------------------------------------

/** Una imagen en dataURL (lo que sale del lector) como archivo para subir. */
async function aArchivo(dataUrl, nombre) {
  const blob = await (await fetch(dataUrl)).blob()
  return new File([blob], nombre, { type: blob.type || 'image/jpeg' })
}

/**
 * Almacén en Cloudinary. Todo lo de fuera se inyecta para poder probarlo sin
 * subir nada de verdad: `pedir` (fetch), `subir` (subirImagen), `vigente`
 * (idVigente) y `local` (el respaldo para el mapa provisional).
 */
export function crearAlmacenCloudinary({
  nube = NUBE, preset = PRESET, pedir = (...a) => fetch(...a), subir = subirImagen, vigente = idVigente,
  local = crearAlmacenLocal(), urlImagen = (id) => urlDe(id, 2000, 0, { ajuste: 'contener' }), archivo = aArchivo,
} = {}) {
  const urlMapa = (base, n) => `https://res.cloudinary.com/${nube}/raw/upload/${base}/mapa/${n}.json`
  const existe = async (url) => {
    try { return (await pedir(url, { method: 'HEAD' })).ok } catch { return false }
  }
  /** El número del último mapa guardado (0 si no hay). Pocos se guardan: se cuenta de uno en uno. */
  async function ultimoMapa(base) {
    let n = 0
    while (n < 50 && await existe(urlMapa(base, n + 1))) n += 1
    return n
  }
  /** Sube el mapa como archivo raw. Lanza si el preset no lo admite. */
  async function subirMapa(base, mapa) {
    let n = (await ultimoMapa(base)) + 1
    for (let intento = 0; intento < 3; intento += 1, n += 1) {
      const cuerpo = new FormData()
      cuerpo.append('file', new Blob([JSON.stringify(mapa)], { type: 'application/json' }), 'mapa.json')
      cuerpo.append('upload_preset', preset)
      cuerpo.append('public_id', `${base}/mapa/${n}.json`)
      const r = await pedir(`https://api.cloudinary.com/v1_1/${nube}/raw/upload`, { method: 'POST', body: cuerpo })
      if (!r.ok) {
        const detalle = await r.json().then((j) => j?.error?.message).catch(() => null)
        throw new Error(detalle || `Cloudinary no aceptó el mapa (respuesta ${r.status}).`)
      }
      const j = await r.json()
      if (j.existing) continue
      return n
    }
    throw new Error('No se pudo guardar el mapa: hubo cambios al mismo tiempo.')
  }
  return {
    tipo: 'cloudinary',
    indice: local.indice,
    async guardar({ empresa, codigo, version, nombre, paginas, mapa }) {
      if (!nube || !preset) throw new Error('Cloudinary no está configurado en esta web.')
      const base = carpetaHoja(empresa, codigo, version)
      const imagenes = []
      for (const [i, pagina] of paginas.entries()) {
        await subir(await archivo(pagina, `hoja-${i + 1}.jpg`), { publicId: base, etiqueta: `fom_hoja_${limpio(empresa)}`, titulo: `${nombre} · página ${i + 1}` })
        imagenes.push(await vigente(base))
      }
      const conImagenes = { ...mapa, imagenes }
      try {
        await subirMapa(base, conImagenes)
        local.anotar(empresa, { codigo, version: Number(version), nombre, guardadaEn: new Date().toISOString(), provisional: false, donde: 'cloudinary' })
        return { donde: 'cloudinary', provisional: false }
      } catch (e) {
        // Las imágenes ya están en Cloudinary; el mapa se queda en este navegador hasta que haya dónde guardarlo.
        await local.guardar({ empresa, codigo, version, nombre, paginas: imagenes.map(urlImagen), mapa: conImagenes, provisional: true })
        return { donde: 'local', provisional: true, motivo: e?.message || 'Cloudinary no aceptó el mapa.' }
      }
    },
    async leer({ empresa, codigo, version }) {
      const base = carpetaHoja(empresa, codigo, version)
      const n = nube ? await ultimoMapa(base) : 0
      if (n) {
        try {
          const r = await pedir(urlMapa(base, n))
          const mapa = r.ok ? await r.json() : null
          if (mapa?.imagenes?.length) return { mapa, paginas: mapa.imagenes.map(urlImagen), provisional: false }
        } catch { /* sin mapa en la nube: se mira el de este navegador */ }
      }
      return local.leer({ empresa, codigo, version })
    },
  }
}

// --- El que toca -------------------------------------------------------------

let elegido = null
/**
 * Demostración (o sin Cloudinary): el local. Conectado y con Cloudinary: la
 * nube. Sin Cloudinary pero conectado, el local queda como provisional.
 */
export function almacenHojas() {
  if (elegido) return elegido
  elegido = CONECTADO && cloudinaryConfigurado() ? crearAlmacenCloudinary() : crearAlmacenLocal()
  return elegido
}

/** ¿Lo que se guarde ahora se queda solo en este navegador aunque el panel esté conectado? */
export const guardaSoloAqui = () => CONECTADO && almacenHojas().tipo === 'local'

/** Las plantillas de la empresa actual que tienen hoja (según este navegador). */
export function hojasConocidas() {
  return almacenHojas().indice(empresaActual())
}

/** La hoja de una plantilla concreta, o null. */
export function hojaDePlantilla({ codigo, version }) {
  return almacenHojas().leer({ empresa: empresaActual(), codigo, version }).catch(() => null)
}

/** La plantilla que manda para un nombre: la publicada y, entre iguales, la versión más alta. */
export function plantillaDeNombre(plantillas, nombre) {
  return (plantillas ?? [])
    .filter((t) => t.nombre === nombre)
    .sort((a, b) => Number(b.estado === 'publicada') - Number(a.estado === 'publicada') || Number(b.version) - Number(a.version))[0] ?? null
}

/**
 * Para imprimir: la hoja de la plantilla de una inspección, por el nombre
 * del formato (la lista de inspecciones solo trae el nombre). `plantillas`
 * es la lista de la empresa (repo.programaInspecciones.plantillas).
 */
export async function hojaDeFormato(nombre, plantillas) {
  if (!nombre) return null
  const t = plantillaDeNombre(plantillas, nombre)
  return t ? hojaDePlantilla({ codigo: t.codigo, version: t.version }) : null
}
