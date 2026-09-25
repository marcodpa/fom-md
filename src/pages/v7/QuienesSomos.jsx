// Quiénes somos, from output/laminas-secciones-v7/07-quienes-somos. Second pass: the story
// reads like an About page — 02 framed; 03 is the truck on the highway with the three
// principles as image cards (user idea 7, it absorbed the old principles section); FAQ on the
// app background; hero and footer keep their full photographs.
import { PAGES } from '../../content/pages'
import { V7Section, FaqList, V7Footer, V7Icon, Frame, AppBackdrop, tilt, usePageTitle } from '../../components/v7/V7Kit'
import panel from '../../assets/marketing/real/panel-resumen.webp'
import appHome from '../../assets/marketing/real/app-inicio.webp'
import connectImg from '../../assets/marketing/v7/07-quienes-somos/conectar.webp'
import understandImg from '../../assets/marketing/v7/07-quienes-somos/entender.webp'
import actImg from '../../assets/marketing/v7/07-quienes-somos/actuar.webp'
import '../../styles/v7/quienes-somos.css'

// Same answers the current page shows (ABOUT_FAQ in ReferenceMarketing).
const FAQ = [
  { icon: 'question', q: '¿Qué es FOM?', a: 'Una plataforma que conecta a las personas, los vehículos y la información de una operación en movimiento.' },
  { icon: 'users', q: '¿Quién puede usar la plataforma?', a: 'Los responsables de la operación trabajan desde el panel web y los conductores desde la app, con acceso según su rol.' },
  { icon: 'laptop', q: '¿Necesito instalar algo?', a: PAGES.plataforma.faqs[0].a },
]

const bolt = <path d="M13.5 2.5 4.5 13.5h6.5l-1 8 9-11h-6.5Z" fill="currentColor" />
const bars = <path d="M5 20v-5M10 20v-8M15 20v-10M20 20V4" strokeWidth="3.4" strokeLinecap="butt" />

// The three principles as image cards (user idea 7, extra/07-quienes-somos-dato-accion): the
// Conectar and Actuar pictures are cut from that proposal; Entender shows the real map capture.
const PRINCIPLES = [
  { icon: 'link', title: 'Conectar', text: 'Vehículos, conductores y responsables en un mismo flujo.', image: connectImg, w: 285, h: 213, alt: 'Camión en una autopista al atardecer.' },
  { icon: bars, title: 'Entender', text: 'Ubicación, historial y estado claros para cada rol.', image: understandImg, w: 900, h: 675, alt: 'Detalle de la captura original del centro de control FOM con unidades en el mapa. Datos de demostración.' },
  { icon: bolt, title: 'Actuar', text: 'Alertas e inspecciones que permiten atender lo importante.', image: actImg, w: 285, h: 213, alt: 'Inspección de un neumático con una lista de revisión.' },
]
function untilt(e) { e.currentTarget.style.removeProperty('--rx'); e.currentTarget.style.removeProperty('--ry') }

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

    <V7Section className="qs-03" plateId="07-quienes-somos/03" labelledBy="qs-03-title">
      <div className="v7-copy">
        <h2 id="qs-03-title">De cada dato a una acción concreta.</h2>
        <p>Los recorridos, las alertas, las inspecciones y el mantenimiento comparten una misma vista de la operación.</p>
        <p>Así es más sencillo revisar lo que pasa y dar seguimiento sin perder el contexto.</p>
      </div>
      <div className="qs-steps">
        {PRINCIPLES.map(item => <article key={item.title} className="v7-card qs-step" onPointerMove={tilt} onPointerLeave={untilt}>
          <span className="qs-step-icon"><V7Icon name={item.icon} /></span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
          <div className="qs-step-media"><img src={item.image} alt={item.alt} width={item.w} height={item.h} loading="lazy" decoding="async" /></div>
        </article>)}
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
