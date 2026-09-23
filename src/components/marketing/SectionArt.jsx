import { Link } from 'react-router-dom'
import { DashboardVisual, MobileVisual } from './ProductVisuals'
import patio from '../../assets/marketing/areas-patio-v3.png'
import oficina from '../../assets/marketing/photos/oficina.webp'
import coaching from '../../assets/marketing/photos/coaching.webp'
import inspeccion from '../../assets/marketing/photos/inspeccion.webp'
import demostracion from '../../assets/marketing/photos/demostracion.webp'
import instalacion from '../../assets/marketing/photos/instalacion.webp'
import soporte from '../../assets/marketing/photos/soporte.webp'
import conductor from '../../assets/marketing/photos/conductor.webp'
import servidores from '../../assets/marketing/concepts/06-datos-escala.webp'
import ruta from '../../assets/marketing/concepts/07-gps-ruta.webp'
import diagnostico from '../../assets/marketing/concepts/08-diagnostico.webp'
import eventos from '../../assets/marketing/concepts/12-eventos.webp'
import video from '../../assets/marketing/concepts/13-video.webp'
import grupos from '../../assets/marketing/concepts/17-grupos.webp'
import sedes from '../../assets/marketing/concepts/19-multisitio.webp'

const PHOTO_NOTE = 'Imagen ilustrativa'
export function Photo({ src, alt, className = '', caption = PHOTO_NOTE }) {
  return <figure className={`v-photo ${className}`}><img src={src} alt={alt} loading="lazy" decoding="async" width="1672" height="941" />{caption && <figcaption>{caption}</figcaption>}</figure>
}
// Crop the approved artwork in layout, keeping its source intact. Text stays in HTML.
export function Crop({ src, box, alt, className = '' }) {
  const [x, y, w, h] = box
  return <div className={`v-crop ${className}`} style={{ aspectRatio: `${w} / ${h}` }}><svg viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={alt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}><image href={src} width="1672" height="941" /></svg></div>
}
export function Flow({ items, label = 'Flujo de trabajo' }) {
  return <ol className="v-flow" aria-label={label}>{items.map((item, i) => <li key={item}><span>{String(i + 1).padStart(2, '0')}</span><b>{item}</b></li>)}</ol>
}
function Roles() {
  return <div className="v-roles"><div className="v-role-head"><span>ACCESOS</span><b>Un equipo.<br />Distintas responsabilidades.</b></div><div className="v-role-table"><table><caption>Ejemplo de distribución de responsabilidades</caption><thead><tr><th>Operación</th><th>Administrador</th><th>Supervisor</th><th>Conductor</th></tr></thead><tbody>{[['Flota','Gestiona','Supervisa','Su unidad'],['Inspecciones','Consulta','Revisa','Completa'],['Mantenimiento','Organiza','Coordina','Reporta']].map(row => <tr key={row[0]}>{row.map((v,i)=>i ? <td key={v}>{v}</td> : <th scope="row" key={v}>{v}</th>)}</tr>)}</tbody></table></div></div>
}
function Groups() {
  return <div className="v-groups"><div className="v-vehicle-row">{[[42,'Camioneta'],[330,'Camión'],[626,'Cisterna']].map(([x,title])=><figure key={title}><Crop src={grupos} box={[x,130,270,205]} alt={title} /><figcaption>{title}</figcaption></figure>)}</div><div className="v-connector" aria-hidden="true" /><div className="v-group-labels">{['Zona','Sede','Contrato'].map(s=><span key={s}>{s}</span>)}</div><p className="m-caption">Organiza las unidades según tu operación.</p></div>
}
function Sites() {
  return <div className="v-sites">{[[0,'Cabimas','Distribución urbana'],[560,'Ciudad Ojeda','Operación en campo'],[1120,'Lagunillas','Almacén y despacho']].map(([x,label,sub])=><figure key={label}><Crop src={sedes} box={[x,307,550,335]} alt={`Entorno ilustrativo de ${sub.toLowerCase()}`} /><figcaption><b>{label}</b><span>{sub}</span></figcaption></figure>)}<p className="m-caption">Escenarios ilustrativos de operación.</p></div>
}
function Scope() {
  return <div className="v-scope"><Photo src={conductor} alt="Responsable de patio consultando una tableta" /><div className="v-scope-list"><span>ACCESO POR ÁREA</span>{[['Sede','Cabimas'],['Zona','Patio de distribución'],['Contrato','Operación asignada'],['Responsable','Supervisor de área']].map(([a,b])=><div key={a}><small>{a}</small><b>{b}</b></div>)}<p className="m-caption">Ejemplo de alcance de acceso.</p></div></div>
}
function Journey() {
  const steps=[['Contacto',soporte],['Demo',demostracion],['Propuesta',oficina],['Instalación',instalacion],['Arranque',inspeccion]]
  return <ol className="v-journey">{steps.map(([label,src],i)=><li key={label}><Photo src={src} alt={`${label} de FOM`} caption={false}/><span>{String(i+1).padStart(2,'0')}</span><b>{label}</b></li>)}</ol>
}
const IDS = { plataforma: [1,2,3,4,5,6], funciones: [7,8,9,10,11], seguridad: [12,13,14,15,16], areas: [17,18,19,20], contacto: [21,22,23,24,25] }
export function sectionDesign(slug,index) {
  const id=IDS[slug][index]
  return { id, layout: [1,5,10,19,22].includes(id) ? 'wide' : [3,9,13,17,25].includes(id) ? 'reverse' : [14,21,24].includes(id) ? 'photo' : 'split' }
}
export default function SectionArt({ id }) {
  switch(id) {
    case 1: return <div className="v-monitor"><DashboardVisual /></div>
    case 2: return <div className="v-office"><Photo src={oficina} alt="Coordinación de la flota desde la oficina" /><MobileVisual screen="perfil" /><div className="v-office-labels"><span>Desde la oficina</span><span>En el vehículo</span></div></div>
    case 3: return <DashboardVisual screen="mapa" />
    case 4: return <div className="v-capture"><Photo src={inspeccion} alt="Inspección de una llanta antes de salir" /><Flow items={['Captura','Sincronización','Historial']} /><MobileVisual screen="inspeccion" /></div>
    case 5: return <Roles />
    case 6: return <div><Crop src={servidores} box={[810,80,850,755]} alt="Detalle ilustrativo de equipos de almacenamiento" /><Flow items={['Accesos','Respaldo','Historial']} /></div>
    case 7: return <div><Crop src={ruta} box={[20,350,1625,390]} alt="Vehículo en una carretera industrial con recorrido GPS ilustrativo" /><Flow items={['Salida','Parada','Llegada']} /></div>
    case 8: return <div><Crop src={diagnostico} box={[580,100,1090,740]} alt="Ilustración técnica de una camioneta con motor, batería y odómetro" /><p className="m-caption">Ilustración técnica · Lecturas de ejemplo.</p></div>
    case 9: return <div className="v-service"><Photo src={inspeccion} alt="Revisión de una camioneta en el patio" /><MobileVisual screen="mantenimiento" /><Flow items={['Programado','En taller','Completado']} /></div>
    case 10: return <div className="v-report"><DashboardVisual screen="reportes" /><div className="v-report-files"><span>Reportes de operación</span><b>PDF</b><b>Excel</b></div></div>
    case 11: return <div className="v-alerts"><MobileVisual screen="mantenimiento" /><DashboardVisual screen="alertas" /></div>
    case 12: return <div><Crop src={eventos} box={[200,120,800,420]} alt="Vista de una carretera desde el vehículo" /><DashboardVisual screen="seguridad" /></div>
    case 13: return <div className="v-video"><Crop src={video} box={[1075,95,355,375]} alt="Cámara instalada junto al retrovisor" /><div><span className="m-kicker">CONTEXTO DEL RECORRIDO</span><h3>Antes, durante<br />y después del evento.</h3><p>Revisa la evidencia disponible y comprende lo que ocurrió.</p></div></div>
    case 14: return <Photo src={coaching} alt="Supervisor y conductor revisando juntos una tableta junto a su unidad" />
    case 15: return <div className="v-profile"><MobileVisual screen="perfil" /><div><span className="m-kicker">PERFIL DEL CONDUCTOR</span><h3>Un índice.<br />Una conversación clara.</h3><div className="v-score-key"><span>Seguro</span><span>Por mejorar</span><span>Atención</span></div><p>Consulta los eventos que influyen en el manejo.</p></div></div>
    case 16: return <div className="v-sos"><DashboardVisual screen="seguridad" /><Flow items={['Aviso','Ubicación','Atención']} /><p className="m-caption">Atención desde la consola · Acceso autorizado.</p></div>
    case 17: return <Groups />
    case 18: return <div className="v-geofence"><Photo src={patio} alt="Patio logístico con todas las unidades sobre pavimento" /><svg viewBox="0 0 1000 563" aria-hidden="true"><path d="M220 140 780 115 875 420 200 460Z" fill="#3d9bf529" stroke="#65baff" strokeWidth="3" strokeDasharray="8 7" /></svg><div className="v-geofence-label">Zona de operación</div><p className="m-caption">Geocerca ilustrativa · Delimita el área y consulta sus movimientos.</p></div>
    case 19: return <Sites />
    case 20: return <Scope />
    case 21: return <div className="v-demo"><Photo src={demostracion} alt="Equipo revisando una demostración de la plataforma" /><DashboardVisual screen="flota" /></div>
    case 22: return <Journey />
    case 23: return <div className="v-contact-channels"><Photo src={soporte} alt="Especialista de soporte atendiendo una consulta" /><a href="mailto:contacto@fom.app">contacto@fom.app ↗</a><a href="#solicitud-demo">Formulario de contacto ↗</a></div>
    case 24: return <div><Photo src={instalacion} alt="Técnico instalando un dispositivo GPS en una unidad" /><Flow items={['Instalar','Verificar señal','Activar unidad']} /></div>
    case 25: return <div className="v-help"><MobileVisual screen="inspeccion" /><div><span className="m-kicker">ACOMPAÑAMIENTO</span><h3>Resuelve.<br />Aprende.<br />Continúa.</h3><Link to="/preguntas-frecuentes">Centro de ayuda ↗</Link><a href="mailto:contacto@fom.app">Soporte técnico ↗</a></div></div>
    default: return null
  }
}
