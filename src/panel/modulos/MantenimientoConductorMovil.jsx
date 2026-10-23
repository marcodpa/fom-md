import { useMemo, useState } from 'react'
import { Cargando, Modal } from '../comp/ui'
import OdtAsignadas from '../comp/OdtAsignadas'
import * as f from '../datos/formato'
import { etiqueta } from '../datos/catalogos'
import { estadoVisible } from '../datos/historial-odt'
import { masNuevasPrimero } from '../datos/odtAsignadas'
import '../../styles/mantenimiento-movil.css'

// ============================================================
// MANTENIMIENTO DEL CONDUCTOR EN EL TELÉFONO — la pestaña de la app
// ------------------------------------------------------------
// Copia de `(driver)/mantenimiento.tsx` de FOM-DRIVER: título, «Asignadas a
// ti», las cifras (Abiertas · En revisión · Resueltas), la tarjeta de la
// unidad con su estado, el buscador, el riel de estados con el botón «Tipo» y
// la lista en tres tramos (Vencidas · Pendientes · Realizadas), de la más
// nueva a la más vieja. «Reportar una falla» queda fijo abajo.
//
// La web no tiene las alertas de los controles (preventivo por km) que la app
// arma en el teléfono: aquí cada acción es una orden de trabajo real.
// ============================================================

/** Los tres tipos de la app: planificado (azul), falla (rojo), anticipado (morado). */
const TIPOS = [
  { id: 'preventivo', texto: 'Preventivo' },
  { id: 'correctivo', texto: 'Correctivo' },
  { id: 'predictivo', texto: 'Predictivo' },
]
/** Los estados del riel, con su punto de color. */
const GRUPOS = [
  { id: 'todas', texto: 'Todas' },
  { id: 'abierta', texto: 'Abiertas', tono: 'aviso' },
  { id: 'revision', texto: 'En revisión', tono: 'info' },
  { id: 'resuelta', texto: 'Resueltas', tono: 'exito' },
]

/** Sin tildes ni mayúsculas: buscar «bujia» encuentra «bujía». */
const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** El servicio de una orden del sistema: lo que va antes de «:» o «Mantenimiento programado». */
function servicioDe(descripcion = '') {
  const corte = descripcion.indexOf(':')
  const cabeza = corte > 0 ? descripcion.slice(0, corte).trim() : ''
  return cabeza && cabeza.length <= 60 ? cabeza : 'Mantenimiento programado'
}

/**
 * Una orden como «acción» de la app (`odtToAccion`): título por la falla o el
 * servicio, su estado en los tres de la app y, si nadie la ha atendido
 * (abierta), vencida: la urgencia de una correctiva es su propio estado.
 */
function accionDe(o) {
  const grupo = estadoVisible(o.estado).clave
  const delSistema = o.tipo === 'preventiva' && !o.creadorId
  const estado = grupo === 'resuelta' ? 'realizada' : grupo === 'revision' ? 'en_proceso' : 'pendiente'
  return {
    id: o.id,
    tipo: o.tipo === 'preventiva' ? 'preventivo' : o.tipo === 'predictiva' ? 'predictivo' : 'correctivo',
    titulo: delSistema || (o.tipo === 'preventiva' && !o.tipoFalla)
      ? servicioDe(o.descripcion)
      : o.tipoFalla ? `Falla: ${etiqueta('tipo_falla', o.tipoFalla)}` : 'Falla reportada',
    detalle: o.descripcion ?? '',
    generadoPor: delSistema ? 'Sistema · regla de mantenimiento' : o.creadorNombre ? `Reportada por ${o.creadorNombre}` : 'Sistema',
    relevancia: ['alta', 'media', 'baja'].includes(o.prioridad) ? o.prioridad : 'media',
    vencida: o.estado === 'abierta',
    estado,
    grupo,
    creadaEn: o.creadaEn,
  }
}

/** Ícono por servicio, deducido del título (`iconoServicio` de la app). */
function iconoServicio(titulo) {
  const t = plano(titulo)
  if (t.includes('freno')) return 'frenos'
  if (t.includes('aceite') || t.includes('filtro')) return 'aceite'
  if (t.includes('neumatic') || t.includes('llanta') || t.includes('rueda')) return 'neumatico'
  if (t.includes('bateria') || t.includes('electric')) return 'electrico'
  if (t.includes('motor') || t.includes('correa') || t.includes('bujia')) return 'motor'
  if (t.includes('suspension') || t.includes('carroc')) return 'carroceria'
  return 'ot'
}

