// ============================================================
// ATENCIÓN DE UNA UNIDAD — una sola respuesta a «¿esta unidad pide atención
// por sus papeles o por no tener conductor?». La usan la tabla de Flota, la
// lista del teléfono y las filas del informe, para que nunca digan cosas
// distintas de la misma unidad.
//
// `docsVencidos` / `docsPorVencer` salen de contar los documentos con la regla
// de datos/vencimientos.js. Si la fuente no los trae (null) no se afirma nada
// sobre papeles: ni vencidos ni al día.
// ============================================================

const cuenta = (n) => (Number(n) > 0 ? Number(n) : 0)

/**
 * { vencidos, porVencer, sinConductor, sinDatoPapeles, requiere, novedad }
 *  - `requiere`: tiene papeles vencidos o por vencer, o nadie a cargo.
 *  - `novedad`: la PEOR, con su tramo del teléfono ('no-salen' | 'atencion'),
 *    o null si no hay ninguna.
 */
export function atencionDeUnidad(v) {
  const vencidos = cuenta(v?.docsVencidos)
  const porVencer = cuenta(v?.docsPorVencer)
  const sinConductor = !v?.conductorPrincipalId
  const sinDatoPapeles = v?.docsVencidos == null || v?.docsPorVencer == null

  let novedad = null
  if (vencidos > 0) {
    novedad = { peso: 3, grupo: 'no-salen', color: 'rojo', t: vencidos === 1 ? 'Documento vencido' : `${vencidos} vencidos` }
  } else if (porVencer > 0) {
    novedad = { peso: 5, grupo: 'atencion', color: 'ambar', t: `${porVencer} por vencer` }
  } else if (sinConductor) {
    novedad = { peso: 7, grupo: 'atencion', color: 'ambar', t: 'Sin conductor' }
  }

  return { vencidos, porVencer, sinConductor, sinDatoPapeles, requiere: novedad !== null, novedad }
}
