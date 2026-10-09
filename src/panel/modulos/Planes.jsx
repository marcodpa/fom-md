import { useEffect, useState } from 'react'
import { normalizarCodigoPlan, validarCodigoPlan } from '../datos/codigoPlan'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Buscador, Campo, Cargando, Chips, ErrorCarga, Modal, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'
import VehicleVisual from '../../components/VehicleVisual'

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

export default function Planes({ vista = 'acciones' }) {
  const pestana = vista
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('pending')
  const [aviso, setAviso] = useState('')
  const [fallo, setFallo] = useState('') // error de la última acción: se enseña dentro del cuadro abierto
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
    setFallo('')
    try {
      await fn()
      setAviso(exito)
      planes.recargar()
      acciones.recargar()
      return true
    } catch (e) {
      setFallo(e?.message || 'No se pudo completar la acción.')
      return false
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <div className="mnt-toolbar"><div><h2>{pestana === 'planes' ? 'Planes de mantenimiento' : 'Próximos servicios'}</h2><p>{pestana === 'planes' ? 'Define cada cuánto atender tus unidades y asigna la cobertura.' : 'Anticípate a los vencimientos y sigue cada servicio.'}</p></div><button type="button" className="pnl-btn primario" onClick={() => pestana === 'planes' ? setNuevoPlan(true) : setNuevaAccion(true)}><Icono nombre="mas" tam={18}/>{pestana === 'planes' ? 'Crear plan' : 'Crear acción'}</button></div>

      <div className="mnt-plans">
        {aviso && <p className="pnl-campo-error" role="status" style={{ color: 'var(--e-exito)' }}>{aviso}</p>}
        {fallo && !nuevoPlan && !cubriendo && !nuevaAccion && !moviendo && <p className="pnl-campo-error" role="alert">{fallo}</p>}

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
                    <div className="pnl-fila mnt-plan-row" key={p.id}>
                      <div className="mnt-plan-symbol"><Icono nombre="sync" tam={24} /></div>
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
                      <div className="mnt-plan-interval"><b>{p.cadaKm ? f.numero(p.cadaKm) : p.cadaDias}</b><span>{p.cadaKm ? 'km' : 'días'}{p.cadaKm && p.cadaDias ? ` / ${p.cadaDias} días` : ''}</span></div>
                      <Tag color={crC}>{crT}</Tag>
                      <Tag color={p.activo ? 'verde' : 'gris'} plano>{p.activo ? 'Activo' : 'Apagado'}</Tag>
                      <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => actuar(() => repo.planes.encender(p, !p.activo), p.activo ? 'Plan apagado: ya no genera servicios.' : 'Plan encendido.')}>{p.activo ? 'Apagar' : 'Encender'}</button>
                      <button type="button" className="pnl-btn sutil" onClick={() => setCubriendo(p)}>Asignar unidad →</button>
                    </div>
                  )
                })}
              </div>
            ))}
          </Tarjeta>
        )}

        {pestana === 'acciones' && (
          <Tarjeta titulo="Servicios programados" accion={<Buscador valor={q} alCambiar={setQ} placeholder="Buscar por título o unidad…" />} sinCuerpo>
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
                    <div className={`pnl-fila mnt-service-row${abierta && (a.relevancia === 'critical' || a.relevancia === 'high') ? ' aviso' : ''}`} key={a.id}>
                      <Icono nombre="llave" tam={18} />
                      <div className="pnl-fila-txt">
                        <b>{a.titulo} <span style={{ fontWeight: 500, color: 'var(--e-texto-2)' }}>· {a.vehiculo}{a.placa ? ` · ${a.placa}` : ''}</span></b>
                        <span>
                          {TIPO_ACCION[a.tipo] ?? a.tipo}
                          {a.plan ? ` · plan ${a.plan}` : ''}
                          {a.venceKm ? ` · vence a los ${f.numero(a.venceKm)} km` : ''}
                          {a.venceEn ? ` · vence el ${f.fecha(a.venceEn)}` : ''}
                          {a.costo != null ? ` · ${f.numero(a.costo)} ${a.moneda ?? ''}` : ''}
                          {a.odtId && <> · <Link to={`/panel/mantenimiento?orden=${encodeURIComponent(a.odtId)}`} className="pnl-link">Ver orden vinculada →</Link></>}
                        </span>
                      </div>
                      <Tag color={reC}>{reT}</Tag>
                      <Tag color={esC} plano>{esT}</Tag>
                      {abierta && <details className="mnt-service-actions"><summary>Gestionar servicio</summary>
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
                      </details>}
                    </div>
                  )
                })}
              </div>
            ))}
          </Tarjeta>
        )}
      </div>

      <ModalPlan key={String(nuevoPlan)} fallo={fallo} abierto={nuevoPlan} alCerrar={() => { if (!ocupado) { setNuevoPlan(false); setFallo('') } }} guardar={(datos) => actuar(() => repo.planes.guardar(datos), 'Plan guardado.')} />
      <ModalCubrir key={cubriendo?.id ?? "sin-plan"} fallo={fallo} plan={cubriendo} vehiculos={vehiculos.datos ?? []} alCerrar={() => { if (!ocupado) { setCubriendo(null); setFallo('') } }} guardar={(vehiculoId, datos) => actuar(() => repo.planes.cubrirUnidad(cubriendo.id, vehiculoId, datos), 'Unidad cubierta por el plan.')} />
      <ModalAccion key={String(nuevaAccion)} fallo={fallo} abierto={nuevaAccion} vehiculos={vehiculos.datos ?? []} planes={planes.datos ?? []} alCerrar={() => { if (!ocupado) { setNuevaAccion(false); setFallo('') } }} guardar={(datos) => actuar(() => repo.planes.crearAccion(datos), 'Acción creada.')} />
      <ModalMover key={`${moviendo?.accion.id}-${moviendo?.destino}`} fallo={fallo} paso={moviendo} alCerrar={() => { if (!ocupado) { setMoviendo(null); setFallo('') } }} confirmar={(nota) => actuar(() => repo.planes.moverAccion(moviendo.accion, moviendo.destino, nota), 'Acción actualizada.')} />
    </>
  )
}

