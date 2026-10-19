import FotoFija from './FotoFija'
import { ids } from '../datos/cloudinary'

// La foto de una unidad en una lista: se pide solo cuando la fila entra en pantalla (carga diferida del navegador).
// Mientras no haya foto, se muestra lo de `children` (la ilustración).
export default function MiniFoto({ vehiculoId, alto = 56, ancho = 70, children }) {
  const lado = Math.min(ancho, alto)
  return (
    <span style={{ display: 'inline-flex', width: lado, height: lado, flex: 'none', overflow: 'hidden', borderRadius: 8 }}>
      <FotoFija publicId={vehiculoId ? ids.vehiculo(vehiculoId) : null} ancho={lado * 2} alto={lado * 2} ajuste="recortar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}>
        {children}
      </FotoFija>
    </span>
  )
}
