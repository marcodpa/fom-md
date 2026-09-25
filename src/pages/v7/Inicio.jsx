// Inicio, from output/laminas-secciones-v7/01-inicio (plates in src/assets/marketing/home-v7,
// copied to v7/01-inicio). Second pass, without a pinned tour: the two office monitors
// (slides 04 and 08) are one framed console with tabs; the phone in hand (02) and the driving
// index (07) are shorter framed sections; the technician's phone (05) switches between app screens; the first-check section (06) and
// the FAQ (10) sit on the app background. The demo form stays on this page (#contacto).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PAGES } from '../../content/pages'
import { V7Section, DemoButton, FaqList, V7Footer, DeviceTabs, Frame, AppBackdrop, TextCards, Arrow, usePageTitle } from '../../components/v7/V7Kit'
import { ContactForm } from '../../components/marketing/MarketingSections'
import panel from '../../assets/marketing/real/panel-resumen.webp'
import map from '../../assets/marketing/real/panel-mapa.webp'
import appHome from '../../assets/marketing/real/app-inicio.webp'
import appInspection from '../../assets/marketing/real/app-inspeccion.webp'
import appProfile from '../../assets/marketing/real/app-perfil.webp'
import '../../styles/v7/inicio.css'

const DEMO = '/#contacto'
const cards = (items) => items.map(([icon, title, text, to]) => ({ icon, title, text, to }))
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
const APP = [['phone', 'Inicio', 'Estado de la unidad en tiempo real.'], ['clipboard', 'Inspección', 'Checklist desde la app.'], ['user', 'Perfil', 'Información y documentos del conductor.']]

export default function Inicio() {
  usePageTitle('Tu flota conectada')
  const [appView, setAppView] = useState(0)
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

    <V7Section id="app-en-tu-mano" className="in-02 is-framed" labelledBy="in-02-title">
      <div className="v7-copy">
        <h2 id="in-02-title">Todo ese control.<br />Ahora en tu mano.</h2>
        <p>De la vista completa de tu flota a la unidad que acompaña a tu conductor.</p>
        <TextCards columns={3} items={cards([['phone', 'La misma información', 'Tu equipo en campo y la oficina siempre alineados.'], ['cloud', 'Datos en tiempo real', 'Lo que pasa en la ruta, al alcance de tu mano.'], ['users', 'Una operación conectada', 'Vehículos, conductores y tareas en un mismo lugar.']])} />
      </div>
      <Frame plateId="01-inicio/02" x="-89%" ratio="4 / 5" screens={[{ phone: true, src: appHome, corners: [[910, 83], [1247, 90], [1208, 860], [850, 836]] }]} />
      <small className="v7-demo">Datos de demostración</small>
    </V7Section>

    <V7Section id="quienes-somos" className="in-03" plateId="01-inicio/03" demo labelledBy="in-03-title"
      screens={[{ src: map, corners: [[373, 189], [992, 166], [990, 637], [373, 614]], clip: [[371, 186], [1008, 160], [1008, 644], [537, 621], [510, 580], [490, 545], [458, 497], [430, 465], [400, 440], [371, 427]] }]}>
      <div className="v7-copy">
        <h2 id="in-03-title">La operación se entiende mejor cuando todos ven lo mismo.</h2>
        <p>FOM reúne el trabajo de la oficina y del equipo en campo en una sola plataforma para flotas. Seguimiento, cuidado del vehículo y comunicación forman parte de una misma operación.</p>
        <TextCards columns={3} className="in-services" items={cards([['truck', 'Seguimiento', 'Ubicación, recorridos y estado de cada vehículo.', '/plataforma'], ['wrench', 'Cuidado', 'Inspecciones, documentos y mantenimiento.', '/funciones'], ['chart', 'Decisiones', 'Alertas, seguridad y reportes para la operación.', '/seguridad']])} />
        <p className="in-note">De la ubicación de una unidad al próximo servicio, la información permanece conectada.</p>
      </div>
    </V7Section>

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

    <V7Section id="app" className="in-05" plateId="01-inicio/05" demo labelledBy="in-05-title" active={appView}
      screens={[{ phone: true, src: [appHome, appInspection, appProfile], corners: [[589, 425], [750, 438], [710, 781], [541, 757]] }]}>
      <div className="v7-copy">
        <h2 id="in-05-title">La operación también viaja con tu equipo.</h2>
        <p>FOM DRIVER conecta al conductor con su unidad y con la oficina. Inicio, inspección y perfil en una misma app.</p>
        <div className="in-app-cards" data-active={appView}><TextCards columns={3} items={cards(APP)} /></div>
      </div>
      <DeviceTabs className="in-app-tabs" label="Pantallas de la app del conductor" tabs={APP.map(([icon, label]) => ({ icon, label }))} active={appView} onChange={setAppView} />
    </V7Section>

    <V7Section id="funciones" className="in-06 is-plain" labelledBy="in-06-title">
      <AppBackdrop side="right" />
      <div className="v7-copy">
        <h2 id="in-06-title">Del primer chequeo<br />al próximo servicio.</h2>
        <p>Un recorrido conectado: revisar, reportar y dar seguimiento.</p>
      </div>
      <TextCards columns={3} className="in-steps" items={cards([['clipboard', 'Inspecciones en campo', 'Registra condiciones de la unidad.'], ['wrench', 'Mantenimiento', 'Consulta próximos servicios.'], ['document', 'Historial', 'Toda la información, siempre disponible.']])} />
    </V7Section>

    <V7Section id="seguridad" className="in-07 is-framed" labelledBy="in-07-title">
      <div className="v7-copy">
        <h2 id="in-07-title">Conducir mejor empieza por entender cada viaje.</h2>
        <p>Un índice claro para acompañar al conductor y atender lo que necesita mejorar.</p>
        <TextCards columns={3} items={cards([['speed', 'Índice de manejo seguro', 'Evalúa cada viaje.'], ['message', 'Retroalimentación clara', 'Identifica áreas de mejora.'], ['user', 'Conductores más preparados', 'Una flota más segura y eficiente.']])} />
      </div>
      <Frame plateId="01-inicio/07" x="-14%" ratio="4 / 5" screens={[{ phone: true, src: appProfile, corners: [[390, 117], [705, 132], [664, 860], [315, 836]], alt: 'Captura original del perfil del conductor en la app FOM, con su índice de manejo. Datos de demostración.' }]} />
      <small className="v7-demo">Datos de demostración</small>
    </V7Section>

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
