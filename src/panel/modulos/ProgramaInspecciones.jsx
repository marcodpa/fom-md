import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Buscador, Campo, Cargando, Chips, Datos, ErrorCarga, Modal, Tag, Tarjeta, Vacio } from '../comp/ui'
import { Icono } from '../Iconos'
import * as f from '../datos/formato'

const CITAS = {programada:['Programada','azul'],completada:['Completada','verde'],cancelada:['Cancelada','gris']}
const HALLAZGOS = {pendiente:['Pendiente','ambar'],en_seguimiento:['En seguimiento','azul'],resuelto:['Resuelto','verde'],descartado:['Descartado','gris']}
const PLANTILLAS = {borrador:['Borrador','gris'],publicada:['Publicada','verde'],archivada:['Archivada','gris']}
const estado = (dic, valor) => <Tag color={dic[valor]?.[1] || 'gris'}>{dic[valor]?.[0] || valor}</Tag>
const inspeccionUrl = id => '/panel/inspecciones?vista=historial&inspeccion='+encodeURIComponent(id)
function Feedback({ carga, children, vacio }) {
  if(carga.estado === 'cargando') return <Cargando filas={3}/>
  if(carga.estado === 'error') return <ErrorCarga error={carga.error} onReintentar={carga.recargar}/>
  return carga.datos?.length ? children : <Vacio icono="inspeccion" titulo={vacio} texto="Los registros de este filtro aparecerán aquí."/>
}
export default function ProgramaInspecciones({vista='agenda',abrirPrograma}) {
  const [filtro,setFiltro]=useState('')
  const [q,setQ]=useState('')
  const [seleccionId,setSeleccionId]=useState(null)
  const [confirmacion,setConfirmacion]=useState(null)
  const [creando,setCreando]=useState(false)
  const [aviso,setAviso]=useState('')
  const carga=useDatos(()=>vista==='agenda'?repo.programaInspecciones.citas({estado:filtro}):vista==='hallazgos'?repo.programaInspecciones.hallazgos({estado:filtro}):repo.programaInspecciones.plantillas({}),[vista,filtro])
  const lista=(carga.datos??[]).filter(x=>(vista!=='plantillas'||!filtro||x.estado===filtro)&&[x.vehiculo,x.placa,x.nombre,x.codigo,x.punto,x.asignadoA,x.plantilla].some(v=>String(v||'').toLocaleLowerCase().includes(q.toLocaleLowerCase())))
  const seleccion=lista.find(x=>x.id===seleccionId)??lista[0]
  const accion=(obj,destino,tipo)=>{setAviso('');setConfirmacion({obj,destino,tipo})}
  const actualizada=()=>{carga.recargar();setConfirmacion(null);setAviso('Cambio guardado correctamente.')}
  const opciones=vista==='agenda'?[{v:'',t:'Todas'},{v:'programada',t:'Programadas'},{v:'completada',t:'Completadas'},{v:'cancelada',t:'Canceladas'}]:vista==='hallazgos'?[{v:'',t:'Todos'},{v:'pendiente',t:'Pendientes'},{v:'en_seguimiento',t:'En seguimiento'},{v:'resuelto',t:'Resueltos'},{v:'descartado',t:'Descartados'}]:[{v:'',t:'Todas'},{v:'borrador',t:'Borradores'},{v:'publicada',t:'Publicadas'},{v:'archivada',t:'Archivadas'}]
  const hallazgoBotones=h=><div className="insp-context-actions">{h.estado==='pendiente'&&<button className="pnl-btn primario" type="button" onClick={()=>accion(h,'en_seguimiento','hallazgo')}>Dar seguimiento →</button>}{['pendiente','en_seguimiento'].includes(h.estado)&&<><button className="pnl-btn" type="button" onClick={()=>accion(h,'resuelto','hallazgo')}>Resolver</button><button className="pnl-btn sutil" type="button" onClick={()=>accion(h,'descartado','hallazgo')}>Descartar</button></>}</div>
  return <>
    {aviso&&<p className="insp-success" role="status">{aviso}</p>}
    <div className="insp-toolbar"><div><h2>{vista==='agenda'?'Agenda de inspecciones':vista==='hallazgos'?'Atiende lo que salió mal':'Listas claras para cada revisión'}</h2><p>{vista==='agenda'?'A quién le toca revisar qué unidad y cuándo.':vista==='hallazgos'?'Hallazgos registrados desde la app y su seguimiento.':'Crea un borrador, añade puntos y publícalo para programar inspecciones.'}</p></div>{vista==='plantillas'&&<button className="pnl-btn primario" type="button" onClick={()=>setCreando(true)}><Icono nombre="mas" tam={18}/>Nueva plantilla</button>}</div>
    <div className="insp-filters"><Chips opciones={opciones} valor={filtro} alCambiar={setFiltro}/><Buscador valor={q} alCambiar={setQ} placeholder={vista==='plantillas'?'Buscar plantilla…':'Buscar unidad, responsable o punto…'}/></div>
    <div className={vista==='plantillas'?'':'insp-split'}>
      <Tarjeta titulo={vista==='agenda'?'Citas de inspección':vista==='hallazgos'?'Hallazgos':'Plantillas'} sinCuerpo>
        <Feedback carga={carga} vacio={vista==='plantillas'?'Sin plantillas todavía':'Sin registros con este filtro'}>
          {!lista.length&&<Vacio icono="buscar" titulo="Sin coincidencias" texto="Cambia la búsqueda o el estado."/>}
          {vista==='agenda'&&[...new Set(lista.map(c=>String(c.fecha).slice(0,10)))].sort().map(fecha=><div key={fecha}><h3 className="insp-date-group">{fecha===f.hoyISO()?'Hoy · ':''}{f.fecha(fecha)}</h3>{lista.filter(c=>String(c.fecha).slice(0,10)===fecha).map(c=><article className={'insp-list-row'+(seleccion?.id===c.id?' selected':'')} key={c.id}><Icono nombre="inspeccion"/><div><button type="button" className="pnl-table-action" aria-pressed={seleccion?.id===c.id} onClick={()=>setSeleccionId(c.id)}>{c.vehiculo} · {c.placa||'Sin placa'}</button><p>{c.plantilla}</p><small>{c.asignadoA||'Sin responsable'}</small></div>{estado(CITAS,c.estado)}{c.inspeccionId&&<Link className="pnl-link" to={inspeccionUrl(c.inspeccionId)}>Ver resultado →</Link>}</article>)}</div>)}
          {vista==='hallazgos'&&[...lista].sort((a,b)=>Number(b.critico)-Number(a.critico)).map(h=><article className={'insp-list-row'+(seleccion?.id===h.id?' selected':'')} key={h.id}><Icono nombre={h.critico?'alerta':'inspeccion'} tam={24}/><div><button type="button" className="pnl-table-action" aria-pressed={seleccion?.id===h.id} onClick={()=>setSeleccionId(h.id)}>{h.vehiculo} · {h.punto}</button><p>{h.nota||etiquetaPunto(h.estadoPunto)}</p>{h.critico&&<Tag color="rojo">Crítico</Tag>}</div>{estado(HALLAZGOS,h.estado)}</article>)}
          {vista==='plantillas'&&lista.map(t=><article className="insp-template-row" key={t.id}><Icono nombre="documento" tam={24}/><div><h3>{t.nombre}</h3><p>{t.codigo} · v{t.version}</p></div><span>{t.puntos} puntos</span>{estado(PLANTILLAS,t.estado)}<div className="insp-inline-actions">{t.estado==='borrador'&&<button className="pnl-btn primario" type="button" onClick={()=>accion(t,'publicada','plantilla')}>Publicar</button>}{t.estado!=='archivada'&&<button className="pnl-btn sutil" type="button" onClick={()=>accion(t,'archivada','plantilla')}>Archivar</button>}</div></article>)}
        </Feedback>
        {carga.estado==='ok'&&!carga.datos?.length&&vista==='agenda'&&<div className="insp-feedback"><button className="pnl-btn primario" type="button" onClick={abrirPrograma}>Programar inspección</button></div>}
      </Tarjeta>
      {vista!=='plantillas'&&<aside className="insp-side"><h2>{vista==='agenda'?'Detalle de la cita':'Detalle del hallazgo'}</h2>{seleccion?<><h3>{seleccion.vehiculo}</h3>{estado(vista==='agenda'?CITAS:HALLAZGOS,seleccion.estado)}{vista==='agenda'?<><Datos items={[{etiqueta:'Placa',valor:seleccion.placa||'Sin placa'},{etiqueta:'Plantilla',valor:seleccion.plantilla},{etiqueta:'Responsable',valor:seleccion.asignadoA||'Sin responsable'},{etiqueta:'Fecha',valor:f.fecha(seleccion.fecha)}]}/>{seleccion.estado==='programada'&&<button className="pnl-btn insp-danger" type="button" onClick={()=>accion(seleccion,'cancelada','cita')}>Cancelar cita</button>}{seleccion.inspeccionId&&<Link className="pnl-btn" to={inspeccionUrl(seleccion.inspeccionId)}>Ver inspección realizada →</Link>}<p className="insp-info">La inspección se realiza desde la app móvil.</p></>:<><h3 className="insp-category">{seleccion.punto}</h3>{seleccion.critico&&<Tag color="rojo">Falla crítica</Tag>}<p className="insp-info">{seleccion.nota||'Sin nota registrada'}</p><Link className="pnl-link" to={inspeccionUrl(seleccion.inspeccionId)}>Ver inspección →</Link>{seleccion.odtId&&<Link className="pnl-link" to={'/panel/mantenimiento?orden='+encodeURIComponent(seleccion.odtId)}>Ver ODT vinculada →</Link>}{hallazgoBotones(seleccion)}</>}</>:<p>Elige un registro para consultar su contexto.</p>}</aside>}
    </div>
    {creando&&<NuevaPlantilla alCerrar={()=>setCreando(false)} alGuardar={()=>{setCreando(false);carga.recargar();setAviso('Plantilla creada como borrador.')}}/>}
    {confirmacion&&<Confirmacion key={confirmacion.obj.id+confirmacion.destino} {...confirmacion} alCerrar={()=>setConfirmacion(null)} alGuardar={actualizada}/>}
  </>
}
function etiquetaPunto(v){return {falla:'Falla',observacion:'Observación',conforme:'Conforme'}[v]||v}

