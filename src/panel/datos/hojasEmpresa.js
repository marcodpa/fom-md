// ============================================================
// DÓNDE SE GUARDA LA HOJA DE CADA EMPRESA (adaptador `hojasEmpresa`)
// ------------------------------------------------------------
// Una hoja guardada es { mapa, paginas }: el mapa (dónde va cada marca, ver
// hojaEmpresa.js) y la imagen de cada página. Va asociada al código y la
// versión de la plantilla de inspección que salió de ella.
//
// El mapa decide qué se escribe en la hoja impresa, así que solo se lee de un
// sitio de fiar. Una URL pública que cualquiera puede adivinar y llenar (el
// preset sin firma de Cloudinary) NO lo es: antes el mapa se subía ahí y el
// número más alto mandaba, y un tercero podía subir uno suyo. Ya no se sube.
//
// PEDIDO A JUAN (fom-core): un campo `printSheet` en la plantilla de
// inspección (JSON, solo del panel, que la app no muestra) para guardar el
// mapa y los public_id de las imágenes junto a la plantilla, escrito con la
// sesión del gestor. Ver docs/HOJA-EMPRESA-PARA-JUAN.md.
//
// Mientras tanto:
//  · El mapa vive en ESTE navegador (localStorage, pequeño). Conectado, queda
//    PROVISIONAL: la hoja se imprime bien aquí; en otra computadora la
//    inspección sale con la planilla de siempre.
//  · Las imágenes: con Cloudinary, cada página en
//    `fom/hoja/<empresa>/<codigo>-v<version>/<n>` (Cloudinary no deja pisar
//    una ya subida y el mapa guarda el public_id exacto de cada una). Sin
//    Cloudinary (o en la demostración), en IndexedDB de este navegador: en
//    localStorage no caben.
//  · Al leer, todo pasa por hojaValida: si algo no cuadra, se descarta.
// ============================================================
import { CONECTADO } from './repo'
import { empresaGestionActualId } from './api'
import { sesionActual } from '../auth'
import { cloudinaryConfigurado, idVigente, subirImagen, urlDe } from './cloudinary'
import { esImagenDeHoja, hojaValida, validarMapa } from './hojaEmpresa'

const NUBE = import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME || ''
const PRESET = import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET || ''

/**
 * La empresa en la que se está trabajando (la del admin FOM es la que eligió).
 * Conectado y sin empresa, '' : nada se guarda ni se lee (no hay una carpeta
 * común para todos). La demostración usa 'demo'.
 */
export const empresaActual = () => empresaGestionActualId() || sesionActual()?.perfil?.empresaId || (CONECTADO ? '' : 'demo')

export const SIN_EMPRESA = 'No sabemos en qué empresa estás trabajando: elige la empresa y vuelve a intentarlo.'
const MAPA_MALO = 'La hoja tiene marcas fuera de lugar: vuelve a ubicar las respuestas y guarda otra vez.'
const NO_CABE = 'No cabe la hoja en el almacenamiento de este navegador. Prueba con una imagen más liviana o borra hojas de prueba.'
/** Por qué conectado la hoja queda solo en este navegador. */
export const MOTIVO_PROVISIONAL = 'el servidor todavía no guarda la hoja junto a la plantilla'

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

// --- Imágenes en IndexedDB -------------------------------------------------

const BD = 'fom-hojas'
const TABLA = 'paginas'

/**
 * Las imágenes de las páginas en IndexedDB, por la misma clave que la hoja.
 * { guardar(clave, paginas), leer(clave) }. Sin IndexedDB, guardar falla
 * con un mensaje claro y leer da null.
 */
