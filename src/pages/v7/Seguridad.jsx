// Seguridad, from output/laminas-secciones-v7/05-seguridad. Second pass: event detection
// on the app background, coaching in a framed photo, and the two driver-phone slides
// (score with the Perfil capture, SOS with Inicio) joined in one pinned tour.
import { PAGES } from '../../content/pages'
import { V7Section, StatCard, DemoButton, FaqList, MailPrompt, V7Footer, StickyTour, Frame, AppBackdrop, TextCards, usePageTitle } from '../../components/v7/V7Kit'
import panelSafety from '../../assets/marketing/real/panel-seguridad.webp'
import appHome from '../../assets/marketing/real/app-inicio.webp'
import appProfile from '../../assets/marketing/real/app-perfil.webp'
import '../../styles/v7/seguridad.css'

const page = PAGES.seguridad
const [events, video, coaching, score, sos] = page.sections
const asCards = (section, icons) => section.bullets.map((b, i) => ({ icon: icons[i], title: b.label, text: b.text }))
const joined = section => section.bullets.map(b => b.text).join(' ')

// Page-specific icons (24 × 24 stroke paths), drawn after the glyphs in the slides.
const curve = <><path d="M15.5 3.5c-3 0-5.5 1.6-5.5 4s5 2.6 5 5.5-3.5 4-6 5.5L6 21" /><path d="m5 17.5 1 3.5 3.5-.8" /></>
const sliders = <><path d="M3 6h3.5m5 0H21M3 12h9.5m5 0H21M3 18h3.5m5 0H21" /><circle cx="9" cy="6" r="2.4" /><circle cx="15" cy="12" r="2.4" /><circle cx="9" cy="18" r="2.4" /></>
const dualLens = <><rect x="2.5" y="6.5" width="19" height="11" rx="3" /><circle cx="8.3" cy="12" r="2.4" /><circle cx="15.7" cy="12" r="2.4" /></>
const sdCard = <><path d="M8.5 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V5.5Z" /><path d="M9.5 5.5v2.5m2.5-2.5v2.5m2.5-2.5v2.5M9 18.5h6" /></>
const bars = <><path d="M3 21h18" /><path d="M5 20v-5h3v5M10.5 20v-9h3v9M16 20V5h3v15" /></>
const siren = <><path d="M7 18v-5.5a5 5 0 0 1 10 0V18" /><path d="M4.5 18h15v3h-15ZM12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4M10 13a2 2 0 0 1 2-2" /></>

export default function Seguridad() {
  usePageTitle('Seguridad')
  return <main id="contenido" className="v7-page v7-seguridad">
    <V7Section className="sg-01" plateId="05-seguridad/01" priority demo labelledBy="sg-title"
      screens={[{ src: panelSafety, corners: [[780, 181], [1606, 127], [1606, 735], [760, 708]] }]}>
      <div className="v7-copy">
        <p className="v7-kicker">{page.eyebrow}</p>
        <h1 id="sg-title">Conductores protegidos,<br />vehículos cuidados</h1>
        <p>{page.subtitle}</p>
        <DemoButton />
      </div>
      <p className="sg-tagline">La oficina y la carretera,<br />conectadas.</p>
    </V7Section>

    <V7Section className="sg-02 is-plain" labelledBy="sg-02-title">
      <AppBackdrop side="right" />
      <div className="v7-copy">
        <h2 id="sg-02-title">{events.heading}</h2>
        <p>{events.body}</p>
      </div>
      <StatCard className="sg-02-stat" icon="clock" value={events.stat.value} label={events.stat.label} />
      <TextCards columns={5} className="sg-02-cards" items={asCards(events, ['alert', 'speed', 'shieldCheck', curve, sliders])} />
    </V7Section>

    <V7Section className="sg-03" plateId="05-seguridad/03" labelledBy="sg-03-title">
      <div className="v7-copy">
        <h2 id="sg-03-title">{video.heading}</h2>
        <p>{video.body}</p>
        <TextCards columns={2} className="sg-03-cards" items={asCards(video, ['video', dualLens, sdCard, 'shieldCheck'])} />
      </div>
      <StatCard className="is-open" value={video.stat.value} label={<>de grabación continua en bucle<br />antes de sobrescribir</>} />
    </V7Section>

    <V7Section className="sg-04 is-framed" demo labelledBy="sg-04-title">
      <div className="v7-copy">
        <p className="v7-kicker">{page.eyebrow}</p>
        <h2 id="sg-04-title">{coaching.heading}</h2>
        <p>{coaching.body}</p>
        <TextCards columns={3} className="sg-04-cards" items={asCards(coaching, ['bell', bars, 'users', 'target', 'user'])} />
      </div>
      <Frame plateId="05-seguridad/04" x="-104%" ratio="4 / 5"
        screens={[{ phone: true, src: appHome, corners: [[903, 362], [1078, 350], [1128, 725], [955, 742]] }]} />
    </V7Section>

    <StickyTour sticky={false} id="sg-tour" className="sg-tour" label="La app del conductor" plateId="05-seguridad/06"
      screen={{ phone: true, corners: [[1348, 300], [1602, 304], [1567, 872], [1282, 866]] }} srcs={[appProfile, appHome]}
      steps={[
        { tab: 'Perfil', icon: 'user', title: score.heading, body: score.body, stat: { icon: 'gauge', ...score.stat },
          children: <p className="sg-tour-more">{joined(score)}</p> },
        { tab: 'Inicio', icon: 'phone', title: sos.heading, body: sos.body, stat: { icon: 'bell', ...sos.stat },
          children: <p className="sg-tour-more">{joined(sos)}</p> },
      ]} />

    <V7Section className="sg-07 is-plain" id="preguntas" labelledBy="sg-07-title">
      <AppBackdrop side="center" />
      <div className="v7-copy">
        <h2 id="sg-07-title">Preguntas frecuentes</h2>
        <p>Resuelve tus dudas principales.</p>
      </div>
      <FaqList columns={2} open="first" className="sg-faq" items={page.faqs.map((f, i) => ({ ...f, icon: ['video', bars, siren, 'settings'][i] }))} />
      <MailPrompt />
    </V7Section>

    <V7Footer plateId="05-seguridad/09" className="sg-09" statement={null} taglineBreak={false} />
  </main>
}
