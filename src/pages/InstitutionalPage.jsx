import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MarketingFooter } from '../components/marketing/MarketingChrome'
import { DashboardVisual, MobileVisual } from '../components/marketing/ProductVisuals'
import demostracion from '../assets/marketing/photos/demostracion.webp'
import inspeccion from '../assets/marketing/photos/inspeccion.webp'
import oficina from '../assets/marketing/photos/oficina.webp'
import equipo from '../assets/marketing/photos/equipo-operaciones-v2.webp'
import centro from '../assets/marketing/photos/centro-operaciones-v2.webp'
import '../styles/institutional.css'

const SERVICES = [
  { num: '01', title: 'Ubicación y recorridos', copy: 'Consulta dónde están las unidades y revisa sus trayectos desde el centro de control.', to: '/funciones#detalle-0', label: 'Explorar rastreo', photo: demostracion, alt: 'Equipo revisando la operación en una pantalla', visual: <DashboardVisual screen="mapa" /> },
  { num: '02', title: 'Inspecciones y mantenimiento', copy: 'El conductor revisa la unidad desde la app; la oficina consulta hallazgos y da seguimiento al servicio.', to: '/funciones#detalle-2', label: 'Explorar mantenimiento', photo: inspeccion, alt: 'Inspección de una llanta antes de salir', visual: <MobileVisual screen="inspeccion" /> },
  { num: '03', title: 'Alertas, seguridad y reportes', copy: 'Los avisos y los datos de la flota ayudan a priorizar lo que requiere atención y a entender cada recorrido.', to: '/seguridad', label: 'Explorar seguridad', photo: oficina, alt: 'Coordinación de una flota desde la oficina', visual: <DashboardVisual screen="alertas" /> },
]

function AboutPage() {
  return <><section className="i-hero"><div className="i-hero-copy"><span className="m-kicker">QUIÉNES SOMOS</span><h1>Una forma más clara de cuidar y coordinar tu flota.</h1><p>FOM es una plataforma para conectar a las personas, los vehículos y la información de una operación en movimiento.</p><Link className="m-button primary" to="/que-ofrecemos">Conoce lo que ofrecemos ↗</Link></div><figure><img src={equipo} alt="Coordinadora revisando rutas en una oficina junto a una flota estacionada" width="1672" height="941" /><figcaption>Coordinación de flota · Imagen ilustrativa</figcaption></figure></section>
    <section className="i-story"><div><span className="m-kicker">NUESTRA IDEA</span><h2>La oficina y la carretera, conectadas.</h2></div><div><p>Una flota genera decisiones a cada momento: dónde está una unidad, qué necesita para salir y qué ocurrió en el camino. FOM reúne esas respuestas en el panel web y en la app del conductor.</p><p>El objetivo es que cada persona encuentre la información que necesita para actuar: supervisores desde la consola y conductores desde su teléfono.</p></div></section>
    <section className="i-duo"><figure><img src={centro} alt="Coordinador de flota trabajando frente al patio de vehículos" loading="lazy" width="1672" height="941" /><figcaption>Centro de operaciones · Imagen ilustrativa</figcaption></figure><div><span className="m-kicker">CÓMO TRABAJAMOS</span><h2>De cada dato a una acción concreta.</h2><p>Los recorridos, las alertas, las inspecciones y el mantenimiento comparten una misma vista de la operación. Así es más sencillo revisar lo que pasa y dar seguimiento sin perder el contexto.</p><Link className="m-text-link" to="/plataforma">Ver la plataforma web ↗</Link></div></section>
    <section className="i-proof"><div><span>01</span><h3>Conectar</h3><p>Vehículos, conductores y responsables en un mismo flujo.</p></div><div><span>02</span><h3>Entender</h3><p>Ubicación, historial y estado claros para cada rol.</p></div><div><span>03</span><h3>Actuar</h3><p>Alertas e inspecciones que permiten atender lo importante.</p></div></section>
    <section className="i-page-cta"><h2>Conoce la operación detrás de cada pantalla.</h2><Link className="m-button primary" to="/contacto">Hablemos de tu flota ↗</Link></section></>
}

function ServicesPage() {
  return <><section className="i-hero i-services-hero"><div className="i-hero-copy"><span className="m-kicker">QUÉ OFRECEMOS</span><h1>Una plataforma para seguir, cuidar y entender tu flota.</h1><p>Herramientas conectadas para el trabajo diario, desde el panel de control hasta la app del conductor.</p><Link className="m-button primary" to="/contacto">Solicitar una demostración ↗</Link></div><div className="i-hero-panel"><DashboardVisual screen="resumen" /></div></section>
    <nav className="i-service-index" aria-label="Servicios en esta página">{SERVICES.map(s => <a key={s.num} href={`#servicio-${s.num}`}><span>{s.num}</span>{s.title} ↗</a>)}</nav>
    {SERVICES.map((s, index) => <section className={`i-service-row${index % 2 ? ' reverse' : ''}`} id={`servicio-${s.num}`} key={s.num}><div className="i-service-copy"><span className="m-kicker">SERVICIO · {s.num}</span><h2>{s.title}</h2><p>{s.copy}</p><Link className="m-text-link" to={s.to}>{s.label} ↗</Link></div><div className="i-service-media"><figure><img src={s.photo} alt={s.alt} loading="lazy" width="1672" height="941" /><figcaption>Imagen ilustrativa</figcaption></figure>{s.visual}</div></section>)}
    <section className="i-page-cta"><h2>Ve cómo encaja FOM con tu operación.</h2><p>Revisamos tu flota y te mostramos el panel y la app en una demostración.</p><Link className="m-button primary" to="/contacto">Solicitar una demostración ↗</Link></section></>
}

export default function InstitutionalPage() {
  const about = useLocation().pathname === '/quienes-somos'
  useEffect(() => { document.title = `${about ? 'Quiénes somos' : 'Qué ofrecemos'} — FOM` }, [about])
  return <main id="contenido" className="i-page">{about ? <AboutPage /> : <ServicesPage />}<MarketingFooter /></main>
}