/** Trazos de tab-icon.tsx de la app. */
const TRAZOS = {
  frenos: <><circle cx="10.5" cy="12" r="7.5" /><circle cx="10.5" cy="12" r="2.8" /><path d="M17.5 8.5h2.6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2.6" /></>,
  aceite: <><path d="M7 3h6l1 4H6z" /><path d="M8 7v3a4 4 0 0 0 4 4 4 4 0 0 0 4-4" /><path d="M12 14v7" /></>,
  neumatico: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.2" /><path d="M12 3.5v3M12 17.3v3.2M3.5 12h3M17.3 12h3.2" /></>,
  electrico: <path d="M13 2.5 4.5 14H11l-1 7.5L19.5 10H13z" />,
  motor: <><path d="M3 12h3V9.5h5V12h2.5l4 3.5V19H4a1 1 0 0 1-1-1z" /><path d="M8 6.5h5" /><path d="M10.5 6.5v3" /></>,
  carroceria: <><path d="M3 13.5l2.2-4.3A2 2 0 0 1 7 8h9.2a2 2 0 0 1 1.7 1l2.6 4.5V17h-2.2" /><path d="M9.6 17h4.8" /><path d="M3 13.5V17h2.2" /><circle cx="7.4" cy="17" r="1.9" /><circle cx="16.6" cy="17" r="1.9" /></>,
  ot: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  flota: <><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></>,
  chevron: <path d="M9 18l6-6-6-6" />,
  filtro: <path d="M21 4H3l7 8.5V19l4 2v-8.5L21 4z" />,
  reportar: <><path d="M12 3.8 21 19.5H3z" /><path d="M12 9.5v4" /><path d="M12 16.6h.01" strokeWidth="2.6" /></>,
  buscar: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  vacio: <><path d="M4 13l2-7h12l2 7" /><path d="M4 13h5a3 3 0 0 0 6 0h5v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /></>,
}
export function IconoApp({ nombre, tam = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  )
}

/** Píldora de estado o prioridad: punto opcional y palabra, teñidos. */
function Pildora({ tono, texto, conPunto = false }) {
  return <span className={`mvm-pildora ${tono}`}>{conPunto && <i aria-hidden="true" />}{texto}</span>
}

const PRIORIDAD = { alta: ['Alta', 'peligro'], media: ['Media', 'aviso'], baja: ['Baja', 'info'] }
function estadoDeAccion(a) {
  if (a.estado === 'realizada') return ['Realizada', 'exito']
  if (a.estado === 'en_proceso') return ['En proceso', 'info']
  if (a.vencida) return ['Vencida', 'peligro']
  return ['Pendiente', 'aviso']
}
function tonoDeAccion(a) {
  if (a.estado === 'realizada') return 'exito'
  if (a.estado === 'en_proceso') return 'info'
  if (a.vencida) return 'peligro'
  return PRIORIDAD[a.relevancia][1]
}

/** LA TARJETA DE MANTENIMIENTO de la app: ícono teñido, título, descripción y pastillas. */
function TarjetaAccion({ accion, alAbrir }) {
  const hecha = accion.estado === 'realizada'
  const [estado, tonoEstado] = estadoDeAccion(accion)
  const tono = tonoDeAccion(accion)
  const urgente = accion.vencida && !hecha
  return (
    <button type="button" className={`mvm-tarjeta ${tono}${hecha ? ' apagada' : ''}`} onClick={() => alAbrir(accion.id)}
      aria-label={`${accion.titulo}, ${estado}`}>
      <span className="mvm-tarjeta-fila">
        <span className="mvm-tarjeta-icono"><IconoApp nombre={iconoServicio(accion.titulo)} tam={19} /></span>
        <b className="mvm-tarjeta-titulo">{accion.titulo}</b>
        <span className="mvm-tarjeta-marca">
          {urgente ? <i className="mvm-late" aria-hidden="true" /> : <IconoApp nombre="chevron" tam={19} />}
        </span>
      </span>
      {accion.detalle && <span className="mvm-tarjeta-desc">{accion.detalle}</span>}
      <span className="mvm-tarjeta-pie">
        <Pildora tono={tonoEstado} texto={estado} conPunto />
        {!hecha && <Pildora tono={PRIORIDAD[accion.relevancia][1]} texto={PRIORIDAD[accion.relevancia][0]} />}
        <span className="mvm-tarjeta-fecha">{accion.creadaEn ? f.fecha(accion.creadaEn) : ''}</span>
      </span>
    </button>
  )
}

