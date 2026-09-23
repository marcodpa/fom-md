import { Link } from 'react-router-dom'
import SectionArt, { sectionDesign, Photo, Crop, Flow } from './SectionArt'
import { DashboardVisual, MobileVisual } from './ProductVisuals'
import oficina from '../../assets/marketing/photos/oficina.webp'
import conductor from '../../assets/marketing/photos/conductor.webp'
import inspeccion from '../../assets/marketing/photos/inspeccion.webp'
import equipo from '../../assets/marketing/photos/demostracion.webp'
import coaching from '../../assets/marketing/photos/coaching.webp'
import instalacion from '../../assets/marketing/photos/instalacion.webp'
import soporte from '../../assets/marketing/photos/soporte.webp'
import ruta from '../../assets/marketing/concepts/07-gps-ruta.webp'
import eventos from '../../assets/marketing/concepts/12-eventos.webp'
import video from '../../assets/marketing/concepts/13-video.webp'
import '../../styles/approved-sections.css'

const SUBTITLES = [
  '', 'Visión general de la operación, sin saltar entre herramientas.',
  'La oficina coordina. El conductor actúa.',
  'Ubica cada unidad y abre su expediente.',
  'Del reporte en campo al historial de la unidad.',
  'Cada persona accede a lo que necesita.',
  'La información de tu operación, organizada y disponible.',
  'Cada recorrido cuenta una historia. Síguela desde un solo lugar.',
  'Conoce el estado del vehículo antes de que una falla lo detenga.',
  'Del primer aviso al trabajo completado.',
  'Convierte los datos de tu flota en decisiones claras.',
  'Lo que requiere atención, a tiempo.',
  'Comprende qué ocurrió en cada maniobra.',
  'Revisa el contexto, no solo el evento.',
  'Conversaciones que ayudan a conducir mejor.',
  'Un índice claro para acompañar al conductor.',
  'Una señal de ayuda, con el contexto para actuar.',
  'Tu flota organizada como trabaja tu empresa.',
  'Define el perímetro. Entiende cada movimiento.',
  'Diferentes sedes. Una misma visión de la operación.',
  'La información correcta, para el equipo responsable.',
  'Conoce la plataforma con las necesidades de tu operación en mente.',
  'Un camino claro, desde la primera conversación.',
  'Hablemos de tu flota y de lo que necesitas resolver.',
  'De la instalación a la primera señal.',
  'Acompañamiento para que tu equipo siga avanzando.',
]

