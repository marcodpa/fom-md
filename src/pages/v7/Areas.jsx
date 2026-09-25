// Áreas de flota, from output/laminas-secciones-v7/06-areas. Second pass: slides 02 and 03
// (monitor with Vehículos, laptop with the map) become one pinned tour on the monitor
// photo; the multi-site section is the aerial map with pins (moved here from Beneficios,
// user idea 6); slide 05 is a shorter framed section with cards; the FAQ drops its photo and
// uses the app background.
import { PAGES } from '../../content/pages'
import { V7Section, V7Icon, StatCard, DemoButton, FaqList, V7Footer, StickyTour, Frame, AppBackdrop, TextCards, plate, usePageTitle } from '../../components/v7/V7Kit'
import fleet from '../../assets/marketing/real/panel-flota.webp'
import map from '../../assets/marketing/real/panel-mapa.webp'
import unit from '../../assets/marketing/v7/06-areas/06-unidad.webp'
import '../../styles/v7/areas.css'

const page = PAGES.areas
const [groups, geofences, multisite, access] = page.sections
// Bullet sentences kept verbatim, joined into a normal paragraph.
const prose = section => section.bullets.map(b => b.text).join(' ')
const cards = (section, icons) => section.bullets.map((b, i) => ({ icon: icons?.[i], title: b.label, text: b.text }))

