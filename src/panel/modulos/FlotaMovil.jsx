import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Mapa from '../comp/Mapa'
import { Buscador, Chips, Modal, Tag } from '../comp/ui'
import { Icono } from '../Iconos'
import { textoSinSenal, textoUltimoReporte } from '../datos/sinSenal'
import { elegirFoto, useFotosVehiculo } from '../datos/fotoVehiculo'
import { fotoSinFondo } from '../datos/fotoSinFondo'
import '../../styles/supervisor-movil.css'
import '../../styles/vehiculos-movil.css'

// ============================================================
// VEHÍCULOS EN EL TELÉFONO — piezas de `panel/flota.tsx` de la app
// ------------------------------------------------------------
// El mapa en su tarjeta (tocar un punto enseña quién es y, a un toque, el
// mapa completo o su ficha) y el buscador con su botón de filtros, que abre
// una hoja con el estado, el área y lo que se hace con las áreas. La tira y
// la lista por tramos ya estaban en Flota.jsx.
// ============================================================

/**
 * EL MAPA DE LA FLOTA en su tarjeta, con las unidades que deja el filtro.
 * Se queda montado aunque no haya puntos: así no parpadea al buscar.
 */
export function MapaFlotaMovil({ unidades, cargando, novedadDe, nombreConductor, alAbrir, ahora }) {
  const [tocada, setTocada] = useState(null)
  const conPunto = useMemo(() => unidades.filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng)), [unidades])
  const elegida = conPunto.find((v) => v.id === tocada) ?? null
  const novedad = elegida ? novedadDe(elegida) : null
  const callada = elegida && elegida.conectado === false
  return (
    <section className="mvs-mapa vm-mapa-corto" aria-label="Mapa de la flota">
      <Mapa vehiculos={conPunto} alto="100%" leyenda={false} ficha={false} pildoraVista
        seleccionado={tocada} alSeleccionar={(id) => setTocada(id)} />
      {/* Ampliar: el mapa entero, a pantalla completa (Centro de control). */}
      <Link to="/panel/mapa" className="mvs-ampliar" aria-label="Ver el mapa completo">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </Link>
      {conPunto.length === 0 && (
        <span className="mvs-mapa-nota">{cargando ? 'Cargando posiciones…' : 'Sin posiciones que mostrar'}</span>
      )}
      {/* La unidad tocada: quién es y, a un toque, el mapa completo o su ficha. */}
      {elegida && (
        <div className="mvs-tocada" role="dialog" aria-label={`Unidad ${elegida.alias}`}>
          <div className="mvs-tocada-fila">
            <span className="mvs-tocada-txt">
              <b>{elegida.alias}</b>
              <small>{[elegida.placa, nombreConductor(elegida)].filter(Boolean).join(' · ')}</small>
              {callada && <small>{textoSinSenal(elegida.ultimoReporte, ahora)}</small>}
              {callada && textoUltimoReporte(elegida.ultimoReporte) && <small className="chico">{textoUltimoReporte(elegida.ultimoReporte)}</small>}
            </span>
            {novedad && <Tag color={novedad.color}>{novedad.t}</Tag>}
            <button type="button" className="mvs-tocada-cerrar" aria-label="Cerrar" onClick={() => setTocada(null)}>
              <Icono nombre="cerrar" tam={16} />
            </button>
          </div>
          <div className="mvs-tocada-botones">
            <Link className="primario" to={`/panel/mapa?unidad=${encodeURIComponent(elegida.id)}`}>Ver en el mapa</Link>
            <button type="button" onClick={() => alAbrir(elegida.id)}>Ficha</button>
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * EL BUSCADOR CON SUS FILTROS (BuscadorFiltros de la app): la caja y, al lado,
 * el botón que abre la hoja. El botón se pinta en azul con cuántos filtros hay
 * puestos, así se sabe que la lista está acotada. Cada grupo es una fila de
 * opciones; `base` es la opción que no filtra («Todas»).
 */
export function BuscadorFiltrosMovil({ q, alBuscar, placeholder, titulo = 'Filtrar', grupos, acciones }) {
  const [abierta, setAbierta] = useState(false)
  const puestos = grupos.filter((g) => g.valor !== g.base).length
  return (
    <div className="mvs-buscador">
      <Buscador valor={q} alCambiar={alBuscar} placeholder={placeholder} />
      <button type="button" className={`mvs-filtrar${puestos ? ' on' : ''}`} onClick={() => setAbierta(true)}
        aria-label={puestos ? `${titulo}, ${puestos} puestos` : titulo}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 4H3l7 8.5V19l4 2v-8.5L21 4z" /></svg>
        {puestos > 0 && <em>{puestos}</em>}
      </button>
      <Modal titulo={titulo} abierto={abierta} alCerrar={() => setAbierta(false)}>
        <div className="mvs-hoja">
          {grupos.map((g) => (
            <div key={g.titulo} className="mvs-hoja-grupo">
              <span className="mvs-overline">{g.titulo}</span>
              <Chips opciones={g.opciones} valor={g.valor} alCambiar={g.alCambiar} etiqueta={g.titulo} />
            </div>
          ))}
          {acciones && <div className="mvs-hoja-grupo"><span className="mvs-overline">Más</span><div className="mvs-hoja-acciones">{acciones}</div></div>}
          <div className="mvs-hoja-pie">
            {puestos > 0 && <button type="button" className="pnl-btn" onClick={() => grupos.forEach((g) => g.alCambiar(g.base))}>Quitar filtros</button>}
            <button type="button" className="pnl-btn primario" onClick={() => setAbierta(false)}>Listo</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ============================================================
   LA LISTA DE VEHÍCULOS EN EL TELÉFONO (T-190) — fila-unidad-flota.tsx de la app
   ------------------------------------------------------------
   Cada unidad en su tarjeta (foto, número y placa en grande, cómo está ahora,
   conductor y zona, y su aviso más grave), arriba las pastillas rápidas, y la
   lista virtualizada: con 340 unidades solo se montan las tarjetas que se ven
   (y solo esas piden su foto).
   ============================================================ */

/** Alto fijo de la tarjeta + el aire hasta la siguiente, y el del título de cada tramo. */
export const ALTO_TARJETA = 118
const AIRE_TARJETA = 10
const ALTO_TRAMO = 44
/** Cuánto se pinta por encima y por debajo de lo que se ve. */
const MARGEN_VIRTUAL = 600

/**
 * La foto de la unidad en la tarjeta: su recorte sin fondo, su foto, la del
 * catálogo por marca y modelo o la silueta de su tipo (la misma regla que la app).
 */
function FotoFila({ unidad }) {
  const fotos = useFotosVehiculo(unidad.id)
  const [fallo, setFallo] = useState(false)
  const e = elegirFoto(fallo ? {} : fotos, unidad, { catalogo: fotoSinFondo, ancho: 280 })
  const nombre = [unidad.marca, unidad.modelo].filter(Boolean).join(' ') || 'la unidad'
  if (!e.url) return <Icono nombre="camion" tam={26} />
  return (
    <img className={`vm-foto${e.tipo === 'foto' ? ' con-fondo' : ''}`} src={e.url} alt={e.tipo === 'silueta' ? `Silueta de ${nombre}` : `Foto de ${nombre}`}
      loading="lazy" decoding="async" onError={() => setFallo(true)} />
  )
}

/** «● En marcha  61 km/h», «● Detenida» o «● Sin señal · hace 2 h». */
function EstadoAhora({ estado, velocidad, ultimoReporte, ahora }) {
  if (!estado) return <span className="vm-estado apagado">Buscando su posición…</span>
  const tono = estado === 'marcha' || estado === 'reportando' ? 'exito' : estado === 'detenido' ? 'aviso' : 'apagado'
  return (
    <span className={`vm-estado ${tono}`}>
      <i className={`vm-punto${estado === 'marcha' ? ' late' : ''}`} aria-hidden="true" />
      {estado === 'sin-senal' ? <span className="vm-gris">{textoSinSenal(ultimoReporte, ahora)}</span>
        : estado === 'marcha' ? <>En marcha <b>{Math.round(velocidad ?? 0)} km/h</b></>
          : estado === 'reportando' ? 'Reportando' : 'Detenida'}
    </span>
  )
}

/** UNA UNIDAD en su tarjeta (TarjetaUnidad de la app). */
export const FilaUnidadMovil = memo(function FilaUnidadMovil({ unidad: v, numero, estado, aviso, conductor, ahora, alAbrir }) {
  const placa = v.placa && v.placa !== numero ? v.placa : ''
  return (
    <button type="button" className="vm-tarjeta" onClick={() => alAbrir(v.id)}
      aria-label={[numero, placa, aviso?.t].filter(Boolean).join(', ')}>
      <span className="vm-foto-caja"><FotoFila unidad={v} /></span>
      <span className="vm-txt">
        <span className="vm-fila">
          <b className="vm-numero">{numero}</b>
          {placa && <span className="vm-placa">{placa}</span>}
        </span>
        <EstadoAhora estado={estado} velocidad={v.velocidadKmh} ultimoReporte={v.ultimoReporte} ahora={ahora} />
        <span className="vm-fila vm-gente">
          <Icono nombre="gente" tam={13} />
          <span className={`vm-detalle${v.conductorPrincipalId ? '' : ' tenue'}`}>{conductor}</span>
          <i className="vm-punto-area" aria-hidden="true" />
          <span className="vm-detalle tenue vm-zona">{v.areaNombre || 'Sin área'}</span>
        </span>
        {/* Su aviso más grave, entero en su línea: es lo que hay que atender. */}
        {aviso && <span className="vm-fila"><span className={`vm-aviso ${aviso.color}`}><i aria-hidden="true" /><span>{aviso.t}</span></span></span>}
      </span>
    </button>
  )
})

/** LAS PASTILLAS RÁPIDAS: una sola elegida, cada una con su cuenta. */
export function PastillasRapidasMovil({ opciones, valor, alCambiar }) {
  return (
    <div className="vm-pastillas" role="tablist" aria-label="Ver unidades">
      {opciones.map((o) => (
        <button key={o.v} type="button" role="tab" aria-selected={o.v === valor} className={`vm-pastilla${o.v === valor ? ' on' : ''}`}
          onClick={() => alCambiar(o.v)}>
          {o.tono && <i className={o.tono} aria-hidden="true" />}
          {o.t}<em>{o.n}</em>
        </button>
      ))}
    </div>
  )
}

/** El primer antepasado que se desplaza (o la ventana). */
function contenedorDeScroll(el) {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const s = getComputedStyle(p)
    if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight) return p
  }
  return window
}

/**
 * LA LISTA POR TRAMOS, virtualizada: cada elemento tiene su alto fijo, se sabe
 * dónde empieza cada uno y solo se montan los que caen en lo que se ve (más un
 * margen). Escucha el desplazamiento de quien sea que se desplace.
 */
export function ListaVirtualMovil({ tramos, renderUnidad }) {
  const caja = useRef(null)
  const elementos = useMemo(() => {
    const salida = []
    let y = 0
    for (const t of tramos) {
      salida.push({ tipo: 'tramo', clave: `t-${t.clave}`, t, y, alto: ALTO_TRAMO })
      y += ALTO_TRAMO
      for (const u of t.items) {
        salida.push({ tipo: 'unidad', clave: u.v.id, u, y, alto: ALTO_TARJETA + AIRE_TARJETA })
        y += ALTO_TARJETA + AIRE_TARJETA
      }
    }
    return { salida, total: y }
  }, [tramos])
  const [ventana, setVentana] = useState({ desde: 0, hasta: 1400 })
  useLayoutEffect(() => {
    const el = caja.current
    if (!el) return undefined
    const scroll = contenedorDeScroll(el)
    let pedido = 0
    const medir = () => {
      pedido = 0
      const r = el.getBoundingClientRect()
      const alto = window.innerHeight || 800
      const desde = Math.max(0, -r.top - MARGEN_VIRTUAL)
      const hasta = -r.top + alto + MARGEN_VIRTUAL
      setVentana((v) => (Math.abs(v.desde - desde) < 80 && Math.abs(v.hasta - hasta) < 80 ? v : { desde, hasta }))
    }
    const alMover = () => { if (!pedido) pedido = requestAnimationFrame(medir) }
    medir()
    scroll.addEventListener('scroll', alMover, { passive: true })
    window.addEventListener('resize', alMover)
    return () => {
      scroll.removeEventListener('scroll', alMover)
      window.removeEventListener('resize', alMover)
      if (pedido) cancelAnimationFrame(pedido)
    }
  }, [elementos.total])
  const visibles = elementos.salida.filter((e) => e.y + e.alto >= ventana.desde && e.y <= ventana.hasta)
  return (
    <div ref={caja} className="vm-lista" style={{ height: elementos.total }}>
      {visibles.map((e) => (
        <div key={e.clave} className="vm-lista-el" style={{ transform: `translateY(${e.y}px)`, height: e.alto }}>
          {e.tipo === 'tramo'
            ? <h3 className={`mv-grupo-cab vm-tramo ${e.t.color}`}>{e.t.t}</h3>
            : renderUnidad(e.u)}
        </div>
      ))}
    </div>
  )
}
