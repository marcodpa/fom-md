import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Mapa from '../comp/Mapa'
import { Buscador, Chips, Modal, Tag } from '../comp/ui'
import { Icono } from '../Iconos'
import { textoSinSenal, textoUltimoReporte } from '../datos/sinSenal'
import '../../styles/supervisor-movil.css'

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
    <section className="mvs-mapa" aria-label="Mapa de la flota">
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
