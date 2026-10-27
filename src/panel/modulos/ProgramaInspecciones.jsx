import { Suspense, lazy, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Buscador, Campo, Cargando, Chips, ErrorCarga, Modal, Tag, Tarjeta, Vacio } from '../comp/ui'
import { Icono } from '../Iconos'
import * as f from '../datos/formato'
import FormatosListos from '../comp/FormatosListos'
import { hojaDePlantilla, hojasConocidas } from '../datos/hojasEmpresa'
import { AVISO_SIN_DIAS_EN_SERVIDOR, DIAS_SEMANA, alternarDia, textoDias } from '../datos/diasPlanilla'

// «La hoja de tu empresa» trae el lector de PDF, el de fotos y el de Excel: se carga solo al abrirla.
const HojaEmpresa = lazy(() => import('../comp/HojaEmpresa'))
const imprimirPrueba = (...a) => import('../comp/HojaEmpresa').then((m) => m.imprimirPrueba(...a))

const HALLAZGOS = {pendiente:['Pendiente','ambar'],en_seguimiento:['En seguimiento','azul'],resuelto:['Resuelto','verde'],descartado:['Descartado','gris']}
const PLANTILLAS = {borrador:['Borrador','gris'],publicada:['Publicada','verde'],archivada:['Archivada','gris']}
const estado = (dic, valor) => <Tag color={dic[valor]?.[1] || 'gris'}>{dic[valor]?.[0] || valor}</Tag>
const inspeccionUrl = id => '/panel/inspecciones?vista=historial&inspeccion='+encodeURIComponent(id)
function Feedback({ carga, children, vacio }) {
  if(carga.estado === 'cargando') return <Cargando filas={3}/>
  if(carga.estado === 'error') return <ErrorCarga error={carga.error} onReintentar={carga.recargar}/>
  return carga.datos?.length ? children : <Vacio icono="inspeccion" titulo={vacio} texto="Los registros de este filtro aparecerán aquí."/>
}
/** Hallazgos y Plantillas de inspecciones (las citas programadas ya no se muestran en el panel). */
export default function ProgramaInspecciones({vista='hallazgos'}) {
  const [filtro,setFiltro]=useState('')
  const [q,setQ]=useState('')
  const [seleccionId,setSeleccionId]=useState(null)
  const [confirmacion,setConfirmacion]=useState(null)
  const [creando,setCreando]=useState(false)
  const [cambiandoDias,setCambiandoDias]=useState(null)
  const [desdeHoja,setDesdeHoja]=useState(false)
  const conHoja=new Set(vista==='plantillas'?hojasConocidas().map(h=>h.codigo+'@'+h.version):[])
  const probarHoja=async t=>{setAviso('');const h=await hojaDePlantilla({codigo:t.codigo,version:t.version});if(!h)return setAviso('No encontramos la hoja de esta plantilla en este navegador.');imprimirPrueba(h.mapa,h.paginas)}
  const [aviso,setAviso]=useState('')
  const carga=useDatos(()=>vista==='hallazgos'?repo.programaInspecciones.hallazgos({estado:filtro}):repo.programaInspecciones.plantillas({}),[vista,filtro])
  const lista=(carga.datos??[]).filter(x=>(vista!=='plantillas'||!filtro||x.estado===filtro)&&[x.vehiculo,x.placa,x.nombre,x.codigo,x.punto,x.asignadoA,x.plantilla].some(v=>String(v||'').toLocaleLowerCase().includes(q.toLocaleLowerCase())))
  // Con el servidor viejo ninguna plantilla trae días: se avisa en vez de ofrecer algo que no funciona.
  const soportaDias=!carga.datos?.length||carga.datos.some(t=>t.soportaDias)
  const seleccion=lista.find(x=>x.id===seleccionId)??lista[0]
  const accion=(obj,destino,tipo)=>{setAviso('');setConfirmacion({obj,destino,tipo})}
  const actualizada=()=>{carga.recargar();setConfirmacion(null);setAviso('Cambio guardado correctamente.')}
  const opciones=vista==='hallazgos'?[{v:'',t:'Todos'},{v:'pendiente',t:'Pendientes'},{v:'en_seguimiento',t:'En seguimiento'},{v:'resuelto',t:'Resueltos'},{v:'descartado',t:'Descartados'}]:[{v:'',t:'Todas'},{v:'borrador',t:'Borradores'},{v:'publicada',t:'Publicadas'},{v:'archivada',t:'Archivadas'}]
  const hallazgoBotones=h=><div className="insp-context-actions">{h.estado==='pendiente'&&<button className="pnl-btn primario" type="button" onClick={()=>accion(h,'en_seguimiento','hallazgo')}>Dar seguimiento →</button>}{['pendiente','en_seguimiento'].includes(h.estado)&&<><button className="pnl-btn" type="button" onClick={()=>accion(h,'resuelto','hallazgo')}>Resolver</button><button className="pnl-btn sutil" type="button" onClick={()=>accion(h,'descartado','hallazgo')}>Descartar</button></>}</div>
  return <>
    {aviso&&<p className="insp-success" role="status">{aviso}</p>}
    <div className="insp-toolbar"><div><h2>{vista==='hallazgos'?'Atiende lo que salió mal':'Listas claras para cada revisión'}</h2><p>{vista==='hallazgos'?'Hallazgos registrados desde la app y su seguimiento.':'Crea un borrador, añade puntos y publícalo para que los conductores lo usen en la app.'}</p></div>{vista==='plantillas'&&<div className="insp-cab-acciones"><button className="pnl-btn sutil" type="button" onClick={()=>setDesdeHoja(true)}><Icono nombre="documento" tam={18}/>Crear desde la hoja de tu empresa</button><button className="pnl-btn primario" type="button" onClick={()=>setCreando(true)}><Icono nombre="mas" tam={18}/>Nueva plantilla</button></div>}</div>
    {vista==='plantillas'&&<FormatosListos plantillas={carga.datos} alPublicar={m=>{carga.recargar();setAviso(m)}}/>}
    <div className="insp-filters"><Chips opciones={opciones} valor={filtro} alCambiar={setFiltro}/><Buscador valor={q} alCambiar={setQ} placeholder={vista==='plantillas'?'Buscar plantilla…':'Buscar unidad, responsable o punto…'}/></div>
    <div className={vista==='plantillas'?'':'insp-split'}>
      <Tarjeta titulo={vista==='hallazgos'?'Hallazgos':'Plantillas'} sinCuerpo>
        <Feedback carga={carga} vacio={vista==='plantillas'?'Sin plantillas todavía':'Sin registros con este filtro'}>
          {!lista.length&&<Vacio icono="buscar" titulo="Sin coincidencias" texto="Cambia la búsqueda o el estado."/>}
          {vista==='hallazgos'&&[...lista].sort((a,b)=>Number(b.critico)-Number(a.critico)).map(h=><article className={'insp-list-row'+(seleccion?.id===h.id?' selected':'')} key={h.id}><Icono nombre={h.critico?'alerta':'inspeccion'} tam={24}/><div><button type="button" className="pnl-table-action" aria-pressed={seleccion?.id===h.id} onClick={()=>setSeleccionId(h.id)}>{h.vehiculo} · {h.punto}</button><p>{h.nota||etiquetaPunto(h.estadoPunto)}</p>{h.critico&&<Tag color="rojo">Crítico</Tag>}</div>{estado(HALLAZGOS,h.estado)}</article>)}
          {vista==='plantillas'&&lista.map(t=><article className="insp-template-row" key={t.id}><Icono nombre="documento" tam={24}/><div><h3>{t.nombre}</h3><p>{t.codigo} · v{t.version}</p>{t.soportaDias&&<p className="insp-dias-fila">{textoDias(t.dias)}</p>}</div><span>{f.cantidad(t.puntos, 'punto', 'puntos')}</span>{conHoja.has(t.codigo+'@'+t.version)&&<Tag color="azul">Con hoja de la empresa</Tag>}{estado(PLANTILLAS,t.estado)}<div className="insp-inline-actions">{conHoja.has(t.codigo+'@'+t.version)&&<button className="pnl-btn sutil" type="button" onClick={()=>probarHoja(t)}>Imprimir prueba</button>}{t.soportaDias&&t.estado!=='archivada'&&<button className="pnl-btn sutil" type="button" onClick={()=>{setAviso('');setCambiandoDias(t)}}>Cambiar días</button>}{t.estado==='borrador'&&<button className="pnl-btn primario" type="button" onClick={()=>accion(t,'publicada','plantilla')}>Publicar</button>}{t.estado!=='archivada'&&<button className="pnl-btn sutil" type="button" onClick={()=>accion(t,'archivada','plantilla')}>Archivar</button>}</div></article>)}
        </Feedback>
        {vista==='plantillas'&&!soportaDias&&<p className="insp-dias-aviso">Días de la semana: {AVISO_SIN_DIAS_EN_SERVIDOR.toLocaleLowerCase('es')}.</p>}
      </Tarjeta>
      {vista!=='plantillas'&&<aside className="insp-side"><h2>Detalle del hallazgo</h2>{seleccion?<><h3>{seleccion.vehiculo}</h3>{estado(HALLAZGOS,seleccion.estado)}<h3 className="insp-category">{seleccion.punto}</h3>{seleccion.critico&&<Tag color="rojo">Falla crítica</Tag>}<p className="insp-info">{seleccion.nota||'Sin nota registrada'}</p><Link className="pnl-link" to={inspeccionUrl(seleccion.inspeccionId)}>Ver inspección →</Link>{seleccion.odtId&&<Link className="pnl-link" to={'/panel/mantenimiento?orden='+encodeURIComponent(seleccion.odtId)}>Ver ODT vinculada →</Link>}{hallazgoBotones(seleccion)}</>:<p>Elige un registro para consultar su contexto.</p>}</aside>}
    </div>
    {desdeHoja&&<Suspense fallback={<Modal titulo="Crear desde la hoja de tu empresa" abierto alCerrar={()=>setDesdeHoja(false)}><Cargando filas={3}/></Modal>}><HojaEmpresa plantillas={carga.datos??[]} alCerrar={()=>setDesdeHoja(false)} alGuardar={m=>{carga.recargar();setAviso(m)}}/></Suspense>}
    {cambiandoDias&&<CambiarDias plantilla={cambiandoDias} alCerrar={()=>setCambiandoDias(null)} alGuardar={()=>{setCambiandoDias(null);carga.recargar();setAviso('Días guardados correctamente.')}}/>}
    {creando&&<NuevaPlantilla soportaDias={soportaDias} alCerrar={()=>setCreando(false)} alGuardar={()=>{setCreando(false);carga.recargar();setAviso('Plantilla creada como borrador.')}}/>}
    {confirmacion&&<Confirmacion key={confirmacion.obj.id+confirmacion.destino} {...confirmacion} alCerrar={()=>setConfirmacion(null)} alGuardar={actualizada}/>}
  </>
}
function etiquetaPunto(v){return {falla:'Falla',observacion:'Observación',conforme:'Conforme'}[v]||v}

