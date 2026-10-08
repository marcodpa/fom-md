import { useState } from 'react'
import { Modal } from './ui'
import { Icono } from '../Iconos'
import FotoFija from './FotoFija'
import CambiarFoto from './CambiarFoto'
import { cloudinaryConfigurado, urlOriginal } from '../datos/cloudinary'
import './fotos-de.css'

// Un juego de fotos con huecos fijos (por ejemplo las dos caras de un documento). Cada hueco muestra su foto o un
// espacio vacío, y se reemplaza con «Subir» / «Reemplazar»: se sube a la misma dirección y no se borra nada.
//   huecos: [{ clave, titulo, publicId, etiqueta }]
export default function FotosDe({ huecos, permiteSubir = true }) {
  const [abierta, setAbierta] = useState(null)
  const [existe, setExiste] = useState({})
  const configurado = cloudinaryConfigurado()

  return (
    <div className="fd">
      {!configurado && (
        <p className="fd-aviso" role="status">
          <Icono nombre="info" tam={16} />
          Las fotos todavía no están activadas en esta web: falta conectar Cloudinary (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET).
        </p>
      )}
      <ul className="fd-huecos">
        {huecos.map((h) => (
          <li key={h.clave} className="fd-hueco">
            <b>{h.titulo}</b>
            <div className="fd-marco">
              <FotoFija
                publicId={h.publicId}
                ancho={640}
                alto={440}
                alt={h.titulo}
                alExistir={(v) => setExiste((e) => (e[h.clave] === v ? e : { ...e, [h.clave]: v }))}
              >
                <span className="fd-vacio-foto">Sin foto</span>
              </FotoFija>
              {existe[h.clave] && (
                <button type="button" className="fd-ampliar" onClick={() => setAbierta(h)} aria-label={`Ampliar ${h.titulo}`}>Ampliar</button>
              )}
            </div>
            {permiteSubir && (
              <CambiarFoto
                flotante={false}
                publicId={h.publicId}
                etiqueta={h.etiqueta}
                titulo={h.titulo}
                hayFoto={Boolean(existe[h.clave])}
                textos={{ subir: 'Subir', editar: 'Reemplazar' }}
              />
            )}
          </li>
        ))}
      </ul>
      <Modal titulo={abierta?.titulo || 'Foto'} abierto={Boolean(abierta)} alCerrar={() => setAbierta(null)} ancho={920}>
        {abierta && (
          <div className="fd-grande">
            <img src={urlOriginal(abierta.publicId)} alt={abierta.titulo} />
            <a className="pnl-link" href={urlOriginal(abierta.publicId)} target="_blank" rel="noreferrer">Abrir original</a>
          </div>
        )}
      </Modal>
    </div>
  )
}
