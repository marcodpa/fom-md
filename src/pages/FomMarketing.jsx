import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PAGES } from '../content/pages'
import { Icono } from '../panel/Iconos'
import { MarketingFooter } from '../components/marketing/MarketingChrome'
import ScrollHero from '../components/marketing/ScrollHero'
import { ContactForm } from '../components/marketing/MarketingSections'
import panelResumen from '../assets/marketing/real/panel-resumen.webp'
import panelMapa from '../assets/marketing/real/panel-mapa.webp'
import panelFlota from '../assets/marketing/real/panel-flota.webp'
import panelAlertas from '../assets/marketing/real/panel-alertas.webp'
import panelReportes from '../assets/marketing/real/panel-reportes.webp'
import panelSeguridad from '../assets/marketing/real/panel-seguridad.webp'
import appInicio from '../assets/marketing/real/app-inicio.webp'
import appInspeccion from '../assets/marketing/real/app-inspeccion.webp'
import appMantenimiento from '../assets/marketing/real/app-mantenimiento.webp'
import appPerfil from '../assets/marketing/real/app-perfil.webp'
import road from '../assets/marketing/v6/road.webp'
import office from '../assets/marketing/v6/office.webp'
import fleet from '../assets/marketing/v6/fleet.webp'
import camera from '../assets/marketing/v6/camera.webp'
import conductor from '../assets/marketing/photos/conductor.webp'
import inspection from '../assets/marketing/photos/inspeccion.webp'
import installation from '../assets/marketing/photos/instalacion.webp'
import coaching from '../assets/marketing/photos/coaching.webp'
import support from '../assets/marketing/photos/soporte.webp'
import team from '../assets/marketing/photos/demostracion.webp'
import yard from '../assets/marketing/v6/yard.webp'

