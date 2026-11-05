import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { nombreUnidad } from '../datos/nombreUnidad'
import { useSearchParams } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import {
  Buscador, Cargando, ErrorCarga, Vacio,
} from '../comp/ui'
import Mapa from '../comp/Mapa'
import FichaUnidad, { estadoUnidad } from '../comp/FichaUnidad'
import { COLOR } from '../datos/catalogos'
import PanelRecorrido from '../comp/PanelRecorrido'
import { analizar, COLA_MIN, colaReciente } from '../datos/recorrido'
import { esCallada, estadoSenal, ordenarSinSenal, useMinuto, useUnidadesAlDia } from '../datos/sinSenal'
import { leerEnlaceEvento } from '../datos/eventosManejo'
import { BloqueManejoBrusco, useManejoBrusco } from '../comp/ManejoBrusco'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'
import MarcaEmpresa from '../comp/MarcaEmpresa'
import { useMovil } from '../comp/movil-navegacion'
import '../../styles/control-map.css'

/**
 * Los filtros de estado, con su cifra y su color. La clave es la de `estadoUnidad` (la regla única
 * de sinSenal.js) y el color sale del mismo catálogo que pinta el mapa: el chip ES la leyenda.
 * Las cuatro primeras siempre se ven; «Sin ubicación» y «Sin GPS», solo si hay alguna (o si están elegidas).
 */
const ESTADOS = [
  { v: '', t: 'Todas', fijo: true },
  { v: 'en_marcha', t: 'En marcha', color: COLOR.marcha_estado.en_marcha, fijo: true },
  { v: 'parada', t: 'Detenidas', color: COLOR.marcha_estado.parada, fijo: true },
  { v: 'sin_senal', t: 'Sin señal', color: COLOR.conexion.sin_senal, fijo: true },
  { v: 'sin_ubicacion', t: 'Sin ubicación', color: COLOR.conexion.sin_ubicacion },
  { v: 'sin_gps', t: 'Sin GPS', color: COLOR.conexion.sin_gps },
]

/**
 * Conserva el MISMO objeto mientras su contenido no cambie. Cada refresco trae objetos nuevos aunque
 * los datos sean iguales; sin esto el mapa borra y vuelve a dibujar la ruta, cierra los globos que el
 * usuario abrió y parpadea cada 15 s. Con esto, lo que no cambió no se toca.
 */
function useEstable(valor, firma) {
  const guardado = useRef({ f: undefined, v: valor })
  const f = valor == null ? null : firma(valor)
  if (f !== guardado.current.f) guardado.current = { f, v: valor }
  return guardado.current.v
}
/** ¿La unidad coincide con lo escrito en el buscador? Placa, alias, número, marca, modelo o conductor. */
function coincide(v, texto) {
  if (!texto) return true
  return [v.placa, v.alias, v.numero, v.marca, v.modelo, v.conductorNombre].join(' ').toLowerCase().includes(texto)
}

// El conductor entra en la firma: el buscador también filtra por su nombre.
const firmaFlota = (lista) => lista.map((v) => `${v.id}:${v.lat}:${v.lng}:${v.estadoMarcha}:${v.velocidadKmh}:${v.ultimoReporte}:${v.posicionEn}:${v.recepcionGpsAt}:${v.conductorNombre}`).join('|') + (lista.incompleta ? '|incompleta' : '') + (lista.conductoresFallo ? '|sinconductores' : '')
const firmaPuntos = (p) => `${p.length}|${p[0]?.hora}|${p.at(-1)?.hora}|${p.at(-1)?.lat}|${p.at(-1)?.lng}`
const firmaAnalisis = (a) => `${firmaPuntos(a.puntos)}|${a.viajes.length}|${a.paradas.length}`

// El inventario de equipos GPS casi no cambia: se guarda unos minutos para que abrir la ficha de
// una unidad tras otra no pida la lista entera cada vez. Si dos fichas lo piden a la vez, comparten
// la misma petición.
const VIGENCIA_INVENTARIO_MS = 5 * 60_000
let inventarioGps = null // { en, equipos } | { promesa }
/**
 * Los equipos GPS, o `null` si esta cuenta no tiene permiso para verlos (403): eso no es un error,
 * la ficha sale sin la sección del GPS. Cualquier otro fallo SÍ llega a la pantalla (con «Reintentar»).
 */
