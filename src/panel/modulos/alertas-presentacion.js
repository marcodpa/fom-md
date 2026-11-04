import { masNuevoPrimero } from '../datos/orden.js'

export function estaLeida(aviso) {
  return Boolean(aviso?.leida || aviso?.leidaEn)
}

/** Cuántos avisos siguen sin leer: la ÚNICA cuenta (campana, globo del teléfono, bandeja y Resumen). */
export function contarSinLeer(lista) {
  return (lista ?? []).filter(n => !estaLeida(n)).length
}

export function esDeHoy(iso, ahora = new Date()) {
  if (!iso) return false
  const fecha = new Date(iso)
  return !Number.isNaN(fecha.getTime()) && fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth() && fecha.getDate() === ahora.getDate()
}

export function agruparAvisos(lista, ahora = new Date()) {
  const ordenados = masNuevoPrimero(lista, 'creadaEn')
  return [
    { titulo: 'Hoy', items: ordenados.filter(n => esDeHoy(n.creadaEn, ahora)) },
    { titulo: 'Anteriores', items: ordenados.filter(n => !esDeHoy(n.creadaEn, ahora)) },
  ].filter(g => g.items.length)
}
