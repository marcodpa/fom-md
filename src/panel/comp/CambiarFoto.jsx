import { useRef, useState } from 'react'
import { cloudinaryConfigurado, invalidarFotos, problemaDelArchivo, subirImagen } from '../datos/cloudinary'
import { Icono } from '../Iconos'
import './fotos-de.css'

// «Editar foto» encima de la imagen: elegir otra foto la REEMPLAZA (no se borra nada). Sube a Cloudinary con la
// etiqueta y avisa con `alCambiar` cuando la lista ya puede volver a leerse.
export default function CambiarFoto({ etiqueta, titulo = '', hayFoto = false, alCambiar }) {
  const campo = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  if (!cloudinaryConfigurado()) return null

  async function elegir(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    const mal = problemaDelArchivo(archivo)
    if (mal) { setError(mal); return }
    setError('')
    setSubiendo(true)
    try {
      await subirImagen(archivo, { carpeta: `fom/${etiqueta}`, etiqueta, titulo, lote: String(Date.now()) })
      // La lista pública de Cloudinary tarda un instante en ver la foto nueva.
      setTimeout(() => { invalidarFotos(etiqueta); alCambiar?.() }, 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <>
      <button type="button" className="fd-editar" disabled={subiendo} onClick={() => campo.current?.click()}>
        <Icono nombre="editar" tam={15} />
        {subiendo ? 'Subiendo…' : hayFoto ? 'Editar foto' : 'Subir foto'}
      </button>
      <input ref={campo} type="file" accept="image/*" hidden onChange={elegir} />
      {error && <span className="fd-editar-error" role="alert">{error}</span>}
    </>
  )
}
