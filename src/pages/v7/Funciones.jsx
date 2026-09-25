// Funciones, from output/laminas-secciones-v7/04-funciones. Second pass: slides 02, 05 and 06
// (map, reports, alerts) share one pinned laptop tour on the 05 plate; telemática is a framed
// section; the FAQ drops its photo for the app background.
import { PAGES } from '../../content/pages'
import { V7Section, StatCard, DemoButton, FaqList, MailPrompt, V7Footer, StickyTour, Frame, AppBackdrop, TextCards, usePageTitle } from '../../components/v7/V7Kit'
import map from '../../assets/marketing/real/panel-mapa.webp'
import appHome from '../../assets/marketing/real/app-inicio.webp'
import reports from '../../assets/marketing/real/panel-reportes.webp'
import alerts from '../../assets/marketing/real/panel-alertas.webp'
import '../../styles/v7/funciones.css'

const page = PAGES.funciones
const [gps, telematics, maintenance, reporting, alerting] = page.sections
const asCards = (section, icons) => section.bullets.map((b, i) => ({ icon: icons[i], title: b.label, text: b.text }))
// The bullet facts as one normal paragraph, each led by its own label.
const Facts = ({ section }) => <p className="fn-facts">{section.bullets.map(b => <span key={b.label}><b>{b.label}.</b> {b.text} </span>)}</p>

// Icons drawn in the slides that the kit does not have (24 × 24 strokes).
const battery = <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M6.5 7V4.8h3V7m5 0V4.8h3V7M6.5 13.5h4m5-2v4m-2-2h4" /></>
const alarm = <><circle cx="12" cy="13" r="7.5" /><path d="M12 9v4l2.6 1.8M3.5 5.8 6.5 3.2m14 2.6-3-2.6M7 19.8l-1.6 1.7m11.6-1.7 1.6 1.7" /></>
const money = <><circle cx="12" cy="12" r="9.5" /><path d="M15 8.8c-.6-.9-1.7-1.3-3-1.3-1.8 0-3 .9-3 2.2 0 3.2 6.2 1.6 6.2 4.8 0 1.3-1.3 2.3-3.2 2.3-1.4 0-2.6-.5-3.2-1.5M12 5.5v2m0 9v2" /></>
const history = <><path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2H11" /><path d="M14 2.5V8h5.5M14 2.5 19.5 8v3M8 12h6M8 15.5h3" /><circle cx="17" cy="17.5" r="3.5" /><path d="M17 16v1.7l1.1.8" /></>

const split = value => { const [first, ...rest] = value.split(' '); return <>{first}<br />{rest.join(' ')}</> }

export default function Funciones() {
  usePageTitle('Funciones')
  return <main id="contenido" className="v7-page v7-funciones">
    <V7Section className="fn-01" plateId="04-funciones/01" priority labelledBy="fn-title">
      <div className="v7-copy">
        <p className="v7-kicker">{page.eyebrow}</p>
        <h1 id="fn-title">Control diario de tu<br />flota, sin puntos ciegos</h1>
        <p>{page.subtitle}</p>
        <DemoButton />
      </div>
      <p className="fn-tagline" aria-hidden="true"><span>Flotas que mantienen<br />el mundo en movimiento</span></p>
      <p className="fn-statement" aria-hidden="true">La oficina<br />y la carretera<br />conectadas</p>
    </V7Section>

    <StickyTour id="fn-tour" className="fn-tour" label="Recorrido por las funciones del panel" plateId="04-funciones/05"
      screen={{ corners: [[813, 192], [1592, 160], [1582, 683], [766, 700]], clip: [[740, 130], [1640, 130], [1640, 684], [1540, 684], [1528, 692], [1526, 740], [740, 740]] }}
      srcs={[map, reports, alerts]}
      steps={[
        { tab: 'Rastreo GPS', icon: 'pin', kicker: 'Mapa en vivo', title: gps.heading, body: gps.body, stat: { icon: 'clock', ...gps.stat }, children: <Facts section={gps} /> },
        { tab: 'Reportes', icon: 'chart', kicker: 'Analítica', title: reporting.heading, body: reporting.body, stat: { icon: 'document', ...reporting.stat }, children: <Facts section={reporting} /> },
        { tab: 'Alertas', icon: 'bell', kicker: 'Avisos', title: alerting.heading, body: alerting.body, stat: { icon: 'bell', ...alerting.stat }, children: <Facts section={alerting} /> },
      ]} />

    <V7Section className="fn-03 is-framed" demo labelledBy="fn-03-title">
      <div className="v7-copy">
        <p className="v7-kicker">Telemática</p>
        <h2 id="fn-03-title">{telematics.heading}</h2>
        <p>{telematics.body}</p>
        <TextCards columns={2} items={asCards(telematics, [battery, 'engine', 'speed', 'alert'])} />
        <StatCard icon="clock" value={telematics.stat.value} label={telematics.stat.label} />
      </div>
      <Frame plateId="04-funciones/03" x="-112%" ratio="4 / 5"
        screens={[{ phone: true, src: appHome, corners: [[1103, 107], [1410, 116], [1356, 845], [1030, 818]] }]} />
    </V7Section>

    <V7Section className="fn-04" plateId="04-funciones/04" labelledBy="fn-04-title">
      <div className="v7-copy">
        <h2 id="fn-04-title">{maintenance.heading}</h2>
        <p>{maintenance.body}</p>
        <TextCards columns={2} items={asCards(maintenance, [alarm, 'clipboard', history, money])} />
      </div>
      <StatCard className="is-stacked" icon="wrench" value={split(maintenance.stat.value)} label={maintenance.stat.label} />
    </V7Section>

    <V7Section className="fn-07 is-plain" id="preguntas" labelledBy="fn-07-title">
      <AppBackdrop side="right" />
      <div className="v7-copy">
        <h2 id="fn-07-title">Preguntas frecuentes</h2>
        <p>Resuelve tus dudas principales.</p>
      </div>
      <FaqList columns={2} open="first" items={page.faqs.map((f, i) => ({ ...f, icon: ['pin', 'settings', 'chart', 'document'][i] }))} className="fn-faq" />
      <MailPrompt />
    </V7Section>

    <V7Section className="fn-08" plateId="04-funciones/08" labelledBy="fn-08-title">
      <div className="v7-copy">
        <p className="v7-kicker">Funciones</p>
        <h2 id="fn-08-title">Conoce FOM<br />con tu equipo</h2>
        <p>La oficina y la carretera, conectadas.</p>
        <DemoButton />
      </div>
      <p className="fn-tagline" aria-hidden="true"><span>Flotas que mantienen<br />el mundo en movimiento</span></p>
    </V7Section>

    <V7Footer plateId="04-funciones/09" className="fn-09" taglineBreak={false} statement={<>Flotas que mantienen<br />el mundo en movimiento</>} />
  </main>
}
