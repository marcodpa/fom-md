/** La identidad confirmada manda; sin ella, solo un nombre inequívoco. */
export function miAsignacion(perfil, asignaciones) {
  if (!perfil) return null
  if (perfil.userId) return asignaciones.find(a => a.id === perfil.userId) ?? null
  const nombre = String(perfil.nombre ?? '').trim().toLowerCase()
  if (!nombre) return null
  const mias = asignaciones.filter(a => String(a.nombre ?? '').trim().toLowerCase() === nombre)
  return mias.length === 1 ? mias[0] : null
}

/** Nunca reutilizar una ficha de la asignación anterior al cambiar de unidad. */
export function unidadDeAsignacion(asignacion, unidad) {
  if (!asignacion?.vehiculoId || unidad?.id !== asignacion.vehiculoId) return null
  const ultimo = (unidad.recorrido ?? []).at(-1)
  return { ...unidad, lat: unidad.lat ?? ultimo?.lat ?? null, lng: unidad.lng ?? ultimo?.lng ?? null }
}
