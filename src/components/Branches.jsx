import { useState } from 'react'
import capturaMapa from '../assets/consola-mapa.jpg'

// Tres zonas reales de operación en la Costa Oriental del Lago. El lago las
// separa: Maracaibo al oeste, la costa oriental al este, el sur más abajo.
const ZONES = [
  {
    id: 'occidente',
    name: 'Maracaibo',
    tag: 'Occidente del lago',
    count: 12,
    desc: 'Reparto urbano y flota liviana. Entran y salen de la ciudad todo el día, organizadas por geocercas de sector.',
  },
  {
    id: 'oriental',
    name: 'Cabimas · Ciudad Ojeda',
    tag: 'Costa oriental',
    count: 9,
    desc: 'Corredor petrolero. Unidades pesadas entre campos, patios y muelles, con control de velocidad y paradas.',
  },
  {
    id: 'sur',
    name: 'Lagunillas · Bachaquero',
    tag: 'Sur del lago',
    count: 5,
    desc: 'Rutas largas. Seguimiento continuo en tramos sin señal urbana y alertas de desvío en tiempo real.',
  },
]

const TOTAL = ZONES.reduce((s, z) => s + z.count, 0)

export default function Branches() {
  const [active, setActive] = useState('occidente')

  return (
    <section className="section" id="sucursales">
      <div className="container">
        <header className="sec-head" data-reveal>
          <div className="sec-kicker">Áreas de flota</div>
          <h2>Una operación, tres zonas de control.</h2>
          <p>
            Organiza la flota por área y supervisa cada zona de la Costa Oriental del Lago
            desde el mismo panel. El lago las separa; FOM las une.
          </p>
        </header>

        <div className="areas" data-reveal>
          {/* La consola real con el mapa en vivo: las tres zonas se ven tal
              cual las ve el supervisor, con el mismo marco de navegador de
              las demás capturas del sitio. */}
          <div className="area-map">
            <div className="mk-browser">
              <div className="mk-bar">
                <span className="mk-dot" />
                <span className="mk-dot" />
                <span className="mk-dot" />
                <div className="mk-url">app.fom.com.ve/panel</div>
              </div>
              <img
                className="mk-captura"
                src={capturaMapa}
                alt="Consola FOM: resumen de la operación con el mapa en vivo de las tres zonas — Maracaibo, la costa oriental y el sur del lago"
                loading="lazy"
              />
            </div>
          </div>

          <div className="area-cards">
            {ZONES.map((z) => (
              <button
                type="button"
                key={z.id}
                className={`area-card${active === z.id ? ' on' : ''}`}
                onMouseEnter={() => setActive(z.id)}
                onFocus={() => setActive(z.id)}
                aria-pressed={active === z.id}
              >
                <div className="area-card-top">
                  <span className="area-card-tag">{z.tag}</span>
                  <span className="area-card-count">
                    <b>{z.count}</b> unidades
                  </span>
                </div>
                <h3>{z.name}</h3>
                <p>{z.desc}</p>
              </button>
            ))}

            <div className="area-total">
              <span>Flota total en operación</span>
              <b>{TOTAL} unidades</b>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