/** Rótulo de un tramo, la línea que se apaga y cuántas hay. */
function EncabezadoGrupo({ texto, cuenta, tono = '' }) {
  return (
    <div className="mvm-grupo-cab">
      <span className={`mvm-overline${tono ? ` ${tono}` : ''}`}>{texto}</span>
      <i aria-hidden="true" />
      <small>{cuenta}</small>
    </div>
  )
}

/** Estado vacío de la app: ícono azul en su círculo y una línea de qué pasa. */
function Vacio({ titulo, texto, accion }) {
  return (
    <div className="mvm-vacio">
      <span className="mvm-vacio-icono"><IconoApp nombre="vacio" tam={22} /></span>
      <b>{titulo}</b>
      {texto && <small>{texto}</small>}
      {accion}
    </div>
  )
}

/**
 * La pestaña, con lo que MantenimientoConductor ya leyó. Abrir una orden y
 * reportar una falla usan los mismos diálogos de la web.
 */
export default function MantenimientoConductorMovil({
  cargando, error, alReintentar, asignacion, unidad, lista, ordenes, perfil, alCambiar, alAbrir, alReportar, aviso,
}) {
  const [tipo, setTipo] = useState('')
  const [grupo, setGrupo] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [eligiendoTipo, setEligiendoTipo] = useState(false)

  const acciones = useMemo(() => (lista ?? []).map(accionDe), [lista])
  const q = plano(busqueda.trim())
  const buscadas = acciones.filter((a) => !q || plano(`${a.titulo} ${a.detalle} ${a.generadoPor}`).includes(q))
  const delTipo = buscadas.filter((a) => !tipo || a.tipo === tipo)
  const delEstado = buscadas.filter((a) => grupo === 'todas' || a.grupo === grupo)
  const visibles = masNuevasPrimero(delTipo.filter((a) => grupo === 'todas' || a.grupo === grupo))
  const cuentaEstado = (g) => delTipo.filter((a) => g === 'todas' || a.grupo === g).length
  // Tres tramos: lo VENCIDO, lo PENDIENTE y lo HECHO; dentro, lo más nuevo primero.
  const tramos = [
    { texto: 'Vencidas', tono: 'peligro', items: visibles.filter((a) => a.vencida && a.estado !== 'realizada') },
    { texto: 'Pendientes', tono: '', items: visibles.filter((a) => !a.vencida && a.estado !== 'realizada') },
    { texto: 'Realizadas', tono: '', items: visibles.filter((a) => a.estado === 'realizada') },
  ].filter((t) => t.items.length > 0)

  // Las cifras de arriba, de TODAS (el filtro no las toca).
  const abiertas = acciones.filter((a) => a.grupo === 'abierta').length
  const enRevision = acciones.filter((a) => a.grupo === 'revision').length
  const resueltas = acciones.filter((a) => a.grupo === 'resuelta').length
  const vencidas = acciones.filter((a) => a.vencida && a.estado !== 'realizada').length
  const pendientes = acciones.filter((a) => a.estado !== 'realizada').length
  const tonoUnidad = error ? 'aviso' : vencidas ? 'peligro' : pendientes ? 'aviso' : 'exito'
  const textoUnidad = error ? 'Sin comprobar'
    : vencidas ? f.cantidad(vencidas, 'vencida', 'vencidas')
      : pendientes ? f.cantidad(pendientes, 'pendiente', 'pendientes') : 'Al día'
  const tipoElegido = TIPOS.find((t) => t.id === tipo)
  const etiquetaUnidad = (unidad?.numero && unidad.numero !== '—' ? unidad.numero.toUpperCase() : null) ?? unidad?.placa ?? unidad?.alias ?? ''

  const titulo = (
    <header className="mvm-titulo">
      <h1>Mantenimiento</h1>
      <p>Lo que reportaste y cómo va.</p>
    </header>
  )

  return (
    <div className="mvm">
      {titulo}
      {/* Las órdenes que el supervisor le asignó, para trabajarlas (aunque no tenga unidad). */}
      {!cargando && ordenes && <OdtAsignadas odts={ordenes} perfil={perfil} alCambiar={alCambiar} alAbrir={alAbrir} unidad={unidad} />}

      {!cargando && !error && !asignacion ? (
        <Vacio titulo="Aún no conduces una unidad" texto="Cuando tu supervisor te asigne un vehículo, aquí verás su mantenimiento." />
      ) : (
        <>
          <div className="mvm-cabeza">
            {/* Cuánto hay de cada cosa; solo con las órdenes leídas (unos ceros dirían algo que no se sabe). */}
            {!cargando && !error && (
              <div className="mvm-kpis">
                {[['Abiertas', abiertas, 'aviso'], ['En revisión', enRevision, 'primario'], ['Resueltas', resueltas, 'exito']].map(([k, n, t]) => (
                  <div key={k} className="mvm-kpi"><b className={t}>{f.numero(n)}</b><small>{k}</small></div>
                ))}
              </div>
            )}
            {unidad && (
              <div className="mvm-unidad">
                <span className="mvm-unidad-icono"><IconoApp nombre="flota" tam={24} /></span>
                <span className="mvm-unidad-txt">
                  <b>{etiquetaUnidad}</b>
                  <small>{[`${unidad.marca ?? ''} ${unidad.modelo ?? ''}`.trim(), unidad.km == null ? null : f.km(unidad.km)].filter(Boolean).join(' · ')}</small>
                </span>
                <span className={`mvm-chip ${tonoUnidad}`}><i className={vencidas ? 'mvm-late' : ''} aria-hidden="true" />{textoUnidad}</span>
              </div>
            )}
            <label className="mvm-buscar">
              <IconoApp nombre="buscar" tam={18} />
              <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar un servicio…" aria-label="Buscar un servicio" />
            </label>
          </div>

          {aviso && <p className="mvm-aviso" role="status"><IconoApp nombre="check" tam={18} />{aviso}</p>}

          {/* Los filtros siguen aunque no haya nada: si no, no habría cómo volver. */}
          <div className="mvm-filtros">
            <div className="mvm-riel" role="group" aria-label="Estado de la orden">
              {GRUPOS.map((g) => (
                <button key={g.id} type="button" className={`mvm-opcion${g.id === grupo ? ' on' : ''}`} aria-pressed={g.id === grupo} onClick={() => setGrupo(g.id)}>
                  {g.tono && <i className={g.tono} aria-hidden="true" />}
                  {g.texto}
                  <span className="mvm-cuenta">{cargando ? '—' : cuentaEstado(g.id)}</span>
                </button>
              ))}
            </div>
            <button type="button" className={`mvm-tipo${tipoElegido ? ' on' : ''}`} onClick={() => setEligiendoTipo(true)}
              aria-label={tipoElegido ? `Tipo de orden: ${tipoElegido.texto}` : 'Tipo de orden'}>
              <IconoApp nombre="filtro" tam={16} />Tipo
            </button>
          </div>

          {cargando ? (
            <Cargando filas={3} />
          ) : error && visibles.length === 0 ? (
            <Vacio titulo="No pudimos leer las órdenes de tu unidad." texto="Revisa tu conexión e inténtalo de nuevo."
              accion={<button type="button" className="pnl-btn" onClick={alReintentar}>Reintentar</button>} />
          ) : visibles.length === 0 ? (
            <Vacio titulo={busqueda.trim() ? 'Nada con esa búsqueda'
              : tipoElegido ? `Sin mantenimiento ${tipoElegido.texto.toLowerCase()}`
                : grupo === 'todas' ? 'Tu unidad está al día' : 'Nada en este estado'} />
          ) : (
            <div className="mvm-tramos">
              {tramos.map((t) => (
                <section key={t.texto} className="mvm-tramo" aria-label={t.texto}>
                  <EncabezadoGrupo texto={t.texto} cuenta={t.items.length} tono={t.tono} />
                  {t.items.map((a) => <TarjetaAccion key={a.id} accion={a} alAbrir={alAbrir} />)}
                </section>
              ))}
            </div>
          )}

          {/* La acción principal, fija sobre la barra de pestañas. */}
          {unidad && (
            <div className="mvm-barra-accion">
              <button type="button" className="mvm-destacado" onClick={alReportar}>
                <IconoApp nombre="reportar" tam={20} />Reportar una falla
              </button>
            </div>
          )}
        </>
      )}

      <Modal titulo="Tipo de orden" abierto={eligiendoTipo} alCerrar={() => setEligiendoTipo(false)}>
        <ul className="mvm-opciones">
          {[{ id: '', texto: 'Todos los tipos' }, ...TIPOS].map((t) => {
            const n = t.id ? delEstado.filter((a) => a.tipo === t.id).length : delEstado.length
            return (
              <li key={t.id || 'todos'}>
                <button type="button" aria-pressed={t.id === tipo} onClick={() => { setTipo(t.id); setEligiendoTipo(false) }}>
                  <b>{t.texto}</b>
                  <small>{n === 0 ? 'Ninguna' : n}</small>
                  <span className="mvm-opcion-marca">{t.id === tipo && <IconoApp nombre="check" tam={16} />}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </Modal>
    </div>
  )
}