// Icons drawn on the slides that the kit does not have (24 × 24 strokes).
// Aerial map: [label, pin centre x, pin centre y, colour, icon, label x, label y, label width] in photo pixels.
// Illustrative places over 06-areas/06 (the photo's own pins were removed so these can drop in).
const truckIcon = <><path d="M2.5 6.5h11v9h-11ZM13.5 9.5h4l3 3.2v2.8h-7" /><circle cx="6.5" cy="17" r="1.8" /><circle cx="17" cy="17" r="1.8" /></>
const PLACES = [
  ['Zona norte', 390, 128, '#34c77b', truckIcon, 318, 173, 145],
  ['Almacén', 212, 462, '#ef4444', <path d="M3 20.5V9.5L12 4l9 5.5v11M7 20.5v-7h10v7M7 16.5h10" />, 150, 398, 121],
  ['Patio central', 546, 423, '#f5b82e', truckIcon, 471, 459, 150],
  ['Acceso principal', 662, 657, '#2c9cff', <path d="M3 7.5a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />, 664, 688, 188],
]
const grid = <><rect x="3" y="3" width="7.5" height="7.5" rx="1.8" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" /></>

export default function Areas() {
  usePageTitle('Áreas de flota')
  return <main id="contenido" className="v7-page v7-areas">
    <V7Section className="ar-01" plateId="06-areas/01" priority labelledBy="ar-title">
      <div className="v7-copy">
        <h1 id="ar-title">{page.title}</h1>
        <p>{page.subtitle}</p>
      </div>
    </V7Section>

    <StickyTour sticky={false} id="ar-tour" className="ar-tour" label="Grupos y geocercas en el panel web" plateId="06-areas/02"
      screen={{ corners: [[642, 136], [1604, 119], [1598, 801], [628, 775]] }} srcs={[fleet, map]}
      steps={[
        { tab: 'Vehículos', icon: 'truck', kicker: 'Gestión de flotas', title: groups.heading, body: groups.body, stat: { icon: grid, ...groups.stat },
          children: <p className="ar-prose">{prose(groups)}</p> },
        { tab: 'Centro de control', icon: 'geofence', kicker: 'Zonas inteligentes', title: geofences.heading, body: geofences.body, stat: { icon: 'target', ...geofences.stat },
          children: <p className="ar-prose">{prose(geofences)}</p> },
      ]} />

    <V7Section className="ar-04" demo labelledBy="ar-04-title">
      <div className="v7-plate ar-plate">
        <img className="v7-photo" src={plate('06-areas/06')} width="1672" height="941" alt="Vista aérea ilustrativa de un parque industrial con zonas marcadas y una unidad sobre el mapa." loading="lazy" decoding="async" />
        <div className="ar-map" aria-hidden="true">
          {PLACES.map(([label, x, y, color, icon, lx, ly, lw], i) => <span key={label} className="ar-spot" style={{ '--x': x, '--y': y, '--c': color, '--lx': lx, '--ly': ly, '--lw': lw, '--i': i }}>
            <span className="ar-pin"><svg viewBox="0 0 48 52"><circle cx="24" cy="23" r="21" fill="currentColor" /><path d="M13.5 38h21L24 50Z" fill="currentColor" /><circle cx="24" cy="23" r="16" fill="#0b1724" /><g fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" transform="translate(15.6 14.6) scale(.7)">{icon}</g></svg></span>
            <span className="ar-place">{label}</span>
          </span>)}
          <div className="ar-unit">
            <img src={unit} alt="" width="284" height="200" loading="lazy" decoding="async" />
            <div>
              <strong>FOM-024</strong>
              <span className="ar-unit-state">En marcha</span>
              <p><svg viewBox="0 0 24 24"><path d="M12 22s7-7.1 7-12.5a7 7 0 1 0-14 0C5 14.9 12 22 12 22Z" /><circle cx="12" cy="9.5" r="2.5" /></svg><span><small>Última ubicación</small>Zona norte<br />Hoy, 08:42</span></p>
            </div>
          </div>
        </div>
      </div>
      <div className="v7-copy">
        <h2 id="ar-04-title">{multisite.heading}</h2>
        <p>{multisite.body}</p>
        <ul className="ar-lines">
          {multisite.bullets.map((b, i) => <li key={b.label}><V7Icon name={['map', 'filter', 'geofence', grid][i]} /><div><h3>{b.label}</h3><p>{b.text}</p></div></li>)}
        </ul>
        <StatCard className="is-inline ar-04-stat" icon="building" value={multisite.stat.value} label={multisite.stat.label} />
      </div>
    </V7Section>

    <V7Section className="ar-05 is-framed" labelledBy="ar-05-title">
      <div className="v7-copy">
        <p className="v7-kicker">Gestión de usuarios</p>
        <h2 id="ar-05-title">{access.heading}</h2>
        <p>{access.body}</p>
        <TextCards columns={3} items={cards(access, ['users', 'building', 'document', 'bell', 'shield'])} className="ar-access" />
        <StatCard icon="users" value={access.stat.value} label={access.stat.label} />
      </div>
      <div className="ar-05-media">
        <Frame plateId="06-areas/05" x="-78%" ratio="1 / 1"
          screens={[{ src: fleet, alt: 'Captura original del panel web FOM: Vehículos, con el área de cada unidad. Datos de demostración.', corners: [[1047, 318], [1636, 316], [1614, 729], [1027, 733]],
            clip: [[1000, 290], [1680, 290], [1680, 770], [1228, 770], [1222, 730], [1195, 718], [1160, 716], [1148, 718], [1090, 638], [1062, 612], [1048, 578], [1032, 525], [1000, 500]] }]} />
        <small className="ar-frame-demo">Datos de demostración</small>
      </div>
    </V7Section>

    <V7Section className="ar-06 is-plain" id="preguntas" labelledBy="ar-06-title">
      <AppBackdrop side="right" />
      <div className="v7-copy">
        <p className="v7-kicker" aria-hidden="true">Preguntas frecuentes</p>
        <h2 id="ar-06-title">Preguntas frecuentes</h2>
        <p>Resuelve tus dudas principales.</p>
      </div>
      <div className="ar-06-body">
        <FaqList open="first" items={page.faqs.map((f, i) => ({ ...f, icon: ['layers', 'pin', 'bell', 'user'][i] }))} className="ar-faq" />
        <aside className="ar-cta" aria-labelledby="ar-cta-title">
          <h3 id="ar-cta-title">Conoce FOM con tu equipo</h3>
          <p>La oficina y la carretera, conectadas.</p>
          <DemoButton />
          <p className="ar-motto" aria-hidden="true">Flotas que mantienen<br />el mundo en movimiento</p>
        </aside>
      </div>
    </V7Section>

    <V7Footer plateId="06-areas/07" className="ar-07" taglineBreak={false} statement={<>Flotas que<br />mantienen<br />el mundo<br />en movimiento</>}>
      <span className="ar-foot-icon is-platform"><V7Icon name="laptop" /></span>
      <span className="ar-foot-icon is-info"><V7Icon name="document" /></span>
      <span className="ar-foot-icon is-contact"><V7Icon name="mail" /></span>
    </V7Footer>
  </main>
}
