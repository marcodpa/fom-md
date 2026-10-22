import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { HAY_MAPBOX } from './MapaMapbox'
import { Cargando, ErrorCarga, Tarjeta, Vacio } from './ui'
import {
  CLAVES_EVENTO, DIAS_PEDIDO, EXCESO_KMH, PASO_EVENTOS, PERIODOS_LISTA, PERIODOS_MAPA, TIPOS_EVENTO,
  alCambiarUnidad, conteoTipo, eleccionParaEvento, eleccionValida, enlaceEventoEnMapa, eventoDelEnlace,
  eventosParaMapa, filtrarEventosManejo, mostrarInicial, periodoIncompleto, textoEvento, tipoEvento,
  unidadEvento, velocidadesEvento, verMas,
} from '../datos/eventosManejo'
import * as f from '../datos/formato'
import './eventos-manejo.css'

// ============================================================
// MANEJO BRUSCO — frenadas, aceleraciones y excesos de más de 120 km/h.
// ------------------------------------------------------------
// En el Centro de control (y en «Mi mapa» del conductor) van sobre el mapa al elegir la unidad,
// con un bloque compacto en su ficha para filtrar. En la pestaña Conducción del perfil solo hay
// lista, y cada evento lleva al mapa. Las reglas de filtro son de datos/eventosManejo.js.
// ============================================================

/** El ícono de un tipo de evento: el mismo círculo de color y glifo de la capa del mapa. */
export function IconoEventoManejo({ tipo, tam = 28 }) {
  const t = tipoEvento(tipo)
  if (!t) return null
  return <span className="em-icono" style={{ '--em-color': t.color, width: tam, height: tam }} aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {t.glifo.map((d) => <path key={d} d={d} />)}
    </svg>
  </span>
}

// --- Pedidos: uno por persona, guardado unos minutos ------------------------
// Las pastillas filtran aquí, así que cambiar de período o de tipo no pide nada. El refresco de
// 60 s de la pantalla vuelve a leer lo guardado hasta que vence; un fallo no se guarda.
const VIGENCIA_MS = 3 * 60000
const guardados = new Map()

function pedirEventos({ userId, propio }) {
  const llave = `${propio ? 'me' : 'u'}:${userId ?? ''}`
  const g = guardados.get(llave)
  if (g && Date.now() - g.desde < VIGENCIA_MS) return g.peticion
  const peticion = repo.manejo.eventos({ userId, propio, dias: DIAS_PEDIDO })
  const nuevo = { desde: Date.now(), peticion }
  guardados.set(llave, nuevo)
  peticion.catch(() => { if (guardados.get(llave) === nuevo) guardados.delete(llave) })
  return peticion
}

// --- Lo elegido se recuerda mientras dure la sesión -------------------------
const CLAVE_SESION = 'fom.panel.manejoBrusco.'

function leerEleccion(clave, periodos) {
  try {
    return eleccionValida(JSON.parse(sessionStorage.getItem(CLAVE_SESION + clave) || 'null'), periodos)
  } catch {
    return eleccionValida(null, periodos)
  }
}

/**
 * Todo lo del manejo brusco de una unidad (o de una persona, sin `vehiculoId`).
 * - `userId` / `propio`: de quién se piden (el servidor los da por conductor). Sin ninguno, nada.
 * - `pedido`: lo que trae un enlace ({ unidad, evento, hora, tipo, clave }); se aplica una vez,
 *   cuando ya llegaron los eventos de esa unidad y `listoParaVolar` (el mapa terminó de
 *   encuadrar la unidad: si no, ese encuadre taparía el vuelo al evento).
 * - `clave`: dónde se recuerda la elección en la sesión ('mapa' o 'lista').
 */
