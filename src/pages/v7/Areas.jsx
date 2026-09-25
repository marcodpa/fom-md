// Áreas de flota, from output/laminas-secciones-v7/06-areas. Second pass: slides 02 and 03
// (monitor with Vehículos, laptop with the map) become one pinned tour on the monitor
// photo; slide 05 is a shorter framed section with cards; the FAQ drops its photo and
// uses the app background.
import { PAGES } from '../../content/pages'
import { V7Section, V7Icon, StatCard, DemoButton, FaqList, V7Footer, StickyTour, Frame, AppBackdrop, TextCards, usePageTitle } from '../../components/v7/V7Kit'
import fleet from '../../assets/marketing/real/panel-flota.webp'
import map from '../../assets/marketing/real/panel-mapa.webp'
import '../../styles/v7/areas.css'

const page = PAGES.areas
const [groups, geofences, multisite, access] = page.sections
// Bullet sentences kept verbatim, joined into a normal paragraph.
const prose = section => section.bullets.map(b => b.text).join(' ')
const cards = (section, icons) => section.bullets.map((b, i) => ({ icon: icons?.[i], title: b.label, text: b.text }))

// Icons drawn on the slides that the kit does not have (24 × 24 strokes).
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

    <V7Section className="ar-04" plateId="06-areas/04" labelledBy="ar-04-title">
      <div className="v7-copy">
        <p className="v7-kicker">{page.eyebrow}</p>
        <h2 id="ar-04-title">Visibilidad de una<br />operación multi-sitio</h2>
        <p>{multisite.body}</p>
        <TextCards columns={2} items={cards(multisite)} className="ar-mini" />
      </div>
      <StatCard icon="map" value={multisite.stat.value} label={multisite.stat.label} />
      <ul className="ar-sites" aria-label="Fotografías ilustrativas de patios por municipio">
        {['Cabimas', 'Ciudad Ojeda', 'Lagunillas'].map(name => <li key={name}><V7Icon name="pin" />{name}</li>)}
      </ul>
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
