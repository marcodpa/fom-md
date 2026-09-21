import { useState } from 'react'
import MapaLibre from '../panel/comp/MapaLibre'
import VehicleVisual from './VehicleVisual'
import { Icono } from '../panel/Iconos'

// Ejemplos públicos, separados del repositorio y rotulados dentro de la vista.
const UNIDADES = [
  { id: 'demo-024', alias: 'FOM-024', placa: 'DEMO-024', marca: 'Toyota', modelo: 'Hilux', lat: 10.65, lng: -71.62, estadoMarcha: 'en_marcha', conectado: true },
  { id: 'demo-017', alias: 'FOM-017', placa: 'DEMO-017', marca: 'Ford', modelo: 'Ranger', lat: 10.39, lng: -71.44, estadoMarcha: 'parada', conectado: true },
  { id: 'demo-031', alias: 'FOM-031', placa: 'DEMO-031', marca: 'Chevrolet', modelo: 'D-Max', lat: 10.2, lng: -71.31, estadoMarcha: 'en_marcha', conectado: true },
]

export function PreviewMap({ alto = '360px', sedes = false }) {
  return <div className={`site-map${sedes ? ' sedes' : ''}`}><MapaLibre vehiculos={UNIDADES} alto={alto} ficha={false} leyenda={false} />{sedes && <div className="site-map-sites"><span>Base Maracaibo</span><span>Sucursal Cabimas</span><span>Taller Ciudad Ojeda</span></div>}<span className="site-demo-label">Vista de ejemplo</span></div>
}

export function PreviewProgress({ value, max = 100, label, tone = '' }) {
  return <div className={`site-progress ${tone}`}><div><span>{label}</span><b>{value} / {max}</b></div><div className="site-progress-track"><i style={{ width: `${Math.min(100, value / max * 100)}%` }} /></div></div>
}

export function PreviewMetric({ label, value, unit, icon = 'velocidad' }) {
  return <div className="site-preview-metric"><Icono nombre={icon} tam={22} /><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>
}

export default function ProductPreview({ mobile = false }) {
  const [id, setId] = useState('demo-024')
  const unidad = UNIDADES.find(v => v.id === id) ?? UNIDADES[0]
  return (
    <div className={`site-product-showcase${mobile ? ' with-mobile' : ''}`}>
      <div className="site-product-preview">
        <div className="site-preview-top"><b>FOM <span>· Flota</span></b><span>Datos de ejemplo</span></div>
        <div className="site-preview-counters"><div><span>Vehículos</span><b>24</b></div><div><span>En marcha</span><b className="success">18</b></div><div><span>Detenidos</span><b>6</b></div></div>
        <div className="site-preview-workspace">
          <MapaLibre vehiculos={UNIDADES} seleccionado={id} alSeleccionar={setId} alto="390px" ficha={false} leyenda={false} />
          <div className="site-preview-unit"><span className={`site-status ${unidad.estadoMarcha === 'en_marcha' ? 'success' : ''}`}>{unidad.estadoMarcha === 'en_marcha' ? 'En marcha' : 'Detenido'}</span><VehicleVisual modelo={unidad.modelo} /><h3>{unidad.alias}</h3><p>{unidad.marca} {unidad.modelo}</p><PreviewMetric label="Velocidad" value={unidad.estadoMarcha === 'en_marcha' ? '64' : '0'} unit="km/h" /><PreviewProgress value={72} label="Combustible" /><LinkPreview /></div>
        </div>
      </div>
      {mobile && <div className="site-phone-preview"><div className="site-phone-notch" /><b>FOM</b><h3>Hola, Elena</h3><span>Tu operación de hoy</span><VehicleVisual /><strong>FOM-024</strong><p>Toyota Hilux</p><PreviewProgress label="Inspección diaria" value={8} max={10} tone="success" /><div className="site-phone-action"><Icono nombre="inspeccion" />Inspección diaria</div><div className="site-phone-action"><Icono nombre="llave" />Reportar falla</div><div className="site-phone-action"><Icono nombre="reloj" />Mi jornada</div><small>Vista de ejemplo de la app</small></div>}
    </div>
  )
}

function LinkPreview() { return <span className="site-preview-foot"><Icono nombre="pin" tam={15} />Costa Oriental del Lago</span> }
