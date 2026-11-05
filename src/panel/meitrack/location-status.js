const STATES = {
  reception_pending: ['Esperando recepción', 'El servidor todavía no tiene una trama comprobada de este equipo.'],
  interpretation_pending: ['Ubicación pendiente', 'Hay recepción, pero todavía falta interpretar una posición utilizable.'],
  clock_pending: ['Validación de hora pendiente', 'Llegan mensajes del equipo, pero el servidor todavía no ha comprobado la hora de sus posiciones y por eso no las publica en el mapa. El equipo ya está bien configurado: no repitas los SMS de APN y servidor; guarda la respuesta DB4 del equipo, que es la que comprueba la hora.'],
  assignment_pending: ['Asignación pendiente', 'Asigna el GPS a una unidad para publicar su ubicación en la empresa correspondiente.'],
  fix_pending: ['Esperando posición GPS', 'Hay recepción y hora comprobada. Falta una posición válida del equipo.'],
  projection_pending: ['Publicación de ubicación pendiente', 'La trama está cualificada, pero el servidor todavía no ha confirmado una posición publicada para la unidad.'],
  available: ['Ubicación disponible', 'El servidor confirmó una posición reciente publicada para la unidad y su instalación vigente.'],
  stale: ['Sin ubicación reciente', 'Las posiciones comprobadas no son recientes. La recepción y la hora de la posición se comprueban por separado.'],
  unavailable: ['No se pudo comprobar la ubicación', 'Vuelve a consultar. Recibir una trama no confirma por sí solo la publicación de una posición.'],
}
export function locationStatus(value) {
  const known = value && Object.hasOwn(STATES, value.state) ? value.state : 'unavailable'
  return { state: known, title: STATES[known][0], detail: STATES[known][1], available: known === 'available' }
}
