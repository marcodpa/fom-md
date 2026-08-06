import { useEffect, useState } from 'react'
import { alCambiarTema, aplicarTema, alternarEsquema, escucharSistema, esquemaDe, modoGuardado } from './tema'

/**
 * Tema reactivo de la consola. Devuelve el esquema en curso y la función para
 * alternarlo, igual que useTheme()/toggleColorScheme() en la app.
 */
export function useTema(marca) {
  const [esquema, setEsquema] = useState(() => esquemaDe())

  useEffect(() => {
    aplicarTema(modoGuardado(), marca)
    const bajaTema = alCambiarTema(({ esquema: e }) => setEsquema(e))
    const bajaSistema = escucharSistema()
    return () => {
      bajaTema()
      bajaSistema()
    }
  }, [marca])

  return { esquema, alternar: alternarEsquema }
}

export default useTema
