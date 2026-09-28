import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plate } from './V7Kit'
import panel from '../../assets/marketing/real/panel-resumen.webp'
import map from '../../assets/marketing/real/panel-mapa.webp'
import alerts from '../../assets/marketing/real/panel-alertas.webp'
import home from '../../assets/marketing/real/app-inicio.webp'
import inspection from '../../assets/marketing/real/app-inspeccion.webp'
import maintenance from '../../assets/marketing/real/app-mantenimiento.webp'
import profile from '../../assets/marketing/real/app-perfil.webp'
import '../../styles/v7/home-stories.css'

const Demo = () => <small className="hs-demo">Capturas reales · Datos de demostración</small>

function Phone({ src, alt, className = '' }) {
  return <div className={`hs-phone ${className}`}>
    <div className="hs-phone-speaker" aria-hidden="true" />
    <img src={src} alt={alt} width="390" height="844" loading="lazy" decoding="async" />
    <span className="hs-phone-home" aria-hidden="true" />
  </div>
}

export function ConnectedDevices() {
  return <section id="app-en-tu-mano" className="hs-section hs-connected" aria-labelledby="hs-connected-title">
    <header className="hs-heading">
      <h2 id="hs-connected-title">Todo ese control.<br /><span>Ahora en tu mano.</span></h2>
      <p>La oficina y el conductor,<br />conectados con la misma información.</p>
    </header>
    <div className="hs-connected-devices">
      <div className="hs-laptop">
        <div className="hs-laptop-screen"><img src={panel} alt="Resumen real del panel FOM: flota, mapa, órdenes y alertas. Datos de demostración." width="1430" height="953" loading="lazy" decoding="async" /></div>
        <div className="hs-laptop-base" aria-hidden="true" />
      </div>
      <svg className="hs-connection" viewBox="0 0 120 100" fill="none" aria-hidden="true"><path d="M8 18C70 18 40 82 112 82" /><circle cx="8" cy="18" r="6" /><circle cx="112" cy="82" r="6" /></svg>
      <Phone src={home} alt="Inicio real de la app FOM del conductor, con estado y datos de su unidad." />
    </div>
    <p className="hs-connection-caption">Panel web en la oficina <span aria-hidden="true">↔</span> App del conductor en campo</p>
    <Demo />
  </section>
}

const SERVICES = [
  { title: 'Seguimiento', text: 'Ubicación, recorridos y estado de cada vehículo.', link: 'Explorar plataforma', to: '/plataforma', src: map, alt: 'Centro de control real de FOM con las unidades en el mapa.' },
  { title: 'Cuidado', text: 'Inspecciones, documentos y mantenimiento.', link: 'Explorar funciones', to: '/funciones', src: panel, alt: 'Resumen real de FOM con inspecciones, mantenimiento y documentos.' },
  { title: 'Decisiones', text: 'Alertas, seguridad y reportes para la operación.', link: 'Explorar seguridad', to: '/seguridad', src: alerts, alt: 'Alertas reales del panel FOM para revisar eventos de la operación.' },
]

export function ServiceIndex() {
  const [active, setActive] = useState(0)
  return <section id="quienes-somos" className="hs-section hs-services" aria-labelledby="hs-services-title">
    <div className="hs-services-photo" id="hs-services-preview">
      <Plate id="inicio-variedad/servicios" active={active} screens={[{ src: SERVICES.map(s => s.src), corners: [[128, 114], [947, 169], [970, 704], [133, 741]], alt: SERVICES[active].alt }]} />
    </div>
    <div className="hs-services-copy">
      <h2 id="hs-services-title">Una operación.<br /><span>Toda la información.</span></h2>
      <div className="hs-service-list">
        {SERVICES.map((s, i) => <article className={active === i ? 'is-active' : ''} key={s.title}>
          <h3><button type="button" aria-expanded={active === i} aria-controls={`hs-service-${i}`} onClick={() => setActive(i)}>
            <span className="hs-service-number" aria-hidden="true">0{i + 1}</span>{s.title}<span className="hs-service-toggle" aria-hidden="true">{active === i ? '−' : '+'}</span>
          </button></h3>
          <p>{s.text}</p>
          <div id={`hs-service-${i}`} hidden={active !== i}><Link to={s.to}>{s.link} <span aria-hidden="true">→</span></Link></div>
        </article>)}
      </div>
      <Link className="hs-about-link" to="/quienes-somos">Conoce quiénes somos <span aria-hidden="true">→</span></Link>
      <Demo />
    </div>
  </section>
}

