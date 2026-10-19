import CambiarFoto from './CambiarFoto'
import { cloudinaryConfigurado, etiquetas, ids } from '../datos/cloudinary'

export default function FotoDePerfil({ userId }) {
  if (!userId) return null
  if (!cloudinaryConfigurado()) return <p className="fp-foto-nota">La foto de perfil se activa cuando se conecte Cloudinary a esta web.</p>
  return <div className="fp-foto-nota"><CambiarFoto flotante={false} publicId={ids.avatar(userId)}
    etiqueta={etiquetas.avatar(userId)} titulo="Foto de perfil" hayFoto textos={{ editar: 'Cambiar foto' }} /></div>
}
