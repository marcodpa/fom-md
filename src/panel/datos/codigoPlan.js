/** Canonical code accepted by the maintenance API (2–80 ASCII characters). */
export function normalizarCodigoPlan(valor = '') {
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/gu, '')
    .trim().toLowerCase().replace(/[^a-z0-9._-]+/gu, '-')
    .replace(/^[^a-z0-9]+/u, '').replace(/-+$/u, '')
}
export function validarCodigoPlan(valor) {
  if (!/^[a-z0-9][a-z0-9._-]{1,79}$/u.test(valor)) {
    throw new Error('El código debe tener entre 2 y 80 caracteres y empezar con una letra o número. Usa letras, números, puntos, guiones o guiones bajos.')
  }
  return valor
}
