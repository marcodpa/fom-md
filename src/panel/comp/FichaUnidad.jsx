import { Link } from 'react-router-dom'
import { nombreUnidad } from '../datos/nombreUnidad'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'
import { estadoUnidad } from '../datos/estadoUnidad'
import { soloRecepcion, textoUltimoReporte, useMinuto } from '../datos/sinSenal'
import FotoUnidad from './FotoUnidad'
import { PastillaConductor } from './ManejoConductor'
import { useSesion } from '../useSesion'
import { esGestor } from '../roles'
import { locationStatus } from '../meitrack/location-status.js'
import '../../styles/fleet-map.css'
export { estadoUnidad } from '../datos/estadoUnidad'

/** Filas de datos: se descartan las que no tienen valor. */
function datosDe(v, s) {
  const filas = [
    ['Combustible', v.combustiblePct == null ? null : `${v.combustiblePct}%`],
    ['Aceite', v.aceitePct == null ? null : `${v.aceitePct}%`],
    ['Última señal', s.ultimoReporte ? s.hace : null],
    // El encendido es un detalle, no un estado: solo con señal al día y con velocidad, donde
    // las dos cosas juntas cuentan algo (un motor encendido a 0 km/h es ralentí).
    ['Motor', v.ignition == null || s.velocidadKmh == null ? null : v.ignition ? 'Encendido' : 'Apagado'],
    ['Velocidad', s.velocidadKmh == null ? null : f.velocidad(s.velocidadKmh)],
    ['Odómetro', v.km == null ? null : f.km(v.km)],
    ['Conductor', v.conductorNombre && v.conductorNombre !== 'Sin asignar' ? v.conductorNombre : null],
    ['Área', v.areaNombre && v.areaNombre !== 'Sin área' ? v.areaNombre : null],
    ['Ubicación', v.ubicacionTexto || null],
    ['Temperatura', v.tempMotorC == null ? null : `${v.tempMotorC} °C`],
    ['Índice de manejo', v.indiceSeguro == null ? null : f.numero(v.indiceSeguro)],
    ['IMEI del equipo', v.gps?.imei || null],
    [
      'Coordenadas',
      v.lat != null && v.lng != null ? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}` : null,
    ],
  ]
  return filas.filter(([, valor]) => valor != null && valor !== '')
}

export default function FichaUnidad({ unidad, variante = 'panel', conCabecera = true, alCerrar, conEnlace = true, alVerRecorrido, viendoRecorrido = false, alVerManejo, viendoManejo = false, children }) {
  const puedeEditar = esGestor(useSesion()?.perfil)
  // Con la ficha abierta, «hace 12 min» avanza solo cada minuto y la unidad pasa sola a
  // «Sin señal» a los 5 min sin reportar, sin esperar otra lectura del servidor.
  const ahora = useMinuto()
  const v = unidad
  if (!v) return null
  // La regla única (estadoSenal): la pastilla, la velocidad y el GPS dicen lo mismo que el mapa.
  const estado = estadoUnidad(v, ahora)
  const s = estado.senal
  const ultimo = s.clave === 'sin_senal' ? textoUltimoReporte(s.ultimoReporte) : null
  // Lo que dice el servidor de la ubicación del Meitrack (location-status.js), si ya se pidió.
  const ubicacionGps = v.ubicacionGps ? locationStatus(v.ubicacionGps) : null
  const descripcion = [v.alias, [v.marca, v.modelo, v.anio].filter(Boolean).join(' ')].filter(Boolean).join(' · ')
  const extras = datosDe(v, s).filter(([k]) => !['Velocidad', 'Última señal', 'Conductor', 'Ubicación', 'Odómetro'].includes(k))
  const filas = [
    ['reloj', 'Última señal', s.hace],
    // El conductor actual con su pastilla de manejo (la del ranking guardado, sin una lectura por unidad).
    // Solo quien gestiona la empresa ve el ranking; al conductor le basta su tarjeta en Mi unidad.
    ['gente', 'Conductor', v.conductorNombre && v.conductorNombre !== 'Sin asignar'
      ? <>{v.conductorNombre}{puedeEditar && v.conductorPrincipalId && <> <PastillaConductor userId={v.conductorPrincipalId} /></>}</>
      : 'Sin conductor asignado'],
    ['pin', 'Ubicación', v.ubicacionTexto || (Number.isFinite(v.lat) && Number.isFinite(v.lng) ? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}` : 'Sin posición disponible')],
  ]
  return <article className={`fleet-card ${variante}`} aria-label={`Vehículo ${nombreUnidad(v)}`}>
    {conCabecera && <header className="fleet-card-heading"><h2>Vehículo seleccionado</h2>
      {alCerrar && <button type="button" className="fleet-card-close" aria-label="Cerrar ficha del vehículo" onClick={alCerrar}><Icono nombre="cerrar" tam={20} /></button>}
    </header>}
    <div className="fleet-card-content">
    <span className={`fleet-status ${estado.color}`}><i />{s.texto}</span>
    {ultimo && <small className="fleet-status-nota">{ultimo}</small>}
    {/* Solo la recepción del equipo está al día (la regla da «Sin ubicación»): se explica por qué el punto del mapa es viejo. */}
    {s.clave === 'sin_ubicacion' && soloRecepcion(v, ahora) && s.posicionEn && Number.isFinite(v.lat) && Number.isFinite(v.lng) && <p role="status" className="fleet-status-nota">El GPS está reportando. La posición del mapa es histórica: recibida el {f.fechaHora(s.posicionEn)}. No hay una posición reciente para confirmar el movimiento.</p>}
    {ubicacionGps && !ubicacionGps.available && <div role="status" className="fleet-status-nota"><strong>{ubicacionGps.title}</strong><p>{ubicacionGps.detail}</p></div>}
    <h3 className="fleet-plate">{v.placa || 'Sin placa'}</h3>
    {descripcion && <p className="fleet-description">{descripcion}</p>}
    <FotoUnidad key={v.id} unidad={v} puedeEditar={puedeEditar} />
    <div className="fleet-speed"><Icono nombre="velocidad" tam={25} /><strong>{s.velocidadKmh == null ? 'Sin velocidad GPS' : f.numero(s.velocidadKmh)}{s.velocidadKmh != null && <small> km/h</small>}</strong></div>
    <dl className="fleet-facts">{filas.map(([icono, etiqueta, valor]) => <div key={etiqueta}><Icono nombre={icono} tam={19} /><div><dt>{etiqueta}</dt><dd>{valor}</dd></div></div>)}</dl>
    <dl className="fleet-metrics"><div><Icono nombre="mapa" tam={22} /><div><dt>Odómetro</dt><dd>{v.km == null ? 'Sin dato' : f.km(v.km)}</dd></div></div><div><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg><div><dt>GPS</dt><dd>{s.clave === 'reportando' ? 'Con señal' : s.texto}</dd></div></div></dl>
    {extras.length > 0 && <details className="fleet-extra"><summary>Más información</summary><dl>{extras.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}</dl></details>}
    {/* Lo que el módulo agrega dentro de la parte que se desplaza (Mi mapa: «Manejo brusco»). */}
    {children}
    </div>
    {(conEnlace || alVerRecorrido || alVerManejo) && <div className="fleet-actions">
      {conEnlace && <Link className="fleet-action primary" to={`/panel/flota/${encodeURIComponent(v.id)}`}><Icono nombre="documento" tam={18} />Ver expediente</Link>}
      {/* Las capas del mapa (recorrido y manejo brusco) van juntas, iguales y lado a lado. */}
      {(alVerRecorrido || alVerManejo) && <div className={`fleet-actions-capas${alVerRecorrido && alVerManejo ? ' par' : ''}`}>
        {alVerRecorrido && <button type="button" className="fleet-action" onClick={alVerRecorrido} aria-pressed={viendoRecorrido}><Icono nombre="mapa" tam={18} /><span>{viendoRecorrido ? 'Ocultar recorrido' : 'Ver recorrido'}</span></button>}
        {alVerManejo && <button type="button" className="fleet-action" onClick={alVerManejo} aria-pressed={viendoManejo}><Icono nombre="velocidad" tam={18} /><span>{viendoManejo ? 'Ocultar manejo brusco' : 'Ver manejo brusco'}</span></button>}
      </div>}
    </div>}
  </article>
}
