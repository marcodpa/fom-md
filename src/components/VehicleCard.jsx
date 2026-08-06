import { forwardRef, useEffect, useState } from 'react'
import { loadHilux } from '../utils/hiluxTexture'

// Ficha de la unidad que aparece en la intro. La fotografía es la misma
// Hilux del modelo; el filtro CSS la lleva a blanco para que coincida con
// la carrocería del 3D.

const FIELDS = [
  ['Conductor', 'Carlos Méndez'],
  ['Placa', 'A48BF2C'],
  ['Área asignada', 'Maracaibo'],
  ['Empresa', 'Samfor'],
  ['Velocidad', '48 km/h'],
  ['Última señal', 'Hace 8 segundos'],
]

const VehicleCard = forwardRef(function VehicleCard({ onView }, ref) {
  const [img, setImg] = useState(null)

  useEffect(() => {
    let alive = true
    loadHilux().then((r) => alive && setImg(r.dataUrl))
    return () => {
      alive = false
    }
  }, [])

  return (
    <aside ref={ref} className="ov ov-vehicle" aria-label="Información de la unidad FOM-024">
      <div className="vc-head">
        <div className="vc-unit">
          <em>Unidad</em>
          FOM-024
          <small>Toyota Hilux 2025</small>
        </div>
        <span className="vc-status">En marcha</span>
      </div>

      <div className="vc-img">
        <i className="vc-img-piso" aria-hidden="true" />
        {img && <img src={img} alt="Toyota Hilux 2025 blanca, unidad FOM-024" />}
      </div>

      <dl className="vc-grid">
        {FIELDS.map(([label, value]) => (
          <div className="vc-cell" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="vc-footer">
        <button type="button" className="vc-btn" onClick={onView}>
          Ver unidad
          <span className="vc-btn-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
              <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
    </aside>
  )
})

export default VehicleCard
