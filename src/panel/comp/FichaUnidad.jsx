import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'
import { estadoUnidad } from '../datos/estadoUnidad'
import { etiquetas, ids } from '../datos/cloudinary'
import FotoFija from './FotoFija'
import CambiarFoto from './CambiarFoto'
import { useSesion } from '../useSesion'
import { esGestor } from '../roles'
import '../../styles/fleet-map.css'
export { estadoUnidad } from '../datos/estadoUnidad'

/** Filas de datos: se descartan las que no tienen valor. */
function datosDe(v) {
  const filas = [
    ['Combustible', v.combustiblePct == null ? null : `${v.combustiblePct}%`],
    ['Aceite', v.aceitePct == null ? null : `${v.aceitePct}%`],
    ['Última señal', v.ultimoReporte ? f.desde(v.ultimoReporte) : null],
    // El encendido ya se anuncia en la etiqueta de estado; aquí solo se repite
    // si además hay velocidad, donde las dos cosas juntas cuentan algo: un
    // motor encendido a 0 km/h es ralentí, y eso interesa.
    ['Motor', v.ignition == null || v.velocidadKmh == null ? null : v.ignition ? 'Encendido' : 'Apagado'],
    ['Velocidad', v.velocidadKmh == null ? null : f.velocidad(v.velocidadKmh)],
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

export default function FichaUnidad({ unidad: v, variante = 'panel', alCerrar, conEnlace = true, alVerRecorrido, viendoRecorrido = false }) {
  // La foto principal de la unidad (la más reciente con su etiqueta en Cloudinary); sin ella, la ilustración.
  const [hayFoto, setHayFoto] = useState(false)
  const [sinFondo, setSinFondo] = useState(false)
  const puedeEditar = esGestor(useSesion()?.perfil)
  if (!v) return null
  const estado = estadoUnidad(v)
  const descripcion = [v.alias, [v.marca, v.modelo, v.anio].filter(Boolean).join(' ')].filter(Boolean).join(' · ')
  const extras = datosDe(v).filter(([k]) => !['Velocidad', 'Última señal', 'Conductor', 'Ubicación', 'Odómetro'].includes(k))
  const filas = [
    ['reloj', 'Última señal', v.ultimoReporte ? f.desde(v.ultimoReporte) : 'Sin reportes'],
    ['gente', 'Conductor', v.conductorNombre && v.conductorNombre !== 'Sin asignar' ? v.conductorNombre : 'Sin conductor asignado'],
    ['pin', 'Ubicación', v.ubicacionTexto || (Number.isFinite(v.lat) && Number.isFinite(v.lng) ? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}` : 'Sin posición disponible')],
  ]
  return <article className={`fleet-card ${variante}`} aria-label={`Vehículo ${v.placa || v.alias || ''}`}>
    <header className="fleet-card-heading"><h2>Vehículo seleccionado</h2>
      {alCerrar && <button type="button" className="fleet-card-close" aria-label="Cerrar ficha del vehículo" onClick={alCerrar}><Icono nombre="cerrar" tam={20} /></button>}
    </header>
    <div className="fleet-card-content">
    <span className={`fleet-status ${estado.color}`}><i />{estado.texto}</span>
    <h3 className="fleet-plate">{v.placa || 'Sin placa'}</h3>
    {descripcion && <p className="fleet-description">{descripcion}</p>}
    <figure className={`fleet-vehicle-image${hayFoto ? ' con-foto' : ''}${sinFondo ? ' sin-fondo' : ''}`}>
      <FotoFija sinFondo publicId={v?.id ? ids.vehiculo(v.id) : null} ancho={900} alto={600} alt={`Foto de ${v.placa || v.alias || 'la unidad'}`} alExistir={(hay, recortada) => { setHayFoto(hay); setSinFondo(hay && recortada) }}>
        <img src="/images/maps/vehicle-reference.png" alt="Camioneta ilustrativa; no representa necesariamente esta unidad" width="1536" height="1024" />
      </FotoFija>
      <figcaption>{hayFoto ? 'Foto de la unidad' : 'Imagen de referencia'}</figcaption>
      {puedeEditar && v?.id && <CambiarFoto publicId={ids.vehiculo(v.id)} etiqueta={etiquetas.vehiculo(v.id)} titulo={v.placa || v.alias || ''} hayFoto={hayFoto} />}
    </figure>
    <div className="fleet-speed"><Icono nombre="velocidad" tam={25} /><strong>{v.velocidadKmh == null ? 'Sin velocidad GPS' : f.numero(v.velocidadKmh)}{v.velocidadKmh != null && <small> km/h</small>}</strong></div>
    <dl className="fleet-facts">{filas.map(([icono, etiqueta, valor]) => <div key={etiqueta}><Icono nombre={icono} tam={19} /><div><dt>{etiqueta}</dt><dd>{valor}</dd></div></div>)}</dl>
    <dl className="fleet-metrics"><div><Icono nombre="mapa" tam={22} /><div><dt>Odómetro</dt><dd>{v.km == null ? 'Sin dato' : f.km(v.km)}</dd></div></div><div><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg><div><dt>GPS</dt><dd>{v.conectado === true ? 'Conectado' : v.conectado === false ? 'Sin señal' : 'Sin dato'}</dd></div></div></dl>
    {extras.length > 0 && <details className="fleet-extra"><summary>Más información</summary><dl>{extras.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}</dl></details>}
    </div>
    {(conEnlace || alVerRecorrido) && <div className="fleet-actions">
      {conEnlace && <Link className="fleet-action primary" to={`/panel/flota/${encodeURIComponent(v.id)}`}><Icono nombre="documento" tam={18} />Ver expediente</Link>}
      {alVerRecorrido && <button type="button" className="fleet-action" onClick={alVerRecorrido} aria-pressed={viendoRecorrido}><Icono nombre="mapa" tam={18} />{viendoRecorrido ? 'Ocultar recorrido' : 'Ver recorrido'}</button>}
    </div>}
  </article>
}
