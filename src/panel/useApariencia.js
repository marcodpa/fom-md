import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { cuentaApariencia, crearPreferenciasApariencia, crearPreferenciasFondo, FONDO_POR_DEFECTO } from './apariencia-store'
import { conTransicion } from './movimiento'

const obtenerStorage = () => typeof window === 'undefined' ? null : window.localStorage
const eventos = typeof window === 'undefined' ? null : window
const preferencias = crearPreferenciasApariencia(obtenerStorage, eventos)
const fondos = crearPreferenciasFondo(obtenerStorage, eventos)

export function useApariencia(perfil) {
  const cuenta = cuentaApariencia(perfil)
  const obtener = useCallback(() => preferencias.leer(cuenta), [cuenta])
  const obtenerFondo = useCallback(() => fondos.leer(cuenta), [cuenta])
  const diseno = useSyncExternalStore(preferencias.suscribir, obtener, () => 'azul')
  const fondo = useSyncExternalStore(fondos.suscribir, obtenerFondo, () => FONDO_POR_DEFECTO)
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
  return { diseno, cambiar, fondo, cambiarFondo, aviso }
}
