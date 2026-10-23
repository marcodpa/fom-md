import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import repo from '../datos/repo'
import { empresaGestionActualId } from '../datos/api'
import { sesionActual } from '../auth'
import { useDatos } from '../useDatos'
import { HAY_MAPBOX } from './MapaMapbox'
import { Cargando, ErrorCarga, Tarjeta, Vacio } from './ui'
import {
  CLAVES_EVENTO, DIAS_PEDIDO, EXCESO_KMH, PASO_EVENTOS, PERIODOS_LISTA, PERIODOS_MAPA, TIPOS_EVENTO,
  alCambiarUnidad, conteoTipo, crearCacheEventos, diasDelPeriodo, eleccionParaEvento, eleccionValida, enlaceEventoEnMapa, eventoDelEnlace,
  eventosParaMapa, filtrarEventosFlota, filtrarEventosManejo, juntarEventos, mezclarEventos, mostrarInicial, periodoIncompleto, textoEvento,
  tipoEvento, unidadEvento, velocidadesEvento, verMas,
} from '../datos/eventosManejo'
import * as f from '../datos/formato'
import './eventos-manejo.css'

// ============================================================
// MANEJO BRUSCO — frenadas, aceleraciones y excesos de más de 120 km/h.
// ------------------------------------------------------------
// En el Centro de control van sobre el mapa al pulsar «Ver manejo brusco» en la ficha de la
// unidad (o al llegar por un enlace a un evento); en «Mi mapa» del conductor, al abrir su ficha.
// En los dos, con un bloque compacto para filtrar. En la pestaña Conducción del perfil solo hay
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

// --- Pedidos: uno por persona y período, guardado unos minutos --------------
// Las pastillas filtran aquí; solo pasar de 30 a 7 días (o al revés) pide algo. El refresco de
// 60 s de la pantalla vuelve a leer lo guardado hasta que vence; un fallo no se guarda.
// La ficha de una unidad y la vista de la flota comparten lo guardado. Va por sesión y empresa:
// al entrar con otra cuenta o a otra empresa se vacía (ver crearCacheEventos).
const VIGENCIA_MS = 3 * 60000
const cache = crearCacheEventos({
  pedir: ({ userId, propio, dias }) => repo.manejo.eventos({ userId, propio, dias }),
  dueno: () => {
    const perfil = sesionActual()?.perfil
    return `${perfil?.id ?? ''}|${perfil?.empresaId ?? ''}|${empresaGestionActualId() ?? ''}`
  },
  vigenciaMs: VIGENCIA_MS,
})

function pedirEventos({ userId, propio, dias = DIAS_PEDIDO, fresco = false }) {
  return cache.pedir({ userId, propio, dias, fresco })
}