export function useManejoBrusco({
  vehiculoId = null, userId = null, propio = false, pedido = null, listoParaVolar = true,
  periodos = PERIODOS_MAPA, clave = 'mapa',
}) {
  const [eleccion, setEleccion] = useState(() => leerEleccion(clave, periodos))
  useEffect(() => {
    try { sessionStorage.setItem(CLAVE_SESION + clave, JSON.stringify(eleccion)) } catch { /* sin almacenamiento: solo no se recuerda */ }
  }, [clave, eleccion])

  // Al cambiar de unidad: nada elegido (globo cerrado) y «Ver más» de vuelta a 5.
  const [guardado, setGuardado] = useState(() => alCambiarUnidad(null, vehiculoId))
  const estado = alCambiarUnidad(guardado, vehiculoId)
  if (estado !== guardado) setGuardado(estado)

  const pide = Boolean(propio || userId)
  const llave = `${vehiculoId}:${propio ? 'me' : userId}`
  const carga = useDatos(
    async () => ({ llave, lista: pide ? await pedirEventos({ userId, propio }) : null }),
    [llave],
    60000,
  )
  const alDia = carga.datos?.llave === llave
  const crudos = alDia ? carga.datos.lista : null
  const lista = useMemo(() => eventosParaMapa(crudos, { vehiculoId, dias: DIAS_PEDIDO }), [crudos, vehiculoId])
  const filtro = useMemo(
    () => filtrarEventosManejo(lista, { periodo: eleccion.periodo, tipos: eleccion.tipos, mostrar: estado.mostrar }),
    [lista, eleccion, estado.mostrar],
  )
  // El mismo arreglo mientras sean los mismos eventos: el mapa no rehace la capa ni cierra el globo.
  const estable = useRef({ firma: '', v: filtro.visibles })
  const firma = filtro.visibles.map((e) => e.id).join('|')
  if (firma !== estable.current.firma) estable.current = { firma, v: filtro.visibles }
  const visibles = estable.current.v
  const elegido = visibles.some((e) => e.id === estado.activo) ? estado.activo : null

  // El enlace: se aplica una sola vez por pedido.
  const [resuelto, setResuelto] = useState(null)
  if (pedido && pedido.clave !== resuelto && pedido.unidad === vehiculoId && alDia && listoParaVolar) {
    setResuelto(pedido.clave)
    const e = pide ? eventoDelEnlace(lista, pedido) : null
    const nueva = e ? eleccionParaEvento(lista, e.id, { periodos: periodos.map((p) => p.v), tipos: eleccion.tipos }) : null
    if (nueva) {
      setEleccion({ periodo: nueva.periodo, tipos: nueva.tipos })
      setGuardado({ ...estado, activo: e.id, mostrar: nueva.mostrar, aviso: '' })
    } else if (pide) {
      setGuardado({ ...estado, activo: null, aviso: `No encontramos ese evento entre los de esta unidad de los últimos ${DIAS_PEDIDO} días (los excesos de ${EXCESO_KMH} km/h o menos no se muestran).` })
    }
  }

  return {
    estado: !pide ? 'sin' : carga.estado === 'error' && !alDia ? 'error' : !alDia ? 'cargando' : 'ok',
    error: carga.error,
    recargar: carga.recargar,
    lista,
    ...filtro,
    visibles,
    elegido,
    aviso: estado.aviso ?? '',
    incompleto: periodoIncompleto(crudos, eleccion.periodo),
    periodos,
    periodo: eleccion.periodo,
    tipos: eleccion.tipos,
    elegir: (id) => setGuardado((g) => ({ ...alCambiarUnidad(g, vehiculoId), activo: id ?? null, aviso: '' })),
    setPeriodo: (periodo) => {
      setEleccion((el) => ({ ...el, periodo }))
      setGuardado((g) => ({ ...alCambiarUnidad(g, vehiculoId), mostrar: mostrarInicial() }))
    },
    alternarTipo: (tipo) => setEleccion((el) => ({
      ...el,
      tipos: el.tipos.includes(tipo) ? el.tipos.filter((t) => t !== tipo) : CLAVES_EVENTO.filter((c) => c === tipo || el.tipos.includes(c)),
    })),
    verMas: (tipo) => setGuardado((g) => ({ ...alCambiarUnidad(g, vehiculoId), mostrar: verMas(g.mostrar, tipo) })),
  }
}

