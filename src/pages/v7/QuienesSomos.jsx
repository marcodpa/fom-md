// Quiénes somos, from output/laminas-secciones-v7/07-quienes-somos. Second pass: the story
// reads like an About page — 02 framed, 03 paragraphs on the app background, 04 text cards,
// FAQ without photo; hero, closing road and footer keep their full photographs.
import { PAGES } from '../../content/pages'
import { V7Section, DemoButton, FaqList, V7Footer, V7Icon, Frame, AppBackdrop, TextCards, usePageTitle } from '../../components/v7/V7Kit'
import panel from '../../assets/marketing/real/panel-resumen.webp'
import appHome from '../../assets/marketing/real/app-inicio.webp'
import '../../styles/v7/quienes-somos.css'

// Same answers the current page shows (ABOUT_FAQ in ReferenceMarketing).
const FAQ = [
  { icon: 'question', q: '¿Qué es FOM?', a: 'Una plataforma que conecta a las personas, los vehículos y la información de una operación en movimiento.' },
  { icon: 'users', q: '¿Quién puede usar la plataforma?', a: 'Los responsables de la operación trabajan desde el panel web y los conductores desde la app, con acceso según su rol.' },
  { icon: 'laptop', q: '¿Necesito instalar algo?', a: PAGES.plataforma.faqs[0].a },
]

const bolt = <path d="M13.5 2.5 4.5 13.5h6.5l-1 8 9-11h-6.5Z" fill="currentColor" />
const bars = <path d="M5 20v-5M10 20v-8M15 20v-10M20 20V4" strokeWidth="3.4" strokeLinecap="butt" />

const PRINCIPLES = [
  { icon: 'link', title: 'Conectar', text: 'Vehículos, conductores y responsables en un mismo flujo.' },
  { icon: bars, title: 'Entender', text: 'Ubicación, historial y estado claros para cada rol.' },
  { icon: bolt, title: 'Actuar', text: 'Alertas e inspecciones que permiten atender lo importante.' },
]

export default function QuienesSomos() {
  usePageTitle('Quiénes somos')
  return <main id="contenido" className="v7-page v7-quienes">
    <V7Section className="qs-01" plateId="07-quienes-somos/01" priority demo labelledBy="qs-title"
      screens={[{ src: panel, corners: [[657, 299], [1404, 303], [1404, 765], [658, 778]], clip: [[600, 250], [1440, 250], [1440, 655], [1410, 665], [1370, 680], [1323, 703], [1280, 760], [1250, 800], [600, 800]] }]}>
      <div className="v7-copy">
        <p className="v7-kicker">Quiénes somos</p>
        <h1 id="qs-title">Una forma más clara<br />de cuidar y coordinar<br />tu flota.</h1>
        <p>FOM es una plataforma para conectar a las personas, <br className="qs-br" />los vehículos y la información de una operación <br className="qs-br" />en movimiento.</p>
      </div>
    </V7Section>

    <V7Section className="qs-02 is-framed" demo labelledBy="qs-02-title">
      <div className="v7-copy">
        <p className="v7-kicker">Nuestra forma de trabajar</p>
        <h2 id="qs-02-title">La oficina y la carretera, <br className="qs-br" />conectadas.</h2>
        <p>Una flota genera decisiones a cada momento: dónde está una unidad, qué necesita para salir y qué ocurrió en el camino.</p>
        <p>FOM reúne esas respuestas en el panel web y en la app del conductor.</p>
        <p>El objetivo es que cada persona encuentre la información que necesita para actuar: supervisores desde la consola y conductores desde su teléfono.</p>
      </div>
      <Frame plateId="07-quienes-somos/02" x="-72%" ratio="1 / 1"
        screens={[{ phone: true, src: appHome, corners: [[1303, 298], [1545, 298], [1511, 858], [1266, 850]] }]} />
    </V7Section>

    <V7Section className="qs-03 is-plain" labelledBy="qs-03-title">
      <AppBackdrop side="right" />
      <div className="v7-copy">
        <p className="v7-kicker">Todo en contexto</p>
        <h2 id="qs-03-title">De cada dato a una acción concreta.</h2>
        <p>Los recorridos, las alertas, las inspecciones y el mantenimiento comparten una misma vista de la operación.</p>
        <p>Así es más sencillo revisar lo que pasa y dar seguimiento sin perder el contexto.</p>
      </div>
    </V7Section>

    <V7Section className="qs-04 is-plain" labelledBy="qs-04-title">
      <div className="v7-copy">
        <p className="v7-kicker">Nuestros principios</p>
        <h2 id="qs-04-title">Una operación más conectada.</h2>
      </div>
      <TextCards columns={3} className="qs-cards" items={PRINCIPLES} />
    </V7Section>

    <V7Section className="qs-05" plateId="07-quienes-somos/05" labelledBy="qs-05-title">
      <div className="v7-copy">
        <h2 id="qs-05-title">Conoce la operación<br />detrás de cada pantalla.</h2>
        <DemoButton>Hablemos de tu flota</DemoButton>
      </div>
    </V7Section>

    <V7Section className="qs-06 is-plain" id="preguntas" labelledBy="qs-06-title">
      <AppBackdrop side="left" />
      <div className="v7-copy">
        <p className="v7-kicker">Preguntas frecuentes</p>
        <h2 id="qs-06-title">Resuelve tus dudas principales.</h2>
        <p>Explora las preguntas sobre la plataforma, las funciones y la puesta en marcha.</p>
      </div>
      <FaqList open="first" items={FAQ} className="qs-faq" />
    </V7Section>

    <V7Footer className="qs-07" taglineBreak={false} plateId="07-quienes-somos/07" statement={<>Flotas que mantienen<br />el mundo en movimiento</>}>
      <div className="qs-foot-icons" aria-hidden="true"><V7Icon name="laptop" /><V7Icon name="document" /><V7Icon name="mail" /></div>
    </V7Footer>
  </main>
}
