import { useEffect, useState } from 'react'
import { alCambiarFotos, existeFoto, ids, olvidarFotos, subirRecorte, ultimaVersion, urlDe } from './cloudinary'

// ============================================================
// QUÉ FOTO SE MUESTRA DE UNA UNIDAD (T-179)
// ------------------------------------------------------------
// 1. El recorte sin fondo de su foto vigente (`fom/vehiculo-sin-fondo/<id>/<n>`,
//    mismo n que la original), si el gestor lo aceptó al subirla.
// 2. Si no, su foto normal (`fom/vehiculo/<id>/<n>`), donde se quiera mostrar.
// 3. Si no hay foto, la del catálogo por marca y modelo y, si tampoco, la
//    silueta de su tipo (`fotoSinFondo`, T-170).
//
// El catálogo llega como parámetro (`fotoSinFondo` de ./fotoSinFondo): ese
// módulo usa `import.meta.glob` de Vite y así esto se prueba sin navegador.
// ============================================================

/** id del recorte -> Promise<boolean>. Por sesión, como las versiones. */
const recortes = new Map()

// Tras subir algo desde esta web, lo que dijo «no hay» se vuelve a preguntar.
alCambiarFotos(() => {
  for (const [id, hay] of recortes) hay.then((si) => { if (!si && recortes.get(id) === hay) recortes.delete(id) })
})

/** Olvida lo recordado (al cerrar sesión, y en las pruebas). */
export function olvidarRecortes() {
  recortes.clear()
  olvidarFotos()
}

/**
 * Las fotos de una unidad en Cloudinary: `{ original, recorte }` con su
 * dirección completa (`<base>/<n>`), o `null` en lo que no haya.
 */
export async function buscarFotos(vehiculoId) {
  if (!vehiculoId) return { original: null, recorte: null }
  const n = await ultimaVersion(ids.vehiculo(vehiculoId))
  if (!n) return { original: null, recorte: null }
  const original = `${ids.vehiculo(vehiculoId)}/${n}`
  const id = `${ids.vehiculoSinFondo(vehiculoId)}/${n}`
  // Una sola consulta: ¿hay recorte de ESTA foto? (los recortes no van 1, 2, 3…: solo hay de las que se recortaron).
  if (!recortes.has(id)) recortes.set(id, existeFoto(id))
  return { original, recorte: (await recortes.get(id)) ? id : null }
}

/** Guarda el recorte aceptado de la foto `n` y lo deja como el que se muestra. Lanza un Error en llano si no se pudo. */
export async function guardarRecorte(blob, { vehiculoId, n, titulo }) {
  const id = await subirRecorte(blob, { vehiculoId, n, titulo })
  recortes.set(id, Promise.resolve(true))
  return id
}

/** El recorte sin fondo de la foto vigente de la unidad (`<base>/<n>`), o `null`. */
export async function buscarRecorte(vehiculoId) {
  return (await buscarFotos(vehiculoId)).recorte
}

/**
 * Lo que toca mostrar, ya decidido. `catalogo(marca, modelo, tipo)` devuelve
 * `{ url, silueta }` (la firma de `fotoSinFondo`). Con `conFotoNormal: false`
 * (la franja de «Mi unidad», que solo admite fotos sin fondo) la foto normal
 * no cuenta y se pasa directo al catálogo.
 *
 * Devuelve `{ tipo: 'recorte' | 'foto' | 'catalogo' | 'silueta' | null, id, url }`.
 */
export function elegirFoto({ original = null, recorte = null } = {}, unidad = {}, { catalogo = null, conFotoNormal = true, ancho = 800 } = {}) {
  if (recorte) return { tipo: 'recorte', id: recorte, url: urlDe(recorte, ancho, 0, { ajuste: 'contener' }) }
  if (original && conFotoNormal) return { tipo: 'foto', id: original, url: urlDe(original, ancho, 0, { ajuste: 'contener' }) }
  const c = catalogo?.(unidad.marca, unidad.modelo, unidad.tipo)
  if (c?.url) return { tipo: c.silueta ? 'silueta' : 'catalogo', id: null, url: c.url }
  return { tipo: null, id: null, url: '' }
}

/**
 * Las fotos de la unidad en una pantalla: `{ buscando, original, recorte }`.
 * Se vuelve a buscar sola cuando se sube una foto desde esta web.
 */
export function useFotosVehiculo(vehiculoId) {
  const [estado, setEstado] = useState({ buscando: Boolean(vehiculoId), original: null, recorte: null, de: vehiculoId })
  const [vuelta, setVuelta] = useState(0)
  useEffect(() => alCambiarFotos(() => setVuelta((v) => v + 1)), [])
  useEffect(() => {
    let vigente = true
    buscarFotos(vehiculoId)
      .then((r) => { if (vigente) setEstado({ buscando: false, ...r, de: vehiculoId }) })
      .catch(() => { if (vigente) setEstado({ buscando: false, original: null, recorte: null, de: vehiculoId }) })
    return () => { vigente = false }
  }, [vehiculoId, vuelta])
  // Al cambiar de unidad no se enseña ni un instante la foto de la anterior.
  return estado.de === vehiculoId ? estado : { buscando: true, original: null, recorte: null, de: vehiculoId }
}

/**
 * Para la franja de «Mi unidad» (T-170): igual que `fotoSinFondo(marca, modelo,
 * tipo)` — `{ url, silueta }` — pero si el gestor guardó el recorte de la foto
 * de ESTA unidad, sale ese. El recorte viene en el mismo lienzo 8:5 que el
 * catálogo, con el suelo al 92 % y su sombra ya puesta.
 */
export function useFotoSinFondo(unidad, catalogo, { ancho = 800 } = {}) {
  const fotos = useFotosVehiculo(unidad?.id)
  const e = elegirFoto(fotos, unidad ?? {}, { catalogo, conFotoNormal: false, ancho })
  return { url: e.url || null, silueta: e.tipo === 'silueta', recorte: e.tipo === 'recorte' }
}
