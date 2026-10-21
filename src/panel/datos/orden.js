// ============================================================
// ORDEN — toda lista con fecha u hora va de lo más nuevo a lo más viejo
// ------------------------------------------------------------
// Regla de Marco: arriba lo último que pasó. No se confía en el orden en que
// llegan los datos (el servidor y la semilla no siempre coinciden): cada lista
// se ordena aquí antes de pintarla. Lo que no tiene fecha va al final y los
// empates conservan el orden de llegada (el sort de JS es estable).
// ============================================================

/** Milisegundos de una fecha (ISO, «AAAA-MM-DD», Date o número); null si no se puede leer. */
export function instante(valor) {
  if (valor == null || valor === '') return null
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor.getTime()
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  // Un día suelto se lee en hora local, como en formato.js: «2026-10-21» es ese día aquí, no en UTC.
  const texto = String(valor)
  const ms = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? new Date(`${texto}T00:00:00`).getTime() : Date.parse(texto)
  return Number.isNaN(ms) ? null : ms
}

/** Lee la fecha de un elemento: por nombre de campo, por varios (el primero que tenga) o con una función. */
function lector(fechaDe) {
  if (typeof fechaDe === 'function') return fechaDe
  const campos = Array.isArray(fechaDe) ? fechaDe : [fechaDe]
  return (x) => {
    for (const c of campos) if (x?.[c] != null && x[c] !== '') return x[c]
    return null
  }
}

/** Comparador para `sort`: lo más nuevo primero y lo que no tiene fecha al final. */
export function porMasNuevo(fechaDe = 'creadaEn') {
  const leer = lector(fechaDe)
  return (a, b) => {
    const ta = instante(leer(a))
    const tb = instante(leer(b))
    if (ta == null && tb == null) return 0
    if (ta == null) return 1
    if (tb == null) return -1
    return tb - ta
  }
}

/** Copia de la lista ordenada de lo más nuevo a lo más viejo (no toca la original). */
export function masNuevoPrimero(lista, fechaDe = 'creadaEn') {
  return [...(lista ?? [])].sort(porMasNuevo(fechaDe))
}
