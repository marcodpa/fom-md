import { forwardRef } from 'react'

// Telemetría real de la plataforma: los mismos campos que muestra la
// "lengüeta" del mapa en la app del conductor.
//
// El valor se parte en cifra + unidad para que la cifra pueda llevar el peso
// tipográfico y la unidad quede en secundario; `meter` dibuja una barra fina
// (0→1) y `tone` enciende el punto de estado. Sin eso, seis fichas iguales
// con etiqueta y texto se leen como una lista, no como un panel.
export const TELEMETRY_ITEMS = [
  {
    label: 'Posición GPS',
    value: '10.654° N',
    unit: '71.612° W',
    stacked: true,
    side: 'l',
    top: '19%',
    inset: '8%',
  },
  { label: 'Velocidad', value: '48', unit: 'km/h', side: 'r', top: '23%', inset: '9%' },
  { label: 'Batería', value: '12.6', unit: 'V', meter: 0.9, side: 'l', top: '41%', inset: '5%' },
  { label: 'Estado', value: 'En marcha', tone: 'ok', side: 'r', top: '45%', inset: '6%' },
  {
    label: 'Índice de manejo seguro',
    value: '92',
    unit: 'de 100',
    meter: 0.92,
    tone: 'ok',
    side: 'l',
    top: '63%',
    inset: '9%',
  },
  { label: 'Última señal', value: '8', unit: 'segundos', side: 'r', top: '67%', inset: '10%' },
]

const Telemetry = forwardRef(function Telemetry(_, ref) {
  const { itemRefs, phraseRef } = ref.current

  return (
    // Decorativo: es la versión cinematográfica de datos que la página repite
    // luego en secciones navegables, y se puede saltar con el botón. Marcarlo
    // aria-hidden evita que un lector de pantalla recite seis cifras sueltas
    // que van cambiando solas con el scroll.
    <div className="ov-tele" aria-hidden="true">
      {TELEMETRY_ITEMS.map((item, i) => (
        <div
          key={item.label}
          ref={(el) => (itemRefs[i] = el)}
          className={`tele-item side-${item.side}${item.stacked ? ' is-stacked' : ''}`}
          style={
            item.side === 'l'
              ? { left: item.inset, top: item.top }
              : { right: item.inset, top: item.top }
          }
        >
          <i className="tele-line" />
          <i className="tele-streak" />
          <i className="tele-sweep" />
          <span className="tele-label">{item.label}</span>
          <div className="tele-read">
            {item.tone && <i className={`tele-dot tone-${item.tone}`} />}
            <b className="tele-value">{item.value}</b>
            {item.unit && <em className="tele-unit">{item.unit}</em>}
          </div>
          {item.meter != null && (
            <div className="tele-meter">
              <i style={{ '--fill': item.meter }} />
            </div>
          )}
        </div>
      ))}

      <div ref={phraseRef} className="ov ov-tele-phrase">
        <p>
          Cada vehículo genera información.
          <br />
          <em>FOM la convierte en control.</em>
        </p>
      </div>
    </div>
  )
})

export default Telemetry
