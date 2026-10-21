// ============================================================
// LAS VIÑETAS DE LA PLANILLA: la ayuda de cada ítem del formato (T-79)
// ------------------------------------------------------------
// El detalle de una inspección dice qué se respondió en cada ítem, no lo que
// decía el ítem entero: sus sub-puntos están en el FORMATO publicado. Igual
// que la app (getAyudasFormatoFom), se leen del formato y se cruzan con las
// respuestas. Una lectura por formato, no una por hoja.
//
//  · Conectado: se busca el formato por su nombre entre las plantillas de la
//    empresa (la publicada primero, luego la versión más alta) y se lee su
//    detalle, GET /inspection-templates/{id}.
//  · Siempre, de respaldo: los formatos listos del panel (IOGP Conducción),
//    que son los que se publican con un clic; cruzan por nombre del ítem, así
//    que a un formato distinto no le ponen viñetas ajenas.
//  · Demostración: las inspecciones de la semilla no traen formato, así que
//    sus hojas salen con los títulos (como la app sin formato publicado).
//
// Si nada coincide la hoja sale con los títulos, que es la verdad.
// ============================================================

import repo, { CONECTADO } from './repo'
import { pedir } from './api'
import { ayudasDeItems } from './planillaInspeccion'
import IOGP_CONDUCCION from './formatos/iogp-conduccion.json'

const CONOCIDAS = [IOGP_CONDUCCION]

/** La plantilla que manda para un nombre: la publicada y, entre iguales, la versión más alta. */
function laQueManda(plantillas, nombre) {
  return plantillas
    .filter((t) => t.nombre === nombre)
    .sort((a, b) => Number(b.estado === 'publicada') - Number(a.estado === 'publicada') || Number(b.version) - Number(a.version))[0] ?? null
}

/** Los ítems de un formato leído del servidor, venga envuelto o no. */
function itemsDe(r) {
  return r?.template?.items ?? r?.item?.items ?? r?.items ?? []
}

/**
 * La ayuda de cada ítem del formato `nombre`, como Map para la planilla.
 * Nunca falla: sin formato que leer devuelve lo que se sepa (o nada).
 */
export async function leerAyudasDelFormato(nombre) {
  const ayudas = new Map()
  const sumar = (m) => m.forEach((v, k) => ayudas.set(k, v))
  CONOCIDAS.forEach((f) => sumar(ayudasDeItems(f.items)))
  if (!nombre || !CONECTADO) return ayudas
  try {
    const t = laQueManda((await repo.programaInspecciones.plantillas({})) ?? [], nombre)
    if (!t) return ayudas
    const r = await pedir(`/api/v1/console/inspection-templates/${encodeURIComponent(t.id)}`)
    sumar(ayudasDeItems(itemsDe(r)))
  } catch {
    // Sin formato no hay viñetas propias; la hoja sale igual con sus títulos.
  }
  return ayudas
}
