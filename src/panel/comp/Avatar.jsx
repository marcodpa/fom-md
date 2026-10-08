import FotoFija from './FotoFija'
import { ids } from '../datos/cloudinary'

// Foto de perfil por su dirección fija (`fom/avatar/<userId>`); mientras no haya, las iniciales.
export default function Avatar({ userId, iniciales, nombre = '', clase = 'pnl-avatar', tam = 96 }) {
  return (
    <i className={clase}>
      <FotoFija publicId={userId ? ids.avatar(userId) : null} ancho={tam} alto={tam} alt={nombre ? `Foto de ${nombre}` : ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}>
        {iniciales}
      </FotoFija>
    </i>
  )
}
