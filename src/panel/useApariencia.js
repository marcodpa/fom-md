import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { cuentaApariencia, crearPreferenciasApariencia } from './apariencia-store'

const preferencias = crearPreferenciasApariencia(
  () => typeof window === 'undefined' ? null : window.localStorage,
  typeof window === 'undefined' ? null : window,
)

export function useApariencia(perfil) {
  const cuenta = cuentaApariencia(perfil)
  const obtener = useCallback(() => preferencias.leer(cuenta), [cuenta])
  const diseno = useSyncExternalStore(preferencias.suscribir, obtener, () => 'azul')
  const [aviso, setAviso] = useState('')
  useEffect(() => setAviso(''), [cuenta])
  const cambiar = valor => {
    const guardado = preferencias.cambiar(cuenta, valor)
    setAviso(guardado ? 'Diseño guardado para tu cuenta en este navegador.' : 'Diseño aplicado. Este navegador no permite guardarlo; al cerrar la sesión puede perderse.')
  }
  return { diseno, cambiar, aviso }
}
