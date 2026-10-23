import { Link } from 'react-router-dom'
import { Tag } from '../comp/ui'
import * as f from '../datos/formato'
import { ESTADOS_VISIBLES, estadoVisible } from '../datos/historial-odt'
import '../../styles/supervisor-movil.css'

// ============================================================
// MANTENIMIENTO DEL SUPERVISOR EN EL TELÉFONO — piezas de la app
// ------------------------------------------------------------
// De `panel/mantenimiento.tsx` y `mantenimiento-piezas.tsx`: las tres cifras
// (Abiertas · En revisión · Resueltas), «Cómo avanza una ODT» y la tarjeta de
// cuántas unidades están al día. El resto de la pestaña ya era el de la app.
// ============================================================

/** Las tres cifras, en una tarjeta con sus casillas hundidas (KpiFila / CifrasMantenimiento). */
export function CifrasMovil({ odts }) {
  const cuenta = (clave) => odts.filter((o) => estadoVisible(o.estado).clave === clave).length
  const cifras = [['Abiertas', cuenta('abierta'), 'aviso'], ['En revisión', cuenta('revision'), 'info'], ['Resueltas', cuenta('resuelta'), 'exito']]
  return (
    <div className="mvs-kpis" aria-label="Órdenes por estado">
      {cifras.map(([t, n, tono]) => <div key={t} className="mvs-kpi"><b className={tono}>{f.numero(n)}</b><small>{t}</small></div>)}
    </div>
  )
}

/** Del reporte al cierre, en tres pasos: el número, la línea que los une y la etiqueta de cada estado. */
export function ComoAvanzaMovil({ pasos }) {
  return (
    <section className="mvs-tarjeta mvs-pasos" aria-labelledby="mvs-pasos-titulo">
      <div>
        <h2 id="mvs-pasos-titulo" className="mvs-tarjeta-titulo">Cómo avanza una ODT</h2>
        <p className="mvs-tarjeta-bajada">Del reporte al cierre, en tres pasos.</p>
      </div>
      <ol>
        {ESTADOS_VISIBLES.map((g, i) => (
          <li key={g.clave}>
            <b className="mvs-paso-num">{i + 1}</b>
            <span><Tag color={g.color}>{g.etiqueta}</Tag><small>{pasos[g.clave]}</small></span>
          </li>
        ))}
      </ol>
      <Link to="/panel/mantenimiento?vista=planes" className="pnl-link">Prepara tus servicios con un plan →</Link>
    </section>
  )
}

/**
 * CUÁNTAS UNIDADES ESTÁN AL DÍA de cuántas hay: la cifra y la barra con la
 * misma proporción. «Al día» = sin órdenes abiertas ni en revisión. Lleva a
 * Vehículos, donde está cada una.
 */
export function UnidadesAlDiaMovil({ odts, vehiculos }) {
  const pendientes = new Set(odts.filter((o) => estadoVisible(o.estado).clave !== 'resuelta').map((o) => o.vehiculoId))
  const total = vehiculos.length
  const porAtender = vehiculos.filter((v) => pendientes.has(v.id)).length
  const alDia = total - porAtender
  const rotulo = total === 1 ? 'unidad al día' : 'unidades al día'
  return (
    <Link to="/panel/flota" className="mvs-tarjeta mvs-aldia" aria-label={`${alDia} de ${total} ${rotulo}${porAtender ? `, ${porAtender} por atender` : ''}. Ver las unidades`}>
      <span className="mvs-aldia-fila">
        <span className="mvs-aldia-txt">
          <span className="mvs-aldia-cifras"><b className={total ? '' : 'apagado'}>{f.numero(alDia)}</b><span>de {f.numero(total)}</span></span>
          <small>{rotulo}</small>
        </span>
        {porAtender > 0 && <span className="mvs-insignia" aria-hidden="true">!</span>}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
      </span>
      <span className="mvs-aldia-pista" aria-hidden="true"><i style={{ width: total ? `${(alDia / total) * 100}%` : 0 }} /></span>
      {porAtender > 0 && <small className="mvs-aldia-aviso">{f.cantidad(porAtender, 'unidad por atender', 'unidades por atender')}</small>}
    </Link>
  )
}
