// Escena «El aviso llega» de la web v8 (T-142): el mismo aviso real, en el panel de la oficina y en
// la app del supervisor. A la izquierda, un portátil con Alertas del panel; a la derecha, el
// teléfono del supervisor con Alertas de la app. Al bajar, se marca el aviso en el panel
// («Exceso de velocidad · Unidad 23 va a 82 km/h»), una señal viaja hasta el teléfono, el teléfono
// vibra y se marca el mismo aviso en la app. Las dos son capturas REALES con los mismos datos de
// demostración (no se dibuja ningún aviso encima: solo se resalta la fila que ya está).
// Movimiento: momentoAlertaV8.js (escena fija ≥ 1024 px; sin pin en tableta y teléfono).
// Con «reducir movimiento»: quieto, con el aviso marcado en las dos pantallas.
//
// <EscenaAlertaV8 /> · props: nota (false = sin nota), etiqueta.
import { useRef } from 'react'
import { CapturaV8, usarEscenaV8 } from './piezasEscenaV8'
import { momentoAlertaV8 } from './momentoAlertaV8'
import './escena-alerta-v8.css'

// Fila del primer aviso en cada captura (en % de la captura): panel 1280 × 800, app 750 × 1623.
const FILA_PANEL = { left: '21.2%', top: '62.6%', width: '75.8%', height: '11.1%' }
const FILA_APP = { left: '4.4%', top: '67.5%', width: '91.2%', height: '20.1%' }

export default function EscenaAlertaV8({ nota = true, etiqueta = 'Un aviso de exceso de velocidad aparece en el panel y llega a la app del supervisor', className = '' }) {
  const raiz = useRef(null)
  usarEscenaV8(raiz, momentoAlertaV8)
  const texto = nota === true ? 'Capturas reales del panel y de la app · Datos de demostración' : nota
  return <figure ref={raiz} className={`v8-al ${className}`} data-v8-al="" aria-label={etiqueta}>
    <div className="v8-al-grupo">
      <div className="v8-al-portatil">
        <div className="v8-al-tapa">
          <div className="v8-al-pantalla is-panel">
            <CapturaV8 nombre="cap-panel-alertas" sizes="(max-width: 599px) 92vw, 720px"
              alt="Alertas en el panel FOM: exceso de velocidad de la unidad 23, a 82 km/h con límite de 80. Datos de demostración." />
            <i className="v8-al-marca" style={FILA_PANEL} aria-hidden="true"><b /></i>
            <i className="v8-al-reflejo" aria-hidden="true" />
          </div>
        </div>
        <div className="v8-al-base" aria-hidden="true"><i /></div>
      </div>
      <div className="v8-al-tel">
        <div className="v8-al-tel-marco">
          <div className="v8-al-pantalla is-app">
            <CapturaV8 nombre="cap-movil-sup-alertas" sizes="(max-width: 599px) 150px, 230px"
              alt="Alertas en la app del supervisor con el mismo aviso: unidad 23 a 82 km/h. Datos de demostración." />
            <i className="v8-al-marca" style={FILA_APP} aria-hidden="true"><b /></i>
          </div>
        </div>
      </div>
      <svg className="v8-al-senal" aria-hidden="true"><path className="v8-al-ruta" d="" /></svg>
      <i className="v8-al-chispa" aria-hidden="true" />
      <i className="v8-al-chispa is-estela" aria-hidden="true" />
      <i className="v8-al-chispa is-estela" aria-hidden="true" />
    </div>
    {texto && <figcaption className="v8-nota-demo">{texto}</figcaption>}
  </figure>
}