const SHOTS = { resumen:panelResumen, mapa:panelMapa, flota:panelFlota, alertas:panelAlertas, reportes:panelReportes, seguridad:panelSeguridad, inicio:appInicio, inspeccion:appInspeccion, mantenimiento:appMantenimiento, perfil:appPerfil }
const PHONES = new Set(['inicio','inspeccion','mantenimiento','perfil'])
const LABELS = { plataforma:'Plataforma web', funciones:'Funciones', seguridad:'Seguridad', areas:'Áreas de flota', contacto:'Contacto' }
const ICONS = ['pin','camion','inspeccion','llave','gente']
const BENEFITS = [
  ['Visibilidad de la operación','Consulta ubicación, estado y responsable de cada unidad desde una misma vista.','flota',office,'/plataforma'],
  ['Cuidado de cada vehículo','Reúne inspecciones, hallazgos y órdenes de mantenimiento para dar seguimiento a lo que necesita cada unidad.','inspeccion',inspection,'/funciones#detalle-2'],
  ['Comunicación desde el campo','El conductor registra información desde su teléfono y la oficina la consulta en la plataforma.','inicio',conductor,'/app'],
  ['Atención a las alertas','Encuentra los avisos que requieren revisión y consulta el contexto de los eventos.','alertas',office,'/seguridad'],
  ['Organización por áreas','Agrupa unidades por zona, sede o contrato para consultar la parte de la flota que te corresponde.','mapa',yard,'/areas'],
  ['Información para decidir','Consulta reportes e historial para revisar la operación y planificar los siguientes pasos.','reportes',office,'/funciones#detalle-3'],
]
const SERVICES = [
  ['Ubicación y recorridos','Consulta dónde están las unidades y revisa sus trayectos desde el centro de control.','mapa',road,'/funciones#detalle-0'],
  ['Inspecciones y mantenimiento','El conductor revisa la unidad desde la app; la oficina consulta hallazgos y da seguimiento al servicio.','inspeccion',inspection,'/funciones#detalle-2'],
  ['Alertas, seguridad y reportes','Los avisos y los datos de la flota ayudan a priorizar lo que requiere atención y a entender cada recorrido.','alertas',office,'/seguridad'],
]
const SCENES = {
  plataforma:[['resumen',office],['inicio',conductor],['mapa',null],[null,road],[null,team],['resumen',office]],
  funciones:[['mapa',road],['inicio',fleet],['mantenimiento',inspection],['reportes',office],['alertas',office]],
  seguridad:[['seguridad',road],[null,camera],[null,coaching],['perfil',conductor],['seguridad',installation]],
  areas:[['flota',office],['mapa',yard],[null,yard],['flota',conductor]],
  contacto:[['resumen',office],[null,road],[null,support],[null,installation],[null,fleet]],
}
function Button({to='/contacto#solicitud-demo',children='Solicitar una demostración',outline=false}) { return <Link className={`f-button${outline?' f-button-outline':''}`} to={to}>{children}<span aria-hidden="true">↗</span></Link> }
function Screen({name='resumen',priority=false}) {
  const phone=PHONES.has(name)
  return <figure className={`f-device ${phone?'f-phone':'f-monitor'}`}><div className="f-device-frame"><img src={SHOTS[name]} width={phone?390:1440} height={phone?844:960} loading={priority?'eager':'lazy'} fetchpriority={priority?'high':undefined} decoding="async" alt={`Captura original de ${phone?'la app':'el panel'} FOM: ${name}. Datos de demostración.`}/></div>{!phone&&<div className="f-monitor-foot" aria-hidden="true"/>}<figcaption>Datos de demostración · {phone?'App':'Panel'} actual</figcaption></figure>
}
function Media({shot,photo,priority=false,alt='Imagen ilustrativa de la operación de flota'}) {
  return <div className={`f-media${shot?' has-device':''}${PHONES.has(shot)?' has-phone':''}${!photo?' product-only':''}`}>
    {photo&&<img className="f-photo" src={photo} alt={alt} width="1672" height="941" loading={priority?'eager':'lazy'} decoding="async"/>}
    {shot&&<Screen name={shot} priority={priority}/>}</div>
}
function Hero({title,body,shot,photo=office,children,wide=false}) {
  return <header className={`f-hero${wide?' f-hero-wide':''}`} style={{'--scene':`url("${photo}")`}}><div className="f-hero-inner"><div className="f-copy"><h1>{title}</h1><p>{body}</p>{children||<Button/>}</div>{shot&&<Media shot={shot} priority/>}</div></header>
}
function Facts({items=[]}) { return <ul className="f-facts">{items.map((b,i)=><li key={b.label}><Icono nombre={ICONS[i%ICONS.length]} tam={25}/><div><h3>{b.label.replace(/^\d+\.\s*/,'')}</h3><p>{b.text}</p></div></li>)}</ul> }
function Section({title,body,shot,photo,reverse=false,children,id,mode=''}) {
  return <section id={id} className={`f-section ${reverse?'f-reverse':''} ${mode}`}><div className="f-section-inner"><div className="f-copy"><h2>{title}</h2><p>{body}</p>{children}</div><Media shot={shot} photo={photo}/></div></section>
}
function CTA({title='Conoce FOM con tu equipo.',body='Recorre la plataforma y encuentra las herramientas para tu operación.'}) {return <section className="f-cta" style={{'--scene':`url("${road}")`}}><div><h2>{title}</h2><p>{body}</p><Button/></div></section>}
function FAQs({items,title='Preguntas frecuentes',link=true}) {return <section className="f-faq"><div className="f-faq-head"><h2>{title}</h2>{link&&<Link to="/preguntas-frecuentes">Todas las preguntas <span aria-hidden="true">↗</span></Link>}</div><div>{items.map(f=><details key={f.q}><summary>{f.q}<span aria-hidden="true">+</span></summary><p>{f.a}</p></details>)}</div></section>}
function ProductPage({slug}) {
  const p=PAGES[slug]
  const heroShot={plataforma:'resumen',seguridad:'seguridad',contacto:'resumen'}[slug]
  const heroPhoto=slug==='areas'?fleet:slug==='funciones'?road:office
  return <><Hero title={p.title} body={p.subtitle} shot={heroShot} photo={heroPhoto} wide={slug==='areas'||slug==='funciones'}/>
    {p.sections.map((s,i)=>{
      const [shot,photo]=SCENES[slug][i]
      if(slug==='contacto'&&i===0)return <section className="f-contact f-section" id="detalle-0" key={s.heading}><div className="f-copy"><h2>{s.heading}</h2><p>{s.body}</p><Facts items={s.bullets}/><Stat stat={s.stat}/></div><ContactForm/></section>
      if(slug==='contacto'&&i===1)return <section className="f-process" id="detalle-1" key={s.heading} style={{'--scene':`url("${road}")`}}><h2>{s.heading}</h2><p>{s.body}</p><ol>{s.bullets.map((b,j)=><li key={b.label}><span>{j+1}</span><h3>{b.label.replace(/^\d+\.\s*/,'')}</h3><p>{b.text}</p></li>)}</ol></section>
      return <Section key={s.heading} id={`detalle-${i}`} title={s.heading} body={s.body} shot={shot} photo={photo} reverse={slug === 'funciones' ? i%2===0 : i%2===1} mode={`f-${slug}-${i}`}><Facts items={s.bullets}/><Stat stat={s.stat}/>{slug==='contacto'&&i===2&&<a className="f-text-link" href="mailto:contacto@fom.app">contacto@fom.app ↗</a>}</Section>
    })}<FAQs items={p.faqs}/>{slug!=='contacto'&&<CTA/>}</>
}
function Stat({stat}) { return stat?<div className="f-stat"><strong>{stat.value}</strong><span>{stat.label}</span></div>:null }
function AppPage(){return <><Hero title="Tu unidad y tu jornada, en tu teléfono." body="Consulta el estado del vehículo, realiza la inspección y revisa tu perfil desde la app que acompaña al conductor." shot="inicio" photo={fleet}/>
  <Section title="Una inspección que queda registrada." body="Revisa los puntos de la unidad y registra su condición desde el teléfono. La información permite dar seguimiento a los hallazgos desde la oficina." shot="inspeccion" photo={inspection}><Facts items={[{label:'Lista de revisión por vehículo.',text:''},{label:'Registro de observaciones y fallas.',text:''},{label:'Historial disponible para la operación.',text:''}]}/></Section>
  <Section title="El estado de tu unidad, a mano." body="Desde Inicio, el conductor consulta la información de su vehículo y encuentra accesos a inspecciones, mantenimiento y alertas." shot="mantenimiento" photo={road} reverse><Button to="/funciones" outline>Explorar las funciones</Button></Section>
  <Section title="Conoce tu índice de manejo." body="Consulta tus datos, documentos y el índice de conducción. Sus indicadores ayudan a entender qué aspectos del manejo requieren atención." shot="perfil" photo={conductor}><Button to="/seguridad" outline>Conocer las herramientas de seguridad</Button></Section>
  <CTA title="La oficina y el conductor, conectados." body="Conoce el panel web y la app con una demostración de FOM."/></>}