function equiposGps() {
  if (inventarioGps?.en && Date.now() - inventarioGps.en < VIGENCIA_INVENTARIO_MS) return Promise.resolve(inventarioGps.equipos)
  if (inventarioGps?.promesa) return inventarioGps.promesa
  const promesa = repo.admin.gps.listar()
    .then((equipos) => { inventarioGps = { en: Date.now(), equipos }; return equipos })
    .catch((e) => {
      inventarioGps = null
      if (e?.estado === 403) { inventarioGps = { en: Date.now(), equipos: null }; return null }
      throw e
    })
  inventarioGps = { promesa }
  return promesa
}

export default function CentroControl() {
  // El ☰ va dentro de la barra flotante (abre el menú de Consola).
  const movil = useMovil()
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const [areaId, setAreaId] = useState('')
  const [menuArea, setMenuArea] = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)
  const [listaAbierta, setListaAbierta] = useState(false)
  const [viendoRecorrido, setViendoRecorrido] = useState(false)
  const [horas, setHoras] = useState(24)
  const [foco, setFoco] = useState(null)
  const [viajeActivo, setViajeActivo] = useState(null)
  useEffect(() => { setViendoRecorrido(false); setFoco(null); setViajeActivo(null) }, [seleccionado])
  // Modo «manejo brusco»: se guarda la unidad para la que se abrió, así al cambiar de unidad se
  // apaga solo y un enlace puede abrirlo junto con la unidad que elige (sin que el reinicio de
  // arriba, que corre después, lo vuelva a cerrar).
  const [manejoDe, setManejoDe] = useState(null)
  const viendoManejo = Boolean(seleccionado) && manejoDe === seleccionado

  const areas = useDatos(() => repo.areas(), [])
  // Seguimiento en vivo: se vuelve a preguntar por la flota cada 15 segundos.
  // Los equipos reportan cada 1–5 minutos, así que consultar más seguido no
  // adelanta nada; con este ritmo una posición nueva aparece sola en menos de
  // 15 s desde que llega a la base, sin que nadie recargue.
  // Se pide la flota entera y el buscador, el área y el estado filtran aquí lo
  // ya cargado: antes cada letra escrita era un pedido al servidor.
  const flota = useDatos(() => repo.vehiculos.listar({}), [], 15000)
  // La ficha solo necesita de más el IMEI del equipo, que la flota no trae: se saca del inventario
  // de equipos GPS (un solo pedido) al elegir la unidad. Antes se pedía el expediente entero (~8
  // pedidos, todas las páginas de ODT). Lo vivo (posición, velocidad, señal) ya llega con la
  // flota, y el trazo reciente con `cola`.
  const detalle = useDatos(
    () => (seleccionado
      ? equiposGps().then(async (equipos) => {
          // Una sola instalación inequívoca: con dos equipos para la misma unidad no se elige uno a ciegas.
          const candidatos = (equipos ?? []).filter((g) => g.vehiculoId === seleccionado)
          const e = candidatos.length === 1 ? candidatos[0] : null
          const ubicacionGps = e?.protocolo === 'meitrack-t399'
            ? await repo.admin.gps.telemetria(e.id, { limite: 1 }).then(r => r.ubicacion).catch(() => ({ state: 'unavailable' })) : null
          return { id: seleccionado, ubicacionGps, gps: e ? { modelo: e.modelo ?? 'Equipo GPS', imei: e.imei, linea: e.linea, verificado: e.verificado, conectado: e.conectado } : null }
        })
      : Promise.resolve(null)),
    [seleccionado], 30000
  )

  // Sin pedir el recorrido: los últimos minutos de camino de la unidad elegida, para saber de
  // dónde viene. Se renueva con el mismo ritmo que la flota.
  const cola = useDatos(
    async () => ({ vehiculoId: seleccionado, puntos: seleccionado ? await repo.colaReciente(seleccionado) : [] }),
    [seleccionado],
    15000
  )
  const colaActual = cola.datos?.vehiculoId === seleccionado
  const colaInfo = useEstable(useMemo(() => colaReciente(colaActual ? cola.datos.puntos : []), [colaActual, cola.datos]), (c) => `${firmaPuntos(c.puntos)}|${c.ampliada}`)
  const colaPuntos = colaInfo?.puntos ?? []
  // Al pedir el recorrido: el rango completo, con viajes, paradas y la hora de cada punto.
  const dia = useDatos(
    () => (seleccionado && viendoRecorrido ? repo.recorridoDetallado(seleccionado, { horas }) : Promise.resolve(null)),
    [seleccionado, viendoRecorrido, horas],
    60000
  )
  const analisis = useEstable(useMemo(() => (viendoRecorrido && dia.datos ? analizar(dia.datos.puntos) : null), [viendoRecorrido, dia.datos]), firmaAnalisis)

  const datosFlota = useEstable(flota.datos, firmaFlota)
  // Diferido: el campo responde al instante y el mapa se filtra cuando React tiene un respiro.
  const texto = useDeferredValue(q.trim().toLowerCase())
  // Cada minuto se recalcula la señal (5 min sin reportar = «Sin señal»), sin pedir nada más;
  // la pantalla solo se vuelve a pintar si alguna unidad cambió de estado (los «hace …» se
  // renuevan solos en la lista y en la ficha, que llevan su propio reloj).
  const alDia = useUnidadesAlDia(datosFlota)
  // Área y buscador primero; sobre eso se cuentan los estados (la cifra de cada chip) y se filtra
  // por el estado elegido. El estado es el de `estadoUnidad` (regla única): la marcha solo existe
  // con señal, así que una unidad callada nunca pasa el filtro de «En marcha» ni de «Detenidas».
  const porEstado = useMemo(() => {
    const grupos = new Map(ESTADOS.map((e) => [e.v, []]))
    alDia.forEach((v) => {
      if ((areaId && v.areaId !== areaId) || !coincide(v, texto)) return
      grupos.get('').push(v)
      grupos.get(estadoUnidad(v).clave)?.push(v)
    })
    return grupos
  }, [alDia, areaId, texto])
  const lista = porEstado.get(estado) ?? porEstado.get('')
  const chipsEstado = ESTADOS.filter((e) => e.fijo || e.v === estado || porEstado.get(e.v).length > 0)

  // Enlace de un evento de manejo (perfil, Alertas, Eventos y SOS, expediente):
  // `?unidad=…&evento=…` elige la unidad en cuanto llega la flota y se limpia de la dirección.
  const [parametros, setParametros] = useSearchParams()
  const [pedidoEvento, setPedidoEvento] = useState(null)
  useEffect(() => {
    const enlace = leerEnlaceEvento(parametros)
    if (!enlace || flota.estado !== 'ok') return
    if ((datosFlota ?? []).some((v) => v.id === enlace.unidad)) {
      setListaAbierta(false)
      setSeleccionado(enlace.unidad)
      setManejoDe(enlace.unidad)
      setPedidoEvento({ ...enlace, clave: Date.now() })
    }
    setParametros({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametros, flota.estado])

  // Manejo brusco de la unidad elegida. El servidor no los da por unidad, solo por conductor: se
  // piden los de TODOS sus conductores asignados (principal y secundarios; o el que dice el
  // enlace) y se dejan los de esta unidad. Los de un conductor que ya no la tiene asignada no
  // llegan (falta una lectura por unidad en el servidor). Solo se piden con el modo abierto.
  const conductorEnlace = pedidoEvento?.unidad === seleccionado ? pedidoEvento.conductor : null
  const conductorId = conductorEnlace ?? lista.find((v) => v.id === seleccionado)?.conductorPrincipalId ?? null
  const asignados = useDatos(
    async () => (viendoManejo ? { id: seleccionado, lista: await repo.vehiculos.usuariosAsignados(seleccionado).catch(() => []) } : null),
    [viendoManejo, seleccionado]
  )
  const asignadosAlDia = asignados.datos?.id === seleccionado ? asignados.datos.lista : []
  const manejo = useManejoBrusco({
    vehiculoId: seleccionado,
    userId: viendoManejo ? conductorId : null,
    userIds: viendoManejo ? asignadosAlDia.map((u) => u.id) : null,
    pedido: pedidoEvento,
    // Se vuela al evento del enlace después de que el mapa encuadre la cola de la unidad.
    listoParaVolar: colaActual || cola.estado === 'error',
  })

  // El manejo brusco se mira unidad por unidad, desde su ficha («Ver manejo brusco»).
  const elegirUnidad = (id) => setSeleccionado(id)

  // Si el usuario cambia un filtro y deja fuera la unidad abierta, se cierra el detalle. Un refresco
  // de la flota NO la cierra (antes, con un filtro activo, la ficha se cerraba sola cada 15 s en
  // cuanto la unidad dejaba de cumplirlo, p. ej. al detenerse con «En marcha» elegido).
  const listaVigente = useRef(lista)
  listaVigente.current = lista
  useEffect(() => {
    setSeleccionado((s) => (s && !listaVigente.current.some((v) => v.id === s) ? null : s))
  }, [areaId, estado, texto])
  // Y si la unidad ya no existe en la flota (la dieron de baja o la pasaron a otra empresa), se cierra.
  useEffect(() => {
    if (seleccionado && flota.estado === 'ok' && !alDia.some((v) => v.id === seleccionado)) setSeleccionado(null)
  }, [alDia, seleccionado, flota.estado])

  const opcionesArea = useMemo(
    () => [{ v: '', t: 'Todas las áreas' }].concat((areas.datos ?? []).map((a) => ({ v: a.id, t: a.nombre }))),
    [areas.datos]
  )

  const limpiar = () => {
    setQ('')
    setEstado('')
    setAreaId('')
  }
  const areaElegida = opcionesArea.find((a) => a.v === areaId) ?? opcionesArea[0]
  const cerrarMenuArea = useCallback(() => setMenuArea(false), [])
  // La flota pasó del tope de lectura: se dice, para que nadie cuente de menos sin saberlo.
  const incompleta = flota.estado === 'ok' && Boolean(datosFlota?.incompleta)

  // Si el filtro ya no la incluye pero la ficha sigue abierta, los datos vivos salen de la flota entera.
  const unidadLista = lista.find(v => v.id === seleccionado) ?? alDia.find(v => v.id === seleccionado)
  const unidadDetalle = detalle.datos?.id === seleccionado ? detalle.datos : null
  // La lista va encima: sus datos son de hace menos de 15 s; los del expediente, de cuando se eligió.
  const unidad = unidadLista ? { ...unidadDetalle, ...unidadLista, ubicacionGps: unidadDetalle?.ubicacionGps ?? unidadLista.ubicacionGps } : null
  const sinPunto = lista.filter(v => !Number.isFinite(v.lat) || !Number.isFinite(v.lng)).length
  const estadosVisibles = [...new Map(lista.map(v => { const e = estadoUnidad(v); return [e.clave, e] })).values()]

  // En el teléfono la ficha y la lista son hojas a lo ancho que tapan el pie del mapa. Se mide
  // cuánto tapan (`--hoja-alto`) para subir encima el logo de Mapbox, que su licencia exige ver.
  const raiz = useRef(null)
  const hayLista = lista.length > 0
  useEffect(() => {
    const seccion = raiz.current
    if (!seccion || typeof ResizeObserver === 'undefined') return undefined
    const hojas = () => seccion.querySelectorAll(':scope > .control-panel')
    const medir = () => {
      const caja = seccion.getBoundingClientRect()
      let alto = 0
      let izquierda = 0
      hojas().forEach((el) => {
        const r = el.getBoundingClientRect()
        // Las de abajo a lo ancho (teléfono) empujan el logo hacia arriba.
        if (r.width >= caja.width * 0.6 && caja.bottom - r.bottom < 120) alto = Math.max(alto, caja.bottom - r.top)
        // La ficha lateral de escritorio que llega al pie empuja el logo a su derecha.
        else if (r.left - caja.left < 80 && caja.bottom - r.bottom < 120) izquierda = Math.max(izquierda, r.right - caja.left)
      })
      seccion.style.setProperty('--hoja-alto', `${Math.round(alto)}px`)
      seccion.style.setProperty('--hoja-izq', `${Math.round(izquierda)}px`)
    }
    const observador = new ResizeObserver(medir)
    observador.observe(seccion)
    hojas().forEach((el) => observador.observe(el))
    medir()
    return () => observador.disconnect()
  }, [seleccionado, listaAbierta, viendoRecorrido, viendoManejo, flota.estado, hayLista])

  // Recorrido y manejo brusco no se mezclan: abrir uno cierra el otro. Las dos capas juntas
  // (viajes, paradas y eventos) se tapan entre sí y la hoja tendría dos listas largas.
  const alternarRecorrido = () => { setManejoDe(null); setViendoRecorrido((v) => !v) }
  const alternarManejo = () => { setViendoRecorrido(false); setManejoDe((u) => (u === seleccionado ? null : seleccionado)) }
  // Con cualquiera de los dos modos la hoja se compacta (sin foto ni datos extra) y crece.
  const enModo = viendoRecorrido || viendoManejo

  return (
    <section className="control-map" aria-label="Centro de control" ref={raiz}>
      <div className="control-map-canvas">
        <Mapa vehiculos={lista} seleccionado={seleccionado} alSeleccionar={elegirUnidad}
          cola={seleccionado && !viendoRecorrido ? colaPuntos : null} viajes={analisis?.viajes} paradas={analisis?.paradas} foco={foco} viajeActivo={viajeActivo} alElegirViaje={(n) => setViajeActivo((a) => (a === n ? null : n))}
          eventosManejo={viendoManejo ? manejo.visibles : null}
          eventoActivo={manejo.elegido} alElegirEvento={manejo.elegir} encuadrarEventos={false}
          alto="100%" ficha={false} leyenda={false} espacioFicha herramientas />
      </div>
      {/* Arriba, lo justo: UNA barra que flota sobre el mapa (☰, el nombre de la pantalla con la
          empresa debajo y el buscador en píldora con la lista dentro) y una fila de chips que es a
          la vez filtro, cifra y leyenda del mapa. En el teléfono el ☰, el título y la empresa van
          en la barra de la consola (Consola.jsx) y aquí solo queda el buscador. */}
      <div className="control-search">
        {movil?.abrirMenu && (
          <button type="button" className="control-menu" aria-label="Abrir menú" aria-expanded={!!movil.menuAbierto}
            aria-controls="panel-navigation" onClick={movil.abrirMenu}>
            <Icono nombre="menu" tam={22} />
          </button>
        )}
        <div className="control-search-heading">
          <h1>Centro de control</h1>
          <MarcaEmpresa compacta className="control-empresa" />
        </div>
        <div className="control-buscador">
          <Buscador valor={q} alCambiar={setQ} placeholder="Placa, alias o conductor…" />
          <button className="control-lista-btn" type="button" aria-label="Lista de unidades" title="Lista de unidades" aria-expanded={listaAbierta && !seleccionado} aria-controls="control-unidades" onClick={() => { setListaAbierta(v => !v); setSeleccionado(null) }}>
            <IconoLista /><span>Unidades</span>
          </button>
        </div>
      </div>
      <div className="control-filters">
        <div className="pnl-chips control-chips" role="group" aria-label="Filtrar unidades por estado">
          {chipsEstado.map((e) => {
            const n = flota.estado === 'ok' ? porEstado.get(e.v).length : null
            return (
              <button key={e.v} type="button" className={`pnl-chip control-chip${estado === e.v ? ' activo' : ''}`} aria-pressed={estado === e.v} onClick={() => setEstado(e.v)}>
                {e.color && <i className={`control-punto ${e.color}`} aria-hidden="true" />}
                {e.t}{n != null && <em>{f.numero(n)}</em>}
              </button>
            )
          })}
          {opcionesArea.length > 1 && (
            <button type="button" className={`pnl-chip control-chip control-chip-area${areaId ? ' activo' : ''}`} id="control-area-boton"
              aria-haspopup="menu" aria-expanded={menuArea} aria-controls="control-area-menu" aria-label={`Área: ${areaElegida.t}`}
              onClick={() => setMenuArea((v) => !v)}>
              {areaElegida.t}<IconoAbajo />
            </button>
          )}
          {sinPunto > 0 && (
            <button type="button" className="pnl-chip control-chip control-chip-aviso" onClick={() => { setListaAbierta(true); setSeleccionado(null) }}>
              {sinPunto} sin posición · Ver
            </button>
          )}
        </div>
        {menuArea && <MenuArea opciones={opcionesArea} valor={areaId} alElegir={(v) => { setAreaId(v); setMenuArea(false) }} alCerrar={cerrarMenuArea} />}
        {incompleta && <p className="control-aviso" role="status">Lista incompleta: la flota es más grande de lo que se pudo leer.</p>}
        {flota.estado === 'ok' && datosFlota?.conductoresFallo && <p className="control-aviso" role="status">No se pudo leer quién conduce cada unidad. <button type="button" onClick={flota.recargar}>Reintentar</button></p>}
      </div>
      {(flota.estado !== 'ok' || lista.length === 0) && <div className="control-panel control-feedback" role="status">
        {flota.estado === 'cargando' && <Cargando filas={3} />}
        {flota.estado === 'error' && <ErrorCarga error={flota.error} onReintentar={flota.recargar} />}
        {flota.estado === 'ok' && lista.length === 0 && (
            <Vacio
              icono="buscar"
              titulo="Ninguna unidad coincide"
              texto="Prueba con otra placa o quita los filtros para ver toda la flota."
              accion={
                <button type="button" className="pnl-btn" onClick={limpiar}>
                  Limpiar filtros
                </button>
              }
            />
        )}
      </div>}
      {listaAbierta && flota.estado === 'ok' && lista.length > 0 && !seleccionado && <aside className="control-panel" id="control-unidades" aria-label="Unidades de la flota">
        <div className="control-panel-heading"><h2>Unidades <span>{lista.length}</span></h2><button type="button" aria-label="Cerrar lista de unidades" onClick={() => setListaAbierta(false)}><Icono nombre="cerrar" /></button></div>
        <ListaUnidades vehiculos={lista} seleccionado={seleccionado} alSeleccionar={elegirUnidad} />
      </aside>}
      {seleccionado && <aside className={`control-panel control-unit${enModo ? ' con-ruta' : ''}`} aria-label="Detalle de la unidad">
        <FichaUnidad unidad={unidad} alCerrar={() => setSeleccionado(null)} alVerRecorrido={alternarRecorrido} viendoRecorrido={viendoRecorrido}
          alVerManejo={alternarManejo} viendoManejo={viendoManejo} />
        {viendoManejo && <BloqueManejoBrusco m={manejo} />}
        {!enModo && colaPuntos.length > 1 && <p className="control-detail-note ruta-cola-nota" role="status">{colaInfo?.ampliada ? 'Línea punteada: su último trayecto (ahora está detenida).' : `Línea punteada: los últimos ${COLA_MIN} min de camino.`} Pulsa «Ver recorrido» para el día completo.</p>}
        {!enModo && cola.estado === 'error' && <p className="control-detail-note" role="status">No se pudieron cargar los últimos 5 minutos. <button type="button" onClick={cola.recargar}>Reintentar</button></p>}
        {!enModo && cola.estado !== 'error' && (!colaActual || cola.estado === 'cargando') && <p className="control-detail-note" role="status">Cargando los últimos 5 minutos…</p>}
        {!enModo && colaActual && cola.estado === 'ok' && colaPuntos.length < 2 && <p className="control-detail-note" role="status">{cola.datos.puntos.length > 1 ? 'Sin movimiento registrado en el tramo reciente.' : 'No hay suficientes posiciones para dibujar el recorrido reciente.'} Puedes consultar el día completo en «Ver recorrido».</p>}
        {viendoRecorrido && <PanelRecorrido analisis={analisis} horas={horas} alCambiarHoras={setHoras} cargando={dia.estado === 'cargando'} truncado={dia.datos?.truncado} alEnfocar={(p) => setFoco({ ...p, clave: Date.now() })} viajeActivo={viajeActivo} alElegirViaje={setViajeActivo} />}
        {viendoRecorrido && dia.estado === 'error' && <p className="control-detail-note">No se pudo cargar el recorrido. <button onClick={dia.recargar}>Reintentar</button></p>}
        {detalle.estado === 'error' && <p className="control-detail-note">No se pudo cargar la ficha de la unidad. <button onClick={detalle.recargar}>Reintentar</button></p>}
      </aside>}
      {estadosVisibles.length > 0 && <div className="fleet-map-legend" aria-label="Estados de los vehículos">{estadosVisibles.map(e => <span className={e.color} key={e.clave}><i />{e.texto}</span>)}</div>}
      <div className="control-live"><i />Actualización cada 15 s<span>Selecciona una unidad en el mapa o en Unidades</span></div>
    </section>
  )
}

const esSinSenal = (v) => esCallada(v.senal ?? estadoSenal(v))

/** Lista (tres renglones con su viñeta): abre «Unidades». Se entiende mejor que el camión de antes. */
function IconoLista() {
  return (
    <svg className="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" fill="currentColor" /><circle cx="4.5" cy="12" r="1" fill="currentColor" /><circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </svg>
  )
}
function IconoAbajo() {
  return (
    <svg className="ico control-chip-flecha" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
  )
}

/**
 * El menú del chip de área. Va fuera de la fila de chips (que se desplaza de lado y lo cortaría),
 * justo debajo. Con teclado: flechas, Inicio y Fin para moverse, Esc para cerrar (el foco vuelve
 * al chip). Un toque fuera también lo cierra.
 */
function MenuArea({ opciones, valor, alElegir, alCerrar }) {
  const caja = useRef(null)
  // Se abre justo bajo el chip (la fila puede estar desplazada), sin salirse por los lados.
  useLayoutEffect(() => {
    const menu = caja.current
    const boton = document.getElementById('control-area-boton')
    const padre = menu?.offsetParent
    if (!menu || !boton || !padre) return
    const p = padre.getBoundingClientRect()
    const b = boton.getBoundingClientRect()
    const min = Math.max(0, 12 - p.left)
    const max = window.innerWidth - 12 - menu.offsetWidth - p.left
    menu.style.left = `${Math.round(Math.max(min, Math.min(b.left - p.left, max)))}px`
    menu.style.top = `${Math.round(b.bottom - p.top + 8)}px`
  }, [])
  useEffect(() => {
    const menu = caja.current
    if (!menu) return undefined
    menu.querySelector('[aria-checked="true"]')?.focus()
    const fuera = (e) => {
      if (!menu.contains(e.target) && !e.target.closest?.('#control-area-boton')) alCerrar()
    }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [alCerrar])
  const teclas = (e) => {
    const items = [...caja.current.querySelectorAll('[role="menuitemradio"]')]
    const i = items.indexOf(document.activeElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      alCerrar()
      document.getElementById('control-area-boton')?.focus()
    } else if (e.key === 'Tab') {
      alCerrar()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      items[e.key === 'Home' ? 0 : items.length - 1]?.focus()
    }
  }
  return (
    <div className="control-area-menu" id="control-area-menu" role="menu" aria-label="Área de la flota" ref={caja} onKeyDown={teclas}>
      {opciones.map((a) => (
        <button key={a.v} type="button" role="menuitemradio" aria-checked={a.v === valor} tabIndex={a.v === valor ? 0 : -1} onClick={() => { alElegir(a.v); document.getElementById('control-area-boton')?.focus() }}>
          <span>{a.t}</span>{a.v === valor && <Icono nombre="check" tam={16} />}
        </button>
      ))}
    </div>
  )
}

function ListaUnidades({ vehiculos, seleccionado, alSeleccionar }) {
  // Cada minuto se rehace el «hace …» y el orden de las calladas, sin pedir nada al servidor.
  const ahora = useMinuto()
  const filas = useMemo(() => ordenarSinSenal(vehiculos, esSinSenal, ahora), [vehiculos, ahora])
  return (
    <div className="pnl-filas">
      {filas.map((v) => {
        // La regla única: verde solo con señal y posición al día.
        const s = estadoSenal(v, ahora)
        const viva = s.clave === 'reportando'
        const abierta = seleccionado === v.id
        const alternar = () => alSeleccionar(abierta ? null : v.id)
        return (
          <div
            key={v.id}
            className={`pnl-fila${abierta ? ' aviso' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={abierta}
            onClick={alternar}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                alternar()
              }
            }}
          >
            <i className={`pnl-punto ${viva ? 'on' : 'off'}`} />
            <div className="pnl-fila-txt">
              <b>{nombreUnidad(v)}</b>
              <span>
                {v.placa || '—'} ·{' '}
                {v.conductorNombre === 'Sin asignar' ? 'Sin conductor' : v.conductorNombre}
              </span>
              {(!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) && <span>Sin posición publicada · selecciona para ver el diagnóstico</span>}
            </div>
            {/* En marcha, la velocidad; si no, el estado («Detenida», «Sin señal · hace 2 h»…). */}
            <em>
              {s.marcha === 'en_marcha' && s.velocidadKmh != null ? f.velocidad(s.velocidadKmh) : s.texto}
            </em>
          </div>
        )
      })}
    </div>
  )
}
