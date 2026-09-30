import { useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Cabecera, Campo, Cargando, Chips, Datos, ErrorCarga, Modal, Pestanas, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'

// ============================================================
// PROGRAMA DE INSPECCIONES
// ------------------------------------------------------------
// Tres cosas que la consola de Juan agrupa en «Cumplimiento»: las citas
// (a quién le toca inspeccionar qué unidad y cuándo), los hallazgos que
// salieron mal en una inspección y su seguimiento, y las plantillas (la
// lista de puntos que se revisan). La inspección en sí se hace desde la
// app, y su registro se ve en «Inspecciones».
// ============================================================

const ESTADO_CITA = { programada: ['Programada', 'azul'], completada: ['Completada', 'verde'], cancelada: ['Cancelada', 'gris'] }
const ESTADO_HALLAZGO = { pendiente: ['Pendiente', 'ambar'], en_seguimiento: ['En seguimiento', 'azul'], resuelto: ['Resuelto', 'verde'], descartado: ['Descartado', 'gris'] }
const ESTADO_PLANTILLA = { borrador: ['Borrador', 'gris'], publicada: ['Publicada', 'verde'], archivada: ['Archivada', 'ambar'] }
const PIE = { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }

export default function ProgramaInspecciones() {
  const [pestana, setPestana] = useState('citas')
  const [citaId, setCitaId] = useState(null)
  const [estadoCita, setEstadoCita] = useState('programada')
  const [estadoHallazgo, setEstadoHallazgo] = useState('pendiente')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [programando, setProgramando] = useState(false)
  const [creandoPlantilla, setCreandoPlantilla] = useState(false)
  const [cancelando, setCancelando] = useState(null)
  const [moviendo, setMoviendo] = useState(null) // { h, destino }

  const citas = useDatos(() => repo.programaInspecciones.citas({ estado: estadoCita }), [estadoCita])
  const hallazgos = useDatos(() => repo.programaInspecciones.hallazgos({ estado: estadoHallazgo }), [estadoHallazgo])
  const plantillas = useDatos(() => repo.programaInspecciones.plantillas({}), [])
  const seleccion = citas.estado === 'ok' ? citas.datos.find(c => c.id === citaId) ?? citas.datos[0] : null

  async function actuar(fn, exito) {
    setOcupado(true)
    setAviso('')
    try {
      await fn()
      setAviso(exito)
      citas.recargar()
      hallazgos.recargar()
      plantillas.recargar()
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
      <Cabecera titulo="Programa de inspecciones" bajada="A quién le toca revisar qué unidad, qué salió mal y qué se hizo al respecto.">
        <Link to="/panel/inspecciones" className="pnl-btn sutil">
          <Icono nombre="check" tam={16} />
          Inspecciones hechas
        </Link>
        <button type="button" className="pnl-btn primario" onClick={() => setProgramando(true)}>
          <Icono nombre="mas" tam={16} />
          Programar inspección
        </button>
      </Cabecera>

      <div className="pnl-cuerpo pnl-programa">
        {aviso && <p className="pnl-campo-error" role="status">{aviso}</p>}
        <Pestanas
          opciones={[{ v: 'citas', t: 'Citas' }, { v: 'hallazgos', t: 'Hallazgos' }, { v: 'plantillas', t: 'Plantillas' }]}
          valor={pestana}
          alCambiar={setPestana}
        />

        {pestana === 'citas' && (
          <div className="pnl-admin-dividido">
          <Tarjeta titulo="Citas de inspección" sinCuerpo>
            <div className="pnl-card-cuerpo">
              <Chips opciones={[{ v: 'programada', t: 'Programadas' }, { v: 'completada', t: 'Completadas' }, { v: 'cancelada', t: 'Canceladas' }, { v: '', t: 'Todas' }]} valor={estadoCita} alCambiar={setEstadoCita} />
            </div>
            {citas.estado === 'cargando' && <Cargando filas={4} />}
            {citas.estado === 'error' && <ErrorCarga onReintentar={citas.recargar} error={citas.error} />}
            {citas.estado === 'ok' && (citas.datos.length === 0 ? (
              <div className="pnl-card-cuerpo">
                <Vacio icono="inspeccion" titulo="Sin citas" texto="Programa una: unidad, plantilla, quién la hace y cuándo." accion={<button type="button" className="pnl-btn primario" onClick={() => setProgramando(true)}>Programar inspección</button>} />
              </div>
            ) : (
              <div className="pnl-filas">
                {citas.datos.map((c) => {
                  const [esT, esC] = ESTADO_CITA[c.estado] ?? [c.estado, 'gris']
                  return (
                    <div className="pnl-fila" key={c.id}>
                      <Icono nombre="inspeccion" tam={18} />
                      <div className="pnl-fila-txt">
                        <button type="button" className="pnl-table-action" aria-pressed={seleccion?.id === c.id} onClick={() => setCitaId(c.id)}>{c.vehiculo}{c.placa ? ` · ${c.placa}` : ''} · {c.plantilla}</button>
                        <span>{c.asignadoA} · {f.fechaHora(c.fecha)}{c.inspeccionId && <> · <Link to="/panel/inspecciones" className="pnl-link">ver inspección</Link></>}</span>
                      </div>
                      <Tag color={esC}>{esT}</Tag>
                      {c.estado === 'programada' && (
                        <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => setCancelando(c)}>Cancelar</button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </Tarjeta>
          <aside className="pnl-admin-detalle">
            <Tarjeta titulo="Detalle de la cita">
              {seleccion ? <>
                <h3>{seleccion.vehiculo}</h3>
                <Tag color={ESTADO_CITA[seleccion.estado]?.[1] ?? 'gris'}>{ESTADO_CITA[seleccion.estado]?.[0] ?? seleccion.estado}</Tag>
                <Datos items={[
                  { etiqueta: 'Placa', valor: seleccion.placa || '—' },
                  { etiqueta: 'Plantilla', valor: seleccion.plantilla },
                  { etiqueta: 'Responsable', valor: seleccion.asignadoA || 'Sin asignar' },
                  { etiqueta: 'Fecha y hora', valor: f.fechaHora(seleccion.fecha) },
                ]} />
                {seleccion.inspeccionId && <Link to="/panel/inspecciones" className="pnl-btn sutil">Ver inspección realizada</Link>}
              </> : <Vacio icono="inspeccion" titulo="Sin cita seleccionada" texto="Las citas del filtro aparecerán aquí." />}
            </Tarjeta>
          </aside>
          </div>
        )}

        {pestana === 'hallazgos' && (
          <Tarjeta titulo="Hallazgos" sinCuerpo>
            <div className="pnl-card-cuerpo">
              <Chips opciones={[{ v: 'pendiente', t: 'Pendientes' }, { v: 'en_seguimiento', t: 'En seguimiento' }, { v: 'resuelto', t: 'Resueltos' }, { v: 'descartado', t: 'Descartados' }, { v: '', t: 'Todos' }]} valor={estadoHallazgo} alCambiar={setEstadoHallazgo} />
            </div>
            {hallazgos.estado === 'cargando' && <Cargando filas={4} />}
            {hallazgos.estado === 'error' && <ErrorCarga onReintentar={hallazgos.recargar} error={hallazgos.error} />}
            {hallazgos.estado === 'ok' && (hallazgos.datos.length === 0 ? (
              <div className="pnl-card-cuerpo">
                <Vacio icono="check" titulo="Sin hallazgos" texto="Nada salió mal en las inspecciones con este filtro." />
              </div>
            ) : (
              <div className="pnl-filas">
                {hallazgos.datos.map((h) => {
                  const [esT, esC] = ESTADO_HALLAZGO[h.estado] ?? [h.estado, 'gris']
                  const abierto = h.estado === 'pendiente' || h.estado === 'en_seguimiento'
                  return (
                    <div className={`pnl-fila${h.critico && abierto ? ' critica' : ''}`} key={h.id}>
                      <Icono nombre={h.critico ? 'alerta' : 'inspeccion'} tam={18} />
                      <div className="pnl-fila-txt">
                        <b>{h.vehiculo} · {h.punto}</b>
                        <span>{h.estadoPunto}{h.nota ? ` · ${h.nota}` : ''}{h.odtId && <> · <Link to="/panel/mantenimiento" className="pnl-link">ODT vinculada</Link></>}</span>
                      </div>
                      {h.critico && <Tag color="rojo">Crítico</Tag>}
                      <Tag color={esC} plano>{esT}</Tag>
                      {h.estado === 'pendiente' && <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => setMoviendo({ h, destino: 'en_seguimiento' })}>Dar seguimiento</button>}
                      {abierto && (
                        <>
                          <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => setMoviendo({ h, destino: 'resuelto' })}>Resolver</button>
                          <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => setMoviendo({ h, destino: 'descartado' })}>Descartar</button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </Tarjeta>
        )}

        {pestana === 'plantillas' && (
          <Tarjeta titulo="Plantillas" sinCuerpo accion={<button className="pnl-btn primario" onClick={() => setCreandoPlantilla(true)}>Nueva plantilla</button>}>
            {plantillas.estado === 'cargando' && <Cargando filas={3} />}
            {plantillas.estado === 'error' && <ErrorCarga onReintentar={plantillas.recargar} error={plantillas.error} />}
            {plantillas.estado === 'ok' && (plantillas.datos.length === 0 ? (
              <div className="pnl-card-cuerpo">
                <Vacio icono="documento" titulo="Sin plantillas" texto="Crea una plantilla con los puntos a revisar y publícala para programar inspecciones." />
              </div>
            ) : (
              <div className="pnl-filas">
                {plantillas.datos.map((t) => {
                  const [esT, esC] = ESTADO_PLANTILLA[t.estado] ?? [t.estado, 'gris']
                  return (
                    <div className="pnl-fila" key={t.id}>
                      <Icono nombre="documento" tam={18} />
                      <div className="pnl-fila-txt">
                        <b>{t.nombre} <span style={{ fontWeight: 500, color: 'var(--e-texto-2)' }}>· {t.codigo} v{t.version}</span></b>
                        <span>{t.puntos} {t.puntos === 1 ? 'punto' : 'puntos'} a revisar</span>
                      </div>
                      <Tag color={esC}>{esT}</Tag>
                      {t.estado === 'borrador' && <button className="pnl-btn" disabled={ocupado} onClick={() => actuar(() => repo.programaInspecciones.cambiarPlantilla(t, 'publicada'), 'Plantilla publicada.')}>Publicar</button>}
                      {t.estado !== 'archivada' && <button className="pnl-btn sutil" disabled={ocupado} onClick={() => actuar(() => repo.programaInspecciones.cambiarPlantilla(t, 'archivada'), 'Plantilla archivada.')}>Archivar</button>}
                    </div>
                  )
                })}
              </div>
            ))}
          </Tarjeta>
        )}
      </div>

      <ModalPlantilla abierto={creandoPlantilla} alCerrar={() => setCreandoPlantilla(false)} alGuardar={plantillas.recargar} />
      <ModalProgramar abierto={programando} plantillas={(plantillas.datos ?? []).filter((t) => t.estado === 'publicada')} alCerrar={() => setProgramando(false)} guardar={(datos) => actuar(() => repo.programaInspecciones.programar(datos), 'Inspección programada.')} />
      <ModalMotivo titulo="Cancelar la cita" abierto={Boolean(cancelando)} alCerrar={() => setCancelando(null)} confirmar={(motivo) => actuar(() => repo.programaInspecciones.cancelar(cancelando.id, motivo), 'Cita cancelada.')} />
      <ModalMotivo titulo={moviendo ? ({ en_seguimiento: 'Dar seguimiento al hallazgo', resuelto: 'Resolver el hallazgo', descartado: 'Descartar el hallazgo' })[moviendo.destino] : ''} abierto={Boolean(moviendo)} alCerrar={() => setMoviendo(null)} confirmar={(nota) => actuar(() => repo.programaInspecciones.moverHallazgo(moviendo.h, moviendo.destino, nota), 'Hallazgo actualizado.')} />
    </>
  )
}

function ModalPlantilla({ abierto, alCerrar, alGuardar }) {
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [version, setVersion] = useState('1')
  const [puntos, setPuntos] = useState([{ nombre: '', critico: false }])
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  async function guardar() {
    if (puntos.some(p => p.nombre.trim().length < 2)) return setError('Cada punto necesita un nombre de al menos dos caracteres.')
    setError(''); setOcupado(true)
    try {
      await repo.programaInspecciones.crearPlantilla({ codigo, nombre, version, puntos })
      alGuardar(); alCerrar(); setCodigo(''); setNombre(''); setVersion('1'); setPuntos([{ nombre: '', critico: false }])
    } catch (e) { setError(e.message) } finally { setOcupado(false) }
  }
  return <Modal titulo="Nueva plantilla de inspección" abierto={abierto} alCerrar={alCerrar} ancho={600}>
    <Campo etiqueta="Código" error={error}><input aria-label="Código de plantilla" className="pnl-input" maxLength={50} value={codigo} onChange={e => setCodigo(e.target.value)} /></Campo>
    <Campo etiqueta="Nombre"><input aria-label="Nombre de plantilla" className="pnl-input" maxLength={120} value={nombre} onChange={e => setNombre(e.target.value)} /></Campo>
    <Campo etiqueta="Versión"><input aria-label="Versión de plantilla" type="number" min="1" step="1" className="pnl-input" value={version} onChange={e => setVersion(e.target.value)} /></Campo>
    {puntos.map((p, i) => <fieldset key={i} className="pnl-card-cuerpo"><legend>Punto {i + 1}</legend>
      <input aria-label={`Nombre del punto ${i + 1}`} className="pnl-input" maxLength={160} value={p.nombre} onChange={e => setPuntos(xs => xs.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
      <label><input type="checkbox" checked={p.critico} onChange={e => setPuntos(xs => xs.map((x, j) => j === i ? { ...x, critico: e.target.checked } : x))} /> Punto crítico</label>
      {puntos.length > 1 && <button className="pnl-btn sutil" onClick={() => setPuntos(xs => xs.filter((_, j) => j !== i))}>Quitar punto {i + 1}</button>}
    </fieldset>)}
    <button className="pnl-btn" disabled={puntos.length >= 200 || ocupado} onClick={() => setPuntos(xs => [...xs, { nombre: '', critico: false }])}>Añadir punto</button>
    <div style={PIE}><button className="pnl-btn sutil" disabled={ocupado} onClick={alCerrar}>Cancelar</button><button className="pnl-btn primario" disabled={ocupado} onClick={guardar}>{ocupado ? 'Guardando…' : 'Crear borrador'}</button></div>
  </Modal>
}

function ModalProgramar({ abierto, plantillas, alCerrar, guardar }) {
  const [d, setD] = useState({ vehiculoId: '', plantillaId: '', asignadoA: '', fecha: '' })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }))
  const vehiculos = useDatos(() => repo.vehiculos.listar(), [])
  const gente = useDatos(() => repo.admin.usuarios.listar({}), [])
  async function confirmar() {
    if (!d.vehiculoId || !d.plantillaId || !d.asignadoA || !d.fecha) return setError('Faltan datos: unidad, plantilla, persona y fecha.')
    setGuardando(true)
    setError('')
    const ok = await guardar(d)
    setGuardando(false)
    if (ok) {
      setD({ vehiculoId: '', plantillaId: '', asignadoA: '', fecha: '' })
      alCerrar()
    }
  }
  return (
    <Modal titulo="Programar una inspección" abierto={abierto} alCerrar={alCerrar} ancho={520}>
      <Campo etiqueta="Unidad" error={error}>
        <select className="pnl-input" value={d.vehiculoId} onChange={set('vehiculoId')}>
          <option value="">Elige…</option>
          {(vehiculos.datos ?? []).map((v) => <option key={v.id} value={v.id}>{v.alias} · {v.placa}</option>)}
        </select>
      </Campo>
      <Campo etiqueta="Plantilla" ayuda={plantillas.length === 0 ? 'No hay plantillas publicadas todavía.' : undefined}>
        <select className="pnl-input" value={d.plantillaId} onChange={set('plantillaId')}>
          <option value="">Elige…</option>
          {plantillas.map((t) => <option key={t.id} value={t.id}>{t.nombre} · v{t.version}</option>)}
        </select>
      </Campo>
      <Campo etiqueta="Quién la hace">
        <select className="pnl-input" value={d.asignadoA} onChange={set('asignadoA')}>
          <option value="">Elige…</option>
          {(gente.datos ?? []).map((p) => <option key={p.id} value={p.userId ?? p.id}>{p.nombre}{p.rolEtiqueta ? ` · ${p.rolEtiqueta}` : ''}</option>)}
        </select>
      </Campo>
      <Campo etiqueta="Cuándo">
        <input className="pnl-input" type="date" value={d.fecha} onChange={set('fecha')} />
      </Campo>
      <div style={PIE}>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>{guardando ? 'Guardando…' : 'Programar'}</button>
      </div>
    </Modal>
  )
}

function ModalMotivo({ titulo, abierto, alCerrar, confirmar }) {
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  async function ok() {
    if (texto.trim().length < 3) return setError('Escribe al menos 3 letras: queda en el historial.')
    setGuardando(true)
    setError('')
    const bien = await confirmar(texto.trim())
    setGuardando(false)
    if (bien) {
      setTexto('')
      alCerrar()
    }
  }
  return (
    <Modal titulo={titulo} abierto={abierto} alCerrar={alCerrar} ancho={460}>
      <Campo etiqueta="Nota" error={error}>
        <textarea className="pnl-input" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </Campo>
      <div style={PIE}>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Volver</button>
        <button type="button" className="pnl-btn primario" onClick={ok} disabled={guardando}>{guardando ? 'Guardando…' : 'Confirmar'}</button>
      </div>
    </Modal>
  )
}
