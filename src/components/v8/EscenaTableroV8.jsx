// Escena «En la cabina» de la web v8 (T-142): la foto de la cabina en carretera y, en primer plano,
// el teléfono del conductor en su soporte del tablero con la app REAL (Mi unidad, que sigue con la
// telemetría de su unidad: la misma pantalla larga de pantallasV8.js). Al bajar, la carretera «avanza»
// despacio, el teléfono se asienta en su soporte con un vaivén leve y su pantalla se desplaza sola.
// Sin escena fija en ningún tamaño (escena de paso, para que no todo detenga el scroll).
// Movimiento: momentoTableroV8.js. Con «reducir movimiento»: quieto.
//
// <EscenaTableroV8 /> · props: nota (false = sin nota), etiqueta.
import { useRef } from 'react'
import { FotoIntegradaV8, PantallaTelefonoV8 } from './ImagenesV8'
import { usarEscenaV8 } from './piezasEscenaV8'
import { momentoTableroV8 } from './momentoTableroV8'
import './escena-tablero-v8.css'

export default function EscenaTableroV8({ nota = true, etiqueta = 'Teléfono del conductor en el soporte del tablero con la app FOM', className = '' }) {
  const raiz = useRef(null)
  usarEscenaV8(raiz, momentoTableroV8)
  const texto = nota === true ? 'Captura real de la app · Datos de demostración' : nota
  return <figure ref={raiz} className={`v8-tab ${className}`} data-v8-tab="" aria-label={etiqueta}>
    <div className="v8-tab-escena">
      <div className="v8-tab-foto">
        <FotoIntegradaV8 nombre="cabina-carretera" fundido="ninguno" sizes="(max-width: 599px) 100vw, 1180px"
          alt="Vista desde la cabina de un vehículo en una carretera de montaña, con un camión adelante." />
      </div>
      <div className="v8-tab-tel">
        <i className="v8-tab-brazo" aria-hidden="true" />
        <div className="v8-tab-marco">
          <i className="v8-tab-pinza is-izq" aria-hidden="true" />
          <i className="v8-tab-pinza is-der" aria-hidden="true" />
          <PantallaTelefonoV8 nombre="cap-movil-cond-inicio" sizes="(max-width: 599px) 140px, 240px"
            alt="Mi unidad en la app del conductor: la Toyota Hilux de la U-001, en marcha a 61 km/h, con su telemetría en vivo. Datos de demostración." />
        </div>
      </div>
    </div>
    {texto && <figcaption className="v8-nota-demo">{texto}</figcaption>}
  </figure>
}