/** 7 botones L M M J V S D; ninguno marcado = todos los días. */
function SelectorDias({valor,alCambiar,deshabilitado}){
  return <div role="group" aria-label="Días en que toca"><div className="insp-dias-sel">{DIAS_SEMANA.map(d=><button key={d.valor} type="button" className="insp-dia" aria-pressed={valor.includes(d.valor)} aria-label={d.largo} title={d.largo} disabled={deshabilitado} onClick={()=>alCambiar(alternarDia(valor,d.valor))}>{d.letra}</button>)}</div><p className="insp-dias-resumen">{textoDias(valor)}</p></div>
}
function CambiarDias({plantilla,alCerrar,alGuardar}){
  const [dias,setDias]=useState(plantilla.dias??[])
  const [error,setError]=useState('')
  const [ocupado,setOcupado]=useState(false)
  async function guardar(e){e.preventDefault();setOcupado(true);setError('');try{await repo.programaInspecciones.cambiarDias(plantilla,dias);alGuardar()}catch(e){setError(e.message||'No se pudieron guardar los días.')}finally{setOcupado(false)}}
  return <Modal titulo="Cambiar días" abierto alCerrar={()=>!ocupado&&alCerrar()} ancho={560}><form onSubmit={guardar}><h3>{plantilla.nombre}</h3><p className="insp-info">{plantilla.codigo} · v{plantilla.version}</p><h3 className="insp-category">Días en que toca</h3><SelectorDias valor={dias} alCambiar={setDias} deshabilitado={ocupado}/><p className="insp-info">Si no marcas ninguno, la planilla toca todos los días. El cambio vale desde hoy y no necesita una versión nueva.</p>{error&&<p className="pnl-campo-error" role="alert">{error}</p>}<div className="insp-actions"><button className="pnl-btn sutil" type="button" disabled={ocupado} onClick={alCerrar}>Cancelar</button><button className="pnl-btn primario" type="submit" disabled={ocupado}>{ocupado?'Guardando…':'Guardar días'}</button></div></form></Modal>
}

