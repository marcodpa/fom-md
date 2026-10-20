import { useMemo, useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import { Cargando, ErrorCarga, Modal, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { etiqueta } from '../datos/catalogos'
import { estadoVisible, presentarHistorial } from '../datos/historial-odt'
import { Icono } from '../Iconos'
import { miAsignacion } from './MiUnidad'
import { NuevaOdt } from './Mantenimiento'
import './mantenimiento.css'
import { GaleriaArchivos } from '../comp/Archivos'
import OdtAsignadas from '../comp/OdtAsignadas'

// ============================================================
// MANTENIMIENTO DEL CONDUCTOR
// Solo lo de SU unidad: puede reportar una falla (crea una orden que el
// supervisor ve y atiende) y seguir sus órdenes con todo lo que ha pasado
// en cada una. No cambia estados ni asigna: eso es del supervisor. Si es
// responsable de alguna orden, la trabaja desde «Asignadas a ti», como en la app.
// ============================================================

const CADA_MINUTO = 60_000

/** La etiqueta de estado con los 3 estados visibles (Abierta / En revisión / Resuelta), igual que el supervisor. */
function EstadoOdt({ estado }) {
  const g = estadoVisible(estado)
  return <Tag color={g.color}>{g.etiqueta}</Tag>
}

const AYUDA = {
  abierta: 'Tu reporte llegó al supervisor. Falta que lo revise.',
  en_revision: 'El supervisor lo está evaluando.',
  aprobada: 'Aprobada. Falta asignar quién hará el trabajo.',
  asignada: 'Ya tiene responsable. El trabajo está por empezar.',
  en_ejecucion: 'La unidad está en trabajo.',
  pausada: 'El trabajo está detenido por ahora.',
  en_calidad: 'El trabajo terminó y se está revisando antes de cerrarlo.',
  cerrada: 'Resuelta. Queda en el historial de tu unidad.',
  cancelada: 'Se canceló: no requiere más acciones.',
}

export default function MantenimientoConductor() {
  const sesion = useSesion()
  const perfil = sesion?.perfil
  const asignaciones = useDatos(() => repo.conductores(), [], CADA_MINUTO)
  const asignacion = useMemo(() => miAsignacion(perfil, asignaciones.datos ?? []), [perfil, asignaciones.datos])
  const unidad = useDatos(
    () => (asignacion ? repo.vehiculos.obtener(asignacion.vehiculoId) : Promise.resolve(null)),
    [asignacion?.vehiculoId],
  )
  // Todas las que el servidor le deja ver: de ahí salen las de SU unidad y las «Asignadas a ti».
  const ordenes = useDatos(() => repo.odts.listar({}), [], CADA_MINUTO)
  const [creando, setCreando] = useState(false)
  const [abierta, setAbierta] = useState(null)
  const [aviso, setAviso] = useState('')

  const cargando = asignaciones.estado === 'cargando' || unidad.estado === 'cargando' || ordenes.estado === 'cargando'
  // Solo las órdenes de SU unidad. Se filtra aquí además de lo que ya limite el servidor.
  const lista = useMemo(
    () => (asignacion ? (ordenes.datos ?? []).filter((o) => o.vehiculoId === asignacion.vehiculoId) : [])
      .sort((a, b) => Date.parse(b.creadaEn) - Date.parse(a.creadaEn)),
    [ordenes.datos, asignacion],
  )
  const enCurso = lista.filter((o) => estadoVisible(o.estado).clave !== 'resuelta')
  const cerradas = lista.filter((o) => estadoVisible(o.estado).clave === 'resuelta')
  const abiertas = enCurso.filter((o) => estadoVisible(o.estado).clave === 'abierta')
  // Se cuenta por su grupo, no restando: un estado desconocido no debe sumar a «En revisión».
  const enRevision = enCurso.filter((o) => estadoVisible(o.estado).clave === 'revision')
  const v = unidad.datos
  // Una orden asignada puede ser de otra unidad: se busca en todo lo listado.
  const detalle = abierta ? (ordenes.datos ?? []).find((o) => o.id === abierta) ?? null : null

  return (
    <div className="mnt-root">
      <div className="mnt-heading">
        <div>
          <span className="mnt-breadcrumb">Inicio › Mantenimiento</span>
          <h1>Mantenimiento de mi unidad</h1>
          <p>Qué necesita atención y qué sigue.</p>
        </div>
      </div>

      <div className="mnt-content" style={{ marginTop: 24 }}>
        {cargando && <Cargando filas={5} />}
        {!cargando && (asignaciones.estado === 'error' || ordenes.estado === 'error') && (
          <ErrorCarga error={asignaciones.error || ordenes.error} onReintentar={() => { asignaciones.recargar(); ordenes.recargar() }} />
        )}

        {/* Lo que le toca hacer en taller, arriba de todo y aunque no tenga unidad. */}
        {!cargando && ordenes.estado === 'ok' && (
          <OdtAsignadas odts={ordenes.datos} perfil={perfil} alCambiar={ordenes.recargar} alAbrir={setAbierta} />
        )}

        {!cargando && !asignacion && asignaciones.estado === 'ok' && (
          <Tarjeta>
            <Vacio icono="camion" titulo="Todavía no tienes una unidad asignada" texto="Cuando tu supervisor te asigne un vehículo, aquí verás su mantenimiento y podrás reportar fallas." />
          </Tarjeta>
        )}

        {!cargando && asignacion && v && (
          <>
            <div className="mnt-toolbar">
              <div className="mnt-unit">
                <div>
                  <b>{v.alias} · {v.placa}</b>
                  <span>{[[v.marca, v.modelo].filter(Boolean).join(' '), v.km == null ? null : f.km(v.km)].filter(Boolean).join(' · ')}</span>
                </div>
              </div>
              <button type="button" className="pnl-btn primario" onClick={() => setCreando(true)}>
                <Icono nombre="mas" tam={18} />Reportar una falla
              </button>
            </div>
            {aviso && <div className="mnt-success" role="status"><Icono nombre="check" tam={20} />{aviso}</div>}

            <div className="mnt-summary">
              {[
                ['Abiertas', abiertas.length, 'Reportadas, falta revisarlas', 'ambar'],
                ['En revisión', enRevision.length, 'En evaluación o en taller', 'azul'],
                ['Resueltas', cerradas.length, 'Quedan en el historial', 'verde'],
                ['Última falla', lista[0] ? f.desde(lista[0].creadaEn) : '—', lista[0] ? etiqueta('tipo_falla', lista[0].tipoFalla) : 'Sin órdenes todavía', 'gris'],
              ].map(([t, val, d, c]) => (
                <div key={t}><span><i className={c} />{t}</span><b>{val}</b><small>{d}</small></div>
              ))}
            </div>

            <Tarjeta titulo="Por resolver" sinCuerpo>
              {enCurso.length === 0 ? (
                <div className="pnl-card-cuerpo"><Vacio icono="check" titulo="Sin órdenes abiertas" texto="Si algo falla en tu unidad, repórtalo con «Reportar una falla»." /></div>
              ) : (
                <Filas ordenes={enCurso} alAbrir={setAbierta} />
              )}
            </Tarjeta>

            <Tarjeta titulo="Historial de mantenimiento de mi unidad" sinCuerpo>
              {cerradas.length === 0 ? (
                <div className="pnl-card-cuerpo"><Vacio icono="reloj" titulo="Todavía no hay órdenes resueltas" texto="Aquí quedará lo que se arregló en tu unidad, con su fecha." /></div>
              ) : (
                <Filas ordenes={cerradas} alAbrir={setAbierta} />
              )}
            </Tarjeta>
          </>
        )}
      </div>

      <Modal titulo="Reportar una falla" abierto={creando} alCerrar={() => setCreando(false)} ancho={840}>
        {creando && v && (
          <NuevaOdt
            vehiculos={[v]}
            comoConductor
            sinPermiso="Todavía no puedes reportar fallas desde la web: el servidor aún no tiene activada esa función para conductores. Avísale a tu supervisor o repórtala desde la app del conductor."
            creadorId={perfil?.id ?? null}
            recargar={ordenes.recargar}
            alCerrar={() => setCreando(false)}
            alCrear={() => setAviso('Tu reporte quedó enviado. El supervisor ya puede verlo y atenderlo.')}
          />
        )}
      </Modal>
      <Modal titulo="Qué pasó con esta orden" abierto={Boolean(detalle)} alCerrar={() => setAbierta(null)} ancho={640}>
        {detalle && <Historia odt={detalle} />}
      </Modal>
    </div>
  )
}

function Filas({ ordenes, alAbrir }) {
  return (
    <div className="mnt-orders">
      {ordenes.map((o) => (
        <article key={o.id} className="mnt-order">
          <div className="mnt-thumb"><Icono nombre="llave" tam={26} /></div>
          <div className="mnt-order-copy">
            <span>{etiqueta('tipo_falla', o.tipoFalla)}</span>
            <h3>{o.descripcion}</h3>
            <div>
              <EstadoOdt estado={o.estado} />
              <small>{f.fechaCorta(o.creadaEn)} · {f.desde(o.creadaEn)}</small>
            </div>
          </div>
          <button type="button" className="pnl-btn" onClick={() => alAbrir(o.id)}>Ver qué pasó →</button>
        </article>
      ))}
    </div>
  )
}

/** Solo lectura: cada cambio de estado de la orden, con quién, cuándo y la nota. */
function Historia({ odt }) {
  const historial = useDatos(() => repo.odts.historial(odt.id), [odt.id, odt.estado])
  // Los pasos se cuentan con palabras («Responsable asignado», «Trabajo iniciado»…), no con los nueve estados del servidor.
  const hitos = presentarHistorial(odt, historial.datos ?? []).map((h, i) => ({
    t: h.actor ? `${h.titulo} · ${h.actor}` : h.titulo,
    d: [i === 0 && !h.de ? odt.descripcion : null, ...h.notas].filter(Boolean).join(' · '),
    en: h.en,
  }))

  return (
    <div className="mnt-detail" style={{ gridTemplateColumns: '1fr' }}>
      <section className="mnt-detail-main">
        <div className="pnl-kanban-cab">
          <EstadoOdt estado={odt.estado} />
          <em>{f.desde(odt.creadaEn)}</em>
        </div>
        <div className="pnl-fila-txt"><b>{odt.descripcion}</b><span>{AYUDA[odt.estado] ?? ''}</span></div>
        <GaleriaArchivos coleccion="work-orders" padreId={odt.id} proposito="work_order_opening" titulo="Fotos del reporte" vacio="Sin fotos. Puedes agregar fotos de la falla." />
        {odt.estado === 'cerrada' && odt.notaSolucion && (
          <div className="adm-sigue"><b>Qué se hizo</b><p>{odt.notaSolucion}</p></div>
        )}
        {historial.estado === 'cargando' ? <Cargando filas={2} /> : (
          <section className="mnt-history">
            <h3>Paso a paso</h3>
            {hitos.filter((h) => h.en).map((h, i) => (
              <div key={i}>
                <i />
                <div>
                  <b>{h.t}</b>
                  {h.d && <p>{h.d}</p>}
                  <small>{f.fechaHora(h.en)}</small>
                </div>
              </div>
            ))}
          </section>
        )}
      </section>
    </div>
  )
}