export default function ApprovedSection({ section: s, index, slug }) {
  const { id } = sectionDesign(slug, index)
  const heading = <header className="a-copy"><span className="m-kicker">{slug === 'areas' ? 'Áreas de flota' : slug} · {String(index + 1).padStart(2, '0')}</span><h2 id={`section-title-${id}`}>{s.heading}</h2><p>{SUBTITLES[id]}</p></header>
  const art = <div className="a-art"><SectionArt id={id} /></div>
  const points = <ul className="a-points">{s.bullets.slice(0, 3).map(b => <li key={b.label}>{b.label.replace(/^\d+\.\s*/, '')}</li>)}</ul>
  const photo = (src, alt, cls = '') => <Photo src={src} alt={alt} className={cls} caption={false} />
  let scene
  switch (id) {
    case 1: scene = <>{heading}{art}</>; break
    case 2: scene = <>{heading}<div className="a-connected"><div>{photo(oficina, 'Coordinación de la flota en la oficina')}<DashboardVisual screen="mapa" /><span>Desde la oficina · Planifica y coordina</span></div><b className="a-cloud" aria-label="Información sincronizada">☁</b><div>{photo(conductor, 'Conductor junto a su unidad')}<MobileVisual screen="inicio" /><span>En el vehículo · Registra y consulta</span></div></div></>; break
    case 3: scene = <>{art}<div>{heading}{points}</div></>; break
    case 4: scene = <>{photo(inspeccion, 'Inspección del vehículo antes de salir', 'a-side-photo')}<div>{heading}<div className="a-capture-flow"><MobileVisual screen="inspeccion" /><div><Flow items={['Captura en campo', 'Resguardo sin señal', 'Historial sincronizado']} /></div></div></div></>; break
    case 5: scene = <>{photo(equipo, 'Equipo coordinando la operación', 'a-side-photo')}<div>{heading}{art}</div></>; break
    case 6: scene = <><div>{heading}{points}</div>{art}</>; break
    case 7: scene = <>{heading}<div className="a-road"><Crop src={ruta} box={[20,350,1625,390]} alt="Carretera industrial con recorrido GPS ilustrativo" /><Flow items={['Salida', 'Parada', 'Llegada']} /></div>{points}</>; break
    case 8: scene = <><div>{heading}{points}</div>{art}</>; break
    case 9: scene = <>{photo(inspeccion, 'Revisión de una unidad en campo', 'a-side-photo')}<div>{heading}<div className="a-maintenance"><Flow items={['Programado', 'En taller', 'Completado']} /><MobileVisual screen="mantenimiento" /></div></div></>; break
    case 10: scene = <>{heading}{photo(oficina, 'Supervisión de reportes desde la oficina', 'a-report-photo')}{art}{points}</>; break
    case 11: scene = <><div className="a-alert-scene">{photo(oficina, 'Puesto de coordinación de flota')}<MobileVisual screen="mantenimiento" /></div>{heading}<DashboardVisual screen="alertas" /></>; break
    case 12: scene = <><div className="a-event-road"><Crop src={eventos} box={[200,120,800,420]} alt="Recorrido por una carretera de montaña" /></div>{heading}<DashboardVisual screen="seguridad" /></>; break
    case 13: scene = <><div className="a-video-road"><Crop src={eventos} box={[200,120,800,420]} alt="Vista ilustrativa del recorrido desde la cabina" /><p className="m-caption">Vista de referencia · Evidencia del recorrido</p>{points}</div><div><Crop src={video} box={[1075,95,355,375]} alt="Cámara instalada junto al retrovisor" />{heading}</div></>; break
    case 14: scene = <>{photo(coaching, 'Supervisor y conductor revisando la operación juntos', 'a-backdrop')}<div className="a-overlay-copy">{heading}{points}<Link className="m-text-link" to="/app">Conoce el perfil del conductor ↗</Link></div></>; break
    case 15: scene = <><div className="a-driver-profile">{photo(conductor, 'Conductor consultando información de su unidad')}<MobileVisual screen="perfil" /></div><div>{heading}<div className="v-score-key"><span>Manejo seguro</span><span>Por mejorar</span><span>Requiere atención</span></div>{points}</div></>; break
    case 16: scene = <><div>{heading}<Flow items={['Aviso', 'Ubicación', 'Atención']} /><p className="a-privacy">Información disponible para el equipo autorizado.</p></div><div className="a-sos-scene">{photo(instalacion, 'Interior del vehículo y conexión del equipo')}<MobileVisual screen="inicio" /></div></>; break
    case 17: scene = <>{art}<div>{heading}{points}</div></>; break
    case 18: scene = <>{art}<div className="a-overlay-copy">{heading}{points}</div></>; break
    case 19: scene = <>{heading}{art}{points}</>; break
    case 20: scene = <>{photo(conductor, 'Responsable de área consultando su operación', 'a-side-photo')}<div>{heading}<div className="a-access"><span>ALCANCE DE ACCESO</span>{[['Sede','Ubicación asignada'],['Zona','Área de operación'],['Contrato','Unidades vinculadas'],['Responsable','Supervisor del área']].map(([a,b]) => <div key={a}><b>{a}</b><span>{b}</span></div>)}</div></div></>; break
    case 21: scene = <>{photo(equipo, 'Demostración de la plataforma con un equipo de operaciones', 'a-backdrop')}<DashboardVisual screen="flota" /><div className="a-overlay-copy">{heading}<a href="#solicitud-demo" className="m-button primary">Solicitar una demostración ↗</a></div></>; break
    case 22: scene = <>{heading}{art}<div className="a-journey-notes">{['Cuéntanos tu operación.', 'Recorre las herramientas.', 'Define el alcance.', 'Conecta las unidades.', 'Empieza con tu equipo.'].map(t=><p key={t}>{t}</p>)}</div></>; break
    case 23: scene = <><div>{heading}<div className="a-channels"><a href="mailto:contacto@fom.app"><small>Correo electrónico</small>contacto@fom.app ↗</a><a href="#solicitud-demo"><small>Cuéntanos tu operación</small>Formulario de contacto ↗</a><Link to="/preguntas-frecuentes"><small>Resuelve tus dudas</small>Preguntas frecuentes ↗</Link></div>{photo(oficina, 'Coordinación desde la oficina', 'a-channel-office')}</div>{photo(soporte, 'Especialista atendiendo una consulta', 'a-side-photo')}</>; break
    case 24: scene = <>{photo(instalacion, 'Técnico instalando un dispositivo en la unidad', 'a-install-photo')}<Flow items={['Instalar', 'Verificar señal', 'Activar unidad']} />{heading}</>; break
    case 25: scene = <><div className="a-support-device">{photo(oficina, 'Puesto de trabajo para consultar la plataforma')}<DashboardVisual screen="reportes" /></div><div><MobileVisual screen="inspeccion" />{heading}<div className="a-help-links"><Link to="/preguntas-frecuentes">Centro de ayuda ↗</Link><a href="mailto:contacto@fom.app">Soporte técnico ↗</a><Link to="/app">Conoce la app ↗</Link></div></div></>; break
    default: scene = <>{heading}{art}</>
  }
  return <section className={`a-section a-section-${id}`} id={`detalle-${index}`} aria-labelledby={`section-title-${id}`} data-design={id}>
    <div className="a-scene">{scene}</div>
    <details className="a-detail"><summary>Más sobre {s.heading.toLowerCase()}<span aria-hidden="true">+</span></summary><p>{s.body}</p>{s.stat && <p className="a-stat"><strong>{s.stat.value}</strong> · {s.stat.label}</p>}<div className="v-section-details">{s.bullets.map(b=><article key={b.label}><div><h3>{b.label.replace(/^\d+\.\s*/, '')}</h3><p>{b.text}</p></div></article>)}</div></details>
  </section>
}