function ModalPlan({ abierto, alCerrar, guardar, fallo }) {
  const [d, setD] = useState({ codigo: '', servicio: '', descripcion: '', estrategia: 'fixed', cadaKm: '', cadaDias: '', criticidad: 'medium' })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }))
  async function confirmar() {
    if (!d.codigo.trim() || !d.servicio.trim()) return setError('Código y servicio son obligatorios.')
    let codigo
    try { codigo = validarCodigoPlan(normalizarCodigoPlan(d.codigo)) } catch (e) { return setError(e.message) }
    if (!d.cadaKm && !d.cadaDias) return setError('Di cada cuántos kilómetros o cada cuántos días.')
    if ([d.cadaKm, d.cadaDias].some(v => v !== '' && (!Number.isFinite(Number(v)) || Number(v) <= 0))) return setError('El intervalo debe ser mayor que cero.')
    setGuardando(true)
    setError('')
    const ok = await guardar({ ...d, codigo })
    setGuardando(false)
    if (ok) {
      setD({ codigo: '', servicio: '', descripcion: '', estrategia: 'fixed', cadaKm: '', cadaDias: '', criticidad: 'medium' })
      alCerrar()
    }
  }
  return (
    <Modal titulo="Nuevo plan de mantenimiento" abierto={abierto} alCerrar={alCerrar} ancho={820}>
      <div className="mnt-plan-form"><div><h3>1. Define el servicio</h3>
      <Campo etiqueta="Código" error={error || fallo} ayuda={normalizarCodigoPlan(d.codigo) ? `Se guardará como: ${normalizarCodigoPlan(d.codigo)}` : 'De 2 a 80 caracteres. Convertimos espacios y acentos, por ejemplo: revisión motor → revision-motor.'}>
        <input className="pnl-input" value={d.codigo} onChange={set('codigo')} onBlur={() => setD(x => ({ ...x, codigo: normalizarCodigoPlan(x.codigo) }))} placeholder="aceite-5000" />
      </Campo>
      <Campo etiqueta="Servicio">
        <input className="pnl-input" value={d.servicio} onChange={set('servicio')} placeholder="Cambio de aceite y filtro" />
      </Campo>
      <Campo etiqueta="Descripción (opcional)">
        <input className="pnl-input" value={d.descripcion} onChange={set('descripcion')} />
      </Campo>
      <h3>2. Programa el intervalo</h3>
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
      <h3>3. Indica la importancia</h3>
      <Campo etiqueta="Criticidad">
        <select className="pnl-input" value={d.criticidad} onChange={set('criticidad')}>
          {Object.entries(CRITICIDAD).map(([v, [t]]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </Campo>
      </div><aside className="mnt-plan-preview"><span className="mnt-eyebrow">VISTA PREVIA</span><Icono nombre="sync" tam={32}/><h3>{d.servicio || 'Tu próximo servicio'}</h3><div className="mnt-plan-interval"><b>{d.cadaKm ? f.numero(Number(d.cadaKm)) : d.cadaDias || '—'}</b><span>{d.cadaKm ? 'km' : 'días'}</span></div>{d.cadaKm && d.cadaDias && <p>O cada {d.cadaDias} días</p>}<p>{ESTRATEGIA[d.estrategia]}</p><Tag color={CRITICIDAD[d.criticidad][1]}>{CRITICIDAD[d.criticidad][0]}</Tag><hr/><p>Después de crear el plan, asigna las unidades que cubrirá.</p></aside></div>
      <div style={PIE}>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar plan'}</button>
      </div>
    </Modal>
  )
}

function ModalCubrir({ plan, vehiculos, alCerrar, guardar, fallo }) {
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
    <Modal titulo={plan ? `Asignar unidad · ${plan.servicio}` : ''} abierto={Boolean(plan)} alCerrar={alCerrar} ancho={820}>
      <div className="mnt-plan-form"><div><h3>Elige la unidad</h3>
      <Campo etiqueta="Unidad" error={error || fallo}>
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
      </div><aside className="mnt-plan-preview"><VehicleVisual modelo={vehiculos.find(v=>v.id===vehiculoId)?.modelo ?? ''} compacta/><h3>{plan?.servicio}</h3><p>{vehiculos.find(v=>v.id===vehiculoId)?.placa || 'Selecciona una unidad'}</p><div className="mnt-plan-interval"><b>{plan?.cadaKm ? f.numero(plan.cadaKm) : plan?.cadaDias || '—'}</b><span>{plan?.cadaKm ? 'km' : 'días'}</span></div><p>Registra el último servicio y el próximo vencimiento para esta unidad.</p></aside></div>
      <div style={PIE}>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>{guardando ? 'Guardando…' : 'Asignar al plan'}</button>
      </div>
    </Modal>
  )
}

function ModalAccion({ abierto, vehiculos, planes, alCerrar, guardar, fallo }) {
  const vacio = { vehiculoId: '', planId: '', tipo: 'preventive', titulo: '', detalle: '', relevancia: 'medium', venceKm: '', venceEn: '', costo: '', moneda: 'USD' }
  const [d, setD] = useState(vacio)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }))
  // El número de servicio se pone solo: es el siguiente al último de este plan en esta unidad.
  const delVehiculo = useDatos(() => (d.vehiculoId ? repo.planes.acciones({ vehiculoId: d.vehiculoId }) : Promise.resolve([])), [d.vehiculoId])
  const previos = (delVehiculo.datos ?? []).filter((a) => a.planId === d.planId && a.ciclo != null)
  const sugerido = previos.length ? Math.max(...previos.map((a) => Number(a.ciclo))) + 1 : 1
  useEffect(() => {
    if (d.tipo === 'preventive' && d.planId && d.vehiculoId) setD((x) => ({ ...x, ciclo: String(sugerido) }))
  }, [sugerido, d.planId, d.vehiculoId, d.tipo])
  async function confirmar() {
    if (!d.vehiculoId) return setError('Elige la unidad.')
    if (d.tipo === 'preventive' && !d.planId) return setError('Elige el plan de la acción preventiva.')
    if (d.tipo === 'preventive' && (!Number.isInteger(Number(d.ciclo)) || Number(d.ciclo) < 1)) return setError('Indica un número de ciclo entero, a partir de 1.')
    if (d.titulo.trim().length < 3) return setError('Ponle un título de al menos 3 letras.')
    if (d.venceKm === '' && !d.venceEn) return setError('Indica el kilometraje o la fecha de vencimiento.')
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
    <Modal titulo="Nueva acción de mantenimiento" abierto={abierto} alCerrar={alCerrar} ancho={860}>
      <div className="mnt-plan-form"><div><h3>1. Unidad y servicio</h3>
      <Campo etiqueta="Unidad" error={error || fallo}>
        <select className="pnl-input" value={d.vehiculoId} onChange={set('vehiculoId')}>
          <option value="">Elige…</option>
          {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.alias} · {v.placa}</option>)}
        </select>
      </Campo>
      <Campo etiqueta={d.tipo === 'preventive' ? 'Plan (obligatorio)' : 'Plan (opcional)'}>
        <select className="pnl-input" value={d.planId} onChange={set('planId')}>
          <option value="">Sin plan</option>
          {planes.map((p) => <option key={p.id} value={p.id}>{p.servicio}</option>)}
        </select>
      </Campo>
      {d.tipo === 'preventive' && <Campo
        etiqueta="Servicio n.º"
        ayuda={
          d.planId && d.vehiculoId
            ? previos.length
              ? `Esta unidad ya tiene ${previos.length} ${previos.length === 1 ? 'servicio' : 'servicios'} de este plan, así que este es el n.º ${sugerido}. No hace falta cambiarlo.`
              : 'Es la primera vez que esta unidad lleva este servicio (n.º 1). No hace falta cambiarlo.'
            : 'Elige primero la unidad y el plan: el número se pone solo.'
        }
      >
        <input className="pnl-input" type="number" min="1" step="1" value={d.ciclo ?? ''} onChange={set('ciclo')} />
      </Campo>}
      <Campo etiqueta="Título">
        <input className="pnl-input" value={d.titulo} onChange={set('titulo')} placeholder="Cambio de pastillas delanteras" />
      </Campo>
      <Campo etiqueta="Detalle (opcional)">
        <textarea className="pnl-input" rows={2} value={d.detalle} onChange={set('detalle')} />
      </Campo>
      <h3>2. Vencimiento y costo</h3>
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
      </div><aside className="mnt-plan-preview"><VehicleVisual modelo={vehiculos.find(v=>v.id===d.vehiculoId)?.modelo ?? ''} compacta/><h3>{d.titulo || 'El servicio que vas a programar'}</h3><p>{vehiculos.find(v=>v.id===d.vehiculoId)?.placa || 'Selecciona la unidad'}</p><Tag color={CRITICIDAD[d.relevancia][1]}>{CRITICIDAD[d.relevancia][0]}</Tag><hr/><b>Vencimiento</b><p>{d.venceKm !== '' ? `${f.numero(Number(d.venceKm))} km` : 'Sin kilometraje'}{d.venceEn ? ` · ${f.fecha(d.venceEn)}` : ''}</p><p>Una acción es un servicio programado. Puedes abrir su orden de trabajo después.</p></aside></div>
      <div style={PIE}>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>{guardando ? 'Guardando…' : 'Crear acción'}</button>
      </div>
    </Modal>
  )
}

const TITULO_MOVER = { in_progress: 'Iniciar la acción', completed: 'Dar la acción por completada', dismissed: 'Descartar la acción' }

function ModalMover({ paso, alCerrar, confirmar, fallo }) {
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
      {paso && <div className="mnt-confirm-summary"><Tag color={ESTADO_ACCION[paso.accion.estado]?.[1]}>{ESTADO_ACCION[paso.accion.estado]?.[0]}</Tag><span> → </span><Tag color={ESTADO_ACCION[paso.destino]?.[1]}>{ESTADO_ACCION[paso.destino]?.[0]}</Tag><p>Actualizar este servicio no cierra la orden de trabajo vinculada.</p></div>}
      {paso && <p style={{ margin: '0 0 12px', color: 'var(--e-texto-2)' }}>{paso.accion.titulo} · {paso.accion.vehiculo}</p>}
      <Campo etiqueta="Nota" error={error || fallo} ayuda="Qué se hizo o por qué se descarta.">
        <textarea className="pnl-input" rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
      </Campo>
      <div style={PIE}>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
        <button type="button" className="pnl-btn primario" onClick={ok} disabled={guardando}>{guardando ? 'Guardando…' : 'Confirmar'}</button>
      </div>
    </Modal>
  )
}
