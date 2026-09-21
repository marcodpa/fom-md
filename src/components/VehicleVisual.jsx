import { useEffect, useState } from 'react'
import { loadHilux } from '../utils/hiluxTexture'
import { Icono } from '../panel/Iconos'

/** La misma ilustración de Hilux que ya usa el sitio; nunca una foto de una unidad real. */
export default function VehicleVisual({ modelo = 'Hilux', compacta = false }) {
  const [imagen, setImagen] = useState(null)
  const hilux = /hilux/i.test(modelo)
  useEffect(() => {
    if (!hilux) return undefined
    let vivo = true
    loadHilux().then(r => { if (vivo) setImagen(r.dataUrl) }).catch(() => {})
    return () => { vivo = false }
  }, [hilux])
  return (
    <div className={`fom-vehicle-visual${compacta ? ' compacta' : ''}`}>
      {hilux && imagen ? <img src={imagen} alt="Ilustración de referencia de Toyota Hilux" /> : <Icono nombre="camion" tam={compacta ? 28 : 70} />}
      {!compacta && <small>Ilustración de referencia</small>}
    </div>
  )
}
