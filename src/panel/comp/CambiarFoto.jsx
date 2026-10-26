import { useRef, useState } from 'react'
import { cloudinaryConfigurado, problemaDelArchivo, subirImagen, ultimaVersion } from '../datos/cloudinary'
import { Icono } from '../Iconos'
import VentanaQuitarFondo from '../quitador/VentanaQuitarFondo'
import { quitarFondoPosible } from '../quitador/quitarFondo'
import './fotos-de.css'

// «Editar foto»: elegir otra foto la REEMPLAZA (sube a la misma dirección fija; no se borra nada). Por defecto es un
// botón flotante sobre una imagen; con `flotante={false}` es un botón normal.
// Con `sinFondoDe` (el id de la unidad), después de subir se ofrece la misma foto sin fondo (T-179): la original ya
// quedó guardada, así que si el gestor no la quiere o algo falla, no se pierde nada.
export default function CambiarFoto({ publicId, etiqueta, titulo = '', hayFoto = false, flotante = true, textos, sinFondoDe = null }) {
  const campo = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const [recortar, setRecortar] = useState(null) // { archivo, n } mientras se ofrece la foto sin fondo
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
      await subirImagen(archivo, { publicId, etiqueta, titulo })
      if (sinFondoDe && quitarFondoPosible()) {
        // El recorte lleva el MISMO número que la original que se acaba de subir.
        const n = await ultimaVersion(publicId)
        if (n) setRecortar({ archivo, n })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubiendo(false)
    }
  }

  const t = { subir: 'Subir foto', editar: 'Editar foto', subiendo: 'Subiendo…', ...textos }
  return (
    <>
      <button type="button" className={flotante ? 'fd-editar' : 'pnl-btn sutil'} disabled={subiendo} onClick={() => campo.current?.click()}>
        <Icono nombre="editar" tam={15} />
        {subiendo ? t.subiendo : hayFoto ? t.editar : t.subir}
      </button>
      <input ref={campo} type="file" accept="image/*" hidden onChange={elegir} />
      {error && <span className={flotante ? 'fd-editar-error' : 'fd-error-linea'} role="alert">{error}</span>}
      {recortar && <VentanaQuitarFondo archivo={recortar.archivo} n={recortar.n} vehiculoId={sinFondoDe} titulo={titulo}
        alTerminar={() => setRecortar(null)} />}
    </>
  )
}
