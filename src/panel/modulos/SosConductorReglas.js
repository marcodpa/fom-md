// ============================================================
// LAS REGLAS DEL SOS (T-167b), sin pantalla: se prueban solas.
// Copia de validarParte (lib/validate.ts) y `duracion` de emergencia.tsx de
// la app. El «hace 40 s» es el único de la consola (sinSenal.js).
// ============================================================

/** «hace 40 s», «hace 3 min»: cuánto lleva, que es lo que cuenta en una emergencia. */
export { haceCuanto } from '../datos/sinSenal.js'

/** Cuánto duró el aviso, para el recibo: bajo el minuto, en segundos. */
export function duracionAviso(desde, hasta) {
  const seg = Math.max(0, Math.round((hasta - new Date(desde).getTime()) / 1000))
  if (seg < 60) return `${seg} s`
  const min = Math.round(seg / 60)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return min % 60 ? `${h} h ${min % 60} min` : `${h} h`
}

/** «Otro» sin decir qué es no le sirve a quien va a ir (validarParte de la app). */
export function validarTipoOtro(valor) {
  const v = String(valor ?? '').trim()
  if (!v) return 'Escribe qué tipo de emergencia es.'
  if (v.length < 3) return 'Muy corto: mínimo 3 caracteres.'
  if (v.length > 40) return 'Máximo 40 caracteres.'
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9 .\-/]+$/u.test(v)) return 'Solo letras, números y espacios.'
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/u.test(v)) return 'Ponle nombre, no solo números.'
  return null
}
