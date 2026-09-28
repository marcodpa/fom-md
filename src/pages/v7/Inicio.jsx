// Inicio, from output/laminas-secciones-v7/01-inicio (plates in src/assets/marketing/home-v7,
// copied to v7/01-inicio). Second pass, without a pinned tour: the two office monitors
// (slides 04 and 08) are one framed console with tabs; the phone in hand (02) and the driving
// index (07) are shorter framed sections; the technician's phone (05) switches between app screens; the first-check section (06) and
// the FAQ (10) sit on the app background. The demo form stays on this page (#contacto).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PAGES } from '../../content/pages'
import { V7Section, DemoButton, FaqList, V7Footer, DeviceTabs, Frame, AppBackdrop, Arrow, usePageTitle } from '../../components/v7/V7Kit'
import { ContactForm } from '../../components/marketing/MarketingSections'
import panel from '../../assets/marketing/real/panel-resumen.webp'
import map from '../../assets/marketing/real/panel-mapa.webp'
import { ConnectedDevices, ServiceIndex, AppGallery, MaintenanceJourney, DrivingDetail } from '../../components/v7/HomeStories'
import '../../styles/v7/inicio.css'

const DEMO = '/#contacto'
// The item facts as one normal paragraph, each led by its own title.
const Facts = ({ items }) => <p className="in-facts">{items.map(([, title, text]) => <span key={title}><b>{title}.</b> {text} </span>)}</p>

const PLATFORM = [['pin', 'Flota en tiempo real', 'Ubica tus unidades en el mapa.'], ['settings', 'Estado de la operación', 'Consulta alertas y pendientes.'], ['cluster', 'Información integrada', 'De la ruta al mantenimiento.']]
const AREAS = [['plus', 'Zonas', 'Organiza unidades por área desde la consola.'], ['pin', 'Ubicación', 'Consulta la ubicación de cada unidad.'], ['chart', 'Operación', 'Toma decisiones con información en tiempo real.']]
// Slides 04 and 08 (the two office monitors) become one section: both texts stay visible and
// the console switches between the summary and the map.
const CONSOLE = [
  { tab: 'Resumen', icon: 'gauge', title: <>Toda la operación.<br />Una sola vista.</>, body: 'Vehículos, alertas y mantenimiento conectados para decidir con claridad.', items: PLATFORM },
  { id: 'areas', tab: 'Zonas', icon: 'map', title: <>Un mismo control.<br />Cada zona de tu flota.</>, body: 'Organiza unidades por área y consulta su ubicación desde la consola.', items: AREAS },
]

export default function Inicio() {
  usePageTitle('Tu flota conectada')
  const [consoleView, setConsoleView] = useState(0)
  return <main id="contenido" className="v7-page v7-inicio">
    <V7Section className="in-01" plateId="01-inicio/01" priority demo labelledBy="in-title"
      screens={[{ src: panel, corners: [[758, 150], [1588, 185], [1608, 705], [750, 708]] }]}>
      <div className="v7-copy">
        <h1 id="in-title">Tu flota conectada.<br />Tu operación, bajo control.</h1>
        <p>La oficina y la carretera, en una misma plataforma.</p>
        <DemoButton to={DEMO} />
      </div>
    </V7Section>

    <ConnectedDevices />

    <ServiceIndex />

    <V7Section id="plataforma" className="in-04 is-framed" labelledBy="in-04-title">
      <div className="in-console">
        <Frame plateId="01-inicio/08" x="-47%" ratio="5 / 4" active={consoleView}
          screens={[{ src: [panel, map], corners: [[703, 149], [1592, 120], [1594, 744], [680, 708]] }]} />
        <DeviceTabs className="in-console-tabs" label="Vistas de la consola" tabs={CONSOLE.map(v => ({ label: v.tab, icon: v.icon }))} active={consoleView} onChange={setConsoleView} />
        <small className="v7-demo">Datos de demostración</small>
      </div>
      <div className="v7-copy">
        {CONSOLE.map((view, i) => <article key={view.tab} id={view.id} className={`in-view${i === consoleView ? ' is-active' : ''}`}>
          <h2 id={i ? undefined : 'in-04-title'}>{view.title}</h2>
          <p>{view.body}</p>
          <Facts items={view.items} />
        </article>)}
      </div>
    </V7Section>

    <AppGallery />

    <MaintenanceJourney />

    <DrivingDetail />

    <V7Section id="contacto" className="in-09" plateId="01-inicio/09" labelledBy="in-09-title">
      <div className="v7-copy">
        <h2 id="in-09-title">Hablemos de tu<br />operación</h2>
        <p>Cuéntanos cómo trabajas y coordinamos una demostración.</p>
      </div>
      <ContactForm />
    </V7Section>

    <V7Section id="preguntas" className="in-10 is-plain" labelledBy="in-10-title">
      <AppBackdrop side="center" />
      <div className="v7-copy">
        <h2 id="in-10-title">Preguntas frecuentes</h2>
        <p>Resuelve tus dudas principales.</p>
      </div>
      <FaqList columns={2} open="first" items={PAGES.plataforma.faqs.map((f, i) => ({ ...f, icon: ['message', 'users', 'chart', 'shield'][i] }))} />
      <Link className="in-all-questions" to="/preguntas-frecuentes">Ver todas las preguntas <Arrow /></Link>
    </V7Section>

    <V7Footer plateId="01-inicio/11" className="in-11" statement={null}>
      <Link className="in-footer-demo" to={DEMO}>Solicitar una demostración</Link>
    </V7Footer>
  </main>
}
