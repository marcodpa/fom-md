import { useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import CTA from '../components/CTA'
import Footer from '../components/Footer'
import Preguntas from '../components/Preguntas'
import SeguridadCentro from '../components/SeguridadCentro'
import Visual from '../components/mockups/Visuals'
import { PAGES } from '../content/pages'

// Cada tab es una PÁGINA con su propia estructura, no solo otro orden de las
// mismas cajas. Cambia el HERO (split con dashboard, centrado con chips,
// métrico, con formulario) y la secuencia de secciones, incluyendo un tipo
// nuevo: la línea de pasos (timeline oscura). Así ninguna se ve igual.
//
// D = oscura (row / steps) · L = clara/gris (band / bento / grid)
// La primera sección de detalle siempre es oscura; nunca hay 3 claras juntas.
const DESIGN = {
  plataforma: {
    hero: 'split',
    // La consola real, no un dibujo: captura del panel en vivo
    heroVisual: 'captura-consola',
    // ledger = lista oscura sin números (el contenido no es secuencial)
    pattern: ['row', 'band', 'row', 'ledger', 'bento', 'row'], // D L D D L D
  },
  funciones: {
    hero: 'chips',
    chips: ['Rastreo GPS', 'Telemática', 'Geocercas', 'Mantenimiento', 'Alertas', 'Inspecciones', 'Reportes'],
    pattern: ['row', 'bento', 'row', 'band', 'ledger'], // D L D L D
  },
  seguridad: {
    hero: 'metric',
    metrics: [
      { v: '4', l: 'tipos de evento de riesgo detectados' },
      { v: '<1s', l: 'registro del incidente' },
      { v: 'SOS', l: 'botón de emergencia' },
    ],
    pattern: ['ledger', 'row', 'band', 'row', 'bento'], // D D L D L
  },
  areas: {
    hero: 'split',
    light: true,
    heroVisual: 'card-zones',
    pattern: ['row', 'band', 'row', 'bento'], // D L D L
  },
  contacto: {
    hero: 'form',
    pattern: ['row', 'steps', 'grid', 'row', 'band'], // D D L D L
  },
}

const CONTACT_MAIL = 'mailto:contacto@fom.app?subject=Solicitud%20de%20demostraci%C3%B3n%20FOM'

// Interfaz que ilustra cada sección, por tema.
const RULES = [
  [/inspecc/i, 'phone-inspeccion'],
  // La sección que contrasta el panel con la app se ilustra con el teléfono
  [/\bapp\b|en la calle/i, 'phone-inspeccion'],
  [/mantenim/i, 'card-maintenance'],
  [/telem|diagn|datos/i, 'card-telemetry'],
  [/alerta|notificaci/i, 'card-alerts'],
  [/geocerca|zona|sitio|agrupa|multi-sitio/i, 'card-zones'],
  [/video|evento|coaching|puntaje|sos|emergencia|comportamiento/i, 'card-safety'],
  [/rol|permiso|acceso/i, 'card-roles'],
  [/reporte|anal[íi]tica/i, 'card-report'],
  [/integraci|api/i, 'card-integrations'],
  [/rastreo|gps|mapa|ubicaci|seguimiento/i, 'phone-map'],
  [/panel|visibilidad|instalaci|hardware|cobertura|demo|contacto|soporte/i, 'laptop-dashboard'],
]
const FALLBACK = ['phone-map', 'card-alerts', 'card-telemetry', 'card-zones', 'card-report']

// Dos secciones seguidas no deben repetir ni la misma interfaz ni el mismo
// aparato: dos teléfonos uno tras otro se leen como la misma imagen.
const familia = (v) => String(v).split('-')[0]

function pickVisual(heading, i, prev, heroVisual) {
  // La captura real y el dibujo del panel cuentan como lo mismo: si el hero
  // ya muestra la consola, la primera sección no debe repetirla.
  const heroEsPanel = heroVisual === 'laptop-dashboard' || heroVisual === 'captura-consola'
  let v = i === 0 && !heroEsPanel ? 'laptop-dashboard' : ''
  if (!v) {
    const hit = RULES.find(([re]) => re.test(heading))
    v = hit ? hit[1] : FALLBACK[i % FALLBACK.length]
  }
  const repetido =
    v === prev ||
    v === heroVisual ||
    (heroEsPanel && v === 'laptop-dashboard' && i === 0) ||
    (prev && familia(v) === 'phone' && familia(prev) === 'phone')
  if (repetido) v = FALLBACK[(i + 2) % FALLBACK.length]
  return v
}

const ARROW = (
  <span className="cta-badge" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
)

// En /contacto el CTA no puede apuntar a /contacto (callejón sin salida):
// ahí ofrece el correo directo.
const DemoCta = ({ mail = false }) => (
  <div className="pp-hero-actions" data-reveal>
    {mail ? (
      <a className="header-cta" href={CONTACT_MAIL}>
        Escribir a contacto@fom.app
        {ARROW}
      </a>
    ) : (
      <Link className="header-cta" to="/contacto">
        Solicitar demostración
        {ARROW}
      </Link>
    )}
  </div>
)

// --- HEROS por página ----------------------------------------------------

// Tarjeta de formulario (visual, no envía): da al hero de Contacto una forma
// propia frente a los demás.
function FormCard() {
  const rows = ['Empresa', 'Nombre y cargo', 'Correo', 'Unidades a monitorear']
  return (
    <div className="pp-form mk-shell">
      <div className="pp-form-inner">
        <div className="pp-form-title">Solicitar demostración</div>
        {rows.map((r) => (
          <label className="pp-form-row" key={r}>
            <span>{r}</span>
            <i className="pp-form-field" />
          </label>
        ))}
        <label className="pp-form-row">
          <span>Mensaje</span>
          <i className="pp-form-field tall" />
        </label>
        <a className="pp-form-send" href={CONTACT_MAIL}>
          Enviar solicitud
          {ARROW}
        </a>
      </div>
    </div>
  )
}

function HeroCopy({ page, mail }) {
  return (
    <div className="pp-hero-copy">
      <div className="pp-eyebrow" data-reveal>{page.eyebrow}</div>
      <h1 data-reveal>{page.title}</h1>
      <p data-reveal>{page.subtitle}</p>
      <DemoCta mail={mail} />
    </div>
  )
}

function Hero({ page, design }) {
  const k = design.hero

  if (k === 'split' || k === 'form') {
    return (
      <header className={`pp-hero hero-split${k === 'form' ? ' hero-form' : ''}${design.light ? ' hero-light' : ''}`}>
        <div className="container pp-hero-split">
          <HeroCopy page={page} mail={k === 'form'} />
          <div className="pp-hero-figure" data-reveal>
            {k === 'form' ? <FormCard /> : <Visual id={design.heroVisual} />}
          </div>
        </div>
        {design.strip && (
          <div className="container">
            <div className="pp-hero-strip" data-reveal>
              {design.strip.map((s, i) => (
                <div className="pp-strip-cell" key={i}>
                  <b>{s.v}</b>
                  <span>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>
    )
  }

  if (k === 'chips') {
    return (
      <header className="pp-hero hero-mesh hero-center">
        <div className="container pp-hero-centered">
          <div className="pp-eyebrow" data-reveal>{page.eyebrow}</div>
          <h1 data-reveal>{page.title}</h1>
          <p data-reveal>{page.subtitle}</p>
          <div className="pp-hero-chips" data-reveal>
            {design.chips.map((c) => (
              <span className="pp-chip" key={c}>{c}</span>
            ))}
          </div>
          <DemoCta />
        </div>
      </header>
    )
  }

  if (k === 'metric') {
    return (
      <header className="pp-hero hero-dark">
        <div className="container pp-hero-metric">
          <HeroCopy page={page} />
          <div className="pp-hero-metrics" data-reveal>
            {design.metrics.map((m, i) => (
              <div className="pp-metric" key={i}>
                <b>{m.v}</b>
                <span>{m.l}</span>
              </div>
            ))}
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="pp-hero hero-dark">
      <div className="container">
        <HeroCopy page={page} />
      </div>
    </header>
  )
}

// --- Layouts de sección --------------------------------------------------
function RowSection({ s, vid, flip }) {
  return (
    <section className={`pp-row${flip ? ' flip' : ''}`} data-reveal>
      <div className="container pp-row-inner">
        <div className="pp-copy">
          <h2>{s.heading}</h2>
          <p>{s.body}</p>
          <ul className="pp-feats">
            {s.bullets.map((b, j) => (
              <li key={j}>
                <b>{b.label}</b>
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="pp-visual">
          <Visual id={vid} />
        </div>
      </div>
    </section>
  )
}

// Línea de pasos: timeline OSCURA con hilo conector. Numerada solo cuando el
// contenido es realmente secuencial (ordered); si no, marcador de rombo
// (variante "ledger") para no imponer un orden que no existe.
function StepsSection({ s, ordered = true }) {
  const List = ordered ? 'ol' : 'ul'
  return (
    <section className={`pp-steps${ordered ? '' : ' ledger'}`} data-reveal>
      <div className="container">
        <div className="pp-steps-head">
          <div>
            <h2>{s.heading}</h2>
            <p>{s.body}</p>
          </div>
        </div>
        <List className="pp-steps-list">
          {s.bullets.map((b, j) => (
            <li className="pp-step" key={j}>
              <span className="pp-step-num">
                {ordered ? String(j + 1).padStart(2, '0') : <i className="pp-step-diamond" />}
              </span>
              <div className="pp-step-body">
                <b>{b.label}</b>
                <span>{b.text}</span>
              </div>
            </li>
          ))}
        </List>
      </div>
    </section>
  )
}

// Banda de fondo CLARO: rompe la monotonía oscura y aporta luz.
function BandSection({ s, vid, flip }) {
  return (
    <section className={`pp-band light${flip ? ' flip' : ''}`} data-reveal>
      <div className="container pp-band-inner">
        <div className="pp-band-copy">
          <h2>{s.heading}</h2>
          <p>{s.body}</p>
          <ul className="pp-band-feats">
            {s.bullets.map((b, j) => (
              <li key={j}>
                <b>{b.label}</b> {b.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="pp-band-visual">
          <Visual id={vid} />
        </div>
      </div>
    </section>
  )
}

// Bento de fondo CLARO: encabezado + una rejilla de tarjetas (viñetas).
function BentoSection({ s, vid }) {
  return (
    <section className="pp-bento light" data-reveal>
      <div className="container">
        <div className="pp-bento-head">
          <h2>{s.heading}</h2>
          <p>{s.body}</p>
        </div>
        <div className="pp-bento-grid">
          <div className="pp-bento-visual">
            <Visual id={vid} />
          </div>
          {s.bullets.map((b, j) => (
            <div className="pp-bento-cell" key={j}>
              <b>{b.label}</b>
              <span>{b.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Rejilla clara simple (para contacto): tarjetas sin visual grande.
function GridSection({ s }) {
  return (
    <section className="pp-grid light" data-reveal>
      <div className="container">
        <div className="pp-bento-head">
          <h2>{s.heading}</h2>
          <p>{s.body}</p>
        </div>
        <div className="pp-grid-cells">
          {s.bullets.map((b, j) => (
            <div className="pp-grid-cell" key={j}>
              <span className="pp-grid-num">{String(j + 1).padStart(2, '0')}</span>
              <b>{b.label}</b>
              <span>{b.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function DetailSections({ sections, design }) {
  if (!sections || !sections.length) return null
  const pattern = design.pattern
  let prev = ''
  let flipCount = 0
  return (
    <div className="pp-detail">
      {sections.map((s, i) => {
        const kind = pattern[i % pattern.length]
        const vid = pickVisual(s.heading, i, prev, design.heroVisual)
        prev = vid
        if (kind === 'steps') return <StepsSection key={i} s={s} />
        if (kind === 'ledger') return <StepsSection key={i} s={s} ordered={false} />
        if (kind === 'band') return <BandSection key={i} s={s} vid={vid} flip={flipCount++ % 2 === 1} />
        if (kind === 'bento') return <BentoSection key={i} s={s} vid={vid} />
        if (kind === 'grid') return <GridSection key={i} s={s} />
        return <RowSection key={i} s={s} vid={vid} flip={flipCount++ % 2 === 1} />
      })}
    </div>
  )
}

// Contenido propio del centro de ayuda (el hero vive dentro de Preguntas,
// porque el buscador del hero filtra la lista de abajo).
const PAGINA_PREGUNTAS = {
  eyebrow: 'Centro de ayuda',
  title: 'Centro de ayuda',
  subtitle: '',
}

export default function ProductPage() {
  const { pathname } = useLocation()
  const slug = pathname.replace(/^\//, '') || 'plataforma'
  const esPreguntas = slug === 'preguntas-frecuentes'
  const page = esPreguntas ? PAGINA_PREGUNTAS : PAGES[slug]
  const design = DESIGN[slug] || DESIGN.plataforma

  useEffect(() => {
    document.title = page ? `${page.title} — FOM` : 'Página no encontrada — FOM'
    return () => {
      document.title = 'FOM — Control total de tu flota'
    }
  }, [page])

  if (esPreguntas) {
    return (
      <main className="pp pp-preguntas" id="contenido">
        <Preguntas />
        <CTA />
        <Footer />
      </main>
    )
  }

  if (!page) {
    return (
      <main className="pp" id="contenido">
        <div className="container pp-hero pp-404">
          <div className="pp-eyebrow">Error 404</div>
          <h1>Esta ruta no existe en el mapa</h1>
          <p>La dirección que buscas no está en la plataforma. Estas sí:</p>
          <nav className="pp-404-links" aria-label="Páginas principales">
            <Link to="/">Inicio</Link>
            <Link to="/plataforma">Plataforma</Link>
            <Link to="/funciones">Funciones</Link>
            <Link to="/seguridad">Seguridad</Link>
            <Link to="/contacto">Contacto</Link>
          </nav>
        </div>
        <Footer />
      </main>
    )
  }

  // Seguridad tiene su propio centro de control; después siguen las secciones
  // de video, coaching y puntaje (la detección y el SOS ya viven en el tablero).
  if (slug === 'seguridad') {
    return (
      <main className="pp pp-seguridad" id="contenido">
        <SeguridadCentro page={page} />
        <DetailSections
          sections={page.sections.slice(1, 4)}
          design={{ pattern: ['row', 'band', 'row'] }}
        />
        <CTA />
        <Footer />
      </main>
    )
  }

  return (
    <main className={`pp pp-${slug}`} id="contenido">
      <Hero page={page} design={design} />
      <DetailSections sections={page.sections} design={design} />
      <CTA />
      <Footer />
    </main>
  )
}