function NuevaPlantilla({alCerrar,alGuardar,soportaDias=true}){
  const [d,setD]=useState({codigo:'',nombre:'',version:'1',dias:[],puntos:[{nombre:'',critico:false}]})
  const [error,setError]=useState('')
  const [ocupado,setOcupado]=useState(false)
  const set=k=>e=>setD(v=>({...v,[k]:e.target.value}))
  const punto=(i,campo,valor)=>setD(v=>({...v,puntos:v.puntos.map((p,j)=>j===i?{...p,[campo]:valor}:p)}))
  async function guardar(e){e.preventDefault();if(!d.codigo.trim()||d.nombre.trim().length<2)return setError('Completa el código y un nombre de al menos 2 caracteres.');if(!Number.isInteger(Number(d.version))||Number(d.version)<1)return setError('La versión debe ser un entero positivo.');if(d.puntos.some(p=>p.nombre.trim().length<2))return setError('Cada punto necesita un nombre de al menos 2 caracteres.');setOcupado(true);setError('');try{await repo.programaInspecciones.crearPlantilla(d);alGuardar()}catch(e){setError(e.message||'No se pudo crear la plantilla.')}finally{setOcupado(false)}}
  return <Modal titulo="Nueva plantilla" abierto alCerrar={()=>!ocupado&&alCerrar()} ancho={1100}><form onSubmit={guardar}><div className="insp-dialog-grid"><div><div className="insp-form-three"><Campo etiqueta="Código"><input className="pnl-input" maxLength={50} value={d.codigo} onChange={set('codigo')} disabled={ocupado}/></Campo><Campo etiqueta="Nombre"><input className="pnl-input" maxLength={120} value={d.nombre} onChange={set('nombre')} disabled={ocupado}/></Campo><Campo etiqueta="Versión"><input type="number" min="1" step="1" className="pnl-input" value={d.version} onChange={set('version')} disabled={ocupado}/></Campo></div>{soportaDias?<><h3>Días en que toca</h3><SelectorDias valor={d.dias} alCambiar={dias=>setD(v=>({...v,dias}))} deshabilitado={ocupado}/></>:<p className="insp-info">Días de la semana: {AVISO_SIN_DIAS_EN_SERVIDOR.toLocaleLowerCase('es')}.</p>}<h3>Puntos de inspección</h3><p className="insp-info">Añade los puntos que formarán parte de esta plantilla.</p><div className="insp-points">{d.puntos.map((p,i)=><div className="insp-point-edit" key={i}><b>{i+1}</b><input aria-label={'Nombre del punto '+(i+1)} className="pnl-input" maxLength={160} value={p.nombre} onChange={e=>punto(i,'nombre',e.target.value)} disabled={ocupado}/><label><input type="checkbox" checked={p.critico} onChange={e=>punto(i,'critico',e.target.checked)} disabled={ocupado}/>Punto crítico</label><button className="pnl-btn sutil" type="button" aria-label={'Quitar punto '+(i+1)} disabled={ocupado||d.puntos.length===1} onClick={()=>setD(v=>({...v,puntos:v.puntos.filter((_,j)=>j!==i)}))}><Icono nombre="cerrar" tam={16}/></button></div>)}</div><button className="pnl-btn" type="button" disabled={ocupado||d.puntos.length>=200} onClick={()=>setD(v=>({...v,puntos:[...v.puntos,{nombre:'',critico:false}]}))}>Añadir punto</button><p className="insp-info">Un punto crítico requiere especial atención cuando falla.</p>{error&&<p className="pnl-campo-error" role="alert">{error}</p>}</div><aside className="insp-context"><h3>Vista previa</h3><p>{d.nombre||'Nombre de la plantilla'} · v{d.version||'—'}</p>{soportaDias&&<p>{textoDias(d.dias)}</p>}<ol className="insp-preview-list">{d.puntos.map((p,i)=><li key={i}><span>{p.nombre||'Punto '+(i+1)}</span>{p.critico&&<Tag color="rojo">Crítico</Tag>}</li>)}</ol><p className="insp-info">Se guardará como borrador. Publícala después para que los conductores la usen en la app.</p></aside></div><div className="insp-actions"><button className="pnl-btn sutil" type="button" disabled={ocupado} onClick={alCerrar}>Cancelar</button><button className="pnl-btn primario" type="submit" disabled={ocupado}>{ocupado?'Guardando…':'Crear borrador'}</button></div></form></Modal>
}
function Confirmacion({obj,destino,tipo,alCerrar,alGuardar}){
  const [nota,setNota]=useState('')
  const [error,setError]=useState('')
  const [ocupado,setOcupado]=useState(false)
  const titulo=tipo==='plantilla'?(destino==='publicada'?'Publicar plantilla':'Archivar plantilla'):({en_seguimiento:'Dar seguimiento al hallazgo',resuelto:'Resolver hallazgo',descartado:'Descartar hallazgo'})[destino]
  const dic=tipo==='plantilla'?PLANTILLAS:HALLAZGOS
  async function guardar(e){e.preventDefault();if(tipo!=='plantilla'&&nota.trim().length<3)return setError('Escribe al menos 3 caracteres.');setOcupado(true);setError('');try{if(tipo==='plantilla')await repo.programaInspecciones.cambiarPlantilla(obj,destino);else await repo.programaInspecciones.moverHallazgo(obj,destino,nota.trim());alGuardar()}catch(e){setError(e.message||'No se pudo guardar el cambio.')}finally{setOcupado(false)}}
  return <Modal titulo={titulo} abierto alCerrar={()=>!ocupado&&alCerrar()} ancho={900}><form onSubmit={guardar}><div className="insp-dialog-grid"><aside className="insp-context"><h3>{obj.vehiculo||obj.nombre}</h3><p>{obj.placa||obj.punto||obj.codigo}</p>{tipo==='plantilla'&&<p>Versión {obj.version} · {f.cantidad(obj.puntos, 'punto', 'puntos')}</p>}{tipo==='hallazgo'&&<><p>{obj.nota||'Sin nota del conductor'}</p>{obj.critico&&<Tag color="rojo">Crítico</Tag>}<Link className="pnl-link" to={inspeccionUrl(obj.inspeccionId)}>Ver inspección →</Link></>}{estado(dic,obj.estado)}</aside><div><h3>Cambiar estado</h3><div className="insp-transition">{estado(dic,obj.estado)}<span aria-hidden="true">→</span>{estado(dic,destino)}</div>{tipo!=='plantilla'&&<Campo etiqueta="Nota" error={error}><textarea className="pnl-input" rows={5} value={nota} onChange={e=>setNota(e.target.value)} disabled={ocupado}/></Campo>}{tipo==='plantilla'&&error&&<p className="pnl-campo-error" role="alert">{error}</p>}<p className="insp-info">{tipo==='hallazgo'?'El cambio no modifica el resultado original de la inspección ni desbloquea automáticamente la unidad.':destino==='publicada'?'Esta plantilla quedará disponible para las inspecciones desde la app.':'La plantilla dejará de estar disponible para nuevas inspecciones. Se conserva el registro.'}</p></div></div><div className="insp-actions"><button className="pnl-btn sutil" type="button" disabled={ocupado} onClick={alCerrar}>Volver</button><button className={'pnl-btn '+(destino==='cancelada'||destino==='descartado'?'insp-danger':'primario')} type="submit" disabled={ocupado}>{ocupado?'Guardando…':tipo==='plantilla'?titulo:'Confirmar cambio'}</button></div></form></Modal>
}
