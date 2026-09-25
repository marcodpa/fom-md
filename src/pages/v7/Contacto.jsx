// Contacto, from output/laminas-secciones-v7/11-contacto. Second pass: 03 and 07 sit on the
// app background (no photo), 04 and 06 are shorter framed sections, the rest full-bleed.
import { Link } from 'react-router-dom'
import { PAGES } from '../../content/pages'
import { V7Section, V7Icon, Features, StatCard, DemoButton, FaqList, MailPrompt, V7Footer, Frame, AppBackdrop, TextCards, usePageTitle } from '../../components/v7/V7Kit'
import { ContactForm } from '../../components/marketing/MarketingSections'
import panel from '../../assets/marketing/real/panel-resumen.webp'
import '../../styles/v7/contacto.css'

const page = PAGES.contacto
const [demo, steps, channels, install, support] = page.sections

// Icons that the kit does not have (24 × 24 stroke paths).
const I = {
  chat: <><path d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5Z" /><path d="M8.2 12h.1M12 12h.1M15.8 12h.1" strokeWidth="2.6" /></>,
  whatsapp: <><path d="M3.5 20.5l1.2-4.1a8.5 8.5 0 1 1 3.3 3Z" /><path d="M9.2 8.2c-.4 3 3.2 6.8 6.6 6.6l.8-1.6-1.9-1-1 .9c-1-.4-1.9-1.3-2.4-2.4l.9-1-1-1.9Z" /></>,
  handset: <path d="M5.2 3.5h3.2l1.6 4.4-2.1 1.4a11.5 11.5 0 0 0 6.8 6.8l1.4-2.1 4.4 1.6v3.2a1.7 1.7 0 0 1-1.8 1.7C10.6 20 4 13.4 3.5 5.3a1.7 1.7 0 0 1 1.7-1.8Z" />,
  sliders: <><path d="M3 7h8.5m4.5 0h5M3 17h4.5m4.5 0h9" /><circle cx="13.8" cy="7" r="2.3" /><circle cx="9.8" cy="17" r="2.3" /></>,
  help: <><path d="M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-7L8 21.5v-4H4A1.5 1.5 0 0 1 2.5 16V6A1.5 1.5 0 0 1 4 4.5Z" /><path d="M9.8 8.8a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.6M12 14.6v.1" /></>,
  cap: <><path d="m2 9.5 10-5 10 5-10 5Z" /><path d="M6 11.5v4.8c0 1.6 2.7 3.2 6 3.2s6-1.6 6-3.2v-4.8M22 9.5v5.5" /></>,
}

