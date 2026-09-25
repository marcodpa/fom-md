// Plataforma web, from output/laminas-secciones-v7/02-plataforma. Slides 02 and 04 (the
// two laptops) are joined in one pinned tour; slide 06 is a shorter framed section.
import { useState } from 'react'
import { PAGES } from '../../content/pages'
import { V7Section, Features, StatCard, DemoButton, FaqList, MailPrompt, V7Footer, StickyTour, DeviceTabs, Frame, AppBackdrop, TextCards, usePageTitle } from '../../components/v7/V7Kit'
import panel from '../../assets/marketing/real/panel-resumen.webp'
import map from '../../assets/marketing/real/panel-mapa.webp'
import fleet from '../../assets/marketing/real/panel-flota.webp'
import appHome from '../../assets/marketing/real/app-inicio.webp'
import appInspection from '../../assets/marketing/real/app-inspeccion.webp'
import appService from '../../assets/marketing/real/app-mantenimiento.webp'
import appProfile from '../../assets/marketing/real/app-perfil.webp'
import '../../styles/v7/plataforma.css'

const page = PAGES.plataforma
const [single, split, live, capture, roles, security] = page.sections
const withIcons = (section, icons) => section.bullets.map((b, i) => [icons[i], b.label, b.text])
const asCards = (section, icons) => section.bullets.map((b, i) => ({ icon: icons[i], title: b.label, text: b.text }))

const APP_TABS = [{ label: 'Inicio', icon: 'phone' }, { label: 'Inspección', icon: 'clipboard' }, { label: 'Mantenimiento', icon: 'wrench' }, { label: 'Perfil', icon: 'user' }]

export default function Plataforma() {
  usePageTitle('Plataforma web')
  const [appView, setAppView] = useState(0)
  return <main id="contenido" className="v7-page v7-plataforma">
    <V7Section className="pf-01" plateId="02-plataforma/01" priority demo labelledBy="pf-title"
      screens={[{ src: panel, corners: [[595, 183], [1413, 195], [1408, 790], [590, 778]], clip: [[560, 150], [1440, 150], [1440, 600], [1415, 612], [1380, 660], [1340, 722], [1300, 800], [560, 800]] }]}>
      <div className="v7-copy">
        <p className="v7-kicker">{page.eyebrow}</p>
        <h1 id="pf-title">Toda tu flota<br />en un solo panel</h1>
        <p>{page.subtitle}</p>
        <DemoButton />
      </div>
    </V7Section>

    <StickyTour id="pf-tour" className="pf-tour" label="Recorrido por el panel web" plateId="02-plataforma/04"
      screen={{ corners: [[720, 95], [1584, 88], [1577, 748], [689, 730]], clip: [[600, 40], [1640, 40], [1640, 592], [1560, 596], [1535, 602], [1526, 615], [1526, 800], [600, 800]] }} srcs={[panel, map, fleet]}
      steps={[
        { tab: 'Resumen', icon: 'gauge', kicker: 'Panel web', title: single.heading, body: single.body, items: withIcons(single, ['gauge', 'monitor', 'layout', 'users']), stat: { icon: 'globe', ...single.stat } },
        { tab: 'Centro de control', icon: 'pin', kicker: 'Mapa en vivo', title: live.heading, body: live.body, items: withIcons(live, ['pin', 'scan', 'filter', 'cluster']), stat: { icon: 'box', ...live.stat } },
        { tab: 'Vehículos', icon: 'truck', kicker: 'Flota', title: 'Vehículos', body: 'Toda la flota en una sola tabla: estado, papeles y responsable de cada unidad.' },
      ]} />

    <V7Section className="pf-03" plateId="02-plataforma/03" demo labelledBy="pf-03-title" active={appView}
      screens={[{ phone: true, src: [appHome, appInspection, appService, appProfile], corners: [[562, 175], [737, 186], [701, 591], [516, 581]], clip: [[500, 150], [760, 150], [760, 332], [716, 338], [709, 420], [713, 482], [760, 490], [760, 620], [500, 620]] }]}>
      <div className="v7-copy">
        <h2 id="pf-03-title">{split.heading}</h2>
        <p>{split.body}</p>
        <TextCards columns={2} className="pf-03-cards" items={asCards(split, ['monitor', 'phone', 'database', 'wifiOff'])} />
      </div>
      <StatCard className="is-open" icon="phone" value={split.stat.value} label={<>la misma operación desde<br />la computadora y el teléfono</>} />
      <DeviceTabs className="pf-app-tabs" label="Pantallas de la app del conductor" tabs={APP_TABS} active={appView} onChange={setAppView} />
    </V7Section>

    <V7Section className="pf-05 is-plain" labelledBy="pf-05-title">
      <AppBackdrop side="right" />
      <div className="v7-copy">
        <p className="v7-kicker">Datos</p>
        <h2 id="pf-05-title">{capture.heading}</h2>
        <p>{capture.body}</p>
      </div>
      <TextCards columns={4} items={asCards(capture, ['fileSend', 'database', 'antenna', 'cloud'])} />
      <StatCard className="pf-05-stat" icon="database" value={capture.stat.value} label={capture.stat.label} />
    </V7Section>

    <V7Section className="pf-06 is-framed" labelledBy="pf-06-title">
      <div className="v7-copy">
        <h2 id="pf-06-title">Roles y permisos que reflejan<br />tu organización</h2>
        <p>{roles.body}</p>
        <Features className="is-cards" boxed={false} items={withIcons(roles, ['supervisor', 'users', 'driver', 'hierarchy'])} />
        <StatCard icon="team" value={roles.stat.value} label={roles.stat.label} />
      </div>
      <Frame plateId="02-plataforma/06" x="-96%" ratio="4 / 5"
        screens={[{ src: panel, corners: [[1290, 470], [1428, 482], [1392, 628], [1255, 612]], clip: [[1282, 462], [1440, 470], [1440, 580], [1408, 584], [1398, 620], [1340, 640], [1318, 640]] }]} />
    </V7Section>

    <V7Section className="pf-07" plateId="02-plataforma/07" labelledBy="pf-07-title">
      <div className="v7-copy">
        <h2 id="pf-07-title">Seguridad de datos y<br />escalabilidad</h2>
        <p>{security.body}</p>
        <Features boxed={false} items={withIcons(security, ['lock', 'database', 'cloudUp', 'blocks', 'trend'])} />
      </div>
      <StatCard className="is-open" icon="clock" value={security.stat.value} label={security.stat.label} />
    </V7Section>

    <V7Section className="pf-08 is-plain" id="preguntas" labelledBy="pf-08-title">
      <AppBackdrop side="center" />
      <div className="v7-copy">
        <h2 id="pf-08-title">Preguntas frecuentes</h2>
        <p>Resuelve tus dudas principales.</p>
      </div>
      <FaqList columns={2} open="first" items={page.faqs.map((f, i) => ({ ...f, icon: ['monitor', 'users', 'chart', 'database'][i] }))} className="pf-faq" />
      <MailPrompt />
    </V7Section>

    <V7Footer plateId="02-plataforma/10" />
  </main>
}
