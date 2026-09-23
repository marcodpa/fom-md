import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PAGES } from '../content/pages'
import { MarketingFooter } from '../components/marketing/MarketingChrome'
import { DashboardVisual, MobileVisual, MapVisual, ScoreCard } from '../components/marketing/ProductVisuals'
import ApprovedSection from '../components/marketing/ApprovedSection'
import '../styles/marketing-sections.css'
import { FaqSection, ContactForm } from '../components/marketing/MarketingSections'

const LABELS = { plataforma: 'Plataforma', funciones: 'Funciones', seguridad: 'Seguridad', areas: 'Áreas de flota', contacto: 'Contacto' }
const ALL_FAQS = Object.entries(PAGES).flatMap(([slug, p]) => p.faqs.map(f => ({ ...f, slug })))
const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
function HelpPage() {
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const filtered = ALL_FAQS.filter(f => (!topic || f.slug === topic) && normalize(`${f.q} ${f.a}`).includes(normalize(search)))
  return <><header className="m-page-hero m-help-hero"><span className="m-kicker">CENTRO DE AYUDA</span><h1>Preguntas frecuentes.</h1><p>Explora las preguntas sobre la plataforma, las funciones y la puesta en marcha.</p><label className="m-help-search"><span>Busca una pregunta</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="GPS, mantenimiento, roles…" /></label><div className="m-help-topics" role="group" aria-label="Tema de ayuda">{[['', 'Todas'], ...Object.entries(LABELS)].map(([k, label]) => <button key={k} aria-pressed={topic === k} onClick={() => setTopic(k)}>{label}</button>)}</div></header><section className="m-section m-help-results"><p className="m-caption" role="status">{filtered.length} {filtered.length === 1 ? 'pregunta' : 'preguntas'}</p>{filtered.length ? filtered.map(f => <details key={f.q}><summary>{f.q}<span aria-hidden="true">+</span></summary><p>{f.a}</p><Link className="m-text-link" to={`/${f.slug}`}>Más sobre {LABELS[f.slug].toLowerCase()} ↗</Link></details>) : <div className="m-help-empty"><h2>No encontramos esa pregunta.</h2><p>Prueba con otra palabra o consulta todos los temas.</p><button className="m-button outline" onClick={() => { setSearch(''); setTopic('') }}>Ver todas las preguntas</button></div>}</section><PageCTA /></>
}
function PageCTA() { return <section className="m-page-cta"><h2>Conoce FOM con tu equipo.</h2><p>Recorre la plataforma y encuentra las herramientas para tu operación.</p><Link to="/contacto" className="m-button primary">Solicitar una demostración ↗</Link></section> }

export default function MarketingPage() {
  const { pathname } = useLocation()
  const slug = pathname.slice(1)
  const page = PAGES[slug]
  const help = slug === 'preguntas-frecuentes'
  useEffect(() => { document.title = `${help ? 'Preguntas frecuentes' : page?.title || 'Página no encontrada'} — FOM` }, [page, help])
  if (help) return <main id="contenido"><HelpPage /><MarketingFooter /></main>
  if (!page) return <main id="contenido"><header className="m-page-hero"><span className="m-kicker">404</span><h1>Esta ruta no está en el mapa.</h1><p>Vuelve al inicio para conocer la plataforma.</p><Link className="m-button primary" to="/">Ir al inicio</Link></header><MarketingFooter /></main>
  return <main id="contenido" className={`m-product-page m-page-${slug}`}>
    <header className={`m-page-hero ${slug === 'contacto' ? 'm-page-contact' : ''}`}>
      <div className="m-page-hero-copy"><span className="m-kicker">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.subtitle}</p>{slug !== 'contacto' && <Link className="m-button primary" to="/contacto">Solicitar una demo ↗</Link>}</div>
      {slug === 'contacto' ? <ContactForm /> : <div className="m-page-hero-visual">{slug === 'areas' ? <MapVisual /> : slug === 'seguridad' ? <MobileVisual screen="perfil" /> : slug === 'funciones' ? <div className="m-page-duo"><MobileVisual screen="inspeccion" /><MobileVisual screen="mantenimiento" /></div> : <DashboardVisual />}</div>}
    </header>

    <nav className="m-page-index" aria-label="Contenido de la página"><span>En esta página</span>{page.sections.map((s, i) => <a href={`#detalle-${i}`} key={s.heading}>{s.heading}</a>)}</nav>
    <div className="m-page-details" id="contenido-detalle">{page.sections.map((s, i) => <ApprovedSection section={s} index={i} slug={slug} key={s.heading} />)}</div>
    <FaqSection faqs={page.faqs} title={`Más sobre ${LABELS[slug].toLowerCase()}.`} />
    {slug !== 'contacto' && <PageCTA />}
    <MarketingFooter />
  </main>
}