function BenefitsPage(){return <><Hero title="Más claridad para cada decisión de tu flota." body="FOM conecta el trabajo de campo con la oficina para que la información sirva al seguimiento diario de la operación." photo={fleet} wide/>{BENEFITS.map(([title,body,shot,photo,to],i)=><Section key={title} {...{title,body,shot,photo}} reverse={i%2===0}><Button to={to} outline>Conocer más</Button></Section>)}<CTA title="Encuentra las herramientas para tu operación." body="Conoce el panel web y la app con una demostración de FOM."/></>}
function ServicesPage(){return <><Hero title="Una plataforma para seguir, cuidar y entender tu flota." body="Herramientas conectadas para el trabajo diario, desde el panel de control hasta la app del conductor." shot="resumen"/>{SERVICES.map(([title,body,shot,photo,to],i)=><Section key={title} id={`servicio-0${i+1}`} {...{title,body,shot,photo}} reverse={i%2===0}><Button to={to} outline>Explorar el servicio</Button></Section>)}<CTA title="Ve cómo encaja FOM con tu operación." body="Revisamos tu flota y te mostramos el panel y la app en una demostración."/></>}
function AboutPage(){return <><Hero title="Una forma más clara de cuidar y coordinar tu flota." body="FOM es una plataforma para conectar a las personas, los vehículos y la información de una operación en movimiento." shot="resumen"><Button to="/que-ofrecemos">Conoce lo que ofrecemos</Button></Hero>
  <Section title="La oficina y la carretera, conectadas." body="Una flota genera decisiones a cada momento: dónde está una unidad, qué necesita para salir y qué ocurrió en el camino. FOM reúne esas respuestas en el panel web y en la app del conductor." shot="inicio" photo={conductor}><p>El objetivo es que cada persona encuentre la información que necesita para actuar: supervisores desde la consola y conductores desde su teléfono.</p></Section>
  <Section title="De cada dato a una acción concreta." body="Los recorridos, las alertas, las inspecciones y el mantenimiento comparten una misma vista de la operación. Así es más sencillo revisar lo que pasa y dar seguimiento sin perder el contexto." photo={road} reverse><Button to="/plataforma" outline>Ver la plataforma web</Button></Section>
  <div className="f-principles">{[['Conectar','Vehículos, conductores y responsables en un mismo flujo.',road],['Entender','Ubicación, historial y estado claros para cada rol.',yard],['Actuar','Alertas e inspecciones que permiten atender lo importante.',inspection]].map(([title,body,photo])=><article key={title}><h2>{title}</h2><p>{body}</p><img src={photo} alt="Imagen ilustrativa de operaciones" loading="lazy" width="1672" height="941"/></article>)}</div><CTA title="Conoce la operación detrás de cada pantalla." body="Hablemos de tu flota."/></>}
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
function HelpPage(){const [search,setSearch]=useState('');const [topic,setTopic]=useState('');const groups=Object.entries(PAGES).map(([slug,p])=>({slug,items:p.faqs.filter(f=>(!topic||slug===topic)&&normalize(f.q+' '+f.a).includes(normalize(search)))}));const count=groups.reduce((n,g)=>n+g.items.length,0)
 return <><Hero title="Preguntas frecuentes." body="Explora las preguntas sobre la plataforma, las funciones y la puesta en marcha." shot="resumen"><a className="f-button" href="#preguntas">Explorar preguntas <span aria-hidden="true">↓</span></a></Hero><section className="f-help" id="preguntas"><aside><label htmlFor="faq-search">Buscar preguntas</label><input id="faq-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="GPS, mantenimiento, roles…"/><nav aria-label="Temas de preguntas">{[['','Todos los temas'],...Object.entries(LABELS)].map(([key,label])=><button key={key} aria-pressed={topic===key} onClick={()=>setTopic(key)}>{label}</button>)}</nav><p role="status">{count} {count===1?'pregunta':'preguntas'}</p></aside><div>{groups.filter(g=>g.items.length).map(g=><FAQs key={g.slug} title={LABELS[g.slug]} items={g.items} link={false}/>)}{!count&&<div className="f-empty"><h2>No encontramos esa pregunta.</h2><p>Prueba con otra palabra o consulta todos los temas.</p><button className="f-button" onClick={()=>{setSearch('');setTopic('')}}>Ver todas las preguntas</button></div>}</div></section><CTA title="¿Aún tienes preguntas?"/></>}
function Home(){return <><ScrollHero/>
  <Section id="quienes-somos" title="La operación se entiende mejor cuando todos ven lo mismo." body="FOM reúne el trabajo de la oficina y del equipo en campo en una sola plataforma para flotas. Seguimiento, cuidado del vehículo y comunicación forman parte de una misma operación." shot="mapa" photo={office} reverse><Button to="/quienes-somos" outline>Conoce FOM</Button></Section>
  <section className="f-home-services" id="servicios"><div><h2>Herramientas para cada momento de la flota.</h2><p>De la ubicación de una unidad al próximo servicio, la información permanece conectada.</p></div><div className="f-service-list">{[['Seguimiento','Ubicación, recorridos y estado de cada vehículo.','pin'],['Cuidado','Inspecciones, documentos y mantenimiento.','llave'],['Decisiones','Alertas, seguridad y reportes para la operación.','resumen']].map(([h,p,icon])=><article key={h}><Icono nombre={icon} tam={32}/><h3>{h}</h3><p>{p}</p></article>)}</div><Button to="/que-ofrecemos" outline>Ver todo lo que ofrecemos</Button></section>
  <Section id="plataforma" title="Toda la operación. Una sola vista." body="Vehículos, alertas y mantenimiento conectados para decidir con claridad." shot="resumen" photo={office}><Button to="/plataforma">Conocer la plataforma web</Button></Section>
  <Section id="app" title="La operación también viaja con tu equipo." body="FOM DRIVER conecta al conductor con su unidad y con la oficina. Inicio, inspección y perfil en una misma app." shot="inicio" photo={conductor} reverse><Button to="/app" outline>Conocer la app</Button></Section>
  <Section id="funciones" title="Del primer chequeo al próximo servicio." body="Un recorrido conectado: revisar, reportar y dar seguimiento." shot="inspeccion" photo={inspection}><Button to="/funciones" outline>Explorar funciones</Button></Section>
  <Section id="seguridad" title="Conducir mejor empieza por entender cada viaje." body="Un índice claro para acompañar al conductor y atender lo que necesita mejorar." shot="perfil" photo={conductor} reverse><Button to="/seguridad" outline>Conocer seguridad</Button></Section>
  <Section id="areas" title="Un mismo control. Cada zona de tu flota." body="Organiza unidades por área y consulta su ubicación desde la consola." shot="mapa" photo={yard}><Button to="/areas" outline>Ver áreas de flota</Button></Section>
  <Section id="beneficios" title="Cuidar a la gente. Ordenar la operación." body="Información clara para actuar a tiempo y acompañar a tu equipo." photo={coaching} reverse><Button to="/beneficios" outline>Conocer los beneficios</Button></Section>
  <section className="f-contact f-home-contact" id="contacto"><div className="f-copy"><h2>Hablemos de tu operación</h2><p>Cuéntanos cómo trabajas y coordinamos una demostración.</p><a href="mailto:contacto@fom.app" className="f-text-link">contacto@fom.app ↗</a></div><ContactForm/></section><FAQs items={PAGES.plataforma.faqs}/></>}
const EXTRA={app:AppPage,beneficios:BenefitsPage,'quienes-somos':AboutPage,'que-ofrecemos':ServicesPage,'preguntas-frecuentes':HelpPage}
export default function FomMarketing(){const {pathname}=useLocation();const slug=pathname.slice(1);const Page=EXTRA[slug];useEffect(()=>{document.title=`${slug?(LABELS[slug]||({app:'App del conductor',beneficios:'Beneficios','quienes-somos':'Quiénes somos','que-ofrecemos':'Qué ofrecemos','preguntas-frecuentes':'Preguntas frecuentes'}[slug])||'Página no encontrada'):'Tu flota conectada'} — FOM`},[slug]);return <main id="contenido" className={`fom-site f-route-${slug||'inicio'}`} key={slug}>{!slug?<Home/>:PAGES[slug]?<ProductPage slug={slug}/>:Page?<Page/>:<Hero title="Esta ruta no está en el mapa." body="Vuelve al inicio para conocer la plataforma."><Button to="/">Ir al inicio</Button></Hero>}<MarketingFooter/></main>}

