import { useEffect, useState } from 'react'
import { fondoPorId } from '../apariencia-store'

const MOVIL = '(max-width: 767px)'

/**
 * La capa del fondo elegido (docs/FONDOS.md): fija, detrás de todo el panel y
 * sin recibir clics. La foto se pide cuando el navegador queda libre y entra
 * fundida al cargar; mientras, se ve el degradado del mismo tono. En el
 * teléfono baja la versión vertical y más liviana.
 */
export default function FondoPanel({ fondo }) {
  const f = fondoPorId(fondo)
  const [lista, setLista] = useState(null)
  const [movil, setMovil] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(MOVIL).matches)

  useEffect(() => {
    const mq = window.matchMedia?.(MOVIL)
    if (!mq) return undefined
    const alCambiar = () => setMovil(mq.matches)
    mq.addEventListener?.('change', alCambiar)
    return () => mq.removeEventListener?.('change', alCambiar)
  }, [])

  const url = f.imagen ? (movil && f.imagenMovil) || f.imagen : null
  useEffect(() => {
    if (!url) return undefined
    let vivo = true
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => { if (vivo) setLista(url) }
    const pedir = () => { img.src = url }
    // Carga perezosa: primero el panel y sus datos, después la foto.
    const id = window.requestIdleCallback ? window.requestIdleCallback(pedir, { timeout: 1200 }) : window.setTimeout(pedir, 200)
    return () => {
      vivo = false
      img.onload = null
      if (window.cancelIdleCallback) window.cancelIdleCallback(id)
      else window.clearTimeout(id)
    }
  }, [url])

  if (!f.tono) return null
  const cargada = url && lista === url
  return <div
    className="pnl-fondo"
    data-fondo={f.id}
    data-lista={cargada ? '' : undefined}
    aria-hidden="true"
    style={cargada ? { '--fondo-foto': `url("${url}")` } : undefined}
  />
}
