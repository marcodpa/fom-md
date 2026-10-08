import { useEffect, useState } from 'react'
import { alCambiarFotos, cloudinaryConfigurado, huboSubidaReciente, urlDe } from '../datos/cloudinary'

// Una foto por su dirección fija en Cloudinary. Si todavía no existe (Cloudinary responde 404), muestra `children`.
// Se vuelve a pedir sola cuando se sube otra foto desde esta web. Justo después de subir, Cloudinary tarda un
// instante en servir la foto nueva: mientras tanto se reintenta unas veces, sin mostrar una imagen rota.
const REINTENTOS = 12
const ESPERA_MS = 2000

export default function FotoFija({ publicId, ancho = 480, alto = 0, alt = '', className, style, children, alExistir }) {
  const [fallo, setFallo] = useState(false)
  const [cargada, setCargada] = useState(false)
  const [version, setVersion] = useState(0)
  const [intento, setIntento] = useState(0)

  useEffect(() => alCambiarFotos(() => { setFallo(false); setCargada(false); setIntento(0); setVersion((v) => v + 1) }), [])
  useEffect(() => { setFallo(false); setCargada(false); setIntento(0) }, [publicId])

  const hay = cloudinaryConfigurado() && Boolean(publicId) && !fallo
  useEffect(() => { alExistir?.(hay && cargada) }, [hay, cargada, alExistir])

  function alFallar() {
    if (huboSubidaReciente() && intento < REINTENTOS) setTimeout(() => setIntento((n) => n + 1), ESPERA_MS)
    else setFallo(true)
  }

  if (!hay) return children ?? null
  return (
    <>
      <img
        key={`${publicId}-${version}-${intento}`}
        src={`${urlDe(publicId, ancho, alto)}${intento ? `&r=${intento}` : ''}`}
        alt={alt}
        className={className}
        style={cargada ? style : { ...style, display: 'none' }}
        onLoad={() => setCargada(true)}
        onError={alFallar}
      />
      {!cargada && children}
    </>
  )
}
