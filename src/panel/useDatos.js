import { useCallback, useEffect, useRef, useState } from 'react'
import { alCambiarDatos } from './datos/repo'

/**
 * Carga asíncrona con estados completos, equivalente al useAsyncData de la app.
 * Se recarga solo cuando el repositorio cambia (una edición en otro módulo).
 *
 * const { datos, estado, error, errorRefresco, recargar } = useDatos(() => repo.vehiculos.listar({ q }), [q])
 *
 * Un refresco silencioso que falla (el de 15 s, o el que sigue a una edición)
 * NO tumba la pantalla si ya había datos buenos: `estado` se queda en 'ok' y el
 * fallo queda aparte en `errorRefresco`, para quien quiera avisarlo.
 */
export function useDatos(cargar, deps = [], refrescarCada = 0) {
  const [datos, setDatos] = useState(null)
  const [estado, setEstado] = useState('cargando') // cargando | ok | error
  const [error, setError] = useState(null)
  const [errorRefresco, setErrorRefresco] = useState(null)
  const hayDatos = useRef(false)
  const vivo = useRef(true)
  const peticion = useRef(0)
  const fnRef = useRef(cargar)
  fnRef.current = cargar

  const ejecutar = useCallback((silencioso = false) => {
    const actual = ++peticion.current
    const cargarActual = fnRef.current
    if (!silencioso) {
      setEstado('cargando')
      hayDatos.current = false
    }
    return Promise.resolve()
      .then(() => cargarActual())
      .then((r) => {
        if (!vivo.current || actual !== peticion.current) return
        hayDatos.current = true
        setDatos(r)
        setEstado('ok')
        setError(null)
        setErrorRefresco(null)
      })
      .catch((e) => {
        if (!vivo.current || actual !== peticion.current) return
        // Silencioso y con datos buenos en pantalla: se conservan.
        if (silencioso && hayDatos.current) {
          setErrorRefresco(e)
          return
        }
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
      peticion.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // Si otro módulo edita algo, refrescar sin parpadeo.
  useEffect(() => alCambiarDatos(() => ejecutar(true)), [ejecutar])

  // Refresco periódico, para las pantallas que siguen algo vivo (la posición
  // de la flota). Va en silencio: sin estado de carga, así la tabla no
  // parpadea ni el mapa se reconstruye. Se detiene con la pestaña en segundo
  // plano — nadie está mirando y son peticiones al servidor de balde.
  useEffect(() => {
    if (!refrescarCada) return undefined
    const id = setInterval(() => {
      if (!document.hidden) ejecutar(true)
    }, refrescarCada)
    const alVolver = () => {
      if (!document.hidden) ejecutar(true)
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [refrescarCada, ejecutar])

  // Tras una escritura, el servidor tarda un instante en reflejar el cambio: se vuelve a leer una segunda vez para que la
  // lista no se quede con lo anterior hasta recargar la página.
  const recargar = () => {
    const primera = ejecutar(true)
    setTimeout(() => { if (vivo.current) ejecutar(true) }, 2200)
    return primera
  }
  return { datos, estado, error, errorRefresco, recargar }
}

export default useDatos
