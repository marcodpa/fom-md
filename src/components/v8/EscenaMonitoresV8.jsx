// Escena del puesto de monitores de la web v8 (T-142): tres monitores de la oficina de operaciones
// que se van encendiendo uno tras otro con el scroll, cada uno con una pantalla REAL del panel.
// En escritorio empiezan en fila y se cierran en arco alrededor de quien mira (como un puesto de
// control); luego se enciende el del centro (Resumen) y después los de los lados.
// Sin caja propia: los monitores van solos sobre el fondo de la página.
// Movimiento: momentoMonitoresV8.js (escena fija ≥ 1024 px; sin pin en tableta y teléfono).
// Con «reducir movimiento»: en arco, los tres encendidos y quietos.
//
// <EscenaMonitoresV8 /> · props: nota (texto bajo los monitores; false = sin nota), etiqueta.
import { useRef } from 'react'
import { CapturaV8, usarEscenaV8 } from './piezasEscenaV8'
import { momentoMonitoresV8 } from './momentoMonitoresV8'
import './escena-monitores-v8.css'

// Orden en pantalla: izquierda, centro, derecha. `orden` = turno para encenderse.
const MONITORES = [
  { lado: 'izquierda', orden: 1, nombre: 'Centro de control', captura: 'cap-panel-mapa',
    alt: 'Centro de control del panel FOM con las unidades en el mapa. Datos de demostración.' },
  { lado: 'centro', orden: 0, nombre: 'Resumen', captura: 'cap-panel-resumen',
    alt: 'Resumen del panel FOM: flota, órdenes por resolver, alertas nuevas y vehículos en tiempo real. Datos de demostración.' },
  { lado: 'derecha', orden: 2, nombre: 'Mantenimiento', captura: 'cap-panel-mantenimiento',
    alt: 'Mantenimiento en el panel FOM: órdenes de trabajo abiertas, en revisión y resueltas. Datos de demostración.' },
]

const SIZES = '(max-width: 599px) 92vw, (max-width: 1023px) 32vw, 560px'

export default function EscenaMonitoresV8({ nota = true, etiqueta = 'Tres monitores de la oficina que se encienden con pantallas reales del panel', className = '' }) {
  const raiz = useRef(null)
  usarEscenaV8(raiz, momentoMonitoresV8)
  const texto = nota === true ? 'Capturas reales del panel · Datos de demostración' : nota
  return <figure ref={raiz} className={`v8-mon ${className}`} data-v8-mon="" aria-label={etiqueta}>
    <div className="v8-mon-fila">
      {MONITORES.map(m => <div key={m.lado} className={`v8-mon-col is-${m.lado}`} data-orden={m.orden}>
        <div className="v8-mon-aparato">
          <div className="v8-mon-marco">
            <div className="v8-mon-pantalla">
              <div className="v8-mon-toma"><CapturaV8 nombre={m.captura} alt={m.alt} sizes={SIZES} /></div>
              <i className="v8-mon-linea" aria-hidden="true" />
              <i className="v8-mon-reflejo" aria-hidden="true" />
            </div>
          </div>
          <div className="v8-mon-pie" aria-hidden="true"><i /><b /></div>
        </div>
        <p className="v8-mon-nombre">{m.nombre}</p>
      </div>)}
    </div>
    {texto && <figcaption className="v8-nota-demo">{texto}</figcaption>}
  </figure>
}
