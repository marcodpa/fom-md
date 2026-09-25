// Preguntas frecuentes (second pass): photo hero, one continuous help center on the app
// background (sticky index + search on the left, topic groups on the right), a framed
// closing section and the footer. FAQs come from each product page (PAGES.<tema>.faqs).
import { useEffect, useId, useRef, useState } from 'react'
import { PAGES } from '../../content/pages'
import { V7Section, Frame, AppBackdrop, FaqList, DemoButton, V7Footer, V7Icon, usePageTitle } from '../../components/v7/V7Kit'
import panel from '../../assets/marketing/real/panel-resumen.webp'
import appHome from '../../assets/marketing/real/app-inicio.webp'
import '../../styles/v7/preguntas.css'

const TOPICS = [
  { key: 'plataforma', label: 'Plataforma', icon: 'monitor', body: 'Todo lo que necesitas saber sobre el acceso, usuarios y funcionamiento general.' },
  { key: 'funciones', label: 'Funciones', icon: 'settings', body: 'Conoce más sobre el seguimiento, reportes y herramientas de operación.' },
  { key: 'seguridad', label: 'Seguridad', icon: 'shieldCheck', body: 'Resuelve tus dudas sobre la protección de tu flota y tus conductores.' },
  { key: 'areas', label: 'Áreas', icon: 'map', body: 'Gestiona zonas, geocercas y permisos por área o contrato.' },
  { key: 'contacto', label: 'Contacto', icon: 'mail', body: 'Información sobre la demostración, instalación y cobertura.' },
]

const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const matches = (faq, query) => !query || normalize(`${faq.q} ${faq.a}`).includes(query)

// Physical screens measured on the slides (tl, tr, br, bl) and what sits in front of them.
const SCREENS = {
  '01': [{ src: panel, corners: [[739, 187], [1540, 168], [1532, 759], [710, 728]] }],
  // Driver's thumb covers the lower right edge of the tablet.
  '07': [{ phone: true, radius: '40px/20px', src: appHome, corners: [[1112, 201], [1407, 209], [1372, 818], [1100, 797]], clip: [[1080, 180], [1440, 180], [1440, 640], [1400, 648], [1390, 667], [1377, 693], [1370, 727], [1363, 760], [1353, 793], [1333, 813], [1320, 840], [1080, 840]] }],
  // Supervisor's shoulder hides the lower left corner, his right hand the lower right; the footer band cuts it at y 602.
  '08': [{ src: panel, corners: [[792, 102], [1448, 88], [1440, 606], [774, 584]], clip: [[760, 60], [1480, 60], [1480, 530], [1440, 532], [1420, 540], [1400, 560], [1380, 585], [1372, 602], [912, 602], [897, 560], [885, 510], [860, 470], [830, 430], [805, 405], [790, 380], [760, 380]] }],
}

function HelpCenter() {
  const [query, setQuery] = useState('')
  const searchId = useId()
  const q = normalize(query.trim())
  const groups = TOPICS.map(t => ({ ...t, items: PAGES[t.key].faqs.filter(f => matches(f, q)) }))
  const found = groups.reduce((n, g) => n + g.items.length, 0)
  const total = TOPICS.reduce((n, t) => n + PAGES[t.key].faqs.length, 0)
  // Scroll spy: the index marks the topic group currently under the header.
  const [active, setActive] = useState(TOPICS[0].key)
  const groupsRef = useRef(null)
  useEffect(() => {
    const els = [...groupsRef.current.querySelectorAll('.pq-group')]
    const observer = new IntersectionObserver(entries => {
      const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) setActive(hit.target.id.replace('tema-', ''))
    }, { rootMargin: '-30% 0px -60% 0px' })
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return <V7Section id="temas" className="is-plain pq-help" labelledBy="pq-help-title">
    <AppBackdrop side="right" />
    <aside className="pq-aside">
      <h2 id="pq-help-title" className="pq-aside-title">Preguntas por tema</h2>
      <div className="pq-search" role="search">
        <label className="pq-sr" htmlFor={searchId}>Buscar preguntas</label>
        <V7Icon name="search" />
        <input id={searchId} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar preguntas…" autoComplete="off" />
      </div>
      <p className="pq-count" role="status">{q ? `${found} ${found === 1 ? 'pregunta encontrada' : 'preguntas encontradas'}` : `${total} preguntas en ${TOPICS.length} temas`}</p>
      <nav className="pq-nav" aria-label="Temas de preguntas">
        {groups.map(g => <a key={g.key} href={`#tema-${g.key}`} aria-current={active === g.key ? 'location' : undefined} className={[active === g.key && 'is-active', !g.items.length && 'is-empty'].filter(Boolean).join(' ') || undefined}>
          <V7Icon name={g.icon} /><span>{g.label}</span><small aria-label={`${g.items.length} preguntas`}>{g.items.length}</small>
        </a>)}
      </nav>
    </aside>

    <div className="pq-groups" ref={groupsRef}>
      {groups.map(g => <section key={g.key} id={`tema-${g.key}`} className="pq-group" aria-labelledby={`pq-${g.key}-title`}>
        <header className="pq-group-head">
          <span className="pq-group-icon"><V7Icon name={g.icon} /></span>
          <div><h3 id={`pq-${g.key}-title`}>{g.label}</h3><p>{g.body}</p></div>
        </header>
        {g.items.length
          ? <FaqList items={g.items} open={q ? 'all' : 'first'} className="pq-faq" />
          : <p className="pq-none">Ninguna pregunta de {g.label} coincide con la búsqueda.</p>}
      </section>)}
      {q && !found && <div className="pq-empty">
        <p>No encontramos esa pregunta.</p>
        <p>Prueba con otra palabra o consulta todos los temas.</p>
        <button type="button" onClick={() => setQuery('')}>Ver todas las preguntas</button>
      </div>}
    </div>
  </V7Section>
}

export default function Preguntas() {
  usePageTitle('Preguntas frecuentes')
  return <main id="contenido" className="v7-page v7-preguntas">
    <V7Section className="pq-01" plateId="10-preguntas/01" priority demo labelledBy="pq-title" screens={SCREENS['01']}>
      <div className="v7-copy">
        <p className="pq-kicker">La oficina y la carretera, conectadas</p>
        <h1 id="pq-title">Preguntas<br />frecuentes.</h1>
        <p>Explora las preguntas sobre la plataforma,<br className="pq-br" /> las funciones y la puesta en marcha.</p>
      </div>
    </V7Section>

    <HelpCenter />

    <V7Section className="is-framed pq-07" labelledBy="pq-07-title">
      <div className="v7-copy">
        <p className="pq-kicker">Conoce FOM con tu equipo</p>
        <h2 id="pq-07-title">¿Aún tienes<br />preguntas?</h2>
        <p>La oficina y la carretera, conectadas.</p>
        <DemoButton />
      </div>
      <div className="pq-07-media">
        <Frame plateId="10-preguntas/07" screens={SCREENS['07']} ratio="1 / 1" x="-72%" />
        <small className="pq-demo-note">Datos de demostración</small>
      </div>
    </V7Section>

    <V7Footer plateId="10-preguntas/08" className="pq-08" screens={SCREENS['08']} demo taglineBreak={false} statement={<>Flotas que mantienen<br />el mundo en movimiento</>} />
  </main>
}