export function ProgramarInspeccion({unidadInicial='',alCerrar,alGuardar}) {
  const [paso,setPaso]=useState(1)
  const [q,setQ]=useState('')
  const [d,setD]=useState({vehiculoId:unidadInicial||'',plantillaId:'',asignadoA:'',fecha:''})
  const [error,setError]=useState('')
  const [ocupado,setOcupado]=useState(false)
  const cuerpo=useRef(null)
  const vehiculos=useDatos(()=>repo.vehiculos.listar({}),[])
  const gente=useDatos(()=>repo.personal.listar({}),[])
  const plantillas=useDatos(()=>repo.programaInspecciones.plantillas({estado:'publicada'}),[])
  const unidad=(vehiculos.datos??[]).find(v=>v.id===d.vehiculoId)
  const persona=(gente.datos??[]).find(p=>(p.userId??p.id)===d.asignadoA)
  const plantilla=(plantillas.datos??[]).find(p=>p.id===d.plantillaId)
  const set=k=>e=>setD(v=>({...v,[k]:e.target.value}))
  useEffect(()=>{cuerpo.current?.querySelector('input,select,button')?.focus()},[paso])
  async function guardar(e){e.preventDefault();if(!unidad||!plantilla||!persona||!d.fecha)return setError('Completa unidad, plantilla publicada, responsable y fecha.');setOcupado(true);setError('');try{await repo.programaInspecciones.programar(d);alGuardar()}catch(e){setError(e.message||'No se pudo programar la inspección.')}finally{setOcupado(false)}}
  return <Modal titulo="Programar inspección" abierto alCerrar={()=>!ocupado&&alCerrar()} ancho={1000}><div className="insp-stepper"><span aria-current={paso===1?'step':undefined}><b>1</b>Unidad</span><i/><span aria-current={paso===2?'step':undefined}><b>2</b>Detalles</span></div><form onSubmit={guardar}><div className="insp-dialog-grid" ref={cuerpo}><div>
    {paso===1?<><h3>Selecciona una unidad</h3><p className="insp-info">Busca y elige la unidad que revisará el conductor.</p><Buscador valor={q} alCambiar={setQ} placeholder="Buscar unidad o placa…"/><div className="insp-unit-picker">{vehiculos.estado==='cargando'&&<Cargando filas={3}/>} {vehiculos.estado==='error'&&<ErrorCarga error={vehiculos.error} onReintentar={vehiculos.recargar}/>}
    {(vehiculos.datos??[]).filter(v=>(v.alias+' '+v.placa).toLowerCase().includes(q.toLowerCase())).map(v=><button className="insp-unit-option" type="button" key={v.id} aria-pressed={d.vehiculoId===v.id} onClick={()=>setD(x=>({...x,vehiculoId:v.id}))}><Icono nombre="camion" tam={30}/><span><b>{v.alias}</b><small>{v.placa||'Sin placa'}</small></span>{d.vehiculoId===v.id&&<Icono nombre="check"/>}</button>)}
    {vehiculos.estado==='ok'&&!(vehiculos.datos??[]).some(v=>(v.alias+' '+v.placa).toLowerCase().includes(q.toLowerCase()))&&<Vacio icono="buscar" titulo="Sin unidades disponibles" texto="Revisa la búsqueda o la flota de esta empresa."/>}</div></>:<>
      {plantillas.estado==='error'&&<ErrorCarga error={plantillas.error} onReintentar={plantillas.recargar}/>}
      {gente.estado==='error'&&<ErrorCarga error={gente.error} onReintentar={gente.recargar}/>}
      <Campo etiqueta="Plantilla" ayuda={plantillas.estado==='cargando'?'Cargando plantillas…':plantillas.datos?.length?'Solo plantillas publicadas.':'No hay plantillas publicadas. Crea y publica una en Plantillas.'}><select className="pnl-input" value={d.plantillaId} onChange={set('plantillaId')} disabled={ocupado||plantillas.estado!=='ok'}><option value="">Elige una plantilla…</option>{(plantillas.datos??[]).filter(t=>t.estado==='publicada').map(t=><option key={t.id} value={t.id}>{t.nombre} · v{t.version}</option>)}</select></Campo>
      <Campo etiqueta="Quién la hace" ayuda="Personas activas de la empresa seleccionada."><select className="pnl-input" value={d.asignadoA} onChange={set('asignadoA')} disabled={ocupado||gente.estado!=='ok'}><option value="">Elige un responsable…</option>{(gente.datos??[]).filter(p=>!p.estado||p.estado==='active'||p.estado==='activo').map(p=><option key={p.userId??p.id} value={p.userId??p.id}>{p.nombre}</option>)}</select></Campo>
      <Campo etiqueta="Cuándo"><input type="date" className="pnl-input" value={d.fecha} onChange={set('fecha')} disabled={ocupado}/></Campo>
    </>}
    {error&&<p className="pnl-campo-error" role="alert">{error}</p>}
    </div><aside className="insp-context"><h3>{paso===1?'Unidad seleccionada':'Así quedará la cita'}</h3><Icono nombre="camion" tam={70}/><h3>{unidad?.alias||'Elige una unidad'}</h3><p>{unidad?.placa||'La unidad aparecerá aquí.'}</p>{paso===2&&<Datos items={[{etiqueta:'Plantilla',valor:plantilla?.nombre||'Sin elegir'},{etiqueta:'Responsable',valor:persona?.nombre||'Sin elegir'},{etiqueta:'Fecha',valor:d.fecha?f.fecha(d.fecha):'Sin elegir'}]}/>}<p className="insp-info">La inspección se realiza desde la app.</p></aside></div><div className="insp-actions"><button className="pnl-btn sutil" type="button" disabled={ocupado} onClick={()=>paso===1?alCerrar():setPaso(1)}>{paso===1?'Cancelar':'Volver'}</button>{paso===1?<button className="pnl-btn primario" type="button" disabled={!unidad} onClick={()=>{setError('');setPaso(2)}}>Continuar →</button>:<button className="pnl-btn primario" type="submit" disabled={ocupado||plantillas.estado!=='ok'||gente.estado!=='ok'}>{ocupado?'Programando…':'Programar inspección'}</button>}</div></form></Modal>
}
function NuevaPlantilla({alCerrar,alGuardar}){
  const [d,setD]=useState({codigo:'',nombre:'',version:'1',puntos:[{nombre:'',critico:false}]})
  const [error,setError]=useState('')
  const [ocupado,setOcupado]=useState(false)
  const set=k=>e=>setD(v=>({...v,[k]:e.target.value}))
  const punto=(i,campo,valor)=>setD(v=>({...v,puntos:v.puntos.map((p,j)=>j===i?{...p,[campo]:valor}:p)}))
  async function guardar(e){e.preventDefault();if(!d.codigo.trim()||d.nombre.trim().length<2)return setError('Completa el código y un nombre de al menos 2 caracteres.');if(!Number.isInteger(Number(d.version))||Number(d.version)<1)return setError('La versión debe ser un entero positivo.');if(d.puntos.some(p=>p.nombre.trim().length<2))return setError('Cada punto necesita un nombre de al menos 2 caracteres.');setOcupado(true);setError('');try{await repo.programaInspecciones.crearPlantilla(d);alGuardar()}catch(e){setError(e.message||'No se pudo crear la plantilla.')}finally{setOcupado(false)}}
  return <Modal titulo="Nueva plantilla" abierto alCerrar={()=>!ocupado&&alCerrar()} ancho={1100}><form onSubmit={guardar}><div className="insp-dialog-grid"><div><div className="insp-form-three"><Campo etiqueta="Código"><input className="pnl-input" maxLength={50} value={d.codigo} onChange={set('codigo')} disabled={ocupado}/></Campo><Campo etiqueta="Nombre"><input className="pnl-input" maxLength={120} value={d.nombre} onChange={set('nombre')} disabled={ocupado}/></Campo><Campo etiqueta="Versión"><input type="number" min="1" step="1" className="pnl-input" value={d.version} onChange={set('version')} disabled={ocupado}/></Campo></div><h3>Puntos de inspección</h3><p className="insp-info">Añade los puntos que formarán parte de esta plantilla.</p><div className="insp-points">{d.puntos.map((p,i)=><div className="insp-point-edit" key={i}><b>{i+1}</b><input aria-label={'Nombre del punto '+(i+1)} className="pnl-input" maxLength={160} value={p.nombre} onChange={e=>punto(i,'nombre',e.target.value)} disabled={ocupado}/><label><input type="checkbox" checked={p.critico} onChange={e=>punto(i,'critico',e.target.checked)} disabled={ocupado}/>Punto crítico</label><button className="pnl-btn sutil" type="button" aria-label={'Quitar punto '+(i+1)} disabled={ocupado||d.puntos.length===1} onClick={()=>setD(v=>({...v,puntos:v.puntos.filter((_,j)=>j!==i)}))}><Icono nombre="cerrar" tam={16}/></button></div>)}</div><button className="pnl-btn" type="button" disabled={ocupado||d.puntos.length>=200} onClick={()=>setD(v=>({...v,puntos:[...v.puntos,{nombre:'',critico:false}]}))}>Añadir punto</button><p className="insp-info">Un punto crítico requiere especial atención cuando falla.</p>{error&&<p className="pnl-campo-error" role="alert">{error}</p>}</div><aside className="insp-context"><h3>Vista previa</h3><p>{d.nombre||'Nombre de la plantilla'} · v{d.version||'—'}</p><ol className="insp-preview-list">{d.puntos.map((p,i)=><li key={i}><span>{p.nombre||'Punto '+(i+1)}</span>{p.critico&&<Tag color="rojo">Crítico</Tag>}</li>)}</ol><p className="insp-info">Se guardará como borrador. Publícala después para programar inspecciones.</p></aside></div><div className="insp-actions"><button className="pnl-btn sutil" type="button" disabled={ocupado} onClick={alCerrar}>Cancelar</button><button className="pnl-btn primario" type="submit" disabled={ocupado}>{ocupado?'Guardando…':'Crear borrador'}</button></div></form></Modal>
}
function Confirmacion({obj,destino,tipo,alCerrar,alGuardar}){
  const [nota,setNota]=useState('')
  const [error,setError]=useState('')
  const [ocupado,setOcupado]=useState(false)
  const titulo=tipo==='cita'?'Cancelar esta cita':tipo==='plantilla'?(destino==='publicada'?'Publicar plantilla':'Archivar plantilla'):({en_seguimiento:'Dar seguimiento al hallazgo',resuelto:'Resolver hallazgo',descartado:'Descartar hallazgo'})[destino]
  const dic=tipo==='cita'?CITAS:tipo==='plantilla'?PLANTILLAS:HALLAZGOS
  async function guardar(e){e.preventDefault();if(tipo!=='plantilla'&&nota.trim().length<3)return setError('Escribe al menos 3 caracteres.');setOcupado(true);setError('');try{if(tipo==='cita')await repo.programaInspecciones.cancelar(obj.id,nota.trim());else if(tipo==='plantilla')await repo.programaInspecciones.cambiarPlantilla(obj,destino);else await repo.programaInspecciones.moverHallazgo(obj,destino,nota.trim());alGuardar()}catch(e){setError(e.message||'No se pudo guardar el cambio.')}finally{setOcupado(false)}}
  return <Modal titulo={titulo} abierto alCerrar={()=>!ocupado&&alCerrar()} ancho={900}><form onSubmit={guardar}><div className="insp-dialog-grid"><aside className="insp-context"><h3>{obj.vehiculo||obj.nombre}</h3><p>{obj.placa||obj.punto||obj.codigo}</p>{tipo==='cita'&&<Datos items={[{etiqueta:'Plantilla',valor:obj.plantilla},{etiqueta:'Responsable',valor:obj.asignadoA},{etiqueta:'Fecha',valor:f.fecha(obj.fecha)}]}/>} {tipo==='plantilla'&&<p>Versión {obj.version} · {obj.puntos} puntos</p>}{tipo==='hallazgo'&&<><p>{obj.nota||'Sin nota del conductor'}</p>{obj.critico&&<Tag color="rojo">Crítico</Tag>}<Link className="pnl-link" to={inspeccionUrl(obj.inspeccionId)}>Ver inspección →</Link></>}{estado(dic,obj.estado)}</aside><div><h3>Cambiar estado</h3><div className="insp-transition">{estado(dic,obj.estado)}<span aria-hidden="true">→</span>{estado(dic,destino)}</div>{tipo!=='plantilla'&&<Campo etiqueta={tipo==='cita'?'Motivo de cancelación':'Nota'} error={error}><textarea className="pnl-input" rows={5} value={nota} onChange={e=>setNota(e.target.value)} disabled={ocupado}/></Campo>}{tipo==='plantilla'&&error&&<p className="pnl-campo-error" role="alert">{error}</p>}<p className="insp-info">{tipo==='cita'?'Se guarda el motivo. No elimina inspecciones realizadas.':tipo==='hallazgo'?'El cambio no modifica el resultado original de la inspección ni desbloquea automáticamente la unidad.':destino==='publicada'?'Esta plantilla quedará disponible para programar inspecciones.':'La plantilla dejará de estar disponible para nuevas programaciones. Se conserva el registro.'}</p></div></div><div className="insp-actions"><button className="pnl-btn sutil" type="button" disabled={ocupado} onClick={alCerrar}>Volver</button><button className={'pnl-btn '+(destino==='cancelada'||destino==='descartado'?'insp-danger':'primario')} type="submit" disabled={ocupado}>{ocupado?'Guardando…':tipo==='cita'?'Cancelar cita':tipo==='plantilla'?titulo:'Confirmar cambio'}</button></div></form></Modal>
}
