// ============================================================
// CONTEO DE EMPRESAS — una sola regla
// ------------------------------------------------------------
// La cuenta de respaldo del sistema (`respaldo`) no es una empresa de
// verdad: no entra en «Empresas», ni en «Todas», ni en activas/suspendidas.
// Suspendida = el servidor dijo que el servicio NO está activo. Si el dato no
// llegó (`servicioActivo` indefinido) no se afirma que esté suspendida.
// ============================================================

/** Las empresas de verdad: todas menos la cuenta de respaldo. */
export const soloOperativas = (lista) => (lista ?? []).filter((e) => !e?.respaldo)

/** `{ operativas, activas, suspendidas }` de una lista de empresas. */
export function contarEmpresas(lista) {
  const operativas = soloOperativas(lista)
  return {
    operativas: operativas.length,
    activas: operativas.filter((e) => e.servicioActivo === true).length,
    suspendidas: operativas.filter((e) => e.servicioActivo === false).length,
  }
}
