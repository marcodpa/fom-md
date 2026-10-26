// ============================================================
// QUITAR EL FONDO de la foto de una unidad (T-179), desde la página.
// ------------------------------------------------------------
// Habla con el trabajador (quitarFondo.worker.js), que es quien hace el
// cálculo sin congelar la web. Uno a la vez. Si tarda más de ~90 s, o algo
// falla, se corta y quien llama se queda con la foto normal.
// ============================================================

import { AVISOS } from './mascara'

/** Lo más que se espera al cálculo (sin contar la primera descarga del programa). */
export const LIMITE_MS = 90_000
/** Lo más que se espera sin que la descarga avance ni un byte. */
const SIN_AVANCE_MS = 45_000
/** Lo que pesa el programa la primera vez (modelo 86 MB + motor 26 MB), mientras el servidor no dice el total. */
export const MB_PROGRAMA = 112

/** Cada motivo de fallo, contado en llano. */
export const MOTIVOS = {
  red: 'No se pudo bajar el programa que quita el fondo. Revisa tu conexión.',
  falta: 'El programa que quita el fondo no está en esta web todavía.',
  foto: 'No se pudo leer esta foto.',
  vacia: 'No se encontró la unidad en la foto.',
  tiempo: 'Quitar el fondo tardó demasiado en este equipo.',
  navegador: 'Este navegador no puede quitar el fondo.',
  otro: 'No se pudo quitar el fondo de esta foto.',
}

/** ¿Este navegador tiene lo necesario (trabajador, lienzo fuera de pantalla)? */
export function quitarFondoPosible() {
  return typeof Worker === 'function' && typeof OffscreenCanvas === 'function' && typeof createImageBitmap === 'function'
}

let trabajador = null
let ocupado = false

function nuevoTrabajador() {
  return new Worker(new URL('./quitarFondo.worker.js', import.meta.url), { type: 'module', name: 'quitar-fondo' })
}

/** Corta lo que esté en curso y suelta la memoria del programa (la caché de descarga se queda). */
export function cancelarQuitarFondo() {
  trabajador?.terminate()
  trabajador = null
  ocupado = false
}

/**
 * Quita el fondo de `archivo`. `alProgreso({ fase, llevado, total, proveedor })`
 * cuenta la descarga del programa (fase «bajando») y el cálculo («quitando»).
 * Resuelve `{ blob, avisos: [texto], claves, tiempos, proveedor }`; si falla,
 * rechaza con un Error cuyo mensaje ya está en llano.
 */
export function quitarFondo(archivo, { alProgreso = () => {}, limiteMs = LIMITE_MS } = {}) {
  if (!quitarFondoPosible()) return Promise.reject(new Error(MOTIVOS.navegador))
  if (ocupado) cancelarQuitarFondo()
  ocupado = true
  if (!trabajador) trabajador = nuevoTrabajador()
  const yo = trabajador
  return new Promise((listo, mal) => {
    let reloj = null
    const terminar = (error, valor) => {
      clearTimeout(reloj)
      yo.onmessage = null
      yo.onerror = null
      if (trabajador === yo) ocupado = false
      if (error) {
        // Tras un corte o un fallo el trabajador puede quedar a medias: el siguiente empieza limpio.
        if (trabajador === yo) cancelarQuitarFondo()
        mal(new Error(MOTIVOS[error] || MOTIVOS.otro))
      } else listo(valor)
    }
    const vigilar = (ms, motivo) => {
      clearTimeout(reloj)
      reloj = setTimeout(() => terminar(motivo), ms)
    }
    vigilar(SIN_AVANCE_MS, 'red')
    yo.onmessage = ({ data }) => {
      if (trabajador !== yo) return
      if (data.tipo === 'progreso') {
        if (data.fase === 'bajando') vigilar(SIN_AVANCE_MS, 'red')
        else vigilar(limiteMs, 'tiempo')
        alProgreso(data)
      } else if (data.tipo === 'listo') {
        terminar(null, {
          blob: data.blob,
          claves: data.avisos,
          avisos: data.avisos.map((k) => AVISOS[k]).filter(Boolean),
          tiempos: data.tiempos,
          proveedor: data.proveedor,
        })
      } else if (data.tipo === 'error') {
        if (data.detalle) console.warn('[quitar fondo]', data.detalle)
        terminar(data.motivo)
      }
    }
    yo.onerror = (e) => {
      console.warn('[quitar fondo]', e?.message || e)
      terminar('otro')
    }
    const base = import.meta.env?.BASE_URL || '/'
    yo.postMessage({ tipo: 'quitar', archivo, base: new URL(base, location.href).href })
  })
}
