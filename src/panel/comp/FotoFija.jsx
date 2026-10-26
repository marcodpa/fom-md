import { useEffect, useState } from 'react'
import { alCambiarFotos, cloudinaryConfigurado, huboSubidaReciente, idVigente, urlDe } from '../datos/cloudinary'

// La foto vigente de una dirección base en Cloudinary (`fom/vehiculo/<id>`): averigua cuál es la versión más nueva y la
// muestra. Si todavía no hay foto, muestra `children`. Se vuelve a pedir sola cuando se sube otra desde esta web.
// Justo después de subir, Cloudinary tarda un instante en servir la foto nueva: mientras tanto se reintenta unas
// veces, sin mostrar una imagen rota. La foto sin fondo de una unidad es otra foto aparte (ver datos/fotoVehiculo.js).
const REINTENTOS = 12
const ESPERA_MS = 2000

export default function FotoFija({ publicId, ancho = 480, alto = 0, alt = '', className, style, children, alExistir, ajuste = 'recortar' }) {
  const [id, setId] = useState(null) // dirección completa de la versión vigente
  const [fallo, setFallo] = useState(false)
  const [cargada, setCargada] = useState(false)
  const [version, setVersion] = useState(0)
  const [intento, setIntento] = useState(0)

  useEffect(() => alCambiarFotos(() => { setFallo(false); setCargada(false); setIntento(0); setVersion((v) => v + 1) }), [])
  useEffect(() => {
    let vigente = true
    setFallo(false); setCargada(false); setIntento(0)
    if (!cloudinaryConfigurado() || !publicId) { setId(null); return undefined }
    idVigente(publicId).then((r) => { if (vigente) setId(r) })
    return () => { vigente = false }
  }, [publicId, version])

  const hay = cloudinaryConfigurado() && Boolean(id) && !fallo
  // El segundo dato («¿salió recortada?») ya siempre es `false`: se deja para no cambiar a quien la escucha.
  useEffect(() => { alExistir?.(hay && cargada, false, id) }, [hay, cargada, id, alExistir])

  function alFallar() {
    if (huboSubidaReciente() && intento < REINTENTOS) setTimeout(() => setIntento((n) => n + 1), ESPERA_MS)
    else setFallo(true)
  }

  if (!hay) return children ?? null
  return (
    <>
      <img
        key={`${id}-${intento}`}
        src={`${urlDe(id, ancho, alto, { ajuste })}${intento ? `&r=${intento}` : ''}`}
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
