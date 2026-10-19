/** Solo una asignación explícitamente principal puede ocupar la titularidad. */
export function principalDe(asignaciones = []) {
  return asignaciones.find(a => a.rol === 'principal') ?? null
}

/** No unir personas por nombre: el perfil siempre usa la identidad registrada. */
export function perfilDeUsuario(usuarioId) {
  return usuarioId ? `/panel/personal/${encodeURIComponent(usuarioId)}` : null
}

export function filtrarJornadas(jornadas, busqueda = '', estado = '') {
  const q = busqueda.trim().toLocaleLowerCase('es')
  return jornadas.filter(j => (!estado || j.estado === estado)
    && (!q || String(j.conductor ?? '').toLocaleLowerCase('es').includes(q)))
    .sort((a, b) => (Date.parse(b.inicio) || 0) - (Date.parse(a.inicio) || 0))
}
