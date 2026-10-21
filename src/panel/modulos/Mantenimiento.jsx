import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Planes from './Planes'
import VehicleVisual from '../../components/VehicleVisual'
import './mantenimiento.css'
import '../../styles/movil-modulos.css'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import {
  Barra,
  Buscador,
  Campo,
  Cargando,
  Datos,
  ErrorCarga,
  Modal,
  Tag,
  Tarjeta,
  Vacio,
} from '../comp/ui'
import * as f from '../datos/formato'
import { color, etiqueta } from '../datos/catalogos'
import { ESTADOS_VISIBLES, estadoVisible, presentarHistorial } from '../datos/historial-odt'
import { GaleriaArchivos, SelectorArchivos } from '../comp/Archivos'
import { puedeSubirArchivos, subirArchivo, subirVarios } from '../datos/archivos'
import { Icono } from '../Iconos'
import OdtAsignadas from '../comp/OdtAsignadas'
import TarjetaMantenimiento, { GrupoTarjetas } from '../comp/TarjetaMantenimiento'
import { masNuevasPrimero } from '../datos/odtAsignadas'
import { esGestor } from '../roles'

// ============================================================
// MANTENIMIENTO — órdenes de trabajo de la flota.
// La app móvil solo muestra la lista de ODT de un vehículo; aquí el
// supervisor ve toda la operación: tablero por estado, tabla completa,
// expediente de cada orden y las reglas que crean las preventivas solas.
// ============================================================

// Etiquetas, filtros y cifras usan los 3 estados visibles (Abierta / En
// revisión / Resuelta, ver historial-odt). Los pasos de abajo siguen con los
// nueve estados del servidor: eso es lo que se envía y no cambia.
const EN_CURSO = ESTADOS_VISIBLES.find(g => g.clave === 'revision').estados

/** La etiqueta de estado de una orden, con los 3 estados visibles. */
function EstadoOdt({ estado }) {
  const g = estadoVisible(estado)
  return <Tag color={g.color}>{g.etiqueta}</Tag>
}

// «Cómo avanza una ODT»: un paso por estado visible.
const PASOS_GUIA = {
  abierta: 'Alguien reporta la falla y elige la unidad.',
  revision: 'El supervisor la revisa, asigna quién hace el trabajo y sigue el avance.',
  resuelta: 'Se confirma la solución y se registra el costo si lo hay.',
}

// La nota que pide cada paso, igual que en la app. Las obligatorias exigen 3
// letras (el servidor guarda la nota en el historial y no acepta menos).
const NOTA_OPCIONAL = { etiqueta: 'Nota (opcional)', ayuda: 'Si la escribes, queda en el historial de la orden.' }
const NOTA_CANCELAR = { etiqueta: 'Por qué se cancela', obligatoria: true, ejemplo: 'Se reportó dos veces; la atiende la otra orden.' }
const NOTA_QUE_FALTA = { etiqueta: 'Qué falta', obligatoria: true, ejemplo: 'Falta la foto del tablero con el testigo encendido.' }
const NOTA_REABRIR = { etiqueta: 'Por qué se reabre', obligatoria: true, ejemplo: 'El ruido volvió a los dos días.' }
const NOTA_PAUSA = { etiqueta: 'Motivo de la pausa', obligatoria: true, ejemplo: 'Falta el repuesto; llega mañana.' }
const NOTA_ENTREGA = { etiqueta: 'Qué se hizo', obligatoria: true, ejemplo: 'Se cambiaron las pastillas delanteras y se probó el frenado.' }

// Los pasos posibles desde cada estado: la tabla de transiciones del servidor
// más los dos caminos aparte que usa la app, asignar responsable (aprobada o
// asignada → asignada) y los eventos de ejecución (inicio, pausa, reanudación,
// entrega). Reasignar solo existe antes de empezar: el servidor no lo admite
// con el trabajo en curso.
const PASOS_ODT = {
  abierta: [
    { a: 'en_revision', t: 'Pasar a revisión', nota: NOTA_OPCIONAL, sinNota: 'Pasada a revisión' },
    { a: 'cerrada', t: 'Resolver sin taller' },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true, nota: NOTA_CANCELAR },
  ],
  en_revision: [
    { a: 'aprobada', t: 'Aprobar', nota: NOTA_OPCIONAL, sinNota: 'Aprobada' },
    { a: 'abierta', t: 'Devolver a abierta', sutil: true, nota: NOTA_QUE_FALTA },
    { a: 'cerrada', t: 'Resolver sin taller' },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true, nota: NOTA_CANCELAR },
  ],
  aprobada: [
    { a: 'asignar', t: 'Asignar responsable', nota: NOTA_OPCIONAL },
    { a: 'en_revision', t: 'Volver a revisión', sutil: true, nota: NOTA_QUE_FALTA },
    { a: 'cerrada', t: 'Resolver sin taller' },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true, nota: NOTA_CANCELAR },
  ],
  asignada: [
    { a: 'inicio', t: 'Iniciar trabajo', ejecucion: true },
    { a: 'asignar', t: 'Reasignar', sutil: true, nota: NOTA_OPCIONAL },
    { a: 'en_revision', t: 'Volver a revisión', sutil: true, nota: NOTA_QUE_FALTA },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true, nota: NOTA_CANCELAR },
  ],
  en_ejecucion: [
    { a: 'entrega', t: 'Entregar', ejecucion: true, nota: NOTA_ENTREGA },
    { a: 'pausa', t: 'Pausar', ejecucion: true, sutil: true, nota: NOTA_PAUSA },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true, nota: NOTA_CANCELAR },
  ],
  pausada: [
    { a: 'reanudacion', t: 'Reanudar', ejecucion: true },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true, nota: NOTA_CANCELAR },
  ],
  en_calidad: [
    { a: 'cerrada', t: 'Cerrar' },
    { a: 'en_ejecucion', t: 'Devolver a ejecución', sutil: true, nota: NOTA_QUE_FALTA },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true, nota: NOTA_CANCELAR },
  ],
  cerrada: [{ a: 'en_revision', t: 'Reabrir', nota: NOTA_REABRIR }],
  cancelada: [],
}
const AYUDA_ODT = {
  abierta: 'Alguien reportó la falla. Pásala a revisión para evaluarla, o resuélvela directo si no necesita taller.',
  en_revision: 'Se está evaluando. Apruébala para llevarla a taller, o resuélvela sin taller si ya se atendió.',
  aprobada: 'Aprobada. Asigna quién la ejecuta en taller (lo verá en su app), o resuélvela sin taller.',
  asignada: 'Tiene responsable. El trabajo empieza cuando el responsable lo inicia desde su app.',
  en_ejecucion: 'En taller. Cuando termine, el responsable la entrega con lo que se hizo.',
  pausada: 'El trabajo está detenido. Reanúdalo cuando siga.',
  en_calidad: 'Terminó el trabajo: revisa y cierra con lo que se hizo y el costo.',
  cerrada: 'Si la falla volvió, reábrela: pasa a revisión y el cierre queda en el historial.',
  cancelada: 'Cancelada: no admite más cambios.',
}

const TIPOS_FALLA = ['motor', 'frenos', 'neumaticos', 'electrico', 'carroceria', 'otro']
const PRIORIDADES = ['baja', 'media', 'alta']

