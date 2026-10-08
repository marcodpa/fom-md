import FotoFija from './FotoFija'
import { ids } from '../datos/cloudinary'

// La foto de una unidad en una lista: se pide solo cuando la fila entra en pantalla (carga diferida del navegador).
// Mientras no haya foto, se muestra lo de `children` (la ilustración).
export default function MiniFoto({ vehiculoId, alto = 56, ancho = 70, children }) {
  return (
    <span style={{ display: 'inline-flex', width: ancho, height: alto, flex: 'none' }}>
      <FotoFija publicId={vehiculoId ? ids.vehiculo(vehiculoId) : null} ancho={ancho * 2} alto={alto * 2} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}>
        {children}
      </FotoFija>
    </span>
  )
}
