// ============================================================
// NOMBRE DE LA UNIDAD — una sola forma de llamarla en todo el panel
// ------------------------------------------------------------
// Antes cada pantalla elegía a mano `alias || placa`, `placa || alias` o el número
// interno, y la misma unidad se llamaba distinto según dónde se mirara. Ahora:
//   nombreUnidad   → alias; si no hay, el número interno en mayúsculas; si no, la placa;
//                    si no, «Unidad».
//   etiquetaUnidad → «nombre · PLACA», sin repetir la placa y sin «·» colgando.
// Los datos traen lo vacío como '' (el «—» se pinta solo al mostrar), pero aquí
// también se tratan como vacíos el «—» y los espacios, que traen datos viejos.
// ============================================================
import { normalizarPlaca } from './placas.js'

/** El texto sin espacios; '' si no hay nada o es la raya de «sin dato». */
export const textoUnidad = (valor) => {
  const t = String(valor ?? '').trim()
  return t === '—' ? '' : t
}

/** El número interno de la unidad en mayúsculas ('' si no tiene). */
const numeroInterno = (v) => textoUnidad(v?.numero).toUpperCase()

/** Cómo se llama la unidad en pantalla. */
export function nombreUnidad(v) {
  return textoUnidad(v?.alias) || numeroInterno(v) || normalizarPlaca(textoUnidad(v?.placa)) || 'Unidad'
}

/** «Hilux 27 · A12BC3D»; sin placa o con la placa ya dicha en el nombre, solo el nombre. */
export function etiquetaUnidad(v) {
  const nombre = nombreUnidad(v)
  const placa = normalizarPlaca(textoUnidad(v?.placa))
  if (!placa || normalizarPlaca(nombre) === placa) return nombre
  return `${nombre} · ${placa}`
}

/**
 * Lo que toda lectura de una unidad del servidor (`/vehicles`) comparte: alias, placa y
 * número. Lo vacío es siempre '' (nunca «—» ni undefined). Sin alias, el nombre cae en el
 * número de flota y solo al final en el `code`, que suele ser opaco.
 */
export function identidadDeUnidad(v) {
  const numero = textoUnidad(v?.fleetNumber) || textoUnidad(v?.code)
  return {
    alias: textoUnidad(v?.alias) || numero.toUpperCase(),
    placa: normalizarPlaca(textoUnidad(v?.plate)),
    numero,
  }
}