/** Pastillas de período y conmutadores de tipo con su conteo «5 de 23». */
function FiltrosManejo({ m }) {
  return <div className="mb-filtros">
    <div className="pnl-chips mb-periodos" role="group" aria-label="Qué eventos mostrar">
      {m.periodos.map((p) => (
        <button key={p.v} type="button" className={`pnl-chip${m.periodo === p.v ? ' activo' : ''}`} aria-pressed={m.periodo === p.v} onClick={() => m.setPeriodo(p.v)}>{p.t}</button>
      ))}
    </div>
    {m.periodo !== 'oculto' && <div className="em-leyenda mb-tipos" role="group" aria-label="Tipos de evento">
      {TIPOS_EVENTO.map((t) => {
        const encendido = m.tipos.includes(t.clave)
        const conteo = conteoTipo(m.porTipo[t.clave])
        return <button key={t.clave} type="button" className={`em-filtro${encendido ? ' activo' : ''}`} aria-pressed={encendido}
          aria-label={`${t.plural}: ${conteo}${encendido ? '' : ' (apagado)'}`} onClick={() => m.alternarTipo(t.clave)}>
          <IconoEventoManejo tipo={t.clave} tam={22} /><span>{t.corto}</span><b>{conteo}</b>
        </button>
      })}
    </div>}
  </div>
}

/** La fila de un evento: botón que lo elige en el mapa, o enlace que lleva al mapa (`a`). */
function FilaEvento({ e, activo = false, alElegir, a, conUnidad = false }) {
  const contenido = <>
    <IconoEventoManejo tipo={e.tipo} />
    <span className="em-fila-txt">
      <b>{tipoEvento(e.tipo).nombre}{velocidadesEvento(e) && <em> · {velocidadesEvento(e)}</em>}</b>
      <small>{[f.fechaHora(e.hora), conUnidad ? unidadEvento(e) : ''].filter(Boolean).join(' · ')}</small>
    </span>
  </>
  if (a) return <Link className="em-fila" to={a} aria-label={`${textoEvento(e)}. Ver en el mapa`}>{contenido}<span className="em-ir" aria-hidden="true">Ver en el mapa →</span></Link>
  return <button type="button" className={`em-fila${activo ? ' activo' : ''}`} aria-pressed={activo}
    aria-label={`${textoEvento(e)}. ${activo ? 'Abierto en el mapa' : 'Ver en el mapa'}`} onClick={() => alElegir(activo ? null : e.id)}>{contenido}</button>
}

/** La lista por tipo, cada uno con «Ver 5 más». */
function ListaManejo({ m, enlace }) {
  const tipos = TIPOS_EVENTO.filter((t) => m.porTipo[t.clave].encendido && m.porTipo[t.clave].eventos.length > 0)
  return tipos.map((t) => {
    const g = m.porTipo[t.clave]
    return <section key={t.clave} className="mb-tipo" aria-label={t.plural}>
      <h4><IconoEventoManejo tipo={t.clave} tam={18} />{t.plural}<span>{conteoTipo(g)}</span></h4>
      <ul className="em-lista">
        {g.eventos.map((e) => <li key={e.id}>
          <FilaEvento e={e} activo={e.id === m.elegido} alElegir={m.elegir} a={enlace?.(e)} conUnidad={Boolean(enlace)} />
        </li>)}
      </ul>
      {g.quedan > 0 && <button type="button" className="pnl-btn sutil mb-mas" onClick={() => m.verMas(t.clave)}>
        Ver {f.numero(Math.min(PASO_EVENTOS, g.quedan))} más
      </button>}
    </section>
  })
}

const TEXTO_PERIODO = { ultimos: `en los últimos ${DIAS_PEDIDO} días`, hoy: 'hoy', 7: 'en los últimos 7 días', 30: 'en los últimos 30 días' }

/** Lo que va debajo de los filtros según el estado (cargando, error, vacío, oculto o la lista). */
function CuerpoManejo({ m, enlace, sinConductor }) {
  if (m.estado === 'sin') return <p className="em-nota">{sinConductor}</p>
  if (m.estado === 'cargando') return <Cargando filas={2} />
  if (m.estado === 'error') return <ErrorCarga compacto error={m.error} texto="No se pudieron consultar los eventos de manejo." onReintentar={m.recargar} />
  if (m.periodo === 'oculto') return <p className="em-nota" role="status">Eventos ocultos en el mapa. Elige un período para verlos.</p>
  if (m.total === 0) return <Vacio compacto icono="velocidad" titulo="Sin eventos bruscos en este período"
    texto={`Sin frenadas ni aceleraciones bruscas, ni excesos de más de ${EXCESO_KMH} km/h, ${TEXTO_PERIODO[m.periodo] ?? ''}.`} />
  if (m.visibles.length === 0) return <p className="em-nota" role="status">Enciende al menos un tipo de evento para verlo.</p>
  return <ListaManejo m={m} enlace={enlace} />
}

