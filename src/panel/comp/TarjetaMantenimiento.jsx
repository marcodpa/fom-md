import { Icono } from '../Iconos'
import * as f from '../datos/formato'
import { etiqueta } from '../datos/catalogos'
import { estadoVisible } from '../datos/historial-odt'

// ============================================================
// LA TARJETA DE MANTENIMIENTO — la misma en todas las listas de órdenes
// (supervisor, conductor y «Asignadas a ti»), igual que en la app: el ícono
// de la falla en su cuadro teñido, «Falla: Eléctrico» de título, el punto que
// late si nadie la ha atendido (o la flecha si no), la descripción en gris y
// abajo el estado, la prioridad y la fecha. Al pasar de la vista por grupos a
// la lista solo cambia el agrupado: la tarjeta es la misma.
// Los estilos viven en mantenimiento.css (.mnt-tarjeta).
// ============================================================

// Un trazo por tipo de falla (viewBox 24, como los demás íconos del panel).
const TRAZOS_FALLA = {
  motor: <><path d="M4 10h3l2-3h6v3h3v8h-3l-2 2H9l-2-3H4z" /><path d="M2 12v4M22 12v4" /></>,
  frenos: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" /><path d="M5 7.5a8.5 8.5 0 0 1 4-3.5" /></>,
  neumaticos: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><path d="M12 3.5V8M12 16v4.5M3.5 12H8M16 12h4.5" /></>,
  electrico: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />,
  carroceria: <><path d="M3 16v-3l2-5h14l2 5v3z" /><circle cx="7.5" cy="17" r="1.8" /><circle cx="16.5" cy="17" r="1.8" /></>,
}

function IconoFalla({ tipoFalla, preventiva }) {
  const trazo = TRAZOS_FALLA[tipoFalla]
  if (!trazo) return <Icono nombre={preventiva ? 'sync' : 'llave'} tam={19} />
  return (
    <svg className="ico" viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {trazo}
    </svg>
  )
}

/** La prioridad en su píldora: Alta roja, Media ámbar, Baja azul (como la app). */
const COLOR_PRIORIDAD = { alta: 'rojo', critica: 'rojo', media: 'ambar', baja: 'azul' }

/** Píldora de estado o prioridad: punto opcional y palabra, teñidos de su color. */
function Pildora({ color, children, punto = false }) {
  return <span className={`mnt-pildora ${color}`}>{punto && <i aria-hidden="true" />}{children}</span>
}

/**
 * Una orden de trabajo en su tarjeta.
 * - `odt`: la orden como la da el repositorio (descripcion, estado, tipo, tipoFalla, prioridad, creadaEn, vehiculoNombre).
 * - `unidad`: false para no repetir la unidad (la vista del conductor, que solo ve la suya).
 * - `children`: lo que va debajo, fuera del toque de la tarjeta (el tiempo y los botones de una asignada).
 */
export default function TarjetaMantenimiento({ odt, alAbrir, unidad = true, children }) {
  const g = estadoVisible(odt.estado)
  const falla = odt.tipoFalla ? etiqueta('tipo_falla', odt.tipoFalla) : null
  const titulo = falla ? `Falla: ${falla}` : odt.descripcion
  const descripcion = [unidad ? odt.vehiculoNombre : null, falla ? odt.descripcion : odt.tipo ? etiqueta('odt_tipo', odt.tipo) : null].filter(Boolean).join(' · ')
  const resuelta = g.clave === 'resuelta'
  // Sin atender: nadie la ha tomado todavía. El punto late (y se queda quieto si se pidió menos movimiento).
  const urgente = odt.estado === 'abierta'
  const contenido = <>
    <div className="mnt-tarjeta-cab">
      <span className="mnt-tarjeta-icono"><IconoFalla tipoFalla={odt.tipoFalla} preventiva={odt.tipo === 'preventiva'} /></span>
      <h3>{titulo}</h3>
      {urgente ? <i className="mnt-tarjeta-pulso" aria-hidden="true" /> : alAbrir ? <span className="mnt-tarjeta-flecha" aria-hidden="true">›</span> : null}
    </div>
    {descripcion && <p>{descripcion}</p>}
    <div className="mnt-tarjeta-pie">
      <Pildora color={g.color} punto>{g.etiqueta}</Pildora>
      {!resuelta && odt.prioridad && <Pildora color={COLOR_PRIORIDAD[odt.prioridad] ?? 'gris'}>{etiqueta('odt_prioridad', odt.prioridad)}</Pildora>}
      {resuelta && odt.costo != null && <span className="mnt-tarjeta-costo">{f.moneda(odt.costo)}</span>}
      {odt.creadaEn && <time dateTime={new Date(odt.creadaEn).toISOString()}>{f.fecha(odt.creadaEn)}</time>}
    </div>
  </>
  return (
    <article className={`mnt-tarjeta ${g.color}${resuelta ? ' apagada' : ''}`}>
      {alAbrir
        ? <button type="button" className="mnt-tarjeta-toque" onClick={() => alAbrir(odt.id)} aria-label={`${titulo}${unidad && odt.vehiculoNombre ? `, ${odt.vehiculoNombre}` : ''}, ${g.etiqueta}. Ver la orden`}>{contenido}</button>
        : <div className="mnt-tarjeta-toque">{contenido}</div>}
      {children && <div className="mnt-tarjeta-extra">{children}</div>}
    </article>
  )
}

/** Encabezado de un grupo: el nombre en mayúsculas, una línea fina y cuántas hay. */
export function GrupoTarjetas({ titulo, cuenta, color = '', children }) {
  return (
    <section className="mnt-grupo" aria-label={`${titulo}: ${cuenta}`}>
      <h3 className={`mnt-grupo-cab ${color}`}><span>{titulo}</span><i aria-hidden="true" /><b>{cuenta}</b></h3>
      {children}
    </section>
  )
}
