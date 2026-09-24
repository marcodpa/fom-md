import { Icono } from '../../panel/Iconos'
import panelResumen from '../../assets/marketing/real/panel-resumen.webp'
import panelMapa from '../../assets/marketing/real/panel-mapa.webp'
import panelFlota from '../../assets/marketing/real/panel-flota.webp'
import panelAlertas from '../../assets/marketing/real/panel-alertas.webp'
import panelReportes from '../../assets/marketing/real/panel-reportes.webp'
import panelSeguridad from '../../assets/marketing/real/panel-seguridad.webp'
import appInicio from '../../assets/marketing/real/app-inicio.webp'
import appInspeccion from '../../assets/marketing/real/app-inspeccion.webp'
import appPerfil from '../../assets/marketing/real/app-perfil.webp'

const screenshots = { resumen:panelResumen, mapa:panelMapa, flota:panelFlota, alertas:panelAlertas, reportes:panelReportes, seguridad:panelSeguridad, inicio:appInicio, inspeccion:appInspeccion, perfil:appPerfil }
const phoneScreens = new Set(['inicio','inspeccion','perfil'])

export function ProductDevice({screen='resumen',kind,priority=false}) {
  const device = kind || (phoneScreens.has(screen) ? 'phone' : 'monitor')
  return <figure className={`s-device s-device-${device}`}>
    <div className="s-device-bezel"><img className="s-screen" src={screenshots[screen]} alt={`Captura real de ${phoneScreens.has(screen)?'la app':'la consola'} FOM: ${screen}. Datos de demostración.`} loading={priority?'eager':'lazy'} decoding="async" width={phoneScreens.has(screen)?390:1440} height={phoneScreens.has(screen)?844:960}/></div>
    {device==='monitor'&&<div className="s-monitor-stand" aria-hidden="true"/>}
    {device==='laptop'&&<div className="s-laptop-keyboard" aria-hidden="true"/>}
  </figure>
}

export default function ScenePhoto({scene,alt='',priority=false,className=''}) {
  const ratio = (scene.ratio||'16 / 10').split('/').map(Number)
  const handWidth = (1672/941)/(ratio[0]/ratio[1])*100
  return <div data-scene={scene.id} className={`s-scene r-art s-${scene.kind||'photo'} ${className}`} style={{aspectRatio:scene.ratio||'16 / 10','--photo-position':scene.position||'center','--device-width':`${Math.min(84,125/(ratio[0]/ratio[1]))}%`}}>
    {scene.kind==='hand' ? <div className="s-hand-canvas" style={{width:`${handWidth}%`}}><img className="s-photo" src={scene.src} alt={alt} loading="lazy" width="1672" height="941"/><img className="s-hand-screen" src={screenshots[scene.screen]} alt={`Captura real de la app FOM: ${scene.screen}. Datos de demostración.`} loading="lazy" width="390" height="844"/></div> : scene.photos ? <div className="s-site-collage">{scene.photos.map((src,i)=><div key={src}><img className="s-photo" src={src} alt={`Vista ilustrativa de ${['Cabimas','Ciudad Ojeda','Lagunillas'][i]}`} loading="lazy"/><span><Icono nombre="pin" tam={20}/>{['Cabimas','Ciudad Ojeda','Lagunillas'][i]}</span></div>)}</div> : scene.src && <img className="s-photo" src={scene.src} alt={scene.alt||alt} loading={priority?'eager':'lazy'} fetchpriority={priority?'high':undefined} decoding="async" width="1672" height="941"/>}
    {scene.screen && scene.kind!=='hand' && <ProductDevice screen={scene.screen} kind={scene.device} priority={priority}/>}
    {scene.kind==='map'&&<div className="s-map-markers" aria-label="Ejemplo de distribución por áreas">{[['Zona norte',27,22],['Almacén',19,53],['Patio central',52,57],['Acceso principal',71,86]].map(([label,x,y])=><span key={label} style={{left:`${x}%`,top:`${y}%`}}><Icono nombre="pin" tam={24}/><b>{label}</b></span>)}</div>}
    {scene.screen&&<small className="s-demo-label">Datos de demostración</small>}
  </div>
}