/**
 * Bloque «Manejo brusco» de la ficha de la unidad (Centro de control y Mi mapa). `m`: lo que
 * devuelve `useManejoBrusco`. Tocar un evento centra el mapa en él y abre su globo.
 */
export function BloqueManejoBrusco({ m, sinConductor = 'Sin conductor asignado: no se pueden mostrar sus eventos (el servidor los entrega por conductor).' }) {
  const notas = [
    m.estado === 'ok' && m.periodo !== 'oculto' ? `Excesos: solo los de más de ${EXCESO_KMH} km/h.` : '',
    m.estado === 'ok' && m.incompleto ? 'Llegaron los 100 eventos más recientes: puede haber más antiguos.' : '',
    m.estado === 'ok' && !HAY_MAPBOX ? 'El mapa de eventos necesita Mapbox, que no está configurado aquí.' : '',
  ].filter(Boolean)
  return <section className="mb-bloque" aria-label="Manejo brusco" aria-busy={m.estado === 'cargando'}>
    <h3>Manejo brusco</h3>
    {m.estado !== 'sin' && <FiltrosManejo m={m} />}
    {m.aviso && <p className="em-nota mb-aviso" role="status">{m.aviso}</p>}
    <CuerpoManejo m={m} sinConductor={sinConductor} />
    {notas.length > 0 && <p className="em-nota">{notas.join(' ')}</p>}
  </section>
}

/**
 * Pestaña Conducción del perfil: solo la lista (sin mapa), con los mismos filtros. Cada evento
 * lleva al Centro de control con su unidad elegida y el mapa en ese evento. `propio`: los de la
 * sesión (`me/`); si no, los de `userId`. El período inicial puede venir en `?dias=` (el «Ver
 * eventos →» de la tarjeta Manejo cuando la persona no tiene unidad).
 */
export default function EventosManejoPerfil({ userId, propio = false }) {
  const [parametros] = useSearchParams()
  const pedidoDias = parametros.get('dias')
  const m = useManejoBrusco({ userId: userId || null, propio, periodos: PERIODOS_LISTA, clave: 'lista' })
  // «Ver eventos →» con la pestaña ya abierta solo cambia `?dias=`: se sigue aquí también.
  const [diasVistos, setDiasVistos] = useState(null)
  if (pedidoDias !== diasVistos) {
    setDiasVistos(pedidoDias)
    if (PERIODOS_LISTA.some((p) => p.v === pedidoDias) && pedidoDias !== m.periodo) m.setPeriodo(pedidoDias)
  }
  const enlace = (e) => enlaceEventoEnMapa({ vehiculoId: e.vehiculoId, eventoId: e.id, conductorId: propio ? null : userId })
  const notas = [
    m.estado === 'ok' ? `Excesos: solo los de más de ${EXCESO_KMH} km/h.` : '',
    m.estado === 'ok' && m.incompleto ? 'Llegaron los 100 eventos más recientes: puede haber más antiguos en el período.' : '',
    m.estado === 'ok' && m.visibles.length ? 'Toca un evento para verlo en el mapa.' : '',
  ].filter(Boolean)
  return (
    <div className="pnl-grid em-conduccion">
      <Tarjeta titulo="Eventos de manejo">
        <div className="mb-bloque mb-perfil" aria-busy={m.estado === 'cargando'}>
          {m.estado !== 'sin' && <FiltrosManejo m={m} />}
          <CuerpoManejo m={m} enlace={enlace} sinConductor="Sin datos de la persona." />
          {notas.length > 0 && <p className="em-nota">{notas.join(' ')}</p>}
        </div>
      </Tarjeta>
    </div>
  )
}
