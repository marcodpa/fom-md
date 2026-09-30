async function principalActual(api, vehicleId) {
  let offset = 0
  while (true) {
    const result = await api.conductores({ desplazamiento: offset })
    const rows = result?.items ?? []
    const current = rows.find(row => row.vehicleId === vehicleId && row.role === 'principal')
    if (current) return current
    offset += rows.length
    if (!rows.length || offset >= (result?.page?.total ?? offset)) return null
  }
}

// La API actual tiene dos operaciones separadas, no un reemplazo atómico.
// Si el alta falla, se comprueba el estado antes de recuperar la asignación
// anterior: nunca revocar una asignación creada por otro supervisor.
export async function asignarPrincipal(api, vehicleId, userId) {
  const previous = await principalActual(api, vehicleId)
  if (previous?.userId === userId || (!previous && !userId)) return true
  if (previous) await api.revocarAsignacion(previous.assignmentId, {
    reason: userId ? 'reemplazo-de-conductor-desde-consola' : 'quitado-desde-consola',
  })
  if (!userId) return true
  try {
    await api.asignarConductor(vehicleId, { userId, role: 'principal' })
    return true
  } catch (failure) {
    if (!previous) throw failure
    let current
    try { current = await principalActual(api, vehicleId) }
    catch { throw new Error('No se pudo confirmar el cambio de conductor. Recarga la ficha para comprobar la asignación antes de volver a intentarlo.') }
    // El alta pudo completarse aunque se perdiera su respuesta.
    if (current?.userId === userId) return true
    if (current) throw new Error('La asignación cambió durante la operación. Recarga la ficha para ver al conductor vigente; no se modificó esa nueva asignación.')
    try {
      await api.asignarConductor(vehicleId, { userId: previous.userId, role: 'principal' })
    } catch {
      throw new Error('No se pudo asignar al nuevo conductor ni confirmar la recuperación del anterior. Recarga la ficha y revisa la asignación. ' + failure.message)
    }
    throw new Error('No se pudo asignar al nuevo conductor. Se recuperó la asignación del anterior. ' + failure.message)
  }
}
