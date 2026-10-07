import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import repo, { CONECTADO } from '../datos/repo'
import { useDatos } from '../useDatos'
import { Buscador, Cargando, Chips, Datos, ErrorCarga, Modal, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { color, etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'
import ProgramaInspecciones, { ProgramarInspeccion } from './ProgramaInspecciones'
import './inspecciones.css'

/** Hash FNV-1a: misma inspección, mismo checklist, siempre. */
function hash(texto) {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Reconstruye el detalle por ítem a partir del resultado registrado.
 * Las fallas críticas caen sobre ítems críticos y las observaciones sobre los
 * no críticos primero. El orden sale del id de la inspección, así que la misma
 * inspección muestra siempre exactamente el mismo checklist.
 */
function checklistDe(insp) {
  if (CONECTADO) return insp.respuestas ?? []
  const items = repo.inspecciones.itemsPlantilla(insp.tipoVehiculo)
  const porHash = (arr) => [...arr].sort((a, b) => hash(insp.id + a.id) - hash(insp.id + b.id))

  const criticos = porHash(items.filter((i) => i.critico))
  const noCriticos = porHash(items.filter((i) => !i.critico))

  const fallas = new Set(criticos.slice(0, Math.min(insp.fallasCriticas ?? 0, criticos.length)).map((i) => i.id))
  const candidatos = [...noCriticos, ...criticos.filter((i) => !fallas.has(i.id))]
  const observados = new Set(
    candidatos.slice(0, Math.min(insp.observaciones ?? 0, candidatos.length)).map((i) => i.id)
  )

  return items.map((i) => ({
    ...i,
    estadoItem: fallas.has(i.id) ? 'falla' : observados.has(i.id) ? 'observacion' : 'conforme',
  }))
}

/** Agrupa el checklist por categoría respetando el orden del catálogo. */
function porCategoria(items) {
  const grupos = []
  items.forEach((it) => {
    const g = grupos.find((x) => x.categoria === it.categoria)
    if (g) g.items.push(it)
    else grupos.push({ categoria: it.categoria, items: [it] })
  })
  return grupos
}


const VISTAS = ['resumen', 'historial', 'agenda', 'hallazgos', 'plantillas']
export default function Inspecciones() {
  const [params, setParams] = useSearchParams()
  const vista = VISTAS.includes(params.get('vista')) ? params.get('vista') : 'resumen'
  const [programando, setProgramando] = useState(null)
  const [aviso, setAviso] = useState('')
  const [version, setVersion] = useState(0)
  const cambiar = v => { const p = new URLSearchParams(); if (v !== 'resumen') p.set('vista', v); setParams(p) }
  return <section className="insp-root">
    <div className="insp-heading"><div><p className="insp-breadcrumb">Inicio › Inspecciones</p><h1>Inspecciones</h1><p>Qué unidades faltan por revisar y qué requiere atención.</p></div>{vista !== 'plantillas' && <button type="button" className="pnl-btn primario" onClick={() => setProgramando({})}><Icono nombre="mas" tam={18}/>Programar inspección</button>}</div>
    <nav className="insp-nav" aria-label="Secciones de inspecciones">{VISTAS.map((v,i) => <button type="button" key={v} aria-current={vista === v ? 'page' : undefined} onClick={() => cambiar(v)}>{['Resumen','Historial','Agenda','Hallazgos','Plantillas'][i]}</button>)}</nav>
    {aviso && <p className="insp-success" role="status">{aviso}</p>}
    {vista === 'resumen' || vista === 'historial' ? <Resultados key={vista} vista={vista} abrirPrograma={v => setProgramando({ vehiculoId: v.id })} cambiarVista={cambiar} inspeccionId={params.get('inspeccion')}/> : <ProgramaInspecciones key={vista + version} vista={vista} abrirPrograma={() => setProgramando({})}/>}
    {programando && <ProgramarInspeccion unidadInicial={programando.vehiculoId} alCerrar={() => setProgramando(null)} alGuardar={() => { setProgramando(null); setAviso('Inspección programada.'); setVersion(v => v+1) }}/>}
  </section>
}

function Resultados({ vista, abrirPrograma, cambiarVista, inspeccionId }) {
  const [fecha, setFecha] = useState(inspeccionId ? '' : f.hoyISO())
  const [resultado, setResultado] = useState('')
  const [q, setQ] = useState('')
  const [detalle, setDetalle] = useState(null)
  const registros = useDatos(() => repo.inspecciones.listar({ fecha: vista === 'resumen' ? f.hoyISO() : fecha, q }), [vista,fecha,q])
  const hoy = useDatos(() => repo.inspecciones.listar({ fecha: f.hoyISO() }), [])
  const pendientes = useDatos(() => repo.inspecciones.pendientesHoy(), [])
  const vehiculos = useDatos(() => repo.vehiculos.listar({}), [])
  // Las programadas: las que el supervisor fija para una fecha y el conductor ve en su app.
  const agenda = useDatos(() => repo.programaInspecciones.citas({}), [])
  const base = registros.datos ?? []
  const lista = resultado ? base.filter(i => i.resultado === resultado) : base
  useEffect(() => { if (inspeccionId && registros.estado === 'ok') setDetalle(base.find(i => i.id === inspeccionId) ?? null) }, [inspeccionId, registros.datos, registros.estado])
  const abrir = i => setDetalle(i)
  // Programada = la que el supervisor fijó y el conductor completó (la cita guarda su inspección); el resto es la diaria.
  const programadas = new Set((agenda.datos ?? []).map(c => c.inspeccionId).filter(Boolean))
  const tabla = filas => <TablaResultados lista={filas} abrir={abrir} programadas={programadas}/>
  return <>
    {vista === 'resumen' && <>
      {hoy.estado === 'error' ? <ErrorCarga error={hoy.error} onReintentar={hoy.recargar}/> : hoy.estado !== 'ok' || vehiculos.estado !== 'ok' ? <Cargando filas={1}/> : <div className="insp-summary">
        {[['Diarias hechas hoy', new Set(hoy.datos.map(i => i.vehiculoId)).size + ' de ' + vehiculos.datos.length,'check'],['Aprobadas',hoy.datos.filter(i => i.resultado === 'aprobada').length,'escudo'],['Con observaciones',hoy.datos.filter(i => i.resultado === 'aprobada_con_observaciones').length,'editar'],['Bloqueadas',hoy.datos.filter(i => i.resultado === 'bloqueada').length,'alerta']].map(([t,n,icono]) => <div key={t}><Icono nombre={icono}/><span>{t}<b>{n}</b></span></div>)}
      </div>}
      {vehiculos.estado === 'error' && <ErrorCarga error={vehiculos.error} onReintentar={vehiculos.recargar}/>}
      <div className="insp-overview"><Tarjeta titulo="Requiere tu atención" sinCuerpo accion={<button className="pnl-link" type="button" onClick={() => cambiarVista('historial')}>Ver historial →</button>}>
        {registros.estado === 'cargando' && <Cargando filas={2}/>}
        {registros.estado === 'error' && <ErrorCarga error={registros.error} onReintentar={registros.recargar}/>}
        {registros.estado === 'ok' && base.filter(i => i.resultado !== 'aprobada').map(i => <article className="insp-task" key={i.id}><Icono nombre={i.resultado === 'bloqueada' ? 'alerta' : 'inspeccion'} tam={24}/><div><h3>{i.vehiculoNombre}</h3><Tag color={color('inspeccion_resultado',i.resultado)}>{etiqueta('inspeccion_resultado',i.resultado)}</Tag><p>{f.numero(i.fallasCriticas)} fallas críticas · {f.numero(i.observaciones)} observaciones</p></div><span className="insp-task-person">{i.conductorNombre}</span><button className="pnl-btn primario" type="button" onClick={() => abrir(i)}>Ver resultado →</button></article>)}
        {pendientes.estado === 'cargando' && <Cargando filas={2}/>}
        {pendientes.estado === 'error' && <ErrorCarga error={pendientes.error} onReintentar={pendientes.recargar}/>}
        {pendientes.estado === 'ok' && pendientes.datos.map(v => <article className="insp-task" key={v.id}><Icono nombre="camion" tam={24}/><div><h3>{v.alias} · {v.placa}</h3><Tag color="ambar">Falta la inspección diaria</Tag><p>{v.areaNombre || 'Sin área'} · la llena el conductor desde su app</p></div><span className="insp-task-person">{v.conductorNombre || 'Sin conductor'}</span></article>)}
        {registros.estado === 'ok' && pendientes.estado === 'ok' && !pendientes.datos.length && !base.some(i => i.resultado !== 'aprobada') && <Vacio icono="check" titulo="Sin pendientes de revisión" texto="No hay unidades sin inspección ni resultados con novedades hoy."/>}
      </Tarjeta><aside className="insp-guide"><h2>Dos clases de inspección</h2>{[['Diaria', 'Cada conductor llena una cada día, desde la app, antes de salir. Aquí ves quién ya la hizo y quién falta.'],['Programada', 'Tú eliges unidad, plantilla, responsable y fecha. El conductor la ve en su app y sabe que le toca.'],['Hallazgos', 'Lo que sale mal en cualquiera de las dos se convierte en un hallazgo con seguimiento.']].map(([t,p],i) => <div key={t}><b>{i+1}</b><span><strong>{t}</strong><p>{p}</p></span></div>)}</aside></div>
      <Tarjeta titulo="Programadas · lo que el conductor ya sabe que viene" sinCuerpo accion={<button className="pnl-link" type="button" onClick={() => cambiarVista('agenda')}>Ver agenda →</button>}>{agenda.estado === 'cargando' && <Cargando filas={2}/>}{agenda.estado === 'error' && <ErrorCarga error={agenda.error} onReintentar={agenda.recargar}/>}{agenda.estado === 'ok' && (() => {const proximas = (agenda.datos ?? []).filter(c => !c.inspeccionId && !['completed','completada','cancelled','cancelada','canceled'].includes(String(c.estado).toLowerCase())).sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).slice(0, 4);return proximas.length ? proximas.map(c => <article className="insp-task" key={c.id}><Icono nombre="inspeccion" tam={24}/><div><h3>{c.vehiculo}{c.placa ? ' · ' + c.placa : ''}</h3><Tag color="azul">{f.fechaCorta(c.fecha)}</Tag><p>{c.plantilla}</p></div><span className="insp-task-person">{c.asignadoA || 'Sin responsable'}</span></article>) : <Vacio icono="inspeccion" titulo="No hay inspecciones programadas" texto="Programa una para que el conductor la vea en su app."/>})()}</Tarjeta>
      <Tarjeta titulo="Últimos resultados de hoy" sinCuerpo accion={<button className="pnl-link" type="button" onClick={() => cambiarVista('historial')}>Ver todos →</button>}>{registros.estado === 'ok' && (base.length ? tabla(base.slice(0,5)) : <Vacio icono="inspeccion" titulo="Sin resultados hoy" texto="Los resultados aparecerán cuando se registren desde la app."/>)}</Tarjeta>
    </>}
    {vista === 'historial' && <Tarjeta titulo="Historial de inspecciones" sinCuerpo>
      <div className="insp-filters"><input type="date" className="pnl-input" aria-label="Fecha de las inspecciones" value={fecha} onChange={e => setFecha(e.target.value)}/><button className="pnl-btn sutil" type="button" aria-pressed={fecha === ''} onClick={() => setFecha('')}>Todas las fechas</button><button className="pnl-btn sutil" type="button" onClick={() => setFecha(f.hoyISO())}>Ver hoy</button><Buscador valor={q} alCambiar={setQ} placeholder="Buscar unidad o conductor…"/></div>
      <div className="insp-filter-chips"><Chips opciones={[{v:'',t:'Todas',n:base.length},{v:'aprobada',t:'Aprobadas',n:base.filter(i=>i.resultado==='aprobada').length},{v:'aprobada_con_observaciones',t:'Con observaciones',n:base.filter(i=>i.resultado==='aprobada_con_observaciones').length},{v:'bloqueada',t:'Bloqueadas',n:base.filter(i=>i.resultado==='bloqueada').length}]} valor={resultado} alCambiar={setResultado}/></div>
      {registros.estado === 'cargando' && <Cargando filas={5}/>}
      {registros.estado === 'error' && <ErrorCarga error={registros.error} onReintentar={registros.recargar}/>}
      {registros.estado === 'ok' && (lista.length ? tabla(lista) : <Vacio icono="buscar" titulo="No hay resultados con estos filtros" texto="Prueba otra fecha, resultado o búsqueda."/>)}
      {inspeccionId && registros.estado === 'ok' && !base.some(i=>i.id === inspeccionId) && <p className="insp-feedback" role="status">Esta inspección no está disponible en el listado autorizado.</p>}
    </Tarjeta>}
    {detalle && <DetalleInspeccion key={detalle.id} inspeccion={detalle} alCerrar={() => setDetalle(null)} alHallazgos={() => {setDetalle(null);cambiarVista('hallazgos')}}/>}
  </>
}

function TablaResultados({ lista, abrir, programadas = new Set() }) {
  return <div className="pnl-tabla-wrap"><table className="pnl-tabla insp-table"><thead><tr>{['Fecha y hora','Tipo','Unidad','Conductor','Resultado','Observaciones','Fallas críticas','Ubicación','Detalle'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{lista.map(i=><tr key={i.id}><td>{f.fechaHora(i.creadaEn || i.fecha)}</td><td><Tag color={(i.clase ? i.clase === 'scheduled' : programadas.has(i.id)) ? 'azul' : 'gris'}>{(i.clase ? i.clase === 'scheduled' : programadas.has(i.id)) ? 'Programada' : 'Diaria'}</Tag></td><td><b>{i.vehiculo?.alias || i.vehiculoNombre}</b><small>{i.vehiculo?.placa || etiqueta('vehiculo_tipo',i.tipoVehiculo)}</small></td><td>{i.conductorNombre}</td><td><Tag color={color('inspeccion_resultado',i.resultado)}>{etiqueta('inspeccion_resultado',i.resultado)}</Tag></td><td>{f.numero(i.observaciones)}</td><td>{f.numero(i.fallasCriticas)}</td><td>{i.ubicacion || 'Sin ubicación'}</td><td><button className="pnl-table-action" type="button" aria-label={'Ver resultado de '+i.vehiculoNombre} onClick={()=>abrir(i)}>Ver resultado →</button></td></tr>)}</tbody></table></div>
}
function DetalleInspeccion({ inspeccion, alCerrar, alHallazgos }) {
  const detalle = useDatos(() => CONECTADO ? repo.inspecciones.obtener(inspeccion.id) : Promise.resolve(checklistDe(inspeccion)), [inspeccion.id])
  const grupos = useMemo(() => porCategoria(detalle.datos ?? []), [detalle.datos])
  return <Modal titulo="Resultado de inspección" abierto alCerrar={alCerrar} ancho={1040}><div className="insp-dialog-grid"><aside className="insp-context"><Icono nombre="camion" tam={70}/><h3>{inspeccion.vehiculoNombre}</h3><Tag color={color('inspeccion_resultado',inspeccion.resultado)}>{etiqueta('inspeccion_resultado',inspeccion.resultado)}</Tag><Datos items={[{etiqueta:'Conductor',valor:inspeccion.conductorNombre},{etiqueta:'Fecha y hora',valor:f.fechaHora(inspeccion.creadaEn||inspeccion.fecha)},{etiqueta:'Ubicación',valor:inspeccion.ubicacion||'Sin ubicación'},{etiqueta:'Tipo de unidad',valor:etiqueta('vehiculo_tipo',inspeccion.tipoVehiculo)}]}/></aside><div><div className="insp-result-summary"><Icono nombre={inspeccion.fallasCriticas ? 'alerta' : 'check'}/><strong>{f.numero(inspeccion.fallasCriticas)} fallas críticas · {f.numero(inspeccion.observaciones)} observaciones</strong></div>
    {detalle.estado === 'cargando' && <Cargando filas={4}/>}
    {detalle.estado === 'error' && <ErrorCarga error={detalle.error} onReintentar={detalle.recargar}/>}
    {detalle.estado === 'ok' && !grupos.length && <Vacio icono="documento" titulo="Sin respuestas disponibles" texto="No se completa el checklist con datos supuestos."/>}
    {grupos.map(g=><Fragment key={g.categoria}><h3 className="insp-category">{g.categoria || 'General'}</h3>{g.items.map(it=><div className="insp-check" key={it.id}><Icono nombre={it.estadoItem==='falla'?'alerta':it.estadoItem==='observacion'?'editar':'check'}/><div><b>{it.nombre}</b>{it.critico && <small>Punto crítico</small>}{it.nota && <p>{it.nota}</p>}</div><Tag color={color('inspeccion_item_estado',it.estadoItem)}>{etiqueta('inspeccion_item_estado',it.estadoItem)}</Tag></div>)}</Fragment>)}
    <p className="insp-info">Respuestas registradas desde la app. El supervisor no modifica el resultado.</p></div></div><div className="insp-actions"><button className="pnl-btn sutil" type="button" onClick={alCerrar}>Cerrar</button><button className="pnl-btn primario" type="button" onClick={alHallazgos}>Ver hallazgos →</button></div></Modal>
}
