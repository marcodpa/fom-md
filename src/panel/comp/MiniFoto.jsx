import { useEffect, useRef, useState } from 'react'
import { cloudinaryConfigurado, etiquetas, fotosDe, miniatura } from '../datos/cloudinary'

// La foto de una unidad en una lista: se pide solo cuando la fila se ve en pantalla (una consulta por carro, pero
// únicamente de los que se ven) y se recuerda. Mientras no haya foto, se muestra lo de `children` (la ilustración).
export default function MiniFoto({ vehiculoId, alto = 56, ancho = 70, children }) {
  const caja = useRef(null)
  const [visible, setVisible] = useState(false)
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!cloudinaryConfigurado() || !caja.current) return undefined
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return undefined }
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); o.disconnect() } }, { rootMargin: '120px' })
    o.observe(caja.current)
    return () => o.disconnect()
  }, [])

  useEffect(() => {
    let vigente = true
    if (!visible || !vehiculoId) return undefined
    fotosDe(etiquetas.vehiculo(vehiculoId)).then((f) => { if (vigente) setUrl(f[0]?.url ?? null) })
    return () => { vigente = false }
  }, [visible, vehiculoId])

  return (
    <span ref={caja} style={{ display: 'inline-flex', width: ancho, height: alto, flex: 'none' }}>
      {url
        ? <img src={miniatura(url, ancho * 2, alto * 2)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
        : children}
    </span>
  )
}
