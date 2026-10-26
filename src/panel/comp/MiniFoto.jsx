import { useState } from 'react'
import FotoFija from './FotoFija'
import { FotoRecorte } from './FotoUnidad'
import { ids } from '../datos/cloudinary'
import { useFotosVehiculo } from '../datos/fotoVehiculo'

// La foto de una unidad en una lista: se pide solo cuando la fila entra en pantalla (carga diferida del navegador).
// Si el gestor guardó la foto sin fondo (T-179), sale esa, entera sobre el fondo oscuro; si no, la foto normal.
// Mientras no haya foto, se muestra lo de `children` (la ilustración).
export default function MiniFoto({ vehiculoId, alto = 56, ancho = 70, children }) {
  const lado = Math.min(ancho, alto)
  const fotos = useFotosVehiculo(vehiculoId)
  const [recorteFallo, setRecorteFallo] = useState(null)
  const estilo = { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }
  const conRecorte = Boolean(fotos.recorte) && recorteFallo !== fotos.recorte
  return (
    <span style={{ display: 'inline-flex', width: lado, height: lado, flex: 'none', overflow: 'hidden', borderRadius: 8, ...(conRecorte ? { background: '#0a0d12' } : null) }}>
      {fotos.buscando ? children ?? null
        : conRecorte
          ? <FotoRecorte id={fotos.recorte} ancho={lado * 3} style={{ ...estilo, objectFit: 'contain' }} alFallar={() => setRecorteFallo(fotos.recorte)}>{children}</FotoRecorte>
          : <FotoFija publicId={vehiculoId ? ids.vehiculo(vehiculoId) : null} ancho={lado * 2} alto={lado * 2} ajuste="recortar" style={estilo}>
            {children}
          </FotoFija>}
    </span>
  )
}
