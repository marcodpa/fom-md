// Qué ofrecemos, from output/laminas-secciones-v7/08-que-ofrecemos. Second pass: the hero
// monitor switches between Resumen and Centro de control (slide 02's map is merged into it),
// the three offer groups are linked cards on the app background, slide 04 is a framed section.
// Text is the current "que-ofrecemos" content (ReferenceMarketing Services + manifest).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { V7Section, V7Icon, DemoButton, V7Footer, DeviceTabs, Frame, AppBackdrop, TextCards, usePageTitle } from '../../components/v7/V7Kit'
import panel from '../../assets/marketing/real/panel-resumen.webp'
import map from '../../assets/marketing/real/panel-mapa.webp'
import inspection from '../../assets/marketing/real/app-inspeccion.webp'
import alerts from '../../assets/marketing/real/panel-alertas.webp'
import '../../styles/v7/que-ofrecemos.css'

// Three solid bars, as drawn in the slides (the kit chart icon is a thin outline).
const bars = <path d="M6 20v-5.5M12 20V9.5M18 20V4.5" strokeWidth="3.6" />

/** Row of round outlined icons with a two-line caption. items: [[icon, label]] */
function Points({ items }) {
  return <ul className="qo-points">{items.map(([icon, label], i) => <li key={i}>
    <span className="qo-ring"><V7Icon name={icon} /></span><span className="qo-label">{label}</span>
  </li>)}</ul>
}

const HERO_TABS = [{ label: 'Resumen', icon: 'gauge' }, { label: 'Centro de control', icon: 'pin' }]

const OFFER = [
  { icon: 'pin', kicker: 'Ubicación y recorridos', title: 'Plataforma web', to: '/plataforma',
    text: 'Consulta dónde están las unidades y revisa sus trayectos desde el centro de control. Visualiza la flota en tiempo real, filtra por estado y accede al detalle de cada unidad.' },
  { icon: 'clipboard', kicker: 'Inspecciones y mantenimiento', title: 'App del conductor', to: '/app',
    text: 'El conductor revisa la unidad desde la app; la oficina consulta hallazgos y da seguimiento al servicio.' },
  { icon: 'bell', kicker: 'Alertas, seguridad y reportes', title: 'Seguridad', to: '/seguridad',
    text: 'Recibe notificaciones, revisa eventos de manejo y mantén tu operación al día.' },
]
const MORE = [['Plataforma web', '/plataforma'], ['App', '/app'], ['Funciones', '/funciones'], ['Seguridad', '/seguridad'], ['Áreas', '/areas']]

export default function QueOfrecemos() {
  usePageTitle('Qué ofrecemos')
  const [view, setView] = useState(0)
  return <main id="contenido" className="v7-page v7-ofrecemos">
    <V7Section className="qo-01" plateId="08-que-ofrecemos/01" priority demo labelledBy="qo-title" active={view}
      screens={[{ src: [panel, map], corners: [[651, 139], [1575, 108], [1566, 752], [636, 720]], clip: [[600, 80], [1650, 80], [1650, 716], [1600, 718], [1540, 719], [1492, 723], [1488, 780], [600, 780]], alt: 'Captura original del panel web FOM (Resumen o Centro de control). Datos de demostración.' }]}>
      <div className="v7-copy">
        <p className="v7-kicker"><span>Flotas que mantienen<br />el mundo en movimiento</span></p>
        <h1 id="qo-title">Una plataforma<br className="qo-d" /> para seguir, cuidar<br className="qo-d" /> y entender tu flota.</h1>
        <p>Herramientas conectadas para el trabajo<br className="qo-d" /> diario, desde el panel de control hasta<br className="qo-d" /> la app del conductor.</p>
        <DemoButton />
        <Points items={[
          ['pin', <>Más control<br />en tu operación</>],
          [bars, <>Información<br />para decidir</>],
          ['users', <>Flotas más<br />eficientes</>],
        ]} />
      </div>
      <DeviceTabs className="qo-tabs" label="Vistas del panel web" tabs={HERO_TABS} active={view} onChange={setView} />
    </V7Section>

    <V7Section className="qo-02 is-plain" id="servicios" labelledBy="qo-02-title">
      <AppBackdrop side="right" />
      <div className="v7-copy">
        <h2 id="qo-02-title">Qué ofrecemos</h2>
      </div>
      <TextCards columns={3} className="qo-cards" items={OFFER} />
      <nav className="qo-more" aria-label="Páginas del producto">{MORE.map(([label, to]) => <Link key={to} to={to}>{label}</Link>)}</nav>
    </V7Section>

    <V7Section className="qo-03" id="inspecciones" plateId="08-que-ofrecemos/03" demo labelledBy="qo-03-title"
      screens={[{ phone: true, src: inspection, corners: [[604, 77], [968, 72], [965, 849], [604, 844]], clip: [[580, 50], [728, 50], [728, 88], [736, 97], [856, 97], [864, 88], [864, 50], [1000, 50], [1000, 880], [580, 880]], alt: 'Captura original de la inspección en la app del conductor FOM. Datos de demostración.' }]}>
      <div className="v7-copy">
        <p className="v7-kicker"><span>Inspecciones y mantenimiento</span></p>
        <h2 id="qo-03-title">Inspecciones y<br className="qo-d" /> mantenimiento</h2>
        <p>Menos imprevistos y más<br className="qo-d" /> tiempo en movimiento.</p>
        <Link className="qo-link" to="/app">App del conductor<V7Icon name="arrowRight" /></Link>
      </div>
    </V7Section>

    <V7Section className="qo-04 is-framed" id="alertas" demo labelledBy="qo-04-title">
      <div className="v7-copy">
        <h2 id="qo-04-title">Alertas, seguridad y reportes</h2>
        <p>Los avisos y los datos de la flota ayudan a priorizar lo que requiere atención y a entender cada recorrido.</p>
        <Link className="qo-link" to="/seguridad">Seguridad<V7Icon name="arrowRight" /></Link>
      </div>
      <Frame plateId="08-que-ofrecemos/04" x="-22%" ratio="16 / 11"
        screens={[{ src: alerts, corners: [[703, 107], [1583, 77], [1590, 746], [683, 741]], clip: [[650, 30], [1660, 30], [1660, 718], [1560, 718], [1500, 721], [1474, 728], [1470, 780], [650, 780]], alt: 'Captura original de las alertas del panel web FOM. Datos de demostración.' }]} />
    </V7Section>

    <V7Footer className="qo-06" plateId="08-que-ofrecemos/06">
      <p className="qo-footer-kicker" aria-hidden="true">Flotas que mantienen<br />el mundo en movimiento</p>
    </V7Footer>
  </main>
}
