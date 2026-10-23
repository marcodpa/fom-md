// Escena del televisor de la web v8 (T-142, idea de Marco): una pantalla grande de sala de control
// que, al llegar con el scroll, SE ENCIENDE: el piloto pasa a azul, una línea de luz se abre de
// lado a lado, un destello suave, la PANTALLA DE CARGA real de FOM (las tres flechas del logo
// original, «FOM», el lema y la barra, como CargaFom.jsx) y luego el panel real: el Centro de
// control con las unidades en el mapa, que se mueve despacio y termina en una unidad abierta.
// Sin caja propia: el televisor va solo sobre el fondo de la página.
// Movimiento: momentoTelevisorV8.js (escena fija ≥ 1024 px; sin pin en tableta y teléfono).
// Con «reducir movimiento»: encendido y quieto en el Centro de control.
//
// <EscenaTelevisorV8 /> · props: nota (texto bajo el televisor; false = sin nota), etiqueta.
import { useRef } from 'react'
import { FLECHAS_FOM } from '../CargaFom'
import { CapturaV8, usarEscenaV8 } from './piezasEscenaV8'
import { momentoTelevisorV8 } from './momentoTelevisorV8'
import './escena-televisor-v8.css'

// La pantalla mide hasta ~1000 px CSS: la captura del panel (2880 px) se ve nítida a 2x.
const SIZES = '(max-width: 599px) 92vw, (max-width: 1023px) 88vw, 1000px'

// Unidades del mapa real (cap-panel-mapa, 1280 × 800) sobre las que late un pulso suave.
const PULSOS = [[38.05, 29], [31.4, 33.5], [49, 53.2], [59.15, 63.3], [65.2, 88.5]]

export default function EscenaTelevisorV8({ nota = true, etiqueta = 'Televisor que se enciende con la pantalla de carga de FOM y muestra el Centro de control', className = '' }) {
  const raiz = useRef(null)
  usarEscenaV8(raiz, momentoTelevisorV8)
  const texto = nota === true ? 'Capturas reales del panel · Datos de demostración' : nota
  return <figure ref={raiz} className={`v8-tv ${className}`} data-v8-tv="" aria-label={etiqueta}>
    <div className="v8-tv-escena">
      <div className="v8-tv-aparato">
        <div className="v8-tv-marco">
          <div className="v8-tv-pantalla">
            {/* El panel real: Centro de control y, al final, una unidad abierta. */}
            <div className="v8-tv-panel">
              <div className="v8-tv-toma is-mapa">
                <CapturaV8 nombre="cap-panel-mapa" sizes={SIZES}
                  alt="Centro de control del panel FOM: 26 unidades en el mapa del Zulia, 15 en marcha. Datos de demostración." />
                {PULSOS.map(([x, y]) => <i key={`${x}-${y}`} className="v8-tv-pulso" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true" />)}
              </div>
              <div className="v8-tv-toma is-unidad" aria-hidden="true">
                <CapturaV8 nombre="cap-panel-mapa-unidad" sizes={SIZES} />
              </div>
            </div>
            {/* La pantalla de carga de FOM (misma marca y orden que CargaFom.jsx). */}
            <div className="v8-tv-carga" aria-hidden="true">
              <div className="v8-tv-carga-marca">
                <svg className="v8-tv-flechas" viewBox="0 0 104 82">{FLECHAS_FOM.map(d => <path key={d} d={d} />)}</svg>
                <div className="v8-tv-nombre"><span>F</span><span>O</span><span>M</span></div>
              </div>
              <p className="v8-tv-lema">Fleet Operations &amp; Maintenance</p>
              <div className="v8-tv-barra" />
              <p className="v8-tv-estado">Cargando…</p>
            </div>
            <i className="v8-tv-linea" aria-hidden="true" />
            <i className="v8-tv-destello" aria-hidden="true" />
            <i className="v8-tv-reflejo" aria-hidden="true" />
          </div>
          <i className="v8-tv-led" aria-hidden="true"><b /></i>
        </div>
        <div className="v8-tv-pie" aria-hidden="true"><i /><b /></div>
      </div>
    </div>
    {texto && <figcaption className="v8-nota-demo">{texto}</figcaption>}
  </figure>
}
