import { useCallback, useEffect, useRef, useState } from 'react'
import { alCambiarDatos } from './datos/repo'

/**
 * Carga asíncrona con estados completos, equivalente al useAsyncData de la app.
 * Se recarga solo cuando el repositorio cambia (una edición en otro módulo).
 *
 * const { datos, estado, error, recargar } = useDatos(() => repo.vehiculos.listar({ q }), [q])
 */
export function useDatos(cargar, deps = []) {
  const [datos, setDatos] = useState(null)
  const [estado, setEstado] = useState('cargando') // cargando | ok | error
  const [error, setError] = useState(null)
  const vivo = useRef(true)
  const fnRef = useRef(cargar)
  fnRef.current = cargar

  const ejecutar = useCallback((silencioso = false) => {
    if (!silencioso) setEstado((e) => (e === 'ok' ? 'ok' : 'cargando'))
    return Promise.resolve()
      .then(() => fnRef.current())
      .then((r) => {
        if (!vivo.current) return
        setDatos(r)
        setEstado('ok')
        setError(null)
      })
      .catch((e) => {
        if (!vivo.current) return
        setError(e)
        setEstado('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    vivo.current = true
    ejecutar()
    return () => {
      vivo.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // Si otro módulo edita algo, refrescar sin parpadeo.
  useEffect(() => alCambiarDatos(() => ejecutar(true)), [ejecutar])

  return { datos, estado, error, recargar: () => ejecutar(true) }
}

export default useDatos
