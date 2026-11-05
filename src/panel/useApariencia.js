import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { atributoVidrio, cuentaApariencia, crearPreferenciasApariencia, crearPreferenciasFondo, crearPreferenciasVidrio, FONDO_POR_DEFECTO, VIDRIO_POR_DEFECTO, vidrioEfectivo } from './apariencia-store'
import { conTransicion } from './movimiento'

const obtenerStorage = () => typeof window === 'undefined' ? null : window.localStorage
const eventos = typeof window === 'undefined' ? null : window
const preferencias = crearPreferenciasApariencia(obtenerStorage, eventos)
const fondos = crearPreferenciasFondo(obtenerStorage, eventos)
const vidrios = crearPreferenciasVidrio(obtenerStorage, eventos)

// «Reducir transparencia» del sistema: el vidrio queda en Sólido.
const SIN_TRANSPARENCIA = '(prefers-reduced-transparency: reduce)'
const consulta = () => (typeof window === 'undefined' ? null : window.matchMedia?.(SIN_TRANSPARENCIA))
const suscribirTransparencia = fn => {
  const mq = consulta()
  mq?.addEventListener?.('change', fn)
  return () => mq?.removeEventListener?.('change', fn)
}
const leerTransparencia = () => Boolean(consulta()?.matches)

export function useApariencia(perfil) {
  const cuenta = cuentaApariencia(perfil)
  const obtener = useCallback(() => preferencias.leer(cuenta), [cuenta])
  const obtenerFondo = useCallback(() => fondos.leer(cuenta), [cuenta])
  const diseno = useSyncExternalStore(preferencias.suscribir, obtener, () => 'azul')
  const fondo = useSyncExternalStore(fondos.suscribir, obtenerFondo, () => FONDO_POR_DEFECTO)
  const obtenerVidrio = useCallback(() => vidrios.leer(cuenta), [cuenta])
  const vidrioElegido = useSyncExternalStore(vidrios.suscribir, obtenerVidrio, () => VIDRIO_POR_DEFECTO)
  const sinTransparencia = useSyncExternalStore(suscribirTransparencia, leerTransparencia, () => false)
  const [aviso, setAviso] = useState('')
  useEffect(() => setAviso(''), [cuenta])
  const cambiar = valor => {
    // El cambio de diseño se funde entero (T-184), no salta de golpe.
    conTransicion(() => {
      const guardado = preferencias.cambiar(cuenta, valor)
      setAviso(guardado ? 'Diseño guardado para tu cuenta en este navegador.' : 'Diseño aplicado. Este navegador no permite guardarlo; al cerrar la sesión puede perderse.')
    }, 'tema')
  }
  const cambiarFondo = valor => {
    conTransicion(() => {
      const guardado = fondos.cambiar(cuenta, valor)
      setAviso(guardado ? 'Fondo guardado para tu cuenta en este navegador.' : 'Fondo aplicado. Este navegador no permite guardarlo; al cerrar la sesión puede perderse.')
    }, 'tema')
  }
  const cambiarVidrio = valor => {
    conTransicion(() => {
      const guardado = vidrios.cambiar(cuenta, valor)
      setAviso(guardado ? 'Vidrio guardado para tu cuenta en este navegador.' : 'Vidrio aplicado. Este navegador no permite guardarlo; al cerrar la sesión puede perderse.')
    }, 'tema')
  }
  return {
    diseno, cambiar, fondo, cambiarFondo, aviso,
    // El paso que se ve, el atributo de .pnl y si el sistema lo fuerza a Sólido.
    vidrio: vidrioEfectivo(diseno, vidrioElegido, sinTransparencia),
    vidrioAtributo: atributoVidrio(vidrioElegido, sinTransparencia),
    sinTransparencia,
    cambiarVidrio,
  }
}
