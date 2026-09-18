import { useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Buscador, Cabecera, Campo, Cargando, Chips, ErrorCarga, Modal, Pestanas, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'

// ============================================================
// PLANES DE MANTENIMIENTO
// ------------------------------------------------------------
// Lo que el servidor llama «maintenance plans» y «maintenance actions»:
// un plan dice cada cuánto toca un servicio (km, días o ambos) y a qué
// unidades cubre; una acción es un trabajo concreto que vence en una
// unidad, y de ella se abre la ODT preventiva. Reemplaza a las viejas
// «reglas de mantenimiento» de Alertas, que el servidor ya no conoce.
// ============================================================

const ESTRATEGIA = { fixed: 'Fija (por km)', floating: 'Flotante (desde el último servicio)', combined: 'Combinada (km o días)' }
const CRITICIDAD = { low: ['Baja', 'gris'], medium: ['Media', 'azul'], high: ['Alta', 'ambar'], critical: ['Crítica', 'rojo'] }
const ESTADO_ACCION = { pending: ['Pendiente', 'ambar'], in_progress: ['En curso', 'azul'], completed: ['Completada', 'verde'], dismissed: ['Descartada', 'gris'] }
const TIPO_ACCION = { preventive: 'Preventiva', predictive: 'Predictiva' }

const PIE = { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }

export default function Planes() {
  const [pestana, setPestana] = useState('acciones')
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('pending')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [nuevoPlan, setNuevoPlan] = useState(false)
  const [cubriendo, setCubriendo] = useState(null)
  const [nuevaAccion, setNuevaAccion] = useState(false)
  const [moviendo, setMoviendo] = useState(null) // { accion, destino }

  const planes = useDatos(() => repo.planes.listar({ q }), [q])
  const acciones = useDatos(() => repo.planes.acciones({ estado, q }), [estado, q])
  const vehiculos = useDatos(() => repo.vehiculos.listar(), [])

  async function actuar(fn, exito) {
    setOcupado(true)
    setAviso('')
    try {
      await fn()
      setAviso(exito)
      planes.recargar()
      acciones.recargar()
      return true
    } catch (e) {
      setAviso(e?.message || 'No se pudo completar la acción.')
      return false
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <Cabecera titulo="Planes de mantenimiento" bajada="Cada cuánto toca cada servicio, a qué unidades cubre y qué trabajos vencen.">
        <Link to="/panel/mantenimiento" className="pnl-btn sutil">
          <Icono nombre="llave" tam={16} />
          Órdenes de trabajo
        </Link>
        <button type="button" className="pnl-btn sutil" onClick={() => setNuevaAccion(true)}>
          <Icono nombre="mas" tam={16} />
          Nueva acción
        </button>
        <button type="button" className="pnl-btn primario" onClick={() => setNuevoPlan(true)}>
          <Icono nombre="mas" tam={16} />
          Nuevo plan
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
        {aviso && <p className="pnl-campo-error" role="status">{aviso}</p>}

        <Pestanas
          opciones={[{ v: 'acciones', t: 'Acciones que vencen' }, { v: 'planes', t: 'Planes' }]}
          valor={pestana}
          alCambiar={setPestana}
        />

        {pestana === 'planes' && (
          <Tarjeta titulo="Planes" accion={<Buscador valor={q} alCambiar={setQ} placeholder="Buscar por código o servicio…" />} sinCuerpo>
            {planes.estado === 'cargando' && <Cargando filas={4} />}
            {planes.estado === 'error' && <ErrorCarga onReintentar={planes.recargar} error={planes.error} />}
            {planes.estado === 'ok' && (planes.datos.length === 0 ? (
              <div className="pnl-card-cuerpo">
                <Vacio
                  icono="llave"
                  titulo="Sin planes todavía"
                  texto="Crea el primero: por ejemplo «Cambio de aceite cada 5.000 km» y luego cúbrele unidades."
                  accion={<button type="button" className="pnl-btn primario" onClick={() => setNuevoPlan(true)}>Nuevo plan</button>}
                />
              </div>
            ) : (
              <div className="pnl-filas">
                {planes.datos.map((p) => {
                  const [crT, crC] = CRITICIDAD[p.criticidad] ?? [p.criticidad, 'gris']
                  return (
                    <div className="pnl-fila" key={p.id}>
                      <Icono nombre="llave" tam={18} />
                      <div className="pnl-fila-txt">
                        <b>{p.servicio} <span style={{ fontWeight: 500, color: 'var(--e-texto-2)' }}>· {p.codigo}</span></b>
                        <span>
                          {ESTRATEGIA[p.estrategia] ?? p.estrategia}
                          {p.cadaKm ? ` · cada ${f.numero(p.cadaKm)} km` : ''}
                          {p.cadaDias ? ` · cada ${p.cadaDias} días` : ''}
                          {' · '}{p.unidades} {p.unidades === 1 ? 'unidad' : 'unidades'}
                          {p.descripcion ? ` · ${p.descripcion}` : ''}
                        </span>
                      </div>
                      <Tag color={crC}>{crT}</Tag>
                      <Tag color={p.activo ? 'verde' : 'gris'} plano>{p.activo ? 'Activo' : 'Apagado'}</Tag>
                      <button type="button" className="pnl-btn sutil" onClick={() => setCubriendo(p)}>Cubrir unidad</button>
                    </div>
                  )
                })}
              </div>
            ))}
          </Tarjeta>
        )}

        {pestana === 'acciones' && (
          <Tarjeta titulo="Acciones de mantenimiento" accion={<Buscador valor={q} alCambiar={setQ} placeholder="Buscar por título o unidad…" />} sinCuerpo>
            <div className="pnl-card-cuerpo">
              <Chips
                opciones={[{ v: 'pending', t: 'Pendientes' }, { v: 'in_progress', t: 'En curso' }, { v: 'completed', t: 'Completadas' }, { v: 'dismissed', t: 'Descartadas' }, { v: '', t: 'Todas' }]}
                valor={estado}
                alCambiar={setEstado}
              />
            </div>
            {acciones.estado === 'cargando' && <Cargando filas={5} />}
            {acciones.estado === 'error' && <ErrorCarga onReintentar={acciones.recargar} error={acciones.error} />}
            {acciones.estado === 'ok' && (acciones.datos.length === 0 ? (
              <div className="pnl-card-cuerpo">
                <Vacio icono="check" titulo="Nada que vence" texto="No hay acciones con este filtro. Las acciones nacen de un plan cubierto o se crean a mano." />
              </div>
            ) : (
              <div className="pnl-filas">
                {acciones.datos.map((a) => {
                  const [esT, esC] = ESTADO_ACCION[a.estado] ?? [a.estado, 'gris']
                  const [reT, reC] = CRITICIDAD[a.relevancia] ?? [a.relevancia, 'gris']
                  const abierta = a.estado === 'pending' || a.estado === 'in_progress'
                  return (
                    <div className={`pnl-fila${abierta && (a.relevancia === 'critical' || a.relevancia === 'high') ? ' aviso' : ''}`} key={a.id}>
                      <Icono nombre="llave" tam={18} />
                      <div className="pnl-fila-txt">
                        <b>{a.titulo} <span style={{ fontWeight: 500, color: 'var(--e-texto-2)' }}>· {a.vehiculo}{a.placa ? ` · ${a.placa}` : ''}</span></b>
                        <span>
                          {TIPO_ACCION[a.tipo] ?? a.tipo}
                          {a.plan ? ` · plan ${a.plan}` : ''}
                          {a.venceKm ? ` · vence a los ${f.numero(a.venceKm)} km` : ''}
                          {a.venceEn ? ` · vence el ${f.fecha(a.venceEn)}` : ''}
                          {a.costo != null ? ` · ${f.numero(a.costo)} ${a.moneda ?? ''}` : ''}
                          {a.odtId && <> · <Link to="/panel/mantenimiento" className="pnl-link">ODT abierta</Link></>}
                        </span>
                      </div>
                      <Tag color={reC}>{reT}</Tag>
                      <Tag color={esC} plano>{esT}</Tag>
                      {a.estado === 'pending' && (
                        <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => setMoviendo({ accion: a, destino: 'in_progress' })}>Iniciar</button>
                      )}
                      {abierta && (
                        <>
                          <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => setMoviendo({ accion: a, destino: 'completed' })}>Completar</button>
                          <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => setMoviendo({ accion: a, destino: 'dismissed' })}>Descartar</button>
                          {!a.odtId && (
                            <button type="button" className="pnl-btn primario" disabled={ocupado} onClick={() => actuar(() => repo.planes.odtDesdeAccion(a), 'ODT preventiva abierta y vinculada a la acción.')}>
                              Abrir ODT
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </Tarjeta>
        )}
      </div>

      <ModalPlan abierto={nuevoPlan} alCerrar={() => setNuevoPlan(false)} guardar={(datos) => actuar(() => repo.planes.guardar(datos), 'Plan guardado.')} />
      <ModalCubrir plan={cubriendo} vehiculos={vehiculos.datos ?? []} alCerrar={() => setCubriendo(null)} guardar={(vehiculoId, datos) => actuar(() => repo.planes.cubrirUnidad(cubriendo.id, vehiculoId, datos), 'Unidad cubierta por el plan.')} />
      <ModalAccion abierto={nuevaAccion} vehiculos={vehiculos.datos ?? []} planes={planes.datos ?? []} alCerrar={() => setNuevaAccion(false)} guardar={(datos) => actuar(() => repo.planes.crearAccion(datos), 'Acción creada.')} />
      <ModalMover paso={moviendo} alCerrar={() => setMoviendo(null)} confirmar={(nota) => actuar(() => repo.planes.moverAccion(moviendo.accion, moviendo.destino, nota), 'Acción actualizada.')} />
    </>
  )
}

function ModalPlan({ abierto, alCerrar, guardar }) {
  const [d, setD] = useState({ codigo: '', servicio: '', descripcion: '', estrategia: 'fixed', cadaKm: '', cadaDias: '', criticidad: 'medium' })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }))
  async function confirmar() {
    if (!d.codigo.trim() || !d.servicio.trim()) return setError('Código y servicio son obligatorios.')
    if (!d.cadaKm && !d.cadaDias) return setError('Di cada cuántos kilómetros o cada cuántos días.')
    setGuardando(true)
    setError('')
    const ok = await guardar({ ...d, codigo: d.codigo.trim().toLowerCase() })
    setGuardando(false)
    if (ok) {
      setD({ codigo: '', servicio: '', descripcion: '', estrategia: 'fixed', cadaKm: '', cadaDias: '', criticidad: 'medium' })
      alCerrar()
    }
  }
  return (
    <Modal titulo="Nuevo plan de mantenimiento" abierto={abierto} alCerrar={alCerrar} ancho={560}>
      <Campo etiqueta="Código" error={error} ayuda="Corto y sin espacios, p. ej. aceite-5000.">
        <input className="pnl-input" value={d.codigo} onChange={set('codigo')} placeholder="aceite-5000" />
      </Campo>
      <Campo etiqueta="Servicio">
        <input className="pnl-input" value={d.servicio} onChange={set('servicio')} placeholder="Cambio de aceite y filtro" />
      </Campo>
      <Campo etiqueta="Descripción (opcional)">
        <input className="pnl-input" value={d.descripcion} onChange={set('descripcion')} />
      </Campo>
      <Campo etiqueta="Estrategia">
        <select className="pnl-input" value={d.estrategia} onChange={set('estrategia')}>
          {Object.entries(ESTRATEGIA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </Campo>
      <div className="pnl-grid k2">
        <Campo etiqueta="Cada cuántos km">
          <input className="pnl-input" type="number" min="1" value={d.cadaKm} onChange={set('cadaKm')} placeholder="5000" />
        </Campo>
        <Campo etiqueta="Cada cuántos días">
          <input className="pnl-input" type="number" min="1" value={d.cadaDias} onChange={set('cadaDias')} placeholder="180" />
        </Campo>
      </div>
      <Campo etiqueta="Criticidad">
        <select className="pnl-input" value={d.criticidad} onChange={set('criticidad')}>
          {Object.entries(CRITICIDAD).map(([v, [t]]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </Campo>
      <div style={PIE}>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar plan'}</button>
      </div>
    </Modal>
  )
}

function ModalCubrir({ plan, vehiculos, alCerrar, guardar }) {
  const [vehiculoId, setVehiculoId] = useState('')
  const [d, setD] = useState({ ultimoServicioKm: '', proximoKm: '', proximaFecha: '' })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }))
  async function confirmar() {
    if (!vehiculoId) return setError('Elige la unidad.')
    setGuardando(true)
    setError('')
    const ok = await guardar(vehiculoId, d)
    setGuardando(false)
    if (ok) alCerrar()
  }
  return (
    <Modal titulo={plan ? `Cubrir una unidad con «${plan.servicio}»` : ''} abierto={Boolean(plan)} alCerrar={alCerrar} ancho={520}>
      <Campo etiqueta="Unidad" error={error}>
        <select className="pnl-input" value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)}>
          <option value="">Elige…</option>
          {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.alias} · {v.placa}</option>)}
        </select>
      </Campo>
      <div className="pnl-grid k2">
        <Campo etiqueta="Último servicio (km)">
          <input className="pnl-input" type="number" min="0" value={d.ultimoServicioKm} onChange={set('ultimoServicioKm')} />
        </Campo>
        <Campo etiqueta="Próximo vencimiento (km)">
          <input className="pnl-input" type="number" min="0" value={d.proximoKm} onChange={set('proximoKm')} />
        </Campo>
      </div>
      <Campo etiqueta="Próximo vencimiento (fecha)">
        <input className="pnl-input" type="date" value={d.proximaFecha} onChange={set('proximaFecha')} />
      </Campo>
      <div style={PIE}>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>{guardando ? 'Guardando…' : 'Cubrir'}</button>
      </div>
    </Modal>
  )
}

function ModalAccion({ abierto, vehiculos, planes, alCerrar, guardar }) {
  const vacio = { vehiculoId: '', planId: '', tipo: 'preventive', titulo: '', detalle: '', relevancia: 'medium', venceKm: '', venceEn: '', costo: '', moneda: 'USD' }
  const [d, setD] = useState(vacio)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }))
  async function confirmar() {
    if (!d.vehiculoId) return setError('Elige la unidad.')
    if (d.titulo.trim().length < 3) return setError('Ponle un título de al menos 3 letras.')
    setGuardando(true)
    setError('')
    const ok = await guardar(d)
    setGuardando(false)
    if (ok) {
      setD(vacio)
      alCerrar()
    }
  }
  return (
    <Modal titulo="Nueva acción de mantenimiento" abierto={abierto} alCerrar={alCerrar} ancho={560}>
      <Campo etiqueta="Unidad" error={error}>
        <select className="pnl-input" value={d.vehiculoId} onChange={set('vehiculoId')}>
          <option value="">Elige…</option>
          {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.alias} · {v.placa}</option>)}
        </select>
      </Campo>
      <Campo etiqueta="Plan (opcional)">
        <select className="pnl-input" value={d.planId} onChange={set('planId')}>
          <option value="">Sin plan</option>
          {planes.map((p) => <option key={p.id} value={p.id}>{p.servicio}</option>)}
        </select>
      </Campo>
      <Campo etiqueta="Título">
        <input className="pnl-input" value={d.titulo} onChange={set('titulo')} placeholder="Cambio de pastillas delanteras" />
      </Campo>
      <Campo etiqueta="Detalle (opcional)">
        <textarea className="pnl-input" rows={2} value={d.detalle} onChange={set('detalle')} />
      </Campo>
      <div className="pnl-grid k2">
        <Campo etiqueta="Tipo">
          <select className="pnl-input" value={d.tipo} onChange={set('tipo')}>
            {Object.entries(TIPO_ACCION).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Relevancia">
          <select className="pnl-input" value={d.relevancia} onChange={set('relevancia')}>
            {Object.entries(CRITICIDAD).map(([v, [t]]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Vence a los (km)">
          <input className="pnl-input" type="number" min="0" value={d.venceKm} onChange={set('venceKm')} />
        </Campo>
        <Campo etiqueta="Vence el">
          <input className="pnl-input" type="date" value={d.venceEn} onChange={set('venceEn')} />
        </Campo>
        <Campo etiqueta="Costo estimado">
          <input className="pnl-input" type="number" min="0" step="0.01" value={d.costo} onChange={set('costo')} />
        </Campo>
        <Campo etiqueta="Moneda">
          <select className="pnl-input" value={d.moneda} onChange={set('moneda')}>
            <option value="USD">USD</option>
            <option value="VES">VES</option>
          </select>
        </Campo>
      </div>
      <div style={PIE}>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>{guardando ? 'Guardando…' : 'Crear acción'}</button>
      </div>
    </Modal>
  )
}

const TITULO_MOVER = { in_progress: 'Iniciar la acción', completed: 'Dar la acción por completada', dismissed: 'Descartar la acción' }

function ModalMover({ paso, alCerrar, confirmar }) {
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  async function ok() {
    if (nota.trim().length < 3) return setError('Escribe una nota de al menos 3 letras: queda en el historial.')
    setGuardando(true)
    setError('')
    const bien = await confirmar(nota.trim())
    setGuardando(false)
    if (bien) {
      setNota('')
      alCerrar()
    }
  }
  return (
    <Modal titulo={paso ? TITULO_MOVER[paso.destino] : ''} abierto={Boolean(paso)} alCerrar={alCerrar} ancho={480}>
      {paso && <p style={{ margin: '0 0 12px', color: 'var(--e-texto-2)' }}>{paso.accion.titulo} · {paso.accion.vehiculo}</p>}
      <Campo etiqueta="Nota" error={error} ayuda="Qué se hizo o por qué se descarta.">
        <textarea className="pnl-input" rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
      </Campo>
      <div style={PIE}>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
        <button type="button" className="pnl-btn primario" onClick={ok} disabled={guardando}>{guardando ? 'Guardando…' : 'Confirmar'}</button>
      </div>
    </Modal>
  )
}
