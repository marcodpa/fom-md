import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { etiquetas, huboSubidaReciente, ids, urlDe, urlOriginal } from '../datos/cloudinary'
import { useFotosVehiculo } from '../datos/fotoVehiculo'
import { fotoSinFondo } from '../datos/fotoSinFondo'
import { Icono } from '../Iconos'
import FotoFija from './FotoFija'
import CambiarFoto from './CambiarFoto'
import { Modal } from './ui'
import './fotos-de.css'

const REINTENTOS = 12
const ESPERA_MS = 2000

/**
 * El recorte sin fondo de una foto (`fom/vehiculo-sin-fondo/<id>/<n>`, ya con su dirección completa). Mientras carga
 * muestra `children`; justo después de guardarlo Cloudinary tarda un instante en servirlo, así que se reintenta unas
 * veces. Si no aparece, `alFallar()` y quien lo usa vuelve a la foto normal.
 */
export function FotoRecorte({ id, ancho = 640, alt = '', className, style, alCargar, alFallar, children }) {
  const [cargada, setCargada] = useState(false)
  const [intento, setIntento] = useState(0)
  useEffect(() => { setCargada(false); setIntento(0) }, [id])
  useEffect(() => { alCargar?.(cargada) }, [cargada, alCargar])
  function fallo() {
    if (huboSubidaReciente() && intento < REINTENTOS) setTimeout(() => setIntento((n) => n + 1), ESPERA_MS)
    else alFallar?.()
  }
  return <>
    <img key={`${id}-${intento}`} src={`${urlDe(id, ancho, 0, { ajuste: 'contener' })}${intento ? `&r=${intento}` : ''}`} alt={alt}
      className={className} style={cargada ? style : { ...style, display: 'none' }} onLoad={() => setCargada(true)} onError={fallo} />
    {!cargada && children}
  </>
}

/**
 * Lo que se ve cuando la unidad no tiene foto: la del catálogo por marca y modelo o, si no hay, la silueta de su tipo
 * (las mismas de «Mi unidad», T-170).
 */
function Referencia({ unidad, variante }) {
  const { url, silueta } = fotoSinFondo(unidad.marca, unidad.modelo, unidad.tipo)
  const nombre = [unidad.marca, unidad.modelo].filter(Boolean).join(' ')
  if (url) {
    return <img src={url} width="800" height="500"
      alt={silueta ? `Silueta de ${nombre || 'la unidad'}; no es la foto de esta unidad` : `${nombre}, foto de referencia; no es la foto de esta unidad`} />
  }
  return variante === 'cabecera'
    ? <span className="eu-foto-sin-imagen"><Icono nombre="camion" tam={24} /><span>Sin foto</span></span>
    : <img src="/images/maps/vehicle-reference.png" alt="Camioneta ilustrativa; no representa necesariamente esta unidad" width="1536" height="1024" />
}

/**
 * Vista cuadrada uniforme. Muestra, en este orden: el recorte sin fondo de la foto vigente (T-179), la foto normal, la
 * del catálogo y la silueta. Al ampliar se ve siempre la fotografía original.
 */
export default function FotoUnidad({ unidad, puedeEditar = false, variante = 'ficha' }) {
  const marco = useRef(null)
  const fotos = useFotosVehiculo(unidad.id)
  const [foto, setFoto] = useState({ hay: false, id: null })
  const [recorteCargado, setRecorteCargado] = useState(false)
  const [recorteFallo, setRecorteFallo] = useState(null) // id del recorte que no se pudo mostrar
  const [abierta, setAbierta] = useState(null)
  const [falloOriginal, setFalloOriginal] = useState(false)
  const nombre = unidad.placa || unidad.alias || 'la unidad'
  const alExistir = useCallback((hay, _sinFondo, id) => {
    setFoto(anterior => anterior.hay === hay && anterior.id === id ? anterior : { hay, id })
  }, [])
  const conRecorte = Boolean(fotos.recorte) && recorteFallo !== fotos.recorte
  const hay = conRecorte ? recorteCargado : foto.hay
  const original = conRecorte ? fotos.original : foto.id
  const lado = variante === 'cabecera' ? 400 : 640
  function ampliar() {
    if (!hay || !original) return
    setFalloOriginal(false)
    setAbierta(original)
  }
  const referencia = <Referencia unidad={unidad} variante={variante} />
  return <>
    <figure ref={marco} className={`fleet-vehicle-image fleet-photo${variante === 'cabecera' ? ' eu-foto-cabecera' : ''}${hay ? ' con-foto' : ''}${hay && conRecorte ? ' sin-fondo' : ''}`}>
      <button type="button" className="fleet-photo-stage" disabled={!hay} onClick={ampliar} aria-label={`Ampliar foto de ${nombre}`}>
        {fotos.buscando ? referencia
          : conRecorte
            ? <FotoRecorte id={fotos.recorte} ancho={lado * 2} alt={`Foto de ${nombre}, sin fondo`} style={{ objectFit: 'contain' }}
              alCargar={setRecorteCargado} alFallar={() => setRecorteFallo(fotos.recorte)}>{referencia}</FotoRecorte>
            : <FotoFija publicId={unidad.id ? ids.vehiculo(unidad.id) : null}
              ancho={lado} alto={lado} ajuste="recortar" alt={`Foto de ${nombre}`} alExistir={alExistir}>
              {referencia}
            </FotoFija>}
        {hay && <span className="fleet-photo-zoom" aria-hidden="true"><Icono nombre="buscar" tam={16} /></span>}
      </button>
      {variante !== 'cabecera' && <figcaption className="fleet-photo-footer">
        <span>{hay ? 'Foto de la unidad' : 'Imagen de referencia'}</span>
        {puedeEditar && unidad.id && <CambiarFoto flotante={false} publicId={ids.vehiculo(unidad.id)} etiqueta={etiquetas.vehiculo(unidad.id)}
          titulo={nombre} hayFoto={hay} sinFondoDe={unidad.id} />}
      </figcaption>}
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
