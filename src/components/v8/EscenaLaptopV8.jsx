// Escena de laptop de la web v8 (T-141, pedido de Marco): el mismo tipo de efecto que la escena de
// teléfonos, pero para el PANEL WEB. Una laptop hecha en CSS (tapa con bisel y cámara, bisagra,
// base de aluminio con teclado y panel táctil) que se ABRE al bajar: la tapa gira desde cerrada
// hasta abierta con perspectiva 3D, la pantalla se enciende con la captura REAL del panel y, si se
// pasa una segunda captura, la pantalla cambia a ella como si alguien navegara el panel.
// Sin caja ni fondo propio: va directo sobre el fondo de la página (noche o banda), sin calle.
// El movimiento lo hace useMomentoV8 (momentoLaptopV8.js), atado al scroll:
//   escritorio ≥ 1024 px: la escena se queda fija mientras se abre; al final se suelta.
//   tableta y teléfono: sin escena fija; la tapa termina de abrirse al pasar (ya casi abierta).
//   «reducir movimiento»: abierta y quieta, con la primera captura.
//
// <EscenaLaptopV8 pantallas={[{ nombre: 'cap-panel-mapa', alt: '…' }, { nombre: 'cap-panel-mapa-unidad', alt: '…' }]} />
//   pantallas = 1 o 2 capturas del panel (cap-panel-*). nota = «Captura real del panel · Datos de
//   demostración» (o el texto que pases; false = sin nota). etiqueta = aria-label de la escena.
import { fotoV8 } from './fotosV8'
import './escena-laptop-v8.css'

// La captura entra a 2x en el ancho de la pantalla (≈ 0,86 del ancho de la tapa).
const SIZES = '(max-width: 599px) calc(100vw - 72px), (max-width: 1023px) 80vw, 760px'

// Teclas por fila (la última es la barra espaciadora con sus vecinas).
const FILAS = [14, 14, 13, 12, 11]

function Captura({ nombre, alt, oculta }) {
  const f = fotoV8(nombre)
  if (!f) return null
  return <picture>
    {f.avif && <source type="image/avif" srcSet={f.avif} sizes={SIZES} />}
    <img src={f.src} srcSet={f.srcSet} sizes={SIZES} width={f.width} height={f.height} alt={oculta ? '' : alt} loading="lazy" decoding="async" />
  </picture>
}

export default function EscenaLaptopV8({ pantallas, nota = true, etiqueta, className = '' }) {
  const texto = nota === true ? (pantallas.length > 1 ? 'Capturas reales del panel · Datos de demostración' : 'Captura real del panel · Datos de demostración') : nota
  return <figure className={`v8-lap ${className}`} data-v8-laptop="" aria-label={etiqueta}>
    <div className="v8-lap-escena">
      <div className="v8-lap-sombra" aria-hidden="true" />
      <div className="v8-lap-equipo">
        <div className="v8-lap-tapa">
          <div className="v8-lap-cara">
            <span className="v8-lap-camara" aria-hidden="true" />
            <div className="v8-lap-pantalla">
              {pantallas.map((p, i) => <div key={p.nombre} className={`v8-lap-capa${i ? ' is-sigue' : ''}`}>
                <Captura nombre={p.nombre} alt={p.alt} />
              </div>)}
              <div className="v8-lap-apagada" aria-hidden="true" />
              <div className="v8-lap-reflejo" aria-hidden="true" />
            </div>
          </div>
          <div className="v8-lap-dorso" aria-hidden="true"><span /></div>
        </div>
        <div className="v8-lap-base" aria-hidden="true">
          <div className="v8-lap-teclado">
            {FILAS.map((n, f) => <div key={f} className="v8-lap-fila">{Array.from({ length: n }, (_, i) => <i key={i} />)}</div>)}
            <div className="v8-lap-fila is-espacio"><i /><i /><i /><i className="is-barra" /><i /><i /><i /></div>
          </div>
          <div className="v8-lap-tactil" />
          <div className="v8-lap-frente" />
        </div>
      </div>
    </div>
    {texto && <figcaption className="v8-nota-demo">{texto}</figcaption>}
  </figure>
}
