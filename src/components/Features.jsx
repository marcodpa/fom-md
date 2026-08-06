const I = {
  pin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m8.5 10 2 2L14 8.5" />
      <path d="M8.5 16H15" />
    </svg>
  ),
  wrench: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  report: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 17v-3M12 17v-6M16 17v-4" />
    </svg>
  ),
}

// Puntos del mini-mapa del tile principal (posición y estado)
const UNITS = [
  { x: 24, y: 30 },
  { x: 47, y: 22, stopped: true },
  { x: 63, y: 44 },
  { x: 33, y: 62 },
  { x: 76, y: 66 },
  { x: 55, y: 78, stopped: true },
]

const PRODUCTS = [
  ['FOM-WEB', 'Consola web de operación'],
  ['FOM-DRIVER', 'App del conductor'],
  ['FOM-TECH', 'App del técnico de taller'],
  ['FOM-CONTROL', 'Consola del proveedor'],
]

export default function Features() {
  return (
    <section className="section" id="funciones">
      <div className="container">
        <header className="sec-head" data-reveal>
          <div className="sec-kicker">Funciones</div>
          <h2>Más que GPS: operación y mantenimiento en un solo lugar.</h2>
          <p>
            Un expediente digital único por vehículo: del recorrido a la inspección, de la
            falla a la orden de trabajo, del costo a la decisión.
          </p>
        </header>

        <div className="bento">
          {/* Protagonista: el mapa en vivo */}
          <article className="tile t-lead" style={{ '--i': 0 }} data-reveal>
            <div className="tile-ico">{I.pin}</div>
            <h3>Mapa en vivo</h3>
            <p>
              El mapa es el protagonista: cada unidad transmite posición, velocidad y
              estado — En marcha o Parada — en tiempo real.
            </p>
            <div className="tile-map" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,34 L38,30 L66,40 L100,32" />
                <path d="M22,0 L28,46 L24,100" />
                <path d="M0,70 L44,64 L100,74" />
                <path d="M62,0 L66,38 L72,100" />
              </svg>
              {UNITS.map((u, k) => (
                <i
                  key={k}
                  className={u.stopped ? 'stopped' : ''}
                  style={{ left: `${u.x}%`, top: `${u.y}%`, animationDelay: `${k * 380}ms` }}
                />
              ))}
            </div>
          </article>

          {/* Inspección */}
          <article className="tile t-half" style={{ '--i': 1 }} data-reveal>
            <div className="tile-ico">{I.check}</div>
            <h3>Inspección diaria</h3>
            <p>
              Checklist pre-viaje. Una falla crítica bloquea la salida y genera la orden de
              trabajo automáticamente.
            </p>
            <div className="tile-chips">
              <span className="chip ok">Conforme</span>
              <span className="chip warn">Observación</span>
              <span className="chip bad">Falla · bloquea salida</span>
            </div>
          </article>

          {/* ODT */}
          <article className="tile t-half" style={{ '--i': 2 }} data-reveal>
            <div className="tile-ico">{I.wrench}</div>
            <h3>Órdenes de trabajo (ODT)</h3>
            <p>
              Cada falla reportada se convierte en una ODT con evidencia, nota de solución
              y costo.
            </p>
            <div className="tile-flow">
              <span className="on">Abierta</span>
              <em>—</em>
              <span>En revisión</span>
              <em>—</em>
              <span>Cerrada</span>
            </div>
          </article>

          {/* Índice de manejo seguro */}
          <article className="tile t-third" style={{ '--i': 3 }} data-reveal>
            <div className="tile-ico">{I.shield}</div>
            <h3>Índice de manejo seguro</h3>
            <p>De 0 a 100, con semáforo. Es cuidado, no vigilancia.</p>
            <div className="tile-ring" aria-hidden="true">
              <b>92</b>
            </div>
          </article>

          {/* Documentos */}
          <article className="tile t-two" style={{ '--i': 4 }} data-reveal>
            <div className="tile-ico">{I.bell}</div>
            <h3>Documentos y alertas</h3>
            <p>
              Licencias, RCV, trimestres y carnets con vencimiento a la vista. Reglas de
              alerta por velocidad y kilometraje.
            </p>
            <div className="tile-docs" aria-hidden="true">
              <div className="doc-row">
                <b>Licencia</b>
                <div className="doc-bar"><span className="ok" style={{ width: '86%' }} /></div>
                <span>Vigente</span>
              </div>
              <div className="doc-row">
                <b>RCV</b>
                <div className="doc-bar"><span className="warn" style={{ width: '24%' }} /></div>
                <span>Por vencer</span>
              </div>
              <div className="doc-row">
                <b>Trimestre</b>
                <div className="doc-bar"><span className="bad" style={{ width: '6%' }} /></div>
                <span>Vencido</span>
              </div>
            </div>
          </article>

          {/* Reportes + productos */}
          <article className="tile t-full" style={{ '--i': 5 }} data-reveal>
            <div>
              <div className="tile-ico">{I.report}</div>
              <h3>Reportes multi-empresa</h3>
              <p>
                Por vehículo, grupo o flota completa — con el formato PDF que exige tu
                contratante, listo para entregar.
              </p>
            </div>
            <div className="tile-prods">
              {PRODUCTS.map(([n, d]) => (
                <div className="prod" key={n}>
                  <b>{n}</b>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
