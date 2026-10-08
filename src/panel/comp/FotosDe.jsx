import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal, Cargando } from './ui'
import { Icono } from '../Iconos'
import { cloudinaryConfigurado, listarImagenes, miniatura, problemaDelArchivo, subirImagen } from '../datos/cloudinary'
import './fotos-de.css'

// Las fotos de algo (una unidad, un documento, una persona): se ven en una galería, se amplían al hacer clic y,
// si `permiteSubir`, se agregan arrastrándolas o eligiéndolas. Todo vive en Cloudinary bajo la `etiqueta`.

/** Las fotos de una etiqueta, con `recargar()` para después de subir. */
export function useFotos(etiqueta) {
  const [fotos, setFotos] = useState(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let vigente = true
    setFotos(null)
    if (!etiqueta) { setFotos([]); return undefined }
    listarImagenes(etiqueta).then((r) => { if (vigente) setFotos(r) })
    return () => { vigente = false }
  }, [etiqueta, version])
  return { fotos, recargar: useCallback(() => setVersion((v) => v + 1), []) }
}

export default function FotosDe({ etiqueta, carpeta, titulo = '', permiteSubir = true, vacio = 'Todavía no hay fotos.', alCambiar }) {
  const { fotos, recargar } = useFotos(etiqueta)
  const [subiendo, setSubiendo] = useState(0)
  const [errores, setErrores] = useState([])
  const [encima, setEncima] = useState(false)
  const [abierta, setAbierta] = useState(null)
  const campo = useRef(null)
  const lista = fotos ?? []
  const configurado = cloudinaryConfigurado()

  async function subir(archivos) {
    const elegidos = [...archivos]
    if (!elegidos.length) return
    setErrores([])
    const nuevos = []
    setSubiendo(elegidos.length)
    // De una en una: es más fácil de seguir y de reintentar si una falla.
    for (const a of elegidos) {
      const mal = problemaDelArchivo(a)
      if (mal) { nuevos.push(mal); setSubiendo((n) => n - 1); continue }
      try {
        await subirImagen(a, { carpeta: carpeta ?? `fom/${etiqueta}`, etiqueta, titulo })
      } catch (e) {
        nuevos.push(e.message)
      }
      setSubiendo((n) => n - 1)
    }
    setErrores(nuevos)
    // La lista pública de Cloudinary tarda un instante en ver la foto nueva.
    setTimeout(() => { recargar(); alCambiar?.() }, 1200)
  }

  return (
    <div className="fd">
      {fotos === null ? <Cargando filas={2} /> : lista.length === 0 ? (
        <p className="fd-vacio">{vacio}</p>
      ) : (
        <ul className="fd-galeria">
          {lista.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => setAbierta(f)} aria-label={f.titulo ? `Ver foto: ${f.titulo}` : 'Ver foto'}>
                <img src={miniatura(f.url, 360, 270)} alt={f.titulo || ''} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {permiteSubir && (configurado ? (
        <div
          className={`fd-zona${encima ? ' encima' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setEncima(true) }}
          onDragLeave={() => setEncima(false)}
          onDrop={(e) => { e.preventDefault(); setEncima(false); subir(e.dataTransfer.files) }}
        >
          <Icono nombre="mas" tam={20} />
          <span>{subiendo > 0 ? `Subiendo ${subiendo} ${subiendo === 1 ? 'foto' : 'fotos'}…` : 'Arrastra fotos aquí o'}</span>
          <button type="button" className="pnl-btn sutil" disabled={subiendo > 0} onClick={() => campo.current?.click()}>Elegir fotos</button>
          <input ref={campo} type="file" accept="image/*" multiple hidden onChange={(e) => { subir(e.target.files); e.target.value = '' }} />
        </div>
      ) : (
        <p className="fd-aviso" role="status">
          <Icono nombre="info" tam={16} />
          Las fotos todavía no están activadas en esta web: falta conectar Cloudinary (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET).
        </p>
      ))}
      {errores.length > 0 && (
        <ul className="fd-errores" role="alert">{errores.map((e, i) => <li key={i}>{e}</li>)}</ul>
      )}

      <Modal titulo={abierta?.titulo || 'Foto'} abierto={Boolean(abierta)} alCerrar={() => setAbierta(null)} ancho={920}>
        {abierta && (
          <div className="fd-grande">
            <img src={miniatura(abierta.url, 1600)} alt={abierta.titulo || ''} />
            <a className="pnl-link" href={abierta.url} target="_blank" rel="noreferrer">Abrir original</a>
          </div>
        )}
      </Modal>
    </div>
  )
}
