// Plataforma web: ten sections from output/laminas-secciones-v7/02-plataforma.
import { PAGES } from '../../content/pages'
import { V7Section, Features, StatCard, DemoButton, FaqList, MailPrompt, V7Footer, usePageTitle } from '../../components/v7/V7Kit'
import panel from '../../assets/marketing/real/panel-resumen.webp'
import map from '../../assets/marketing/real/panel-mapa.webp'
import appHome from '../../assets/marketing/real/app-inicio.webp'
import '../../styles/v7/plataforma.css'

const page = PAGES.plataforma
const [single, split, live, capture, roles, security] = page.sections
const withIcons = (section, icons) => section.bullets.map((b, i) => [icons[i], b.label, b.text])

export default function Plataforma() {
  usePageTitle('Plataforma web')
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

    <V7Section className="pf-02" plateId="02-plataforma/02" labelledBy="pf-02-title"
      screens={[{ src: panel, corners: [[719, 158], [1562, 153], [1550, 728], [716, 722]] }]}>
      <div className="v7-copy">
        <h2 id="pf-02-title">Un panel único<br />para toda la flota</h2>
        <p>{single.body}</p>
        <Features boxed={false} items={withIcons(single, ['gauge', 'monitor', 'layout', 'users'])} />
      </div>
      <StatCard className="is-stacked" icon="globe" value={single.stat.value} label={<>funciona desde el navegador,<br />sin instalar programas</>} />
    </V7Section>

    <V7Section className="pf-03" plateId="02-plataforma/03" demo labelledBy="pf-03-title"
      screens={[{ phone: true, src: appHome, corners: [[562, 175], [737, 186], [701, 591], [516, 581]], clip: [[500, 150], [760, 150], [760, 332], [716, 338], [709, 420], [713, 482], [760, 490], [760, 620], [500, 620]] }]}>
      <div className="v7-copy">
        <h2 id="pf-03-title">{split.heading}</h2>
        <p>{split.body}</p>
        <Features items={withIcons(split, ['monitor', 'phone', 'database', 'wifiOff'])} />
      </div>
      <StatCard className="is-open" icon="phone" value={split.stat.value} label={<>la misma operación desde<br />la computadora y el teléfono</>} />
    </V7Section>

    <V7Section className="pf-04" plateId="02-plataforma/04" demo labelledBy="pf-04-title"
      screens={[{ src: map, corners: [[720, 95], [1584, 88], [1577, 748], [689, 730]], clip: [[600, 40], [1640, 40], [1640, 592], [1560, 596], [1535, 602], [1526, 615], [1526, 800], [600, 800]] }]}>
      <div className="v7-copy">
        <h2 id="pf-04-title">{live.heading}</h2>
        <p>{live.body}</p>
        <Features items={withIcons(live, ['pin', 'scan', 'filter', 'cluster'])} />
      </div>
      <StatCard icon="box" value={live.stat.value} label={live.stat.label} />
    </V7Section>

    <V7Section className="pf-05" plateId="02-plataforma/05" labelledBy="pf-05-title">
      <div className="v7-copy">
        <h2 id="pf-05-title">{capture.heading}</h2>
        <p>{capture.body}</p>
        <Features items={withIcons(capture, ['fileSend', 'database', 'antenna', 'cloud'])} />
      </div>
      <StatCard icon="database" value={capture.stat.value} label={capture.stat.label} />
    </V7Section>

    <V7Section className="pf-06" plateId="02-plataforma/06" labelledBy="pf-06-title"
      screens={[{ src: panel, corners: [[1290, 470], [1428, 482], [1392, 628], [1255, 612]], clip: [[1282, 462], [1440, 470], [1440, 580], [1408, 584], [1398, 620], [1340, 640], [1318, 640]] }]}>
      <div className="v7-copy">
        <h2 id="pf-06-title">Roles y permisos que reflejan<br />tu organización</h2>
        <p>{roles.body}</p>
        <Features boxed={false} items={withIcons(roles, ['supervisor', 'users', 'driver', 'hierarchy'])} />
      </div>
      <StatCard icon="team" value={roles.stat.value} label={roles.stat.label} />
    </V7Section>

    <V7Section className="pf-07" plateId="02-plataforma/07" labelledBy="pf-07-title">
      <div className="v7-copy">
        <h2 id="pf-07-title">Seguridad de datos y<br />escalabilidad</h2>
        <p>{security.body}</p>
        <Features boxed={false} items={withIcons(security, ['lock', 'database', 'cloudUp', 'blocks', 'trend'])} />
      </div>
      <StatCard className="is-open" icon="clock" value={security.stat.value} label={security.stat.label} />
    </V7Section>

    <V7Section className="pf-08" id="preguntas" plateId="02-plataforma/08" demo labelledBy="pf-08-title"
      screens={[{ phone: true, src: appHome, corners: [[1462, 571], [1497, 574], [1470, 650], [1433, 646]], clip: [[1458, 569], [1498, 572], [1481, 613]] }]}>
      <div className="v7-copy">
        <h2 id="pf-08-title">Preguntas frecuentes</h2>
        <p>Resuelve tus dudas principales.</p>
      </div>
      <FaqList columns={2} open="all" items={page.faqs.map((f, i) => ({ ...f, icon: ['monitor', 'users', 'chart', 'database'][i] }))} className="pf-faq" />
      <MailPrompt />
    </V7Section>

    <V7Section className="pf-09" plateId="02-plataforma/09" labelledBy="pf-09-title">
      <div className="v7-copy">
        <h2 id="pf-09-title">Conoce FOM<br />con tu equipo</h2>
        <p>La oficina y la carretera, conectadas.</p>
        <DemoButton />
      </div>
    </V7Section>

    <V7Footer plateId="02-plataforma/10" />
  </main>
}
