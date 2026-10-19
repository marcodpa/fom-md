import { Campo } from './ui'
import { CAMPOS_GPS } from '../datos/metadatosGps'

export default function CamposGps({ datos, alCambiar, ocupado, sinLinea = false }) {
  return <details><summary className="pnl-link">Datos de SIM y comunicación</summary>
    {CAMPOS_GPS.filter(c => !sinLinea || c.clave !== 'simPhone').map(c => <Campo key={c.clave} etiqueta={c.etiqueta}>
      {c.opciones ? <select className="pnl-select" disabled={ocupado} value={datos[c.clave] || ''} onChange={e => alCambiar({ ...datos, [c.clave]: e.target.value })}><option value="">Sin registrar</option>{c.opciones.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select>
        : <input className="pnl-input" disabled={ocupado} type={c.tipo || 'text'} value={datos[c.clave] || ''} maxLength={c.max} onChange={e => alCambiar({ ...datos, [c.clave]: e.target.value })} />}
    </Campo>)}
  </details>
}
