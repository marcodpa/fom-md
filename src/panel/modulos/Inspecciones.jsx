import { Fragment, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import repo, { CONECTADO } from '../datos/repo'
import { useDatos } from '../useDatos'
import { Buscador, Cargando, Chips, Datos, ErrorCarga, Modal, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { color, etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'
import ProgramaInspecciones from './ProgramaInspecciones'
import InspeccionesPorPersona from './InspeccionesPorPersona'
import { diaDe, limitesDelMes, mesDe, moverMes, nombreDelMes } from '../comp/CalendarioInspecciones'
import './inspecciones.css'
import '../../styles/movil-modulos.css'

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

/** La lista del servidor no trae conteos (llegan en null): entonces no se pinta «0», se dice que no hay dato. */
const conConteo = (insp) => insp.fallasCriticas != null || insp.observaciones != null

/**
 * Conteos sacados de las respuestas reales del detalle. Misma regla que la base:
 * falla en punto crítico = falla crítica; cualquier otra respuesta no conforme = observación.
 */
function contarRespuestas(items) {
  const fallasCriticas = items.filter((it) => it.critico && it.estadoItem === 'falla').length
  const observaciones = items.filter((it) => it.estadoItem !== 'conforme').length - fallasCriticas
  return { fallasCriticas, observaciones }
}

/** Cuándo se hizo, corto: «hoy 7:42 a. m.», «ayer 5:10 p. m.» o la fecha. Sin dato, no se dice nada. */
function cuandoSeHizo(insp) {
  const iso = insp.creadaEn || insp.fecha
  if (!iso) return ''
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  const dia = soloFecha ? iso : f.hoyISO(new Date(iso))
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1)
  const nombreDia = dia === f.hoyISO() ? 'hoy' : dia === f.hoyISO(ayer) ? 'ayer' : f.fechaCorta(iso)
  return soloFecha ? nombreDia : `${nombreDia} ${f.hora(iso)}`
}

const momento = i => new Date(i.creadaEn || i.fecha || 0).getTime() || 0

/// Plantillas va al final: se prepara con ratón y solo existe en la web.
const VISTAS = ['resumen', 'historial', 'hallazgos', 'plantillas']
const NOMBRE_VISTA = { resumen: 'Resumen', historial: 'Historial', hallazgos: 'Hallazgos', plantillas: 'Plantillas' }
// El Historial se mira de dos modos sobre el mismo mes: por conductor o todas juntas.
const MODOS = [{ v: 'persona', t: 'Por persona' }, { v: 'todas', t: 'Todas' }]
export default function Inspecciones() {
  const [params, setParams] = useSearchParams()
  // «Por persona» era una pestaña propia: sus enlaces viejos caen en el Historial.
  const pedida = params.get('vista') === 'personas' ? 'historial' : params.get('vista')
  const vista = VISTAS.includes(pedida) ? pedida : 'resumen'
  const inspeccionId = params.get('inspeccion')
  // Un enlace a una inspección concreta se abre sobre la lista de todas.
  const modo = inspeccionId || params.get('modo') === 'todas' ? 'todas' : 'persona'
  const cambiar = (v, extra = {}) => { const p = new URLSearchParams(); if (v !== 'resumen') p.set('vista', v); Object.entries(extra).forEach(([k, x]) => p.set(k, x)); setParams(p) }
  return <section className="insp-root">
    <div className="insp-heading"><div><p className="insp-breadcrumb">Inicio › Inspecciones</p><h1>Inspecciones</h1><p>Qué unidades faltan por revisar y qué requiere atención.</p></div></div>
    <nav className="insp-nav" aria-label="Secciones de inspecciones">{VISTAS.map(v => <button type="button" key={v} aria-current={vista === v ? 'page' : undefined} onClick={() => cambiar(v)}>{NOMBRE_VISTA[v]}</button>)}</nav>
    {vista === 'resumen' ? <Resumen cambiarVista={cambiar}/>
      : vista === 'historial' ? <Historial modo={modo} cambiarModo={m => cambiar('historial', m === 'todas' ? { modo: m } : {})} cambiarVista={cambiar} inspeccionId={inspeccionId}/>
      : <ProgramaInspecciones key={vista} vista={vista}/>}
  </section>
}

/** Solo la diaria cuenta para «Diarias hechas hoy»; las demás se ven como una inspección más. */
const esDiaria = i => i.clase !== 'scheduled'

function Resumen({ cambiarVista }) {
  const [detalle, setDetalle] = useState(null)
  const [faltanTodas, setFaltanTodas] = useState(false)
  const hoy = useDatos(() => repo.inspecciones.listar({ fecha: f.hoyISO() }), [])
  const pendientes = useDatos(() => repo.inspecciones.pendientesHoy(), [])
  const vehiculos = useDatos(() => repo.vehiculos.listar({}), [])
  const base = hoy.datos ?? []
  const abrir = i => setDetalle(i)
  // Requiere tu atención: bloqueadas y con observaciones, de la más reciente a la más antigua.
  const atencion = base.filter(i => i.resultado !== 'aprobada').sort((a, b) => momento(b) - momento(a))
  const faltan = pendientes.datos ?? []
  const verTodas = () => cambiarVista('historial', { modo: 'todas' })
  return <>
    {hoy.estado === 'error' ? <ErrorCarga error={hoy.error} onReintentar={hoy.recargar}/> : hoy.estado !== 'ok' || vehiculos.estado !== 'ok' ? <Cargando filas={1}/> : <div className="insp-summary">
      {[['Diarias hechas hoy', new Set(base.filter(esDiaria).map(i => i.vehiculoId)).size,'check','info',vehiculos.datos.length],['Aprobadas',base.filter(i => i.resultado === 'aprobada').length,'escudo','ok'],['Con observaciones',base.filter(i => i.resultado === 'aprobada_con_observaciones').length,'editar','aviso'],['Bloqueadas',base.filter(i => i.resultado === 'bloqueada').length,'alerta','malo']].map(([t,n,icono,tono,de]) => <div key={t}><span className={`insp-ibox ${tono}`}><Icono nombre={icono}/></span><span>{t}<b>{n}{de != null && <small> de {de}</small>}</b></span></div>)}
    </div>}
    {vehiculos.estado === 'error' && <ErrorCarga error={vehiculos.error} onReintentar={vehiculos.recargar}/>}
    <div className="insp-overview"><Tarjeta titulo="Requiere tu atención" sinCuerpo accion={<button className="pnl-link" type="button" onClick={verTodas}>Ver historial →</button>}>
      {hoy.estado === 'cargando' && <Cargando filas={2}/>}
      <p className="insp-card-hint">Bloqueadas y con observaciones, de la más reciente a la más antigua.</p>
      {hoy.estado === 'ok' && atencion.map(i => { const cuando = cuandoSeHizo(i); return <article className="insp-task" key={i.id}><span className={`insp-ibox ${i.resultado === 'bloqueada' ? 'malo' : 'aviso'}`}><Icono nombre={i.resultado === 'bloqueada' ? 'alerta' : 'inspeccion'}/></span><div><h3>{i.vehiculoNombre}</h3><Tag color={color('inspeccion_resultado',i.resultado)}>{etiqueta('inspeccion_resultado',i.resultado)}</Tag><p>{conConteo(i) ? `${f.numero(i.fallasCriticas)} fallas críticas · ${f.numero(i.observaciones)} observaciones` : `${i.plantilla ? i.plantilla + ' · ' : ''}abre el resultado para ver fallas y observaciones`}{cuando && ` · ${cuando}`}</p></div><span className="insp-task-person">{i.conductorNombre}</span><button className="pnl-btn primario" type="button" onClick={() => abrir(i)}>Ver resultado →</button></article> })}
      {hoy.estado === 'ok' && !atencion.length && <Vacio icono="check" titulo="Nada requiere tu atención" texto="Hoy no hay inspecciones bloqueadas ni con observaciones."/>}
    </Tarjeta><div className="insp-side-col">
    <Tarjeta titulo="Faltan hoy" sinCuerpo accion={pendientes.estado === 'ok' && faltan.length > 4 ? <button className="pnl-link" type="button" aria-expanded={faltanTodas} onClick={() => setFaltanTodas(v => !v)}>{faltanTodas ? 'Ver menos' : `Ver las ${f.numero(faltan.length)} →`}</button> : null}>
      <div className="insp-faltan">
        {pendientes.estado === 'cargando' && <Cargando filas={1}/>}
        {pendientes.estado === 'error' && <ErrorCarga error={pendientes.error} onReintentar={pendientes.recargar}/>}
        {pendientes.estado === 'ok' && (faltan.length ? <>
          <p className="insp-faltan-cifra"><b>{f.numero(faltan.length)}</b> {faltan.length === 1 ? 'unidad sin la diaria' : 'unidades sin la diaria'}</p>
          <ul className="insp-faltan-lista" aria-label="Unidades sin la inspección diaria">{(faltanTodas ? faltan : faltan.slice(0, 4)).map(v => <li key={v.id} title={[v.alias, v.placa, v.conductorNombre || 'Sin conductor'].filter(Boolean).join(' · ')}>{v.placa || v.alias}</li>)}</ul>
        </> : <p className="insp-faltan-ok"><Icono nombre="check" tam={18}/>Todas las unidades tienen la diaria de hoy.</p>)}
      </div>
    </Tarjeta>
    <aside className="insp-guide"><h2>Cómo funciona</h2>{[['Diaria', 'Cada conductor llena una cada día, desde la app, antes de salir. Aquí ves quién ya la hizo y quién falta; en Historial, el mes de cada persona.'],['Hallazgos', 'Lo que sale mal en una inspección se convierte en un hallazgo con seguimiento.']].map(([t,p],i) => <div key={t}><b>{i+1}</b><span><strong>{t}</strong><p>{p}</p></span></div>)}</aside></div></div>
    <Tarjeta titulo="Últimos resultados de hoy" sinCuerpo accion={<button className="pnl-link" type="button" onClick={verTodas}>Ver todos →</button>}>{hoy.estado === 'ok' && (base.length ? <TablaResultados lista={base.slice(0,5)} abrir={abrir}/> : <Vacio icono="inspeccion" titulo="Sin resultados hoy" texto="Los resultados aparecerán cuando se registren desde la app."/>)}</Tarjeta>
    {detalle && <DetalleInspeccion key={detalle.id} inspeccion={detalle} alCerrar={() => setDetalle(null)} alHallazgos={() => {setDetalle(null);cambiarVista('hallazgos')}}/>}
  </>
}

function NavMes({ mes, alCambiar, puedeAvanzar }) {
  return <div className="insp-pp-mes" role="group" aria-label="Mes del historial">
    <button type="button" className="insp-cal-flecha" aria-label="Mes anterior" onClick={() => alCambiar(moverMes(mes, -1))}><Icono nombre="volver" tam={18}/></button>
    <span aria-live="polite">{nombreDelMes(mes)}</span>
    <button type="button" className="insp-cal-flecha adelante" aria-label="Mes siguiente" disabled={!puedeAvanzar} onClick={() => alCambiar(moverMes(mes, 1))}><Icono nombre="volver" tam={18}/></button>
  </div>
}

/**
 * Historial: un solo selector de mes para los dos modos. «Por persona» es el
 * cumplimiento de cada conductor; «Todas», la lista con buscador y filtros.
 */
function Historial({ modo, cambiarModo, cambiarVista, inspeccionId }) {
  const mesActual = mesDe()
  const [mes, setMes] = useState(mesActual)
  const [detalle, setDetalle] = useState(null)
  const cambiarMes = m => setMes(m > mesActual ? mesActual : m)
  // Un enlace a una inspección (desde Hallazgos) la busca en la lectura de siempre, sin importar el mes, y lleva el selector a su mes.
  const enlazada = useDatos(() => inspeccionId ? repo.inspecciones.listar({}) : Promise.resolve(null), [inspeccionId])
  const encontrada = inspeccionId && enlazada.estado === 'ok' ? (enlazada.datos ?? []).find(i => i.id === inspeccionId) ?? null : null
  useEffect(() => { if (encontrada) { setDetalle(encontrada); cambiarMes(diaDe(encontrada.fecha || encontrada.creadaEn).slice(0, 7) || mesActual) } }, [encontrada?.id])
  return <>
    <div className="insp-hist-cab">
      <Chips etiqueta="Cómo ver el historial" opciones={MODOS} valor={modo} alCambiar={cambiarModo}/>
      <NavMes mes={mes} alCambiar={cambiarMes} puedeAvanzar={mes < mesActual}/>
    </div>
    {inspeccionId && enlazada.estado === 'ok' && !encontrada && <p className="insp-feedback" role="status">Esta inspección no está disponible en el listado autorizado.</p>}
    {modo === 'todas'
      ? <TodasDelMes mes={mes} abrir={setDetalle}/>
      : <InspeccionesPorPersona mes={mes} alCambiarMes={cambiarMes} puedeAvanzar={mes < mesActual} abrirInspeccion={setDetalle} ocultarFicha={Boolean(detalle)}/>}
    {detalle && <DetalleInspeccion key={detalle.id} inspeccion={detalle} alCerrar={() => setDetalle(null)} alHallazgos={() => {setDetalle(null);cambiarVista('hallazgos')}}/>}
  </>
}

/** «Todas»: las del mes, con buscador y filtro por resultado. Una lectura por mes; buscar y filtrar se hace aquí. */
function TodasDelMes({ mes, abrir }) {
  const [resultado, setResultado] = useState('')
  const [q, setQ] = useState('')
  const registros = useDatos(() => repo.inspecciones.listar(limitesDelMes(mes)), [mes])
  const t = q.trim().toLowerCase()
  const base = (registros.datos ?? []).filter(i => !t || `${i.vehiculoNombre} ${i.vehiculo?.placa ?? ''} ${i.conductorNombre}`.toLowerCase().includes(t))
  const lista = resultado ? base.filter(i => i.resultado === resultado) : base
  return <Tarjeta titulo={`Inspecciones de ${nombreDelMes(mes)}`} sinCuerpo accion={<button className="pnl-btn sutil insp-imprimir" type="button" disabled={registros.estado !== 'ok' || !lista.length} onClick={() => window.print()}><Icono nombre="documento" tam={18}/>Generar PDF</button>}>
    <div className="insp-filters"><Buscador valor={q} alCambiar={setQ} placeholder="Buscar unidad o conductor…"/></div>
    <div className="insp-filter-chips"><Chips etiqueta="Filtrar por resultado" opciones={[{v:'',t:'Todas',n:base.length},{v:'aprobada',t:'Aprobadas',n:base.filter(i=>i.resultado==='aprobada').length},{v:'aprobada_con_observaciones',t:'Con observaciones',n:base.filter(i=>i.resultado==='aprobada_con_observaciones').length},{v:'bloqueada',t:'Bloqueadas',n:base.filter(i=>i.resultado==='bloqueada').length}]} valor={resultado} alCambiar={setResultado}/></div>
    {registros.estado === 'cargando' && <Cargando filas={5}/>}
    {registros.estado === 'error' && <ErrorCarga error={registros.error} onReintentar={registros.recargar}/>}
    {registros.estado === 'ok' && registros.datos?.incompleta && <p className="insp-ficha-aviso insp-todas-aviso" role="status">El servidor no devolvió todo el mes: algunas inspecciones pueden faltar.</p>}
    {registros.estado === 'ok' && (lista.length ? <TablaResultados lista={lista} abrir={abrir}/> : <Vacio icono="buscar" titulo={registros.datos?.length ? 'No hay resultados con estos filtros' : 'Sin inspecciones este mes'} texto={registros.datos?.length ? 'Prueba otro resultado o búsqueda.' : 'Elige otro mes o espera a que se registren desde la app.'}/>)}
  </Tarjeta>
}

function TablaResultados({ lista, abrir }) {
  return <div className="pnl-tabla-wrap"><table className="pnl-tabla insp-table mv-lista"><thead><tr>{['Fecha y hora','Unidad','Conductor','Resultado','Observaciones','Fallas críticas','Ubicación','Detalle'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{lista.map(i=><tr key={i.id} className={i.resultado === 'bloqueada' ? 'mv-ir mv-u1' : i.resultado === 'aprobada_con_observaciones' ? 'mv-ir mv-u2' : 'mv-ir'}><td className="mv-d">{f.fechaHora(i.creadaEn || i.fecha)}</td><td className="mv-t"><b>{i.vehiculo?.alias || i.vehiculoNombre}</b><small>{i.vehiculo?.placa || etiqueta('vehiculo_tipo',i.tipoVehiculo)}</small></td><td className="mv-d">{i.conductorNombre}</td><td className="mv-e"><Tag color={color('inspeccion_resultado',i.resultado)}>{etiqueta('inspeccion_resultado',i.resultado)}</Tag></td><td>{f.numero(i.observaciones)}</td><td>{f.numero(i.fallasCriticas)}</td><td>{i.ubicacion || 'Sin ubicación'}</td><td className="mv-a"><button className="pnl-table-action mv-estira" type="button" aria-label={'Ver resultado de '+i.vehiculoNombre} onClick={()=>abrir(i)}>Ver resultado →</button></td></tr>)}</tbody></table></div>
}
function DetalleInspeccion({ inspeccion, alCerrar, alHallazgos }) {
  const detalle = useDatos(() => CONECTADO ? repo.inspecciones.obtener(inspeccion.id) : Promise.resolve(checklistDe(inspeccion)), [inspeccion.id])
  const grupos = useMemo(() => porCategoria(detalle.datos ?? []), [detalle.datos])
  // Si la lista no trajo conteos, se cuentan de las respuestas; sin respuestas, no hay dato.
  const cuenta = conConteo(inspeccion) ? inspeccion : detalle.estado === 'ok' && detalle.datos?.length ? contarRespuestas(detalle.datos) : null
  return <Modal titulo="Resultado de inspección" abierto alCerrar={alCerrar} ancho={1040}><div className="insp-dialog-grid"><aside className="insp-context"><Icono nombre="camion" tam={70}/><h3>{inspeccion.vehiculoNombre}</h3><Tag color={color('inspeccion_resultado',inspeccion.resultado)}>{etiqueta('inspeccion_resultado',inspeccion.resultado)}</Tag><Datos items={[{etiqueta:'Conductor',valor:inspeccion.conductorNombre},{etiqueta:'Fecha y hora',valor:f.fechaHora(inspeccion.creadaEn||inspeccion.fecha)},{etiqueta:'Ubicación',valor:inspeccion.ubicacion||'Sin ubicación'},{etiqueta:'Tipo de unidad',valor:etiqueta('vehiculo_tipo',inspeccion.tipoVehiculo) || '—'}]}/></aside><div><div className="insp-result-summary"><Icono nombre={cuenta ? (cuenta.fallasCriticas ? 'alerta' : 'check') : inspeccion.resultado === 'bloqueada' ? 'alerta' : 'inspeccion'}/><strong>{cuenta ? `${f.numero(cuenta.fallasCriticas)} fallas críticas · ${f.numero(cuenta.observaciones)} observaciones` : detalle.estado === 'cargando' ? 'Contando fallas y observaciones…' : 'Fallas y observaciones: sin dato'}</strong></div>
    {detalle.estado === 'cargando' && <Cargando filas={4}/>}
    {detalle.estado === 'error' && <ErrorCarga error={detalle.error} onReintentar={detalle.recargar}/>}
    {detalle.estado === 'ok' && !grupos.length && <Vacio icono="documento" titulo="Sin respuestas disponibles" texto="No se completa el checklist con datos supuestos."/>}
    {grupos.map(g=><Fragment key={g.categoria}><h3 className="insp-category">{g.categoria || 'General'}</h3>{g.items.map(it=><div className="insp-check" key={it.id}><Icono nombre={it.estadoItem==='falla'?'alerta':it.estadoItem==='observacion'?'editar':'check'}/><div><b>{it.nombre}</b>{it.critico && <small>Punto crítico</small>}{it.nota && <p>{it.nota}</p>}</div><Tag color={color('inspeccion_item_estado',it.estadoItem)}>{etiqueta('inspeccion_item_estado',it.estadoItem)}</Tag></div>)}</Fragment>)}
    <p className="insp-info">Respuestas registradas desde la app. El supervisor no modifica el resultado.</p></div></div><div className="insp-actions"><button className="pnl-btn sutil" type="button" onClick={alCerrar}>Cerrar</button><button className="pnl-btn primario" type="button" onClick={alHallazgos}>Ver hallazgos →</button></div></Modal>
}