// Letras (con tildes), números y lo poco que se usa al nombrar una pieza: como la app.
const RE_TEXTO_CORTO = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9 .\-/]+$/u
const RE_ALGUNA_LETRA = /[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/u

/** La parte que falló («Otro») o el título de una foto: corto, con alguna letra y sin símbolos. */
function revisarTextoCorto(valor, { min = 3, max = 40, vacio = 'Escríbelo.', sinLetras = 'Usa palabras, no solo números.' } = {}) {
  const v = String(valor ?? '').trim()
  if (!v) return vacio
  if (v.length < min) return `Muy corto: mínimo ${min} caracteres.`
  if (v.length > max) return `Máximo ${max} caracteres.`
  if (!RE_TEXTO_CORTO.test(v)) return 'Solo letras, números y espacios.'
  if (!RE_ALGUNA_LETRA.test(v)) return sinLetras
  return null
}

/**
 * Un monto o un kilometraje escrito a mano: ≥ 0, hasta 2 decimales, con punto
 * o coma. Devuelve el número, null si está vacío, o NaN si no se entiende.
 */
function leerMonto(texto) {
  const t = String(texto ?? '').trim().replace(/\s/gu, '')
  if (t === '') return null
  if (!/^\d+([.,]\d{1,2})?$/u.test(t)) return Number.NaN
  return Number(t.replace(',', '.'))
}

const UBICACION_POR_DEFECTO = 'Registrada desde el panel'

/** Ámbar para lo correctivo (algo se dañó), azul para lo preventivo (algo se cuida). */
function colorTipo(tipo) {
  return tipo === 'preventiva' ? 'azul' : 'ambar'
}

/** Todo el módulo se pide junto: un solo error con reintento en vez de tres. */
function cargarMantenimiento() {
  return Promise.all([repo.odts.listar({}), repo.vehiculos.listar({})]).then(
    ([odts, vehiculos]) => ({ odts, vehiculos, reglas: [] })
  )
}

export default function Mantenimiento() {
  const [params, setParams] = useSearchParams()
  const vista = ['planes', 'todas'].includes(params.get('vista')) ? params.get('vista') : 'ordenes'
  function cambiar(v) { setParams(v === 'ordenes' ? {} : { vista: v }) }
  return <div className="mnt-root">
    <div className="mnt-heading"><div><span className="mnt-breadcrumb">Inicio › Mantenimiento</span><h1>Mantenimiento</h1><p>Qué necesita atención y qué sigue.</p></div></div>
    <nav className="mnt-nav" aria-label="Secciones de mantenimiento">
      {[['ordenes', 'llave', 'Órdenes'], ['todas', 'documento', 'Todas las órdenes'], ['planes', 'sync', 'Planes']].map(([v, icono, t]) => <button key={v} type="button" aria-current={vista === v ? 'page' : undefined} className={vista === v ? 'activo' : ''} onClick={() => cambiar(v)}><Icono nombre={icono} tam={18}/>{t}</button>)}
    </nav>
    {['ordenes', 'todas'].includes(vista) ? <Ordenes key={vista} listaCompleta={vista === 'todas'} /> : <Planes key={vista} vista={vista} integrado />}
  </div>
}

function Ordenes({ listaCompleta = false }) {
  const sesion = useSesion()
  const { datos, estado, error, recargar } = useDatos(cargarMantenimiento, [])
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [vista, setVista] = useState(listaCompleta ? 'lista' : 'atencion')
  const [unidadFiltro, setUnidadFiltro] = useState('')
  const [grupo, setGrupo] = useState('')
  const [params] = useSearchParams()
  const [detalleId, setDetalleId] = useState(() => params.get('orden'))
  const [creando, setCreando] = useState(false)
  const [aviso, setAviso] = useState('')
  const odts = datos?.odts ?? []
  const vehiculos = datos?.vehiculos ?? []
  // Lo que deja pasar la búsqueda, el tipo y la unidad, sin mirar el estado: de aquí salen las
  // cuentas del control de estado. Siempre de la más nueva a la más vieja, como la app.
  const sinEstado = useMemo(() => masNuevasPrimero(odts.filter(o => {
    if (tipo && o.tipo !== tipo) return false
    if (unidadFiltro && o.vehiculoId !== unidadFiltro) return false
    return [o.id, o.descripcion, o.vehiculoNombre, o.creadorNombre, etiqueta('tipo_falla', o.tipoFalla)].join(' ').toLowerCase().includes(q.trim().toLowerCase())
  })), [odts, q, tipo, unidadFiltro])
  const visibles = useMemo(() => (grupo ? sinEstado.filter(o => estadoVisible(o.estado).clave === grupo) : sinEstado), [sinEstado, grupo])
  const detalle = detalleId ? odts.find(o => o.id === detalleId) : null
  // Arriba de la lista, justo debajo del título y el buscador: el estado y el tipo de orden.
  const filtrosArriba = <div className="mnt-filtrar"><FiltroEstado odts={sinEstado} valor={grupo} alCambiar={setGrupo}/><FiltroTipo odts={odts} valor={tipo} alCambiar={setTipo}/></div>
  const cambioVista = <div className="mnt-view"><button type="button" aria-pressed={vista === 'atencion'} onClick={() => setVista('atencion')}>Prioridades</button><button type="button" aria-pressed={vista === 'lista'} onClick={() => setVista('lista')}>Lista</button></div>
  return <div className="mnt-content">
    <div className="mnt-toolbar"><div><h2>{listaCompleta ? 'Todas las órdenes de mantenimiento' : 'Órdenes de trabajo'}</h2><p>{listaCompleta ? 'Consulta abiertas, en revisión y resueltas de esta empresa.' : 'De la falla reportada a la unidad lista para volver.'}</p></div><button className="pnl-btn primario" type="button" onClick={() => setCreando(true)}><Icono nombre="mas" tam={18}/>Nueva ODT</button></div>
    {aviso && <div className="mnt-success" role="status"><Icono nombre="check" tam={20}/>{aviso}</div>}
    {estado === 'cargando' && <Cargando filas={6}/>}
    {estado === 'error' && <ErrorCarga onReintentar={recargar} texto={error?.message}/>}
    {estado === 'ok' && <>
      {/* Arriba de todo, lo que le toca hacer a quien tiene la sesión (solo si es responsable de alguna). */}
      {!listaCompleta && <OdtAsignadas odts={odts} perfil={sesion?.perfil ?? null} alCambiar={recargar} alAbrir={setDetalleId}/>}
      <Indicadores odts={odts}/>
      {listaCompleta && <div className="mnt-filters"><Buscador valor={q} alCambiar={setQ} placeholder="Buscar orden o unidad…"/></div>}
      {listaCompleta && filtrosArriba}
      {listaCompleta && <div className="mnt-all-filters">
        <Campo etiqueta="Vehículo"><select aria-label="Vehículo" className="pnl-input" value={unidadFiltro} onChange={e => setUnidadFiltro(e.target.value)}><option value="">Todos los vehículos</option>{[...new Map(odts.map(o => [o.vehiculoId, o.vehiculoNombre])).entries()].filter(([id]) => id).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></Campo>
        <p role="status">{visibles.length} de {odts.length} órdenes</p>
        {(q || tipo || unidadFiltro || grupo) && <button type="button" className="pnl-btn sutil" onClick={() => { setQ(''); setTipo(''); setUnidadFiltro(''); setGrupo('') }}>Limpiar filtros</button>}
      </div>}
      {listaCompleta
        ? <Tarjeta titulo="Todas las órdenes" sinCuerpo><div className="mnt-lista-cuerpo"><Tarjetas odts={visibles} alAbrir={setDetalleId} tanda={30}/></div></Tarjeta>
        : <div className="mnt-overview"><div><Tarjeta titulo="Órdenes de trabajo" accion={<div className="mnt-attention-tools">{cambioVista}<Buscador valor={q} alCambiar={setQ} placeholder="Buscar orden o unidad…"/></div>} sinCuerpo>{filtrosArriba}<div className="mnt-lista-cuerpo">{vista === 'atencion' ? <PorEstado odts={visibles} alAbrir={setDetalleId} alCrear={() => setCreando(true)}/> : <Tarjetas odts={visibles} alAbrir={setDetalleId} tanda={30}/>}</div></Tarjeta></div><aside className="mnt-guide"><h3>Cómo avanza una ODT</h3><p className="mnt-guide-intro">Del reporte al cierre, en tres pasos.</p>{ESTADOS_VISIBLES.map((g,i) => <div className="mnt-guide-step" key={g.clave}><b>{i+1}</b><div><Tag color={g.color}>{g.etiqueta}</Tag><p>{PASOS_GUIA[g.clave]}</p></div></div>)}<Link to="/panel/mantenimiento?vista=planes" className="pnl-link">Prepara tus servicios con un plan →</Link></aside></div>}
      <details className="mnt-legacy"><summary>Consultar reglas heredadas</summary><ReglasHeredadas/></details>
    </>}
    <Modal titulo="Detalle de la orden" abierto={Boolean(detalle)} alCerrar={() => setDetalleId(null)} ancho={1080}>{detalle && <Detalle key={detalle.id} odt={detalle} perfil={sesion?.perfil ?? null} vehiculo={vehiculos.find(v => v.id === detalle.vehiculoId)} recargar={recargar} alCerrar={() => setDetalleId(null)}/>}</Modal>
    <Modal titulo="Nueva ODT" abierto={creando} alCerrar={() => setCreando(false)} ancho={840}>{creando && <NuevaOdt vehiculos={vehiculos} creadorId={sesion?.perfil?.id ?? null} recargar={recargar} alCerrar={() => setCreando(false)} alCrear={nombre => setAviso(`ODT creada para ${nombre}. Ya puedes revisarla.`)}/>}</Modal>
  </div>
}

// Las órdenes llegan ya de la más nueva a la más vieja (masNuevasPrimero): aquí no se reordenan.

/** Las tarjetas seguidas, de a `tanda` con «Ver más» (el historial entero pueden ser cientos). */
export function Tarjetas({ odts, alAbrir, tanda = 12, unidad = true, vacio = 'No hay órdenes con estos filtros' }) {
  const [tope, setTope] = useState(tanda)
  if (!odts.length) return <Vacio icono="llave" titulo={vacio} texto="Prueba con otra búsqueda, otro estado u otro tipo de orden."/>
  return <>
    <div className="mnt-tarjetas">{odts.slice(0, tope).map(o => <TarjetaMantenimiento key={o.id} odt={o} alAbrir={alAbrir} unidad={unidad}/>)}</div>
    {odts.length > tope && <button type="button" className="pnl-btn sutil mnt-ver-mas" onClick={() => setTope(tope + tanda)}>Ver más ({odts.length - tope})</button>}
  </>
}

/** Prioridades: las mismas tarjetas, agrupadas por estado (Abiertas, En revisión, Resueltas). */
function PorEstado({ odts, alAbrir, alCrear }) {
  if (!odts.length) return <Vacio icono="check" titulo="No hay órdenes con estos filtros" texto="Cuando se reporte una falla aparecerá aquí con su siguiente paso." accion={<button type="button" className="pnl-btn" onClick={alCrear}>Nueva ODT</button>}/>
  return <div className="mnt-grupos">{ESTADOS_VISIBLES.map(g => {
    const delGrupo = odts.filter(o => g.estados.includes(o.estado))
    return delGrupo.length > 0 && <GrupoTarjetas key={g.clave} titulo={g.plural} cuenta={delGrupo.length} color={g.clave === 'abierta' ? 'ambar' : ''}><Tarjetas odts={delGrupo} alAbrir={alAbrir} tanda={g.clave === 'resuelta' ? 6 : 12}/></GrupoTarjetas>
  })}</div>
}

// ---------------- Indicadores ----------------

function Indicadores({ odts }) {
  const abiertas = odts.filter((o) => o.estado === 'abierta')
  const enRevision = odts.filter((o) => EN_CURSO.includes(o.estado))
  const hoy = new Date()
  const delMes = (fecha) => {
    if (!fecha) return false
    const d = new Date(fecha)
    return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear()
  }
  // «Resueltas» es el mismo grupo que el botón de etapa: cerradas + canceladas.
  // La cancelada no siempre trae fecha de cierre: se toma la de creación.
  const cerradasMes = odts.filter((o) => o.estado === 'cerrada' && delMes(o.resueltaEn))
  const resueltasMes = odts.filter((o) => estadoVisible(o.estado).clave === 'resuelta' && delMes(o.resueltaEn || (o.estado === 'cancelada' ? o.creadaEn : null)))
  // El costo suma solo lo cerrado este mes: una cancelada no tiene gasto.
  const gasto = cerradasMes.reduce((a, o) => a + (Number(o.costo) || 0), 0)
  const conCosto = cerradasMes.filter((o) => o.costo != null).length
  const mes = hoy.toLocaleDateString('es', { month: 'long', year: 'numeric' })

  return <div className="mnt-summary">{[['Abiertas', abiertas.length, 'Reportadas, falta revisarlas', 'ambar'], ['En revisión', enRevision.length, 'En evaluación o en taller', 'azul'], ['Resueltas este mes', resueltasMes.length, mes.charAt(0).toUpperCase() + mes.slice(1), 'verde'], ['Costo del mes', f.moneda(gasto), `${conCosto} ${conCosto === 1 ? 'cierre' : 'cierres'} con costo`, 'gris']].map(([t,v,d,c]) => <div key={t}><span><i className={c}/>{t}</span><b>{v}</b><small>{d}</small></div>)}</div>
}

/**
 * Los 3 estados visibles en un control de píldora: cada uno con su punto de color y cuántas
 * órdenes hay. La elegida va rellena en azul FOM. En el teléfono se desliza de lado.
 */
export function FiltroEstado({ odts, valor, alCambiar }) {
  const opciones = [{ clave: '', plural: 'Todas', n: odts.length }, ...ESTADOS_VISIBLES.map(g => ({ ...g, n: odts.filter(o => g.estados.includes(o.estado)).length }))]
  return <div className="mnt-seg" role="group" aria-label="Filtrar por estado">{opciones.map(o => <button type="button" key={o.clave || 'todas'} aria-pressed={valor === o.clave} onClick={() => alCambiar(o.clave)}>{o.color && <i className={o.color} aria-hidden="true"/>}{o.plural}<b>{o.n}</b></button>)}</div>
}

/** «Tipo»: un botón que abre las opciones (todos, correctivas o preventivas) con su cuenta. */
export function FiltroTipo({ odts, valor, alCambiar }) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef(null)
  // Se cierra al tocar fuera o con Escape (y el foco vuelve al botón).
  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e) => { if (!caja.current?.contains(e.target)) setAbierto(false) }
    const tecla = (e) => { if (e.key === 'Escape') { setAbierto(false); caja.current?.querySelector('button')?.focus() } }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla) }
  }, [abierto])
  const opciones = [{ v: '', t: 'Todos los tipos', n: odts.length }, { v: 'correctiva', t: 'Correctivas', n: odts.filter(o => o.tipo === 'correctiva').length }, { v: 'preventiva', t: 'Preventivas', n: odts.filter(o => o.tipo === 'preventiva').length }]
  const elegida = opciones.find(o => o.v === valor)
  return <div className="mnt-tipo" ref={caja}>
    <button type="button" className={`mnt-tipo-boton${valor ? ' activo' : ''}`} aria-haspopup="true" aria-expanded={abierto} aria-label={valor ? `Tipo de orden: ${elegida?.t}` : 'Tipo de orden'} onClick={() => setAbierto(!abierto)}><Icono nombre="filtro" tam={16}/>Tipo{valor && <em>{elegida?.t}</em>}<svg className="mnt-flecha" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
    {abierto && <div className="mnt-tipo-menu" role="group" aria-label="Tipo de orden">{opciones.map(o => <button type="button" key={o.v || 'todos'} aria-pressed={valor === o.v} onClick={() => { alCambiar(o.v); setAbierto(false) }}><span>{o.t}</span><b>{o.n}</b><i aria-hidden="true">{valor === o.v ? <Icono nombre="check" tam={16}/> : null}</i></button>)}</div>}
  </div>
}

