import '../../styles/marketing-sections.css'
import appInicio from '../../assets/marketing/real/app-inicio.webp'
import appInspeccion from '../../assets/marketing/real/app-inspeccion.webp'
import appMantenimiento from '../../assets/marketing/real/app-mantenimiento.webp'
import appPerfil from '../../assets/marketing/real/app-perfil.webp'
import panelResumen from '../../assets/marketing/real/panel-resumen.webp'
import panelMapa from '../../assets/marketing/real/panel-mapa.webp'
import panelAlertas from '../../assets/marketing/real/panel-alertas.webp'
import panelReportes from '../../assets/marketing/real/panel-reportes.webp'
import panelSeguridad from '../../assets/marketing/real/panel-seguridad.webp'
import panelFlota from '../../assets/marketing/real/panel-flota.webp'
import mapa from '../../assets/marketing/areas-patio-v3.png'

const PANEL_SCREENS = { resumen: [panelResumen, 'Resumen'], mapa: [panelMapa, 'Centro de control'], alertas: [panelAlertas, 'Alertas'], reportes: [panelReportes, 'Reportes'], seguridad: [panelSeguridad, 'Eventos y SOS'], flota: [panelFlota, 'Vehículos'] }
export function DashboardVisual({ className = '', screen = 'resumen' }) {
  const [src, title] = PANEL_SCREENS[screen] || PANEL_SCREENS.resumen
  return <figure className={`m-dashboard ${className}`}><div className="m-browser"><span>● ● ●</span><span>FOM · {title}</span><span>Demostración</span></div><img src={src} alt={`${title}: captura del panel FOM actual con datos de demostración`} width="1440" height="960" loading="lazy" decoding="async" /><figcaption>{title} · Panel actual · Datos de demostración</figcaption></figure>
}

export const SCORE_STATES = [
  { score: 94, color: '#3dd68c', label: 'Manejo seguro', delta: '+4', events: [.2, .1, .3] },
  { score: 76, color: '#f5c242', label: 'Puedes mejorar', delta: '-3', events: [1.6, .8, 1.1] },
  { score: 48, color: '#ff6369', label: 'Requiere atención', delta: '-8', events: [2.8, 2.2, 1.7] },
]
export function ScoreCard({ state = SCORE_STATES[0] }) {
  const c = 2 * Math.PI * 47
  return <article className={`m-score${state.score < 85 ? ' warning' : ''}`} style={{ '--score-color': state.color }} aria-label={`Índice de manejo: ${state.score} de 100, ${state.label}`}>
    <div className="m-score-top"><div className="m-score-ring"><svg viewBox="0 0 108 108" aria-hidden="true"><circle cx="54" cy="54" r="47" fill="none" stroke="#0f141b" strokeWidth="9" /><circle cx="54" cy="54" r="47" fill="none" stroke={state.color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - state.score / 100)} transform="rotate(-90 54 54)" /></svg><div><b>{state.score}</b><small>/ 100</small></div></div><div><span className="m-score-label">Índice de manejo</span><h3>{state.label}</h3><p className="m-score-trend"><b className={state.score < 85 ? 'negative' : ''}>{state.delta}</b> vs. semana pasada</p></div></div>
    <div className="m-score-period"><span>Eventos por 100 km</span><span>Últimos 30 días</span></div>
    {state.events.map((v, i) => <div className="m-score-event" key={i}><div><span>{['Excesos de velocidad', 'Frenadas bruscas', 'Aceleraciones bruscas'][i]}</span><b>{v.toFixed(1)} <small>/100km</small></b></div><div className="m-score-track"><i style={{ width: `${Math.max(4, v / 3 * 100)}%`, background: v >= 2 ? '#ff6369' : v >= 1 ? '#f5c242' : '#69727e' }} /></div></div>)}
  </article>
}

const APP_SCREENS = { inicio: [appInicio, 'Inicio'], inspeccion: [appInspeccion, 'Inspección'], mantenimiento: [appMantenimiento, 'Mantenimiento'], perfil: [appPerfil, 'Perfil'] }
export function MobileVisual({ screen = 'inicio', caption = true }) {
  const [src, title] = APP_SCREENS[screen] || APP_SCREENS.inicio
  return <figure className="m-mobile"><div className="m-real-phone"><img src={src} alt={`${title} de FOM Driver: captura de la app actual con datos de demostración`} width="390" height="844" loading="lazy" decoding="async" /></div>{caption && <figcaption>{title} · App actual · Datos de demostración</figcaption>}</figure>
}
export function MapVisual() {
  return <figure className="m-map-visual"><div className="m-map-crop"><img src={mapa} alt="Patio logístico con camionetas y camiones estacionados en zonas pavimentadas" loading="lazy" width="1672" height="941" /></div><figcaption>Áreas de operación · Imagen ilustrativa</figcaption></figure>
}
