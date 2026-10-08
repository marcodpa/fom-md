import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal, Cargando } from './ui'
import { Icono } from '../Iconos'
import { cloudinaryConfigurado, fotosDe, fotosVigentes, invalidarFotos, miniatura, problemaDelArchivo, subirImagen } from '../datos/cloudinary'
import './fotos-de.css'

// Las fotos de algo (una unidad, un documento, una persona). No se borra nada: se REEMPLAZA.
//   modo «unica»: una sola foto; elegir otra la reemplaza (unidad, persona).
//   modo «juego»: un juego de fotos (las dos caras de un documento); elegir un juego nuevo reemplaza el anterior.
// Todo vive en Cloudinary bajo la `etiqueta`; lo anterior queda guardado allá pero deja de mostrarse.

/** Las fotos VIGENTES de una etiqueta, con `recargar()` para después de subir. */
export function useFotos(etiqueta, modo = 'todas') {
  const [fotos, setFotos] = useState(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let vigente = true
    setFotos(null)
    if (!etiqueta) { setFotos([]); return undefined }
    fotosDe(etiqueta).then((r) => { if (vigente) setFotos(fotosVigentes(r, modo)) })
    return () => { vigente = false }
  }, [etiqueta, modo, version])
  return { fotos, recargar: useCallback(() => setVersion((v) => v + 1), []) }
}

export default function FotosDe({ etiqueta, carpeta, titulo = '', modo = 'unica', permiteSubir = true, vacio = 'Todavía no hay foto.', alCambiar }) {
  const { fotos, recargar } = useFotos(etiqueta, modo)
  const [subiendo, setSubiendo] = useState(0)
  const [errores, setErrores] = useState([])
  const [encima, setEncima] = useState(false)
  const [abierta, setAbierta] = useState(null)
  const campo = useRef(null)
  const lista = fotos ?? []
  const configurado = cloudinaryConfigurado()
  const varias = modo !== 'unica'
  const hay = lista.length > 0

  async function subir(archivos) {
    // En modo «unica» solo cuenta una: la última elegida.
    const elegidos = varias ? [...archivos] : [...archivos].slice(-1)
    if (!elegidos.length) return
    setErrores([])
    const nuevos = []
    // Las fotos de esta tanda llevan el mismo lote: reemplazar es subir un lote nuevo.
    const lote = String(Date.now())
    let subidas = 0
    setSubiendo(elegidos.length)
    for (const a of elegidos) {
      const mal = problemaDelArchivo(a)
      if (mal) { nuevos.push(mal); setSubiendo((n) => n - 1); continue }
      try {
        await subirImagen(a, { carpeta: carpeta ?? `fom/${etiqueta}`, etiqueta, titulo, lote })
        subidas += 1
      } catch (e) {
        nuevos.push(e.message)
      }
      setSubiendo((n) => n - 1)
    }
    setErrores(nuevos)
    if (subidas > 0) {
      // La lista pública de Cloudinary tarda un instante en ver la foto nueva.
      setTimeout(() => { invalidarFotos(etiqueta); recargar(); alCambiar?.() }, 1200)
    }
  }

  const accion = !varias ? (hay ? 'Cambiar foto' : 'Subir foto') : (hay ? 'Reemplazar fotos' : 'Subir fotos')

  return (
    <div className="fd">
      {fotos === null ? <Cargando filas={2} /> : !hay ? (
        <p className="fd-vacio">{vacio}</p>
      ) : (
        <ul className={`fd-galeria${varias ? '' : ' unica'}`}>
          {lista.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => setAbierta(f)} aria-label={f.titulo ? `Ver foto: ${f.titulo}` : 'Ver foto'}>
                <img src={miniatura(f.url, 480, 360)} alt={f.titulo || ''} loading="lazy" />
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
          <span>{subiendo > 0 ? 'Subiendo…' : `Arrastra ${varias ? 'las fotos' : 'la foto'} aquí o`}</span>
          <button type="button" className="pnl-btn sutil" disabled={subiendo > 0} onClick={() => campo.current?.click()}>{accion}</button>
          <input ref={campo} type="file" accept="image/*" multiple={varias} hidden onChange={(e) => { subir(e.target.files); e.target.value = '' }} />
          {hay && <small className="fd-nota">{varias ? 'Las fotos nuevas reemplazan a las actuales.' : 'La foto nueva reemplaza a la actual.'}</small>}
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