const APP_SCREENS = [
  { label: 'Inicio', src: home, alt: 'Inicio actual de FOM: estado de la unidad e inspección del día.' },
  { label: 'Inspección', src: inspection, alt: 'Inspección actual de FOM: lista de revisión de la unidad.' },
  { label: 'Perfil', src: profile, alt: 'Perfil actual de FOM: índice de conducción y documentos del conductor.' },
]

export function AppGallery() {
  return <section id="app" className="hs-section hs-gallery" aria-labelledby="hs-gallery-title">
    <header className="hs-heading">
      <h2 id="hs-gallery-title">La operación también<br /><span>viaja con tu equipo.</span></h2>
      <p>FOM DRIVER conecta al conductor<br />con su unidad y con la oficina.</p>
    </header>
    <div className="hs-phones">{APP_SCREENS.map(s => <figure key={s.label}><Phone src={s.src} alt={s.alt} /><figcaption>{s.label}</figcaption></figure>)}</div>
    <Demo />
  </section>
}

const STEPS = [
  ['Inspección', 'Revisión en campo antes de salir.'],
  ['Reporte de falla', 'El conductor registra el hallazgo desde la app.'],
  ['Mantenimiento', 'La oficina consulta y da seguimiento al servicio.'],
  ['Historial', 'La información queda disponible para consulta.'],
]

export function MaintenanceJourney() {
  return <section id="funciones" className="hs-section hs-journey" aria-labelledby="hs-journey-title">
    <header className="hs-heading">
      <h2 id="hs-journey-title">Del primer chequeo<br /><span>al próximo servicio.</span></h2>
      <p>Un recorrido conectado:<br />revisar, reportar y dar seguimiento.</p>
    </header>
    <div className="hs-flow">
      <figure><Phone src={inspection} alt="Lista de inspección real de FOM para revisar la unidad antes de salir." /><figcaption>El conductor revisa la unidad.</figcaption></figure>
      <div className="hs-timeline">
        <svg viewBox="0 0 1000 420" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M45 290C180 290 220 220 330 210S490 140 605 130S760 50 880 50" /></svg>
        <ol>{STEPS.map(([title, text]) => <li key={title}><span className="hs-step-dot" aria-hidden="true" /><h3>{title}</h3><p>{text}</p></li>)}</ol>
      </div>
      <figure><Phone src={maintenance} alt="Pantalla real de mantenimiento de FOM con avisos y órdenes de trabajo." /><figcaption>La oficina consulta y da seguimiento.</figcaption></figure>
    </div>
    <Demo />
  </section>
}

export function DrivingDetail() {
  return <section id="seguridad" className="hs-section hs-driving" aria-labelledby="hs-driving-title">
    <h2 id="hs-driving-title">Conducir mejor empieza<br />por <span>entender cada viaje.</span></h2>
    <div className="hs-driving-layout">
      <dl className="hs-driving-notes">
        <div><dt>Índice de manejo seguro</dt><dd>Consulta el indicador de tu perfil.</dd></div>
        <div><dt>Eventos de manejo</dt><dd>Revisa excesos de velocidad, frenadas y aceleraciones.</dd></div>
        <div><dt>Información del conductor</dt><dd>Tu perfil y tus documentos en un mismo lugar.</dd></div>
      </dl>
      <Phone src={profile} alt="Perfil real de José Marruffo en FOM. Datos de demostración." />
      <figure className="hs-score-detail">
        <figcaption>Un indicador claro para entender cada viaje.</figcaption>
        <div className="hs-score-crop"><img src={profile} width="390" height="844" alt="Detalle original del índice de manejo: 76 de 100, Puedes mejorar. Excesos 1.2, frenadas 0.8 y aceleraciones 0.5 por cada 100 km. Datos de demostración." loading="lazy" decoding="async" /></div>
        <p>Visualiza los eventos registrados en tu perfil.</p>
        <Link to="/seguridad">Conocer las herramientas de seguridad <span aria-hidden="true">→</span></Link>
      </figure>
    </div>
    <Demo />
  </section>
}