export function crearImagenesIdb(idb = globalThis.indexedDB) {
  let abierta = null
  const abrir = () => {
    abierta ??= new Promise((resolve, reject) => {
      const p = idb.open(BD, 1)
      p.onupgradeneeded = () => p.result.createObjectStore(TABLA)
      p.onsuccess = () => resolve(p.result)
      p.onerror = () => reject(p.error)
      p.onblocked = () => reject(new Error('IndexedDB bloqueada'))
    }).catch((e) => { abierta = null; throw e })
    return abierta
  }
  const operar = async (modo, hacer) => {
    const bd = await abrir()
    return new Promise((resolve, reject) => {
      const tx = bd.transaction(TABLA, modo)
      const pedido = hacer(tx.objectStore(TABLA))
      tx.oncomplete = () => resolve(pedido?.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada'))
    })
  }
  return {
    async guardar(clave, paginas) {
      if (!idb) throw new Error('Este navegador no deja guardar las imágenes de la hoja. Prueba con otro navegador o configura Cloudinary.')
      try {
        await operar('readwrite', (t) => t.put(paginas, clave))
      } catch {
        throw new Error(NO_CABE)
      }
    },
    async leer(clave) {
      if (!idb) return null
      try {
        const v = await operar('readonly', (t) => t.get(clave))
        return Array.isArray(v) ? v : null
      } catch {
        return null
      }
    },
  }
}

// --- En este navegador ------------------------------------------------------

/**
 * Almacén local. `almacen` es localStorage (o uno en memoria en las pruebas)
 * y guarda el mapa, las direcciones de Cloudinary y un índice por empresa;
 * `imagenes` (IndexedDB) guarda las imágenes incrustadas, que no caben en
 * localStorage. `provisional`: conectado, lo guardado aquí no lo ve otra
 * computadora.
 */
export function crearAlmacenLocal(almacen = globalThis.localStorage, imagenes = crearImagenesIdb(), { provisional: soloAqui = false } = {}) {
  const indice = (empresa) => (empresa ? leerJson(almacen, claveIndice(empresa)) ?? [] : [])
  const anotar = (empresa, entrada) => {
    if (!empresa) return
    const resto = indice(empresa).filter((e) => !(e.codigo === entrada.codigo && Number(e.version) === Number(entrada.version)))
    try { almacen.setItem(claveIndice(empresa), JSON.stringify([entrada, ...resto])) } catch { /* el índice es solo una ayuda */ }
  }
  /** Las imágenes de Cloudinary van con el mapa; las incrustadas, a IndexedDB. */
  async function subirPaginas({ empresa, codigo, version, paginas }) {
    if (!empresa) throw new Error(SIN_EMPRESA)
    if (!paginas?.length || !paginas.every(esImagenDeHoja)) throw new Error('Las imágenes de la hoja no se pueden guardar: vuelve a subir el archivo.')
    if (paginas.every((p) => p.startsWith('https://'))) return { paginas: [...paginas], enAlmacen: false }
    await imagenes.guardar(claveHoja(empresa, codigo, version), paginas)
    return { paginas: [...paginas], enAlmacen: true }
  }
  return {
    tipo: 'local',
    indice,
    anotar,
    subirPaginas,
    /** `subidas`: lo que devolvió subirPaginas (si ya se llamó antes de crear la plantilla). */
    async guardar({ empresa, codigo, version, nombre, paginas, mapa, provisional = soloAqui, subidas = null }) {
      if (!empresa) throw new Error(SIN_EMPRESA)
      const revisado = validarMapa(mapa)
      if (!revisado) throw new Error(MAPA_MALO)
      const s = subidas ?? await subirPaginas({ empresa, codigo, version, paginas })
      const registro = { mapa: revisado, paginas: s.enAlmacen ? null : s.paginas, enAlmacen: s.enAlmacen, guardadaEn: new Date().toISOString(), provisional }
      try {
        almacen.setItem(claveHoja(empresa, codigo, version), JSON.stringify(registro))
      } catch {
        throw new Error(NO_CABE)
      }
      anotar(empresa, { codigo, version: Number(version), nombre, guardadaEn: registro.guardadaEn, provisional, donde: 'local' })
      return { donde: 'local', provisional, ...(provisional ? { motivo: MOTIVO_PROVISIONAL } : {}) }
    },
    async leer({ empresa, codigo, version }) {
      if (!empresa) return null
      const clave = claveHoja(empresa, codigo, version)
      const r = leerJson(almacen, clave)
      if (!r?.mapa) return null
      // Las hojas guardadas antes de IndexedDB traen las imágenes aquí mismo.
      const paginas = Array.isArray(r.paginas) ? r.paginas : r.enAlmacen ? await imagenes.leer(clave) : null
      return hojaValida({ mapa: r.mapa, paginas, provisional: r.provisional, guardadaEn: r.guardadaEn })
    },
  }
}

// --- Imágenes en Cloudinary -------------------------------------------------

/** Una imagen en dataURL (lo que sale del lector) como archivo para subir. */
async function aArchivo(dataUrl, nombre) {
  const blob = await (await fetch(dataUrl)).blob()
  return new File([blob], nombre, { type: blob.type || 'image/jpeg' })
}

/**
 * Almacén con las imágenes en Cloudinary y el mapa en este navegador (ver
 * arriba). Todo lo de fuera se inyecta para probarlo sin subir nada de
 * verdad: `subir` (subirImagen), `vigente` (idVigente), `local` (donde queda
 * el mapa) y `urlImagen`.
 */
export function crearAlmacenCloudinary({
  nube = NUBE, preset = PRESET, subir = subirImagen, vigente = idVigente,
  local = crearAlmacenLocal(), urlImagen = (id) => urlDe(id, 2000, 0, { ajuste: 'contener' }), archivo = aArchivo,
} = {}) {
  /** Sube cada página y devuelve el public_id exacto de cada una (Cloudinary no deja pisar una subida). */
  async function subirPaginas({ empresa, codigo, version, nombre, paginas }) {
    if (!empresa) throw new Error(SIN_EMPRESA)
    if (!nube || !preset) throw new Error('Cloudinary no está configurado en esta web.')
    const base = carpetaHoja(empresa, codigo, version)
    const imagenes = []
    for (const [i, pagina] of paginas.entries()) {
      await subir(await archivo(pagina, `hoja-${i + 1}.jpg`), { publicId: base, etiqueta: `fom_hoja_${limpio(empresa)}`, titulo: `${nombre} · página ${i + 1}` })
      imagenes.push(await vigente(base))
    }
    return { paginas: imagenes.map(urlImagen), imagenes, enAlmacen: false }
  }
  return {
    tipo: 'cloudinary',
    indice: local.indice,
    subirPaginas,
    async guardar({ empresa, codigo, version, nombre, paginas, mapa, subidas = null }) {
      if (!empresa) throw new Error(SIN_EMPRESA)
      if (!validarMapa(mapa)) throw new Error(MAPA_MALO)
      const s = subidas ?? await subirPaginas({ empresa, codigo, version, nombre, paginas })
      return local.guardar({ empresa, codigo, version, nombre, mapa: { ...mapa, imagenes: s.imagenes }, subidas: s, provisional: true })
    },
    leer: (q) => local.leer(q),
  }
}

// --- El que toca -------------------------------------------------------------

let elegido = null
/**
 * Con Cloudinary y conectado: las imágenes a la nube. Si no, todo en este
 * navegador. Conectado, el mapa queda provisional en los dos casos.
 */
export function almacenHojas() {
  if (elegido) return elegido
  const local = crearAlmacenLocal(globalThis.localStorage, crearImagenesIdb(), { provisional: CONECTADO })
  elegido = CONECTADO && cloudinaryConfigurado() ? crearAlmacenCloudinary({ local }) : local
  return elegido
}

/** Las plantillas de la empresa actual que tienen hoja (según este navegador). */
export function hojasConocidas() {
  return almacenHojas().indice(empresaActual())
}

/** La hoja de una plantilla concreta, o null. */
export function hojaDePlantilla({ codigo, version }) {
  const empresa = empresaActual()
  if (!empresa) return Promise.resolve(null)
  return almacenHojas().leer({ empresa, codigo, version }).catch(() => null)
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
