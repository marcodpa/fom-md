// ============================================================
// LA DIARIA DE HOY — una sola cuenta para todo el panel
// ------------------------------------------------------------
// «Faltan hoy» (Inspecciones), «Inspecciones de hoy» (Resumen) y «Diarias
// hechas» salen de aquí. Reglas:
//  - cuenta la UNIDAD, no los registros (una unidad con dos inspecciones es una);
//  - solo la clase diaria: la programada (`scheduled`) no sustituye a la diaria;
//  - «hoy» es el día LOCAL (hoyISO de formato.js), nunca el de UTC;
//  - una inspección de una unidad que ya no está en la flota no suma.
// ============================================================
import { hoyISO } from './formato.js'

/** Solo la diaria cuenta; las demás se ven como una inspección más. */
export const esDiaria = (i) => i?.clase !== 'scheduled'

/** Las unidades de la flota que todavía no tienen su diaria de hoy. */
export function unidadesSinDiariaHoy(flota, inspecciones, hoy = hoyISO()) {
  const hechas = new Set(
    (inspecciones ?? [])
      .filter((i) => esDiaria(i) && String(i?.fecha ?? '').slice(0, 10) === hoy)
      .map((i) => i.vehiculoId),
  )
  return (flota ?? []).filter((v) => !hechas.has(v.id))
}

/** Cuántas unidades ya hicieron la diaria de hoy: el total menos las que faltan. */
export function diariasHechasHoy(flota, inspecciones, hoy = hoyISO()) {
  return (flota ?? []).length - unidadesSinDiariaHoy(flota, inspecciones, hoy).length
}
