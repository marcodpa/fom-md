import { estadoSenal } from './sinSenal.js'

/**
 * El estado que se muestra de una unidad: la señal de `estadoSenal` (sinSenal.js), y si reporta,
 * su marcha. Claves: 'en_marcha' | 'parada' (las dos con señal, verdes) | 'sin_ubicacion' (ámbar)
 * | 'sin_senal' | 'sin_gps' (grises). Nada de «Encendido», «Apagado» ni «Reportando»: el
 * encendido es un detalle, no un estado.
 */
export function estadoUnidad(v, ahora = Date.now()) {
  const senal = estadoSenal(v, ahora)
  return { clave: senal.marcha ?? senal.clave, texto: senal.etiqueta, color: senal.color, tono: senal.tono, senal }
}

/** La marcha solo de una unidad que reporta: 'en_marcha' | 'parada' | `null` (sin señal, sin ubicación…). */
export const marchaDe = (v, ahora = Date.now()) => estadoSenal(v, ahora).marcha
