import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { screenProjection } from '../lib/screenProjection'
import panel from '../assets/marketing/real/panel-resumen.webp'
import map from '../assets/marketing/real/panel-mapa.webp'
import appHome from '../assets/marketing/real/app-inicio.webp'
import appProfile from '../assets/marketing/real/app-perfil.webp'
import { Icono } from '../panel/Iconos'
import { Brand } from '../components/marketing/MarketingChrome'
import { ContactForm } from '../components/marketing/MarketingSections'
import { PAGES } from '../content/pages'
import '../styles/home-v7.css'

const photos = import.meta.glob('../assets/marketing/home-v7/*.webp', { eager: true, query: '?url', import: 'default' })
const photo = id => photos[`../assets/marketing/home-v7/${id}.webp`]

function Picture({ id, screen, corners, phone = false, priority = false }) {
  const frame = useRef(null)
  useLayoutEffect(() => {
    const el = frame.current
    const resize = () => el.style.setProperty('--photo-scale', el.clientWidth / 1672)
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return <div className={`h7-picture h7-picture-${id}`} ref={frame}>
    <img className="h7-photo" src={photo(id)} width="1672" height="941" alt="" loading={priority ? 'eager' : 'lazy'} fetchpriority={priority ? 'high' : undefined} decoding="async" />
    {screen && <div className={`h7-screen-layer ${id === '03' ? 'h7-operator-screen' : ''}`}><div className={`h7-screen ${phone ? 'h7-screen-phone' : ''}`} style={{ transform: `scale(var(--photo-scale)) matrix3d(${screenProjection(corners).join(',')})` }}>
      <img src={screen} alt={`Captura original ${phone ? 'de la app del conductor' : 'del panel web'} FOM. Datos de demostración.`} width={phone ? 390 : 1430} height={phone ? 844 : 953} loading={priority ? 'eager' : 'lazy'} />
    </div></div>}
  </div>
}

function Arrow() { return <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3 12h17m-7-7 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg> }

function HomeIcon({ name }) {
  const custom = {
    phone: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M10 4h4M11 19h2" /></>,
    cloud: <path d="M7 19a5 5 0 0 1-1-10 6 6 0 0 1 11-3 5 5 0 0 1 0 13Z" />,
    network: <><circle cx="12" cy="5" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="m10.5 8-4 7m7-7 4 7M8 18h8"/></>,
    chart: <><path d="M3 21h18M6 18V9m6 9V3m6 15V6"/></>,
    monitor: <><rect x="2" y="3" width="20" height="14" rx="1"/><path d="M12 17v4m-5 0h10"/></>,
    person: <><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3Z"/></>,
    settings: <><path d="m9 3 1-1h4l1 3 3 1 3 3-1 3 1 3-3 3-3 1-1 3h-4l-1-3-3-1-3-3 1-3-1-3 3-3Z"/><circle cx="12" cy="12" r="3"/></>,
    question: <><circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4m0 3h.01"/></>,
  }
  return custom[name] ? <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{custom[name]}</svg> : <Icono nombre={name} tam={48} />
}

function Features({ items, cards = false }) {
  return <ul className={`h7-features${cards ? ' h7-feature-cards' : ''}`}>{items.map(([icon, title, text]) => <li key={title}><span className="h7-icon"><HomeIcon name={icon}/></span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ul>
}

function Section({ number, id, title, body, items, screen, corners, phone, reverse = false, children, cards = false }) {
  return <section id={id} className={`h7-section h7-s${number}${reverse ? ' h7-reverse' : ''}`} aria-labelledby={`h7-title-${number}`}>
    <Picture id={number} screen={screen} corners={corners} phone={phone}/>
    <div className="h7-shade"/>
    <div className="h7-copy"><h2 id={`h7-title-${number}`}>{title}</h2><p className="h7-lead">{body}</p>{items && <Features items={items} cards={cards}/>} {children}</div>
    {screen && <small className="h7-demo">Datos de demostración</small>}
  </section>
}

function HomeQuestions() {
  const faqs = PAGES.plataforma.faqs
  const question = (item, index) => <details key={item.q} open={index === 0}>
    <summary><span className="h7-icon"><HomeIcon name={['mensaje','gente','chart','escudo'][index]}/></span><span>{item.q}</span><svg className="h7-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18M12 3v18"/></svg></summary>
    <p>{item.a}</p>
  </details>
  return <section id="preguntas" className="h7-section h7-faq" aria-labelledby="h7-faq-title">
    <Picture id="10"/><div className="h7-copy"><span className="h7-rule"/><h2 id="h7-faq-title">Preguntas frecuentes</h2><p className="h7-lead">Resuelve tus dudas principales.</p></div>
    <div className="h7-question-grid"><div>{question(faqs[0],0)}</div><div>{faqs.slice(1).map((item,index)=>question(item,index+1))}</div></div>
    <Link className="h7-all-questions" to="/preguntas-frecuentes">Ver todas las preguntas <Arrow/></Link>
  </section>
}

function HomeFooter() {
  const groups = [
    ['Plataforma',[['monitor','Plataforma web','/plataforma'],['phone','App','/app'],['settings','Funciones','/funciones'],['escudo','Seguridad','/seguridad'],['pin','Áreas','/areas']]],
    ['Información',[['gente','Quiénes somos','/quienes-somos'],['documento','Qué ofrecemos','/que-ofrecemos'],['chart','Beneficios','/beneficios'],['question','Preguntas frecuentes','/preguntas-frecuentes']]],
  ]
  return <footer className="h7-section h7-footer"><Picture id="11"/><div className="h7-footer-content">
    <div className="h7-footer-brand"><Link to="/" aria-label="FOM — inicio"><Brand/></Link><p>La oficina y la carretera, conectadas.</p></div>
    {groups.map(([name,links])=><nav key={name} aria-label={name}><h2>{name}</h2>{links.map(([icon,label,to])=><Link key={to} to={to}><HomeIcon name={icon}/>{label}</Link>)}</nav>)}
    <nav aria-label="Contacto"><h2>Contacto</h2><a href="mailto:contacto@fom.app"><HomeIcon name="mensaje"/>contacto@fom.app</a><Link to="/#contacto">Solicitar una demostración</Link></nav>
    <p className="h7-footer-statement">Flotas que<br/>mantienen<br/>el mundo<br/>en movimiento</p>
  </div><small className="h7-copyright">© {new Date().getFullYear()} FOM. Todos los derechos reservados.</small></footer>
}

export default function HomeV7() {
  useEffect(() => { document.title = 'Tu flota conectada — FOM' }, [])
  return <main id="contenido" className="home-v7">
    <svg width="0" height="0" className="h7-mask-defs" aria-hidden="true"><defs><clipPath id="h7-operator-occlusion" clipPathUnits="objectBoundingBox"><path d="M.222 .198 L.603 .17 L.603 .684 L.321 .66 C.301 .608 .292 .572 .274 .528 C.258 .481 .241 .466 .222 .454 Z"/></clipPath></defs></svg>
    <section className="h7-section h7-hero" aria-labelledby="h7-title">
      <Picture id="01" screen={panel} corners={[[758,150],[1588,185],[1608,705],[750,708]]} priority />
      <div className="h7-shade" />
      <div className="h7-copy">
        <p className="h7-kicker">Flotas que mantienen<br />el mundo en movimiento <span /></p>
        <h1 id="h7-title">Tu flota conectada.<br />Tu operación, bajo control.</h1>
        <p>La oficina y la carretera, en una misma plataforma.</p>
        <Link className="h7-button" to="/#contacto">Solicitar una demostración <Arrow /></Link>
      </div>
      <small className="h7-demo">Datos de demostración</small>
    </section>
    <Section number="02" id="app-en-tu-mano" title={<>Todo ese control.<br/>Ahora en tu mano.</>} body="De la vista completa de tu flota a la unidad que acompaña a tu conductor." screen={appHome} corners={[[910,83],[1247,90],[1208,860],[850,836]]} phone items={[
      ['phone','La misma información','Tu equipo en campo y la oficina siempre alineados.'],['cloud','Datos en tiempo real','Lo que pasa en la ruta, al alcance de tu mano.'],['gente','Una operación conectada','Vehículos, conductores y tareas en un mismo lugar.'],
    ]}/>
    <Section number="03" id="quienes-somos" reverse title="La operación se entiende mejor cuando todos ven lo mismo." body="FOM reúne el trabajo de la oficina y del equipo en campo en una sola plataforma para flotas. Seguimiento, cuidado del vehículo y comunicación forman parte de una misma operación." screen={map} corners={[[373,189],[992,166],[990,637],[373,614]]}>
      <div className="h7-service-cards">{[['camion','Seguimiento','Ubicación, recorridos y estado de cada vehículo.','/plataforma'],['llave','Cuidado','Inspecciones, documentos y mantenimiento.','/funciones'],['chart','Decisiones','Alertas, seguridad y reportes para la operación.','/seguridad']].map(([icon,title,text,to])=><Link key={title} to={to}><HomeIcon name={icon}/><h3>{title}</h3><p>{text}</p></Link>)}</div>
      <p className="h7-connected-note">De la ubicación de una unidad al próximo servicio, la información permanece conectada.</p>
    </Section>
    <Section number="04" id="plataforma" title={<>Toda la operación.<br/>Una sola vista.</>} body="Vehículos, alertas y mantenimiento conectados para decidir con claridad." screen={panel} corners={[[650,110],[1623,75],[1630,788],[634,752]]} items={[
      ['pin','Flota en tiempo real','Ubica tus unidades en el mapa.'],['settings','Estado de la operación','Consulta alertas y pendientes.'],['network','Información integrada','De la ruta al mantenimiento.'],
    ]}/>
    <Section number="05" id="app" reverse title="La operación también viaja con tu equipo." body="FOM DRIVER conecta al conductor con su unidad y con la oficina. Inicio, inspección y perfil en una misma app." screen={appHome} phone corners={[[589,425],[750,438],[710,781],[541,757]]} cards items={[
      ['phone','Inicio','Estado de la unidad en tiempo real.'],['inspeccion','Inspección','Checklist desde la app.'],['person','Perfil','Información y documentos del conductor.'],
    ]}/>
    <Section number="06" id="funciones" title={<>Del primer chequeo<br/>al próximo servicio.</>} body="Un recorrido conectado: revisar, reportar y dar seguimiento." items={[
      ['inspeccion','Inspecciones en campo','Registra condiciones de la unidad.'],['llave','Mantenimiento','Consulta próximos servicios.'],['documento','Historial','Toda la información, siempre disponible.'],
    ]}/>
    <Section number="07" id="seguridad" reverse title="Conducir mejor empieza por entender cada viaje." body="Un índice claro para acompañar al conductor y atender lo que necesita mejorar." screen={appProfile} phone corners={[[390,117],[705,132],[664,860],[315,836]]} items={[
      ['velocidad','Índice de manejo seguro','Evalúa cada viaje.'],['mensaje','Retroalimentación clara','Identifica áreas de mejora.'],['person','Conductores más preparados','Una flota más segura y eficiente.'],
    ]}/>
    <Section number="08" id="areas" title={<>Un mismo control.<br/>Cada zona de tu flota.</>} body="Organiza unidades por área y consulta su ubicación desde la consola." screen={map} corners={[[703,149],[1592,120],[1594,744],[680,708]]} items={[
      ['mas','Zonas','Organiza unidades por área desde la consola.'],['pin','Ubicación','Consulta la ubicación de cada unidad.'],['chart','Operación','Toma decisiones con información en tiempo real.'],
    ]}/>
    <section id="contacto" className="h7-section h7-contact" aria-labelledby="h7-contact-title"><Picture id="09"/><div className="h7-shade"/><div className="h7-copy"><h2 id="h7-contact-title">Hablemos de tu<br/>operación</h2><p className="h7-lead">Cuéntanos cómo trabajas y coordinamos una demostración.</p></div><ContactForm/></section>
    <HomeQuestions/>
    <HomeFooter/>
  </main>
}