export default function Contacto() {
  usePageTitle('Contacto')
  return <main id="contenido" className="v7-page v7-contacto">
    <V7Section className="ct-01" plateId="11-contacto/01" priority demo labelledBy="ct-title"
      screens={[{ src: panel, corners: [[736, 207], [1414, 252], [1410, 754], [736, 756]], clip: [[700, 170], [1440, 170], [1440, 515], [1405, 522], [1375, 545], [1355, 580], [1347, 620], [1337, 660], [1318, 700], [1300, 740], [1285, 770], [700, 770]] }]}>
      <div className="v7-copy">
        <p className="v7-kicker">{page.eyebrow}</p>
        <h1 id="ct-title">Empieza a controlar<br />tu flota con FOM</h1>
        <p>{page.subtitle}</p>
        <DemoButton />
      </div>
      <p className="ct-tagline">La oficina y la carretera,<br />conectadas.</p>
    </V7Section>

    <V7Section className="ct-02" plateId="11-contacto/02" demo labelledBy="ct-02-title"
      screens={[{ src: panel, corners: [[545, 203], [1097, 224], [1096, 630], [544, 652]], clip: [[500, 150], [1087, 150], [1087, 322], [1086, 375], [1097, 380], [1140, 380], [1140, 568], [1090, 572], [1060, 587], [1020, 600], [990, 618], [960, 635], [930, 652], [900, 668], [880, 680], [500, 700]] }]}>
      <div className="v7-copy">
        <h2 id="ct-02-title">Solicita tu<br />demostración</h2>
        <p>{demo.body}</p>
        <Features items={demo.bullets.map((b, i) => [['pin', 'video', I.sliders, 'users'][i], b.label, b.text])} />
      </div>
      <StatCard icon="calendar" value={demo.stat.value} label={<>Tiempo promedio para agendar<br />la demostración.</>} />
      <ContactForm />
    </V7Section>

    <V7Section className="ct-03 is-plain" labelledBy="ct-03-title">
      <AppBackdrop side="right" />
      <div className="v7-copy">
        <h2 id="ct-03-title">{steps.heading}</h2>
        <p>{steps.body}</p>
      </div>
      <TextCards columns={5} className="ct-timeline" items={steps.bullets.map((b, i) => ({ icon: [I.chat, 'monitor', 'document', 'wrench', 'check'][i], title: b.label, text: b.text }))} />
    </V7Section>

    <V7Section className="ct-04 is-framed" labelledBy="ct-04-title">
      <div className="v7-copy">
        <h2 id="ct-04-title">{channels.heading}</h2>
        <p>{channels.body}</p>
        <ul className="ct-channels">{channels.bullets.map((b, i) => {
          const inner = <><V7Icon name={[I.whatsapp, 'mail', I.handset, 'document'][i]} className={i === 0 ? 'is-green' : ''} /><div><h3>{b.label}</h3><p>{b.text}</p>{b.label === 'Correo' && <a href="mailto:contacto@fom.app">contacto@fom.app</a>}</div></>
          return <li key={b.label}>{b.label === 'Formulario web' ? <Link to="/contacto#solicitud-demo" className="ct-channel">{inner}</Link> : <div className="ct-channel">{inner}</div>}</li>
        })}</ul>
        <StatCard icon="clock" value={channels.stat.value} label={`${channels.stat.label}.`} />
      </div>
      <Frame plateId="11-contacto/04" x="-118%" ratio="4 / 5" />
    </V7Section>

    <V7Section className="ct-05" plateId="11-contacto/05" labelledBy="ct-05-title">
      <div className="v7-copy">
        <h2 id="ct-05-title">{install.heading}</h2>
        <p>{install.body}</p>
      </div>
      <Features className="ct-cards" boxed={false} items={install.bullets.map((b, i) => [['truck', 'users', 'check', 'settings'][i], b.label, b.text])} />
      <StatCard icon="calendar" value={install.stat.value} label={`${install.stat.label}.`} />
    </V7Section>

    <V7Section className="ct-06 is-framed" labelledBy="ct-06-title">
      <Frame plateId="11-contacto/06" x="-104%" ratio="4 / 5" />
      <div className="v7-copy">
        <h2 id="ct-06-title">{support.heading}</h2>
        <p>{support.body}</p>
        <div className="ct-support">{support.bullets.map(b => <p key={b.label}><strong>{b.label}.</strong> {b.text}</p>)}</div>
        <StatCard icon="pin" value={support.stat.value} label={`${support.stat.label}.`} />
      </div>
    </V7Section>

    <V7Section className="ct-07 is-plain" id="preguntas" labelledBy="ct-07-title">
      <AppBackdrop side="center" />
      <div className="v7-copy">
        <h2 id="ct-07-title">Preguntas frecuentes</h2>
        <p>Resuelve tus dudas principales.</p>
      </div>
      <FaqList columns={2} items={page.faqs.map((f, i) => ({ ...f, icon: [I.chat, 'settings', 'pin', 'map'][i] }))} className="ct-faq" />
      <MailPrompt />
    </V7Section>

    <V7Footer className="ct-08" plateId="11-contacto/08" taglineBreak={false} statement={<>Flotas que mantienen<br />el mundo en movimiento</>}>
      <span className="ct-rule" aria-hidden="true" />
      <span className="ct-col-icon is-1" aria-hidden="true"><V7Icon name="monitor" /></span>
      <span className="ct-col-icon is-2" aria-hidden="true"><V7Icon name="document" /></span>
      <span className="ct-col-icon is-3" aria-hidden="true"><V7Icon name="mail" /></span>
    </V7Footer>
  </main>
}
