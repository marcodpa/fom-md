import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { etiquetas, ids, urlOriginal } from '../datos/cloudinary'
import { Icono } from '../Iconos'
import FotoFija from './FotoFija'
import CambiarFoto from './CambiarFoto'
import { Modal } from './ui'
import './fotos-de.css'

/** Marco estable: la proporción de la foto nunca determina el tamaño de la ficha. */
export default function FotoUnidad({ unidad, puedeEditar = false }) {
  const marco = useRef(null)
  const [foto, setFoto] = useState({ hay: false, sinFondo: false, id: null })
  const [abierta, setAbierta] = useState(null)
  const [falloOriginal, setFalloOriginal] = useState(false)
  const nombre = unidad.placa || unidad.alias || 'la unidad'
  const alExistir = useCallback((hay, sinFondo, id) => {
    setFoto(anterior => anterior.hay === hay && anterior.sinFondo === sinFondo && anterior.id === id
      ? anterior : { hay, sinFondo, id })
  }, [])
  function ampliar() {
    if (!foto.hay || !foto.id) return
    setFalloOriginal(false)
    setAbierta(foto.id)
  }
  return <>
    <figure ref={marco} className={`fleet-vehicle-image fleet-photo${foto.hay ? ' con-foto' : ''}${foto.hay && foto.sinFondo ? ' sin-fondo' : ''}`}>
      <button type="button" className="fleet-photo-stage" disabled={!foto.hay} onClick={ampliar} aria-label={`Ampliar foto de ${nombre}`}>
        <FotoFija sinFondo publicId={unidad.id ? ids.vehiculo(unidad.id) : null}
          ancho={1000} alto={700} ajuste="contener" alt={`Foto de ${nombre}`} alExistir={alExistir}>
          <img src="/images/maps/vehicle-reference.png" alt="Camioneta ilustrativa; no representa necesariamente esta unidad" width="1536" height="1024" />
        </FotoFija>
        {foto.hay && <span className="fleet-photo-zoom" aria-hidden="true"><Icono nombre="buscar" tam={16} /></span>}
      </button>
      <figcaption className="fleet-photo-footer">
        <span>{foto.hay ? 'Foto de la unidad' : 'Imagen de referencia'}</span>
        {puedeEditar && unidad.id && <CambiarFoto flotante={false} publicId={ids.vehiculo(unidad.id)} etiqueta={etiquetas.vehiculo(unidad.id)} titulo={nombre} hayFoto={foto.hay} />}
      </figcaption>
    </figure>
    {abierta && createPortal(
      <Modal titulo={`Foto de ${nombre}`} abierto alCerrar={() => setAbierta(null)} ancho={960}>
        <div className="fd-grande">
          {falloOriginal ? <p role="alert">No se pudo cargar la foto. Cierra esta ventana e inténtalo de nuevo.</p>
            : <img src={urlOriginal(abierta)} alt={`Foto completa de ${nombre}`} onError={() => setFalloOriginal(true)} />}
          <a className="pnl-link" href={urlOriginal(abierta)} target="_blank" rel="noreferrer">Abrir original</a>
        </div>
      </Modal>, marco.current?.closest('.pnl') || document.body
    )}
  </>
}
