const I = {
  eye: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  heart: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  ),
  sos: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  ),
  fence: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  lock: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),
  shield: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
}

const ITEMS = [
  {
    icon: 'eye',
    title: 'Tu flota siempre a la vista',
    text: 'Cada vehículo en el mapa en tiempo real, 24/7. Sabes dónde está cada unidad en todo momento — nunca pierdes de vista tu operación.',
  },
  {
    icon: 'heart',
    title: 'Que todos lleguen a casa',
    text: 'El índice de manejo seguro cuida a tus conductores con un semáforo de verde a rojo. Es seguridad y acompañamiento, nunca vigilancia.',
  },
  {
    icon: 'sos',
    title: 'Botón de emergencia (SOS)',
    text: 'Ante cualquier eventualidad, el conductor pide ayuda con un toque y comparte su ubicación en vivo. Ayuda en camino, al instante.',
  },
  {
    icon: 'fence',
    title: 'Geocercas y alertas',
    text: 'Recibe un aviso en el momento si una unidad sale de su zona, se detiene demasiado o excede la velocidad. Te enteras primero.',
  },
  {
    icon: 'lock',
    title: 'Tus datos, protegidos',
    text: 'Información cifrada y accesos por rol: cada persona ve solo lo que le corresponde. Tu operación es tuya y de nadie más.',
  },
  {
    icon: 'shield',
    title: 'Todo bajo control',
    text: 'Operación por excepciones: FOM resalta solo lo que necesita tu atención. Si todo está bien, lo sabes de un vistazo.',
  },
]

export default function Security() {
  return (
    <section className="section sec-security" id="seguridad">
      <div className="container split">
        <aside className="split-aside">
          <header className="sec-head" style={{ marginBottom: 0 }} data-reveal>
            <div className="sec-kicker">Seguridad y tranquilidad</div>
            <h2>
              Tu flota siempre a la vista.
              <br />
              Tu operación siempre segura.
            </h2>
            <p>
              FOM está diseñado para cuidar a tu gente y a tus equipos — para que sepas, en
              todo momento, que todo está bien. Y si algo no lo está, eres el primero en
              saberlo.
            </p>
          </header>

          <div className="live-panel" data-reveal>
            <div className="live-panel-top">
              <span className="live-dot" aria-hidden="true" />
              <b>Todo bien</b>
            </div>
            <p>
              Tu flota está en movimiento, tus conductores seguros y tu operación bajo
              control.
            </p>
          </div>
        </aside>

        <div className="rows">
          {ITEMS.map((it, i) => (
            <article className="row" style={{ '--i': i }} key={it.title} data-reveal>
              <div className="row-idx">{String(i + 1).padStart(2, '0')}</div>
              <div className="row-body">
                <h3>
                  {I[it.icon]}
                  {it.title}
                </h3>
                <p>{it.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
