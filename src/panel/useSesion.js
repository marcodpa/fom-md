import { useEffect, useState } from 'react'
import { alCambiar, sesionActual } from './auth'

/** Sesión reactiva del panel: se actualiza al entrar o salir. */
export function useSesion() {
  const [sesion, setSesion] = useState(() => sesionActual())
  useEffect(() => alCambiar(setSesion), [])
  return sesion
}