/** Los de varios conductores (los de una unidad), juntos y sin repetidos. */
async function pedirDeVarios({ userIds, propio, dias }) {
  if (propio) return pedirEventos({ propio, dias })
  return juntarEventos(await Promise.all(userIds.map((userId) => pedirEventos({ userId, dias }))))
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
 * - `userIds`: más conductores de la misma unidad (principal y secundarios): se juntan.
 * - `pedido`: lo que trae un enlace ({ unidad, evento, hora, tipo, clave }); se aplica una vez,
 *   cuando ya llegaron los eventos de esa unidad y `listoParaVolar` (el mapa terminó de
 *   encuadrar la unidad: si no, ese encuadre taparía el vuelo al evento).
 * - `clave`: dónde se recuerda la elección en la sesión ('mapa' o 'lista').
 * - `todoElPeriodo`: con «Hoy» o «7 días», todos los del período (por defecto, con una unidad).
 */
export function useManejoBrusco({
  vehiculoId = null, userId = null, userIds = null, propio = false, pedido = null, listoParaVolar = true,
  periodos = PERIODOS_MAPA, clave = 'mapa', todoElPeriodo = Boolean(vehiculoId),
}) {
  const [eleccion, setEleccion] = useState(() => leerEleccion(clave, periodos))
  useEffect(() => {
    try { sessionStorage.setItem(CLAVE_SESION + clave, JSON.stringify(eleccion)) } catch { /* sin almacenamiento: solo no se recuerda */ }
  }, [clave, eleccion])

  // Al cambiar de unidad: nada elegido (globo cerrado) y «Ver más» de vuelta a 5.
  const [guardado, setGuardado] = useState(() => alCambiarUnidad(null, vehiculoId))
  const estado = alCambiarUnidad(guardado, vehiculoId)
  if (estado !== guardado) setGuardado(estado)

  // El enlace: se aplica una sola vez por pedido. Mientras espera se piden los 30 días, para
  // encontrar el evento aunque la sesión haya quedado en «7 días».
  const [resuelto, setResuelto] = useState(null)
  const enlacePendiente = Boolean(pedido && pedido.clave !== resuelto && pedido.unidad === vehiculoId)

  const ids = [...new Set([userId, ...(userIds ?? [])].filter(Boolean))]
  const pide = Boolean(propio || ids.length)
  const dias = enlacePendiente ? DIAS_PEDIDO : diasDelPeriodo(eleccion.periodo)
  // `base`: de quién son; `llave`: además, cuántos días. Al cambiar solo los días se sigue
  // viendo lo anterior mientras llega lo nuevo (sin parpadeo de «Cargando»).
  const base = `${vehiculoId}:${propio ? 'me' : ids.join(',')}`
  const llave = `${base}:${dias}`
  const carga = useDatos(
    async () => ({ llave, base, dias, lista: pide ? await pedirDeVarios({ userIds: ids, propio, dias }) : null }),
    [llave],
    60000,
  )
  const alDia = carga.datos?.llave === llave
  const previo = !alDia && carga.datos?.base === base
  const crudos = alDia || previo ? carga.datos.lista : null
  const diasCrudos = alDia || previo ? carga.datos.dias : dias
  const lista = useMemo(() => eventosParaMapa(crudos, { vehiculoId, dias: diasCrudos }), [crudos, vehiculoId, diasCrudos])
  const filtro = useMemo(
    () => filtrarEventosManejo(lista, { periodo: eleccion.periodo, tipos: eleccion.tipos, mostrar: estado.mostrar, todoElPeriodo }),
    [lista, eleccion, estado.mostrar, todoElPeriodo],
  )
  // El mismo arreglo mientras sean los mismos eventos: el mapa no rehace la capa ni cierra el globo.
  const estable = useRef({ firma: '', v: filtro.visibles })
  const firma = filtro.visibles.map((e) => e.id).join('|')
  if (firma !== estable.current.firma) estable.current = { firma, v: filtro.visibles }
  const visibles = estable.current.v
  const elegido = visibles.some((e) => e.id === estado.activo) ? estado.activo : null

  if (enlacePendiente && alDia && listoParaVolar) {
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
    estado: !pide ? 'sin' : carga.estado === 'error' && !alDia ? 'error' : crudos ? 'ok' : 'cargando',
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
          <FilaEvento e={e} activo={e.id === m.elegido} alElegir={m.elegir} a={enlace?.(e)} conUnidad={Boolean(enlace || m.conUnidad)} />
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
    m.estado === 'ok' && m.incompleto ? 'El servidor entrega como mucho 100 eventos por conductor: puede haber más antiguos.' : '',
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

// --- Vista general: el manejo brusco de toda la flota ------------------------
// El servidor no tiene una lectura de eventos de la empresa entera ni por unidad: solo por
// conductor (pendiente con Juan en fom-core). Mientras tanto se pide conductor por conductor, pocos a la vez
// para no ahogar al servidor (pool de 10 conexiones, fom-core#713), y el mapa se va llenando.
// Solo con el modo abierto y sin unidad elegida; lo leído se guarda y se reusa en la ficha.
const A_LA_VEZ = 3
/** Cada cuánto se repinta mientras van llegando (no en cada conductor: con 340 serían 340 repintados). */
const REPINTAR_MS = 1000

/**
 * Manejo brusco de la flota. `vehiculos`: las unidades a la vista (con los filtros del Centro de
 * control); `activo`: el modo está abierto. De cada unidad, los 5 más nuevos de cada tipo.
 */
export function useManejoFlota({ vehiculos, activo }) {
  const [eleccion, setEleccion] = useState(() => leerEleccion('flota', PERIODOS_MAPA))
  useEffect(() => {
    try { sessionStorage.setItem(`${CLAVE_SESION}flota`, JSON.stringify(eleccion)) } catch { /* sin almacenamiento: solo no se recuerda */ }
  }, [eleccion])
  const [activoId, setActivoId] = useState(null)
  const oculto = eleccion.periodo === 'oculto'
  const dias = diasDelPeriodo(eleccion.periodo)

  // Quién maneja cada unidad: el principal y también los secundarios (asignaciones vigentes,
  // que el servidor ya tiene guardadas 5 min para la flota: no es un pedido más).
  const asignaciones = useDatos(() => (activo ? repo.conductores().catch(() => []) : Promise.resolve(null)), [activo])
  const firmaUnidades = (vehiculos ?? []).map((v) => `${v.id}>${v.conductorPrincipalId ?? ''}`).join('|')
  const { unidades, conductores } = useMemo(() => {
    const u = new Set()
    const c = new Set()
    for (const par of firmaUnidades ? firmaUnidades.split('|') : []) {
      const [id, conductor] = par.split('>')
      u.add(id)
      if (conductor) c.add(conductor)
    }
    for (const a of asignaciones.datos ?? []) if (a?.id && u.has(a.vehiculoId)) c.add(a.id)
    return { unidades: u, conductores: [...c] }
  }, [firmaUnidades, asignaciones.datos])
  const asignacionesListas = asignaciones.datos != null

  // Lo leído, por «días:conductor». Se queda entre aperturas y entre cambios de filtro: solo se
  // pide lo que falta o lo que ya venció (se sigue viendo lo anterior hasta que llega lo nuevo).
  const leidos = useRef(new Map())
  const [version, setVersion] = useState(0)
  const [vuelta, setVuelta] = useState(0)
  // La vuelta en la que se pidió «Actualizar»: solo esa sale al servidor saltándose lo guardado.
  const vueltaFresca = useRef(-1)
  const [enCurso, setEnCurso] = useState(false)
  const firmaConductores = conductores.join('|')
  useEffect(() => {
    if (!activo || oculto || !asignacionesListas) return undefined
    let vivo = true
    let repintar = null
    const avisar = () => {
      if (repintar) return
      repintar = setTimeout(() => { repintar = null; if (vivo) setVersion((n) => n + 1) }, REPINTAR_MS)
    }
    const faltan = conductores.filter((id) => {
      const r = leidos.current.get(`${dias}:${id}`)
      return !r || r.error || r.vencido || Date.now() - r.en > VIGENCIA_MS
    })
    if (!faltan.length) return undefined
    setEnCurso(true)
    // Se gasta al usarlo: otra vuelta (un reintento, otro período) vuelve a usar lo guardado.
    const fresco = vuelta === vueltaFresca.current
    if (fresco) vueltaFresca.current = -1
    const trabajar = async () => {
      while (vivo && faltan.length) {
        const id = faltan.shift()
        try {
          const lista = await pedirEventos({ userId: id, dias, fresco })
          if (vivo) leidos.current.set(`${dias}:${id}`, { lista, en: Date.now() })
        } catch (error) {
          if (vivo) leidos.current.set(`${dias}:${id}`, { error, en: Date.now() })
        }
        avisar()
      }
    }
    Promise.all(Array.from({ length: A_LA_VEZ }, trabajar)).then(() => {
      if (!vivo) return
      clearTimeout(repintar)
      repintar = null
      setEnCurso(false)
      setVersion((n) => n + 1)
    })
    return () => {
      vivo = false
      clearTimeout(repintar)
      setEnCurso(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, oculto, asignacionesListas, dias, firmaConductores, vuelta])

  // Lo de cada conductor se filtra (período y unidades a la vista) una sola vez, al llegar, y se
  // intercala con lo que ya había: un repintado no rehace las decenas de miles de antes. Una
  // lectura nueva de un conductor ya mezclado quita solo lo suyo de antes. Con otras unidades,
  // otro período o un conductor que ya no está, se rehace desde cero.
  const mezcla = useRef({ dias: null, unidades: null, de: new Map(), lista: [] })
  const { lista, leidosN, fallidos } = useMemo(() => {
    let m = mezcla.current
    const vigentes = new Set(conductores)
    if (m.dias !== dias || m.unidades !== unidades || [...m.de.keys()].some((id) => !vigentes.has(id))) {
      m = mezcla.current = { dias, unidades, de: new Map(), lista: [] }
    }
    const quitar = new Set()
    const nuevas = []
    let n = 0
    let malos = 0
    for (const id of conductores) {
      const r = leidos.current.get(`${dias}:${id}`)
      if (!r) continue
      n += 1
      if (r.error) { malos += 1; continue }
      const antes = m.de.get(id)
      if (antes?.r === r) continue
      for (const e of antes?.eventos ?? []) quitar.add(e.id)
      const propia = eventosParaMapa(r.lista, { dias }).filter((e) => unidades.has(e.vehiculoId))
      m.de.set(id, { r, eventos: propia })
      // El aviso de corte en 100 mira lo que llegó entero, no solo lo filtrado.
      if (r.lista?.tope && r.lista.length) {
        propia.tope = true
        propia.completoDesde = juntarEventos([r.lista]).completoDesde
      }
      nuevas.push(propia)
    }
    if (quitar.size) {
      const resto = m.lista.filter((e) => !quitar.has(e.id))
      if (m.lista.tope) Object.assign(resto, { tope: true, completoDesde: m.lista.completoDesde })
      m.lista = resto
    }
    if (nuevas.length) m.lista = mezclarEventos(m.lista, nuevas)
    return { lista: m.lista, leidosN: n, fallidos: malos }
    // `version` cambia cuando llega algo nuevo a `leidos`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conductores, dias, unidades, version])
  const crudos = lista
  const filtro = useMemo(
    () => filtrarEventosFlota(lista, { periodo: eleccion.periodo, tipos: eleccion.tipos }),
    [lista, eleccion],
  )
  const estable = useRef({ firma: '', v: filtro.visibles })
  const firma = filtro.visibles.map((e) => e.id).join('|')
  if (firma !== estable.current.firma) estable.current = { firma, v: filtro.visibles }
  const visibles = estable.current.v
  const elegido = visibles.some((e) => e.id === activoId) ? activoId : null

  const total = conductores.length
  return {
    // Mientras lee y aún no llegó nada del período, «Cargando» (no «Sin eventos»).
    estado: !activo ? 'sin' : !asignacionesListas || (!oculto && total > 0 && (leidosN === 0 || (enCurso && filtro.total === 0))) ? 'cargando' : 'ok',
    ...filtro,
    visibles,
    elegido,
    conductores: total,
    leidos: leidosN,
    fallidos,
    leyendo: enCurso && leidosN < total,
    incompleto: periodoIncompleto(crudos, eleccion.periodo),
    periodos: PERIODOS_MAPA,
    periodo: eleccion.periodo,
    tipos: eleccion.tipos,
    elegir: (id) => setActivoId(id ?? null),
    setPeriodo: (periodo) => setEleccion((el) => ({ ...el, periodo })),
    alternarTipo: (tipo) => setEleccion((el) => ({
      ...el,
      tipos: el.tipos.includes(tipo) ? el.tipos.filter((t) => t !== tipo) : CLAVES_EVENTO.filter((c) => c === tipo || el.tipos.includes(c)),
    })),
    /**
     * Vuelve a pedir los que fallaron (y, con `todo`, todos: «Actualizar»). Lo leído no se borra:
     * se marca vencido y se sigue viendo hasta que llega lo nuevo.
     */
    recargar: (todo = false) => {
      for (const [llave, r] of leidos.current) {
        if (r.error) leidos.current.delete(llave)
        // Se marca en el mismo objeto: lo ya mezclado en el mapa no se rehace por esto.
        else if (todo) r.vencido = true
      }
      if (todo) cache.vencer()
      setVuelta((n) => {
        if (todo) vueltaFresca.current = n + 1
        return n + 1
      })
    },
  }
}

/**
 * Bloque «Manejo brusco de la flota» (vista general del Centro de control): filtros, cuánto se
 * lleva leído y los más recientes de cada tipo, con su unidad. Tocar uno lo abre en el mapa.
 */
export function BloqueManejoFlota({ m }) {
  // La lista solo enseña los 5 más nuevos de cada tipo de toda la flota; el mapa, 5 por unidad.
  const corta = {
    ...m,
    porTipo: Object.fromEntries(CLAVES_EVENTO.map((c) => [c, { ...m.porTipo[c], eventos: m.porTipo[c].eventos.slice(0, PASO_EVENTOS), quedan: 0 }])),
    conUnidad: true,
  }
  const notas = [
    m.periodo !== 'oculto' ? `En el mapa, de cada unidad los ${PASO_EVENTOS} más nuevos de cada tipo. Excesos: solo los de más de ${EXCESO_KMH} km/h.` : '',
    m.incompleto ? 'El servidor entrega como mucho 100 eventos por conductor: puede haber más antiguos.' : '',
    !HAY_MAPBOX ? 'El mapa de eventos necesita Mapbox, que no está configurado aquí.' : '',
  ].filter(Boolean)
  return <section className="mb-bloque" aria-label="Manejo brusco de la flota" aria-busy={m.leyendo || m.estado === 'cargando'}>
    <FiltrosManejo m={m} />
    {m.periodo !== 'oculto' && m.conductores > 0 && <p className="em-nota" role="status">
      {m.leyendo
        ? `Leyendo conductores: ${f.numero(m.leidos)} de ${f.numero(m.conductores)}. El mapa se va llenando.`
        : `${f.numero(m.unidades)} ${m.unidades === 1 ? 'unidad' : 'unidades'} con eventos · ${f.numero(m.leidos - m.fallidos)} de ${f.numero(m.conductores)} ${m.conductores === 1 ? 'conductor leído' : 'conductores leídos'}.`}
      {!m.leyendo && <> <button type="button" className="mb-enlace" onClick={() => m.recargar(true)}>Actualizar</button></>}
    </p>}
    {m.fallidos > 0 && !m.leyendo && <p className="em-nota mb-aviso" role="status">
      No se pudieron leer {f.numero(m.fallidos)} {m.fallidos === 1 ? 'conductor' : 'conductores'}. <button type="button" className="mb-enlace" onClick={() => m.recargar()}>Reintentar</button>
    </p>}
    {m.conductores === 0 && m.estado === 'ok'
      ? <p className="em-nota">Ninguna unidad a la vista tiene conductor asignado: el servidor entrega los eventos por conductor.</p>
      : <CuerpoManejo m={{ ...corta, estado: m.estado }} sinConductor="" />}
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