// ---------------- Detalle de una ODT ----------------

function Detalle({ odt, perfil, vehiculo, recargar, alCerrar }) {
  // ------------------------------------------------------------
  // El ciclo de la orden es el MISMO que el de la app y el del servidor:
  //   abierta → en revisión → aprobada → asignada → en ejecución ⇄ pausada
  //   → en calidad → cerrada; cancelada en cualquier punto; cerrada se
  //   reabre a revisión.
  // Cada paso viaja con el estado que se vio (para no pisar a nadie) y una
  // nota que queda en el historial. Asignar responsable y ejecutar (iniciar,
  // pausar, reanudar, entregar) son rutas distintas del cambio de estado, tal
  // como las usa la app en el taller.
  // ------------------------------------------------------------
  const [pendiente, setPendiente] = useState(null) // { a, t, ... }
  const [nota, setNota] = useState('')
  const [notaSolucion, setNotaSolucion] = useState(odt.notaSolucion ?? '')
  const [costo, setCosto] = useState(odt.costo != null ? String(odt.costo) : '')
  // Kilometraje al cerrar una preventiva de un plan: arranca con la última lectura de la unidad.
  const [km, setKm] = useState(vehiculo?.km != null ? String(Math.round(Number(vehiculo.km))) : '')
  const [fotosCierre, setFotosCierre] = useState([])
  const [responsableId, setResponsableId] = useState('')
  const [buscarPersona, setBuscarPersona] = useState('')
  const confirmacionRef = useRef(null)
  const siguienteRef = useRef(null)
  const teniaPaso = useRef(false)
  useEffect(() => {
    if (pendiente) {
      confirmacionRef.current?.querySelector('input,textarea,select,button:not(:disabled)')?.focus()
      teniaPaso.current = true
    } else if (teniaPaso.current) {
      siguienteRef.current?.querySelector('button:not(:disabled)')?.focus()
      teniaPaso.current = false
    }
  }, [pendiente?.a])
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState('')
  const [aviso, setAviso] = useState('')
  const gente = useDatos(() => repo.admin.usuarios.listar({}), [])
  // Responsable y eventos de taller: solo cuando la orden ya está en taller.
  const enTaller = ['asignada', 'en_ejecucion', 'pausada', 'en_calidad'].includes(odt.estado)
  const ejecucion = useDatos(
    () => ((enTaller || odt.estado === 'cerrada') && repo.odts.ejecucion ? repo.odts.ejecucion(odt.id) : Promise.resolve(null)),
    [odt.id, odt.estado],
  )
  // Cada cambio de estado de la orden, guardado en la base con su autor, su fecha y su nota.
  const historial = useDatos(() => (repo.odts.historial ? repo.odts.historial(odt.id) : Promise.resolve(null)), [odt.id, odt.estado])
  const responsable = ejecucion.datos?.responsable ?? null
  // La sesión trae correo y nombre, no identificador: se resuelve contra la
  // lista de gente. Iniciar, pausar, reanudar y entregar los hace SOLO el
  // responsable (el servidor responde «no existe» a cualquier otro), igual
  // que en la app: el gestor asigna, revisa y cierra.
  const yo = (gente.datos ?? []).find((p) => p.email && perfil?.correo && p.email.toLowerCase() === perfil.correo.toLowerCase())
  const soyResponsable = Boolean(responsable && yo && (yo.userId ?? yo.id) === responsable.id)
  // Quien reportó la falla: en la base por su identificador; en el modo demo el perfil ya lo trae.
  const soyQuienReporto = Boolean(odt.creadorId && ((yo && (yo.userId ?? yo.id) === odt.creadorId) || perfil?.id === odt.creadorId))
  const gestor = esGestor(perfil)
  // El servidor solo acepta el kilometraje de cierre en una orden que viene de un plan, y lo
  // exige si el plan cuenta por km: se pide en toda preventiva de plan, como hace la app.
  const pideKm = odt.tipo === 'preventiva' && Boolean(odt.planId)

  const items = [
    {
      etiqueta: 'Unidad',
      valor: odt.vehiculoId ? (
        <Link to={`/panel/flota/${odt.vehiculoId}`} className="pnl-link" onClick={alCerrar}>
          {odt.vehiculoNombre}
        </Link>
      ) : (
        'Sin unidad'
      ),
    },
    { etiqueta: 'Tipo de orden', valor: etiqueta('odt_tipo', odt.tipo) },
    ...(odt.planId ? [{ etiqueta: 'Plan de mantenimiento', valor: <Link className="pnl-link" to="/panel/mantenimiento?vista=planes" onClick={alCerrar}>Consultar planes de mantenimiento</Link> }] : []),
    { etiqueta: 'Prioridad', valor: etiqueta('odt_prioridad', odt.prioridad) },
    {
      etiqueta: 'Tipo de falla',
      valor: odt.tipoFalla ? etiqueta('tipo_falla', odt.tipoFalla) : 'No especificado',
    },
    { etiqueta: 'La generó', valor: odt.creadorNombre },
    { etiqueta: 'Creada', valor: f.fechaHora(odt.creadaEn) },
    { etiqueta: 'Ubicación', valor: odt.ubicacion || 'Sin ubicación' },
  ]
  if (responsable) items.push({ etiqueta: 'Responsable', valor: `${responsable.nombre} · desde ${f.fechaHora(responsable.desde)}` })

  if (odt.estado === 'cerrada' && odt.resueltaEn) {
    const minutos = (new Date(odt.resueltaEn) - new Date(odt.creadaEn)) / 60000
    items.push({ etiqueta: 'Resuelta', valor: f.fechaHora(odt.resueltaEn) })
    const dias = Math.floor(minutos / 1440)
    const resto = Math.round(minutos % 1440)
    items.push({ etiqueta: 'Tiempo de resolución', valor: Number.isFinite(minutos) && minutos >= 0 ? (dias ? `${dias} ${dias === 1 ? 'día' : 'días'}${resto ? ` y ${f.duracion(resto)}` : ''}` : f.duracion(minutos)) : 'Sin fecha válida' })
  }

  const pasos = (PASOS_ODT[odt.estado] ?? []).filter((p) => !p.ejecucion || soyResponsable)
  const pasosDelResponsable = (PASOS_ODT[odt.estado] ?? []).filter((p) => p.ejecucion)
  // Antes de llegar al taller, la orden puede resolverse directo (una revisión rápida, un ajuste en sitio…).
  const sinTaller = ['abierta', 'en_revision', 'aprobada'].includes(odt.estado) ? (PASOS_ODT[odt.estado] ?? []).find((p) => p.a === 'cerrada') : null

  // Todos los pasos abren su formulario (persona, nota o cierre), menos iniciar y
  // reanudar: no tienen nada que preguntar y se hacen con un clic, como en la app.
  const UN_CLIC = ['inicio', 'reanudacion']
  function elegir(paso) {
    if (guardando) return
    setFallo('')
    setErrores({})
    if (UN_CLIC.includes(paso.a)) {
      confirmar(paso)
      return
    }
    setNota('')
    setPendiente(pendiente?.a === paso.a ? null : paso)
  }

  async function confirmar(directo) {
    // Llamado desde un botón recibe el evento; llamado desde `elegir`, el paso.
    const paso = directo?.a ? directo : pendiente
    const err = {}
    const texto = nota.trim()
    if (paso.nota?.obligatoria && texto.length < 3) err.nota = `${paso.nota.etiqueta}: escribe al menos 3 letras.`
    else if (texto && texto.length < 3) err.nota = 'Si escribes una nota, que tenga al menos 3 letras.'
    if (paso.a === 'asignar' && !responsableId) err.responsable = 'Elige quién se hace cargo.'
    let monto = null
    let kmCierre = null
    if (paso.a === 'cerrada') {
      if (notaSolucion.trim().length < 3) err.notaSolucion = 'Cuenta qué se hizo para resolver la falla (al menos 3 letras).'
      monto = leerMonto(costo)
      if (Number.isNaN(monto) || monto > 9999999999.99) err.costo = 'Escribe el costo con números: 0 o más, hasta 2 decimales (por ejemplo 120,50).'
      if (pideKm) {
        kmCierre = leerMonto(km)
        if (kmCierre === null) err.km = 'Escribe el kilometraje con que se cerró el servicio.'
        else if (Number.isNaN(kmCierre) || kmCierre > 9999999999.99) err.km = 'Escribe el kilometraje con números: 0 o más, hasta 2 decimales.'
      }
    }
    setErrores(err)
    if (Object.keys(err).length > 0) return

    setGuardando(true)
    setFallo('')
    try {
      if (paso.a === 'asignar') {
        await repo.odts.asignarResponsable(odt.id, { usuarioId: responsableId, nota: texto })
      } else if (paso.ejecucion) {
        await repo.odts.ejecutar(odt, paso.a, texto)
      } else {
        await repo.odts.cambiarEstado(odt.id, paso.a, {
          estadoActual: odt.estado,
          // El servidor guarda una nota en CADA cambio de estado (mín. 3 letras). Al cerrar es «qué se hizo»,
          // como en la app; en un paso de nota opcional que se deja vacía, el paso dicho en pasado.
          nota: paso.a === 'cerrada' ? notaSolucion.trim() : texto || paso.sinNota || paso.t,
          notaSolucion: paso.a === 'cerrada' ? notaSolucion.trim() : undefined,
          costo: paso.a === 'cerrada' ? monto : undefined,
          moneda: paso.a === 'cerrada' && monto != null ? 'USD' : undefined,
          odometro: paso.a === 'cerrada' && pideKm ? kmCierre : undefined,
        })
      }
      // Las fotos del cierre suben con la orden ya cerrada: si alguna falla, el cierre no se pierde.
      let faltaron = ''
      if (paso.a === 'cerrada' && fotosCierre.length) {
        const r = await subirVarios({ coleccion: 'work-orders', padreId: odt.id, proposito: 'work_order_closure', archivos: fotosCierre })
        if (r.errores.length) faltaron = `La orden quedó cerrada, pero ${r.errores.length} de ${fotosCierre.length} fotos no se subieron: ${r.errores[0]} Puedes agregarlas en «Fotos del trabajo terminado».`
      }
      setAviso(paso.a === 'asignar' ? 'Responsable asignado.' : `Cambio confirmado: ${paso.t}.`)
      setPendiente(null)
      setNota('')
      setFotosCierre([])
      if (faltaron) setFallo(faltaron)
      await recargar()
    } catch (e) {
      setFallo(e?.message || 'No pudimos guardar el cambio. Inténtalo otra vez.')
    } finally {
      setGuardando(false)
    }
  }

  if (pendiente) return <div className="mnt-action-dialog"><aside className="mnt-action-context"><VehicleVisual modelo={vehiculo?.modelo ?? ''}/><h3>{odt.vehiculoNombre}</h3><p>{odt.descripcion}</p><hr/><span className="mnt-muted">Estado actual</span><EstadoOdt estado={odt.estado}/><p>El cambio y la nota quedarán registrados en la orden.</p>{pendiente.a === 'cerrada' && <p>La solución se conserva como historial de la unidad.</p>}{pendiente.a === 'asignar' && <p>Solo el responsable asignado podrá iniciar, pausar y entregar el trabajo.</p>}</aside><div>
        <section ref={confirmacionRef} className="mnt-confirm mnt-action-form">
          <h3>{pendiente.t}</h3><p>{pendiente.a === 'cancelada' ? 'La orden quedará cancelada y no admitirá más cambios.' : pendiente.a === 'asignar' ? 'El responsable verá el trabajo en su app.' : pendiente.a === 'pausa' ? 'El tiempo trabajado deja de contar hasta que reanudes.' : pendiente.a === 'entrega' ? 'El supervisor la revisa y la cierra con el costo.' : `Confirma este paso para ${odt.vehiculoNombre}.`}</p>
          {pendiente.a === 'asignar' && (
            <div className="mnt-assignee"><Buscador valor={buscarPersona} alCambiar={setBuscarPersona} placeholder="Buscar responsable por nombre…"/>
              {gente.estado === 'cargando' && <Cargando filas={3}/>}
              {gente.estado === 'error' && <ErrorCarga texto={gente.error?.message} onReintentar={gente.recargar}/>}
              <div className="mnt-people" role="group" aria-label="Responsable">{(gente.datos ?? []).filter(p => (p.estado === 'active' || p.estado === 'activo' || !p.estado) && p.nombre?.toLowerCase().includes(buscarPersona.trim().toLowerCase())).map(p => <button type="button" key={p.id} aria-pressed={responsableId === (p.userId ?? p.id)} onClick={() => setResponsableId(p.userId ?? p.id)}><span className="mnt-person-avatar">{f.iniciales(p.nombre)}</span><span><b>{p.nombre}</b><small>{p.rolEtiqueta || 'Miembro activo de la empresa'}</small></span><i>{responsableId === (p.userId ?? p.id) ? '✓' : ''}</i></button>)}</div>
              {errores.responsable && <p className="pnl-campo-error" role="alert">{errores.responsable}</p>}
            </div>
          )}
          {pendiente.a === 'cerrada' && (
            <>
              <Campo etiqueta="Qué se hizo" error={errores.notaSolucion} ayuda="Queda como historial de la unidad.">
                <textarea
                  className="pnl-textarea"
                  rows={3}
                  value={notaSolucion}
                  onChange={(e) => setNotaSolucion(e.target.value)}
                  placeholder="Se cambiaron las pastillas delanteras y se purgó el sistema."
                />
              </Campo>
              {/* Texto y no «number»: así acepta la coma decimal, como la app. */}
              <Campo etiqueta="Costo (USD)" error={errores.costo} ayuda="Opcional. Hasta 2 decimales, con punto o coma. Déjalo vacío si aún no lo tienes.">
                <input type="text" inputMode="decimal" className="pnl-input" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="0,00" />
              </Campo>
              {pideKm && (
                <Campo etiqueta="Kilometraje al cerrar" error={errores.km} ayuda="Con este kilometraje vuelve a empezar la cuenta del plan.">
                  <input type="text" inputMode="decimal" className="pnl-input" value={km} onChange={(e) => setKm(e.target.value)} placeholder="Ej.: 45200" />
                </Campo>
              )}
              <SelectorArchivos
                archivos={fotosCierre}
                alCambiar={setFotosCierre}
                coleccion="work-orders"
                titulo="Fotos del trabajo terminado (opcional)"
                ayuda="Hasta 10 fotos. Se suben al cerrar la orden."
                deshabilitado={guardando}
              />
            </>
          )}
          {pendiente.nota && (
            <Campo etiqueta={pendiente.nota.etiqueta} error={errores.nota} ayuda={pendiente.nota.ayuda ?? 'Queda en el historial de la orden. Al menos 3 letras.'}>
              <textarea className="pnl-textarea" rows={pendiente.nota.obligatoria ? 3 : 2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder={pendiente.nota.ejemplo} />
            </Campo>
          )}
          <div className="pnl-kanban-cab">
            <button type="button" className={`pnl-btn primario${pendiente.a === 'cancelada' ? ' mnt-critical' : ''}`} onClick={confirmar} disabled={guardando}>
              {guardando ? 'Guardando…' : pendiente.t}
            </button>
            <button type="button" className="pnl-btn sutil" onClick={() => { setPendiente(null); setErrores({}) }} disabled={guardando}>
              Volver
            </button>
          </div>
        </section>
{fallo && <p className="pnl-campo-error" role="alert">{fallo}</p>}</div></div>

  return (
    <div className="mnt-detail">
      <section className="mnt-detail-main">
      <div className="pnl-kanban-cab">
        <EstadoOdt estado={odt.estado}/>
        <Tag color={colorTipo(odt.tipo)}>{etiqueta('odt_tipo', odt.tipo)}</Tag>
        {odt.prioridad && <Tag color={color('odt_prioridad', odt.prioridad)} plano>{etiqueta('odt_prioridad', odt.prioridad)}</Tag>}
        <em>{f.desde(odt.creadaEn)}</em>
      </div>

      <header className="mnt-detail-title">
        <span>Problema reportado</span>
        <h2>{odt.descripcion}</h2>
        <p>Referencia de la orden: <code>{odt.id.slice(0, 8)}</code></p>
      </header>

      <div className="mnt-unit"><VehicleVisual modelo={vehiculo?.modelo ?? ''} compacta/><div><b>{odt.vehiculoNombre}</b><span>{[vehiculo?.marca, vehiculo?.modelo].filter(Boolean).join(' ') || 'Unidad de la flota'}</span></div></div>
      <section className={`mnt-resolution${odt.estado === 'cerrada' && !odt.notaSolucion ? ' incompleta' : ''}`} aria-label="Situación del trabajo">
        <div className="mnt-resolution-heading"><Icono nombre={odt.estado === 'cerrada' ? (odt.notaSolucion ? 'check' : 'alerta') : 'llave'} tam={24}/><h3>{odt.estado === 'cerrada' ? 'Resultado del trabajo' : 'Estado del trabajo'}</h3></div>
        {odt.estado === 'cerrada' ? <>
          <p>{odt.notaSolucion || 'La orden está cerrada, pero no se registró qué se hizo para solucionar la falla.'}</p>
          <dl className="mnt-resolution-facts"><div><dt>Cierre</dt><dd>{odt.resueltaEn ? f.fechaHora(odt.resueltaEn) : 'Sin fecha registrada'}</dd></div><div><dt>Costo registrado</dt><dd>{odt.costo != null ? f.moneda(odt.costo) : 'Sin registrar'}</dd></div><div><dt>Tiempo hasta el cierre</dt><dd>{items.find(i => i.etiqueta === 'Tiempo de resolución')?.valor || 'Sin fechas suficientes'}</dd></div></dl>
        </> : <><p>{AYUDA_ODT[odt.estado] || 'Revisa el reporte y elige la siguiente acción disponible.'}</p><p className="mnt-detail-responsable"><b>Responsable:</b> {responsable?.nombre || 'Aún sin asignar'}</p></>}
      </section>
      <details className="mnt-record"><summary>Datos del reporte <span>Unidad, responsable, fechas y ubicación</span></summary><Datos items={items}/><p className="mnt-order-reference">Identificador completo: <code>{odt.id}</code></p></details>
      <div className="arch-bloque">
        {/* Agregan fotos el gestor y el responsable; las del reporte, también quien la reportó (como la app). */}
        <GaleriaArchivos coleccion="work-orders" padreId={odt.id} proposito="work_order_opening" titulo="Fotos del reporte" vacio="Nadie ha subido fotos de la falla todavía." puedeSubir={gestor || soyResponsable || soyQuienReporto} />
        <GaleriaArchivos coleccion="work-orders" padreId={odt.id} proposito="work_order_closure" titulo="Fotos del trabajo terminado" vacio="Todavía no hay fotos del trabajo hecho." puedeSubir={gestor || soyResponsable} />
      </div>

      {ejecucion.estado === 'error' && <ErrorCarga texto={ejecucion.error?.message} onReintentar={ejecucion.recargar}/>}
      {(() => {
        const hitos = presentarHistorial(odt, historial.datos ?? [], ejecucion.datos)
        const grupos = []
        for (const hito of hitos) {
          const fecha = hito.fechaValida ? f.fecha(hito.en) : 'Sin fecha registrada'
          if (grupos.at(-1)?.fecha !== fecha) grupos.push({ fecha, hitos: [] })
          grupos.at(-1).hitos.push(hito)
        }
        return (
          <section className="mnt-history">
            <h3>Historial de la orden</h3>
            <p className="mnt-history-intro">Del reporte al cierre, en el orden en que ocurrió.</p>
            {historial.estado === 'cargando' && <p role="status">Consultando los cambios registrados…</p>}
            {historial.estado === 'error' && <ErrorCarga texto="No se pudo cargar el historial completo. Estas son las fechas disponibles de la orden." onReintentar={historial.recargar}/>}
            {grupos.map(grupo => <div className="mnt-history-day" key={grupo.fecha}>
              <h4>{grupo.fecha}</h4>
              <ol className="mnt-history-events">
                {grupo.hitos.map((h, i) => <li className="mnt-history-event" key={i}>
                  <time dateTime={h.fechaValida ? new Date(h.en).toISOString() : undefined}>{h.fechaValida ? f.hora(h.en) : 'Sin hora'}</time>
                  <div className="mnt-history-event-body">
                    <strong>{h.titulo}</strong>
                    <span className="mnt-history-actor">{h.actor ? `Por ${h.actor}` : 'Autor no registrado'}</span>
                    {h.responsable && <p className="mnt-history-responsable"><b>A cargo de:</b> {h.responsable}</p>}
                    {h.notas.length > 0 && <div className="mnt-history-note"><span>Nota registrada</span>{h.notas.map((n, j) => <p key={j}>{n}</p>)}</div>}
                  </div>
                </li>)}
              </ol>
            </div>)}
          </section>
        )
      })()}
      </section><aside className="mnt-next">
      {aviso && <div className="mnt-success" role="status">{aviso}</div>}
      <div className="pnl-fila-txt">
        <b>{odt.estado === 'cerrada' ? '¿La falla volvió?' : 'Siguiente paso'}</b>
        <span>{AYUDA_ODT[odt.estado] ?? 'Mueve la orden según vaya avanzando el trabajo.'}</span>
      </div>

      {enTaller && pasosDelResponsable.length > 0 && !soyResponsable && (
        <div className="pnl-fila">
          <Icono nombre="llamar" tam={16} />
          <div className="pnl-fila-txt">
            <b>{pasosDelResponsable.map((p) => p.t).join(', ')}: lo hace {responsable ? responsable.nombre : 'el responsable'} desde su app.</b>
            <span>Como en el taller: quien tiene la orden asignada la inicia, la pausa y la entrega. Las demás acciones disponibles se muestran según la etapa actual.</span>
          </div>
        </div>
      )}

      {pasos.length === 0 ? (
        <span className="pnl-fila-txt">Esta orden está cancelada: no admite más cambios.</span>
      ) : (
        <div ref={siguienteRef} className="mnt-next-actions" role="group" aria-label="Acciones sobre la orden">
          {pasos.filter(p => !p.sutil).slice(0,1).map(p => <button key={p.a} type="button" className="pnl-btn primario" onClick={() => elegir(p)} disabled={guardando}>{p.t} →</button>)}
          {sinTaller && <button type="button" className="pnl-btn" onClick={() => elegir(sinTaller)} disabled={guardando}>{sinTaller.t}</button>}
          {sinTaller && <p className="mnt-muted" style={{ fontSize: 12, margin: 0 }}>¿No necesita taller? Ciérrala ahora contando qué se hizo.</p>}
          <details><summary>Más acciones</summary>{pasos.filter(p => p !== pasos.find(p => !p.sutil) && p !== sinTaller).map(p => <button key={p.a} type="button" className="pnl-btn sutil" onClick={() => elegir(p)} disabled={guardando}>{p.t}</button>)}</details>
        </div>
      )}

      {fallo && (
        <div className="pnl-fila critica">
          <Icono nombre="alerta" tam={16} />
          <div className="pnl-fila-txt">
            <b>{fallo}</b>
          </div>
        </div>
      )}
    </aside></div>
  )
}

// ---------------- Nueva ODT ----------------

export function NuevaOdt({ vehiculos, creadorId, recargar, alCerrar, alCrear, sinPermiso = '', comoConductor = false }) {
  // Con una sola unidad (el conductor) no hay nada que elegir: se salta al paso de la falla.
  const [vehiculoId, setVehiculoId] = useState(vehiculos.length === 1 ? vehiculos[0].id : '')
  const [paso, setPaso] = useState(vehiculos.length === 1 ? 2 : 1)
  const [busqueda, setBusqueda] = useState('')
  const [descripcion, setDescripcion] = useState('')
  // Sin tipo elegido de entrada, como la app: preseleccionar uno hace que se envíe sin pensarlo.
  const [tipoFalla, setTipoFalla] = useState('')
  const [parte, setParte] = useState('')
  // Media por defecto, como la app: ni se minimiza ni se grita antes de mirarla.
  const [prioridad, setPrioridad] = useState('media')
  const [ubicacion, setUbicacion] = useState(UBICACION_POR_DEFECTO)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState('')
  const [fotos, setFotos] = useState([])
  // El título de cada foto, por archivo: al quitar una, las demás conservan el suyo.
  const [titulos, setTitulos] = useState(() => new Map())
  // La orden ya se creó pero alguna foto no subió: el botón pasa a «Listo».
  const [creada, setCreada] = useState(false)

  if (vehiculos.length === 0) {
    return (
      <Vacio
        icono="camion"
        titulo="No hay unidades registradas"
        texto="Agrega una unidad a la flota para poder levantar órdenes de trabajo."
      />
    )
  }

  const elegido = vehiculos.find((v) => v.id === vehiculoId)

  function crear() {
    const err = {}
    if (!vehiculoId) err.vehiculo = "Elige una unidad."
    // El mismo minimo que exige el servidor. Validarlo aqui convierte un
    // rechazo del servidor en un aviso junto al campo, que es donde se puede
    // corregir.
    if (!descripcion.trim()) err.descripcion = 'Describe la falla.'
    else if (descripcion.trim().length < 10)
      err.descripcion = 'Describe un poco más: al menos 10 caracteres.'
    // «Otro» sin decir qué es no le sirve a quien va a atender la orden.
    if (tipoFalla === 'otro') {
      const mal = revisarTextoCorto(parte, { max: 40, vacio: 'Escribe qué parte falló.', sinLetras: 'Ponle nombre a la parte, no solo números.' })
      if (mal) err.parte = mal
    }
    // El conductor manda al menos una foto (como en la app); el supervisor, si quiere. Si esta web no tiene
    // dónde guardar fotos, no se le puede pedir.
    if (comoConductor && puedeSubirArchivos() && fotos.length === 0) err.fotos = 'Agrega al menos una foto de la falla.'
    // Cada foto con su título: una foto suelta no dice por qué se adjuntó.
    const malTitulos = fotos.map((a) => revisarTextoCorto(titulos.get(a), { max: 60, vacio: 'Ponle un título a la foto.', sinLetras: 'El título necesita palabras, no solo números.' }))
    if (malTitulos.some(Boolean)) err.titulos = malTitulos
    setErrores(err)
    if (Object.keys(err).length > 0) return

    setGuardando(true)
    setFallo('')
    // Con «Otro», la parte va delante de la descripción: el catálogo del servidor es cerrado (igual que la app).
    const texto = tipoFalla === 'otro' ? `${parte.trim()}: ${descripcion.trim()}` : descripcion.trim()
    repo.odts
      .crear({
        vehiculoId,
        descripcion: texto.slice(0, 2000),
        tipoFalla: tipoFalla || undefined,
        prioridad,
        ubicacion: ubicacion.trim() || UBICACION_POR_DEFECTO,
        creadorId,
        comoConductor,
      })
      .then(async (r) => {
        // Las fotos se suben DESPUÉS de crear la orden: necesitan su número para quedar unidas a ella.
        // El servidor devuelve { id }; el modo demo, el id solo.
        const odtId = typeof r === 'string' ? r : r?.id
        if (fotos.length && odtId) {
          const s = { errores: [] }
          for (const archivo of fotos) {
            try {
              await subirArchivo({ coleccion: 'work-orders', padreId: odtId, proposito: 'work_order_opening', archivo, titulo: titulos.get(archivo).trim() })
            } catch (e) {
              s.errores.push(e?.message || `No se pudo subir «${archivo.name}».`)
            }
          }
          if (s.errores.length) {
            setFallo(`La orden quedó creada, pero ${s.errores.length} de ${fotos.length} fotos no se subieron: ${s.errores[0]} Puedes agregarlas desde el detalle de la orden.`)
            setCreada(true)
            setGuardando(false)
            return recargar()
          }
        }
        alCrear(elegido?.placa || elegido?.alias || "la unidad")
        alCerrar()
        return recargar()
      })
      .catch((error) => {
        // Se muestra el motivo REAL. Un «inténtalo otra vez» generico invita a
        // repetir algo que no puede funcionar, y esconde justo el dato que
        // permite arreglarlo.
        setFallo(sinPermiso && /permiso/i.test(error?.message ?? '') ? sinPermiso : (error?.message || 'No pudimos crear la orden.'))
        setGuardando(false)
      })
  }

  return <div className="mnt-wizard">
    <div className="mnt-wizard-steps">{vehiculos.length > 1 && <span className={paso === 1 ? 'activo' : ''}>1 · Elige la unidad</span>}<span className={paso === 2 ? 'activo' : ''}>{vehiculos.length > 1 ? '2 · ' : ''}Describe la falla</span></div>
    {paso === 1 ? <>
      <h3>¿Qué unidad necesita atención?</h3><p>Selecciona el vehículo para continuar.</p>
      <Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar por placa o nombre…"/>
      <div className="mnt-vehicle-options">{vehiculos.filter(v => [v.alias,v.placa,v.marca,v.modelo].join(' ').toLowerCase().includes(busqueda.trim().toLowerCase())).map(v => <button key={v.id} type="button" aria-pressed={vehiculoId === v.id} onClick={() => setVehiculoId(v.id)}><VehicleVisual modelo={v.modelo ?? ''} compacta/><span><b>{v.placa || v.alias}</b><small>{v.alias} · {v.marca} {v.modelo}</small><small>{v.conductorNombre || 'Sin conductor asignado'}</small></span><i>{vehiculoId === v.id ? '✓' : ''}</i></button>)}</div>
      <div className="mnt-form-footer"><span>{elegido ? `Seleccionada: ${elegido.placa || elegido.alias}` : 'Selecciona una unidad'}</span><button type="button" className="pnl-btn primario" disabled={!vehiculoId} onClick={() => setPaso(2)}>Continuar →</button></div>
    </> : <div className="mnt-new-layout"><div className="pnl-filas">
      <Campo
        etiqueta="Qué le pasa a la unidad"
        error={errores.descripcion}
        ayuda="Mientras más claro, más rápido la resuelven en taller."
      >
        <textarea
          className="pnl-textarea"
          rows={3}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="El freno de mano no sostiene la camioneta en pendiente."
        />
      </Campo>

      {/* Tocar el tipo elegido lo quita: el tipo de falla es opcional. */}
      <fieldset className="mnt-failure"><legend>Tipo de falla (opcional)</legend><div>{TIPOS_FALLA.map(t => <button type="button" key={t} aria-pressed={tipoFalla === t} onClick={() => setTipoFalla(tipoFalla === t ? '' : t)}><Icono nombre="llave" tam={18}/>{etiqueta('tipo_falla', t)}</button>)}</div></fieldset>

      {tipoFalla === 'otro' && (
        <Campo etiqueta="Qué parte falló" error={errores.parte} ayuda="Como se llama la pieza: «Puerta trasera», «Eje 3».">
          <input type="text" className="pnl-input" maxLength={40} value={parte} onChange={(e) => setParte(e.target.value)} placeholder="Puerta trasera" />
        </Campo>
      )}

      <fieldset className="mnt-failure mnt-prioridad"><legend>Prioridad</legend><div>{PRIORIDADES.map(p => <button type="button" key={p} aria-pressed={prioridad === p} onClick={() => setPrioridad(p)}><i className={color('odt_prioridad', p)}/>{etiqueta('odt_prioridad', p)}</button>)}</div></fieldset>

      <Campo etiqueta="Ubicación" ayuda="Dónde está la unidad o dónde ocurrió la falla.">
        <input
          type="text"
          className="pnl-input"
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          placeholder={UBICACION_POR_DEFECTO}
        />
      </Campo>

      <SelectorArchivos
        archivos={fotos}
        alCambiar={setFotos}
        coleccion="work-orders"
        titulo={comoConductor ? 'Fotos de la falla' : 'Fotos de la falla (opcional)'}
        ayuda={comoConductor ? 'Al menos 1 foto de lo que se dañó, cada una con su título. Se suben al enviar el reporte.' : 'Hasta 10 fotos de lo que se dañó, cada una con su título. Se suben al crear la orden.'}
        deshabilitado={guardando || creada}
      />
      {errores.fotos && <p className="pnl-campo-error" role="alert">{errores.fotos}</p>}
      {fotos.length > 0 && (
        <div className="mnt-titulos-fotos">
          {fotos.map((a, i) => (
            <Campo key={`${a.name}-${a.size}-${i}`} etiqueta={`Título de la foto ${i + 1}`} error={errores.titulos?.[i] || undefined} ayuda={a.name}>
              <input
                type="text"
                className="pnl-input"
                maxLength={60}
                value={titulos.get(a) ?? ''}
                onChange={(e) => { const v = e.target.value; setTitulos((m) => new Map(m).set(a, v)) }}
                placeholder="Pastilla delantera gastada"
                disabled={guardando || creada}
              />
            </Campo>
          ))}
        </div>
      )}

      {fallo && (
        <div className="pnl-fila critica">
          <Icono nombre="alerta" tam={16} />
          <div className="pnl-fila-txt">
            <b>{fallo}</b>
          </div>
        </div>
      )}

      <div className="pnl-kanban-cab">
        {creada ? (
          <button type="button" className="pnl-btn primario" onClick={alCerrar}>Listo</button>
        ) : (
          <button type="button" className="pnl-btn primario" onClick={crear} disabled={guardando}>
            {guardando ? (fotos.length ? 'Creando y subiendo fotos…' : 'Creando…') : 'Crear ODT'}
          </button>
        )}
        {vehiculos.length > 1 && (<button type="button" className="pnl-btn sutil" onClick={() => setPaso(1)} disabled={guardando}>
          ← Cambiar unidad
        </button>)}
      </div>
    </div><aside className="mnt-new-context"><VehicleVisual modelo={elegido?.modelo ?? ''}/><h3>{elegido?.placa || elegido?.alias}</h3><p>{elegido?.marca} {elegido?.modelo}</p><p>{elegido?.conductorNombre || 'Sin conductor asignado'}</p><hr/><b>¿Qué sigue?</b><p>La orden quedará abierta para revisarla y asignar el trabajo.</p></aside></div>}
  </div>
}

// ---------------- Reglas de alerta ----------------

function textoRegla(r) {
  if (r.tipo === 'velocidad') return `Velocidad mayor a ${f.numero(r.umbral)} km/h`
  return `${r.servicio || 'Servicio programado'}: cada ${f.numero(r.umbral)} km`
}

function ReglasHeredadas() {
 const lectura = useDatos(() => repo.reglas.listar(), [])
 return lectura.estado === 'cargando' ? <Cargando filas={2}/> : lectura.estado === 'error' ? <ErrorCarga texto={lectura.error?.message} onReintentar={lectura.recargar}/> : <Reglas reglas={lectura.datos ?? []}/>
}

function Reglas({ reglas }) {
  return (
    <Tarjeta titulo="Reglas de alerta">
      {reglas.length === 0 ? (
        <Vacio
          icono="alerta"
          titulo="Todavía no hay reglas"
          texto="Cuando configures una regla de velocidad o de mantenimiento la verás aquí."
        />
      ) : (
        <div className="pnl-filas">
          {reglas.map((r) => {
            const asignadas = r.vehiculos?.length ?? 0
            const promedio =
              r.tipo === 'mantenimiento' && asignadas > 0 && r.umbral
                ? r.vehiculos.reduce((a, v) => a + (v.progresoKm ?? 0), 0) / asignadas / r.umbral
                : 0
            const listo = promedio >= 0.85
            return (
              <div className={`pnl-fila${listo ? ' aviso' : ''}`} key={r.id}>
                <div className="pnl-fila-txt">
                  <b>{textoRegla(r)}</b>
                  <span>
                    {asignadas} {asignadas === 1 ? 'unidad asignada' : 'unidades asignadas'}
                  </span>
                  {r.tipo === 'mantenimiento' && (
                    <>
                      <Barra valor={promedio} tono={listo ? 'aviso' : ''} />
                      <span>Progreso promedio: {Math.round(Math.min(1, promedio) * 100)}%</span>
                    </>
                  )}
                </div>
                <Tag color={r.activa ? 'verde' : 'gris'}>{r.activa ? 'Activa' : 'Pausada'}</Tag>
                <em>{f.fechaCorta(r.creadaEn)}</em>
              </div>
            )
          })}
          <p className="pnl-fila-txt">
            <span>
              Estas reglas son de consulta. Gestiona los servicios actuales desde Planes y Próximos servicios.
            </span>
          </p>
        </div>
      )}
    </Tarjeta>
  )
}
