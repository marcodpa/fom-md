import { conSenalAlDia, soloRecepcion } from './sinSenal.js'

// Une únicamente el equipo de la instalación visible en la API autorizada.
// La recepción es evidencia de señal (`recepcionGpsAt`); nunca crea posición, velocidad ni marcha.
// Qué estado sale de esa evidencia lo decide `estadoSenal` (sinSenal.js), no este archivo.
export function conRecepcionEquipo(unidad, equipo, ubicacion = null, ahora = Date.now()) {
  if (!equipo || equipo.vehicleId !== unidad.id || !['meitrack-t399', 'coban-gps103'].includes(equipo.protocolFamily)
    || !equipo.installationId || (unidad.empresaId && equipo.operatingTenantId !== unidad.empresaId)) return unidad
  const recibido = Date.parse(equipo.lastConnectionAt)
  const instalado = Date.parse(equipo.installedAt)
  if (!Number.isFinite(recibido) || !Number.isFinite(instalado) || recibido < instalado || recibido > ahora) return unidad
  const senal = Date.parse(unidad.ultimoReporte)
  const ultima = Number.isFinite(senal) && senal > recibido ? unidad.ultimoReporte : equipo.lastConnectionAt
  const conRecepcion = { ...unidad, ultimoReporte: ultima, recepcionGpsAt: equipo.lastConnectionAt, ubicacionGps: ubicacion }
  // Sin posición reciente, la velocidad, la marcha y el motor son de una posición vieja: no se rejuvenecen.
  const sinPosicion = soloRecepcion(conRecepcion, ahora)
  return conSenalAlDia({ ...conRecepcion, soloRecepcion: sinPosicion,
    ...(sinPosicion ? { estadoMarcha: null, velocidadKmh: null, ignition: null } : {}) }, ahora)
}

/** Inventario autorizado: una sola instalación inequívoca por vehículo. */
export function conRecepcionFlota(unidades, equipos, empresaId = null, ahora = Date.now()) {
  const porVehiculo = new Map()
  for (const equipo of equipos) {
    if (!equipo.vehicleId) continue
    const anteriores = porVehiculo.get(equipo.vehicleId) ?? []
    anteriores.push(equipo)
    porVehiculo.set(equipo.vehicleId, anteriores)
  }
  return unidades.map(unidad => {
    const candidatos = porVehiculo.get(unidad.id) ?? []
    const equipo = candidatos.length === 1 ? candidatos[0] : null
    if (empresaId && equipo?.operatingTenantId !== empresaId) return unidad
    return conRecepcionEquipo(unidad, equipo, unidad.ubicacionGps ?? null, ahora)
  })
}
