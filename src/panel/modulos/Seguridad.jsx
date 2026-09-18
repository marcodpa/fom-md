import { useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Cabecera, Campo, Cargando, Chips, ErrorCarga, Kpi, Modal, Pestanas, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'

// ============================================================
// EVENTOS Y SOS
// ------------------------------------------------------------
// Lo mismo que «Alertas y SOS» en la consola de Juan: los eventos que
// dispararon las reglas (velocidad, condición) y las emergencias que los
// conductores levantan desde el botón de pánico de la app. Cada uno se
// reconoce (alguien lo vio) y se resuelve (se atendió). Los avisos
// personales siguen en «Alertas»: son de la persona, no de la flota.
// ============================================================

const ESTADO_EVENTO = { open: 'Abierta', acknowledged: 'Reconocida', resolved: 'Resuelta' }
const COLOR_EVENTO = { open: 'rojo', acknowledged: 'ambar', resolved: 'verde' }
const SEVERIDAD = { info: ['Info', 'azul'], warning: ['Aviso', 'ambar'], critical: ['Crítica', 'rojo'] }
const TIPO_REGLA = { velocidad: 'Exceso de velocidad', condicion: 'Condición de telemetría' }

const ESTADO_SOS = { active: 'Activa', acknowledged: 'Reconocida', resolved: 'Resuelta', cancelled: 'Cancelada' }
const COLOR_SOS = { active: 'rojo', acknowledged: 'ambar', resolved: 'verde', cancelled: 'gris' }
const TIPO_SOS = { accident: 'Accidente', mechanical: 'Falla mecánica', medical: 'Emergencia médica', security: 'Seguridad', other: 'Otra' }

function coords(u) {
  return u && u.latitude != null ? `${Number(u.latitude).toFixed(5)}, ${Number(u.longitude).toFixed(5)}` : null
}

export default function Seguridad() {
  const [pestana, setPestana] = useState('eventos')
  const [estadoEvento, setEstadoEvento] = useState('open')
  const [severidad, setSeveridad] = useState('')
  const [estadoSos, setEstadoSos] = useState('active')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)

  // Las dos listas se refrescan solas: una emergencia que llega mientras
  // la pantalla está abierta tiene que aparecer sin recargar.
  const eventos = useDatos(() => repo.seguridad.eventos({ estado: estadoEvento, severidad }), [estadoEvento, severidad], 30000)
  const sos = useDatos(() => repo.seguridad.emergencias({ estado: estadoSos }), [estadoSos], 30000)
  const abiertas = useDatos(() => repo.seguridad.emergencias({ estado: 'active' }), [], 30000)
  const reglas = useDatos(() => repo.reglas.listar(), [])
  const [nuevaRegla, setNuevaRegla] = useState(false)

  async function actuar(fn, exito) {
    setOcupado(true)
    setAviso('')
    try {
      await fn()
      setAviso(exito)
      eventos.recargar()
      sos.recargar()
      abiertas.recargar()
      reglas.recargar()
      return true
    } catch (e) {
      setAviso(e?.message || 'No se pudo completar la acción.')
    } finally {
      setOcupado(false)
    }
  }

  const activas = abiertas.datos?.length ?? null
  const evAbiertos = eventos.datos?.pagina?.total ?? eventos.datos?.length ?? null

  return (
    <>
      <Cabecera titulo="Eventos y SOS" bajada="Lo que disparó una regla y las emergencias levantadas desde la app." />

      <div className="pnl-cuerpo">
        <div className="pnl-grid k3">
          <Kpi
            titulo="Emergencias activas"
            valor={activas == null ? '—' : f.numero(activas)}
            icono="alerta"
            tono={activas > 0 ? 'malo' : 'ok'}
            nota={activas > 0 ? 'Alguien pidió ayuda y nadie ha respondido' : 'Nadie está pidiendo ayuda'}
          />
          <Kpi
            titulo={`Eventos ${ESTADO_EVENTO[estadoEvento]?.toLowerCase() ?? ''}`}
            valor={evAbiertos == null ? '—' : f.numero(evAbiertos)}
            icono="velocidad"
            tono={estadoEvento === 'open' && evAbiertos > 0 ? 'aviso' : ''}
            nota="Con el filtro de arriba"
          />
          <Kpi titulo="Reglas activas" valor={reglas.datos ? f.numero(reglas.datos.filter((r) => r.activa).length) : '—'} icono="escudo" nota="Velocidad máxima de la flota" onClick={() => setPestana('reglas')} />
        </div>

        {aviso && <p className="pnl-campo-error" role="status">{aviso}</p>}

        <Pestanas
          opciones={[
            { v: 'eventos', t: 'Eventos de alerta' },
            { v: 'sos', t: `Emergencias (SOS)${activas ? ` · ${activas}` : ''}` },
            { v: 'reglas', t: 'Reglas' },
          ]}
          valor={pestana}
          alCambiar={setPestana}
        />

        {pestana === 'eventos' && (
          <Tarjeta titulo="Eventos de alerta" sinCuerpo>
            <div className="pnl-card-cuerpo">
              <Chips
                opciones={[{ v: 'open', t: 'Abiertos' }, { v: 'acknowledged', t: 'Reconocidos' }, { v: 'resolved', t: 'Resueltos' }, { v: '', t: 'Todos' }]}
                valor={estadoEvento}
                alCambiar={setEstadoEvento}
              />
              <Chips
                opciones={[{ v: '', t: 'Toda severidad' }, { v: 'critical', t: 'Críticos' }, { v: 'warning', t: 'Avisos' }, { v: 'info', t: 'Info' }]}
                valor={severidad}
                alCambiar={setSeveridad}
              />
            </div>
            {eventos.estado === 'cargando' && <Cargando filas={5} />}
            {eventos.estado === 'error' && <ErrorCarga onReintentar={eventos.recargar} error={eventos.error} />}
            {eventos.estado === 'ok' && (eventos.datos.length === 0 ? (
              <div className="pnl-card-cuerpo">
                <Vacio icono="check" titulo="Sin eventos" texto="Ninguna regla se disparó con este filtro. Buena señal." />
              </div>
            ) : (
              <div className="pnl-filas">
                {eventos.datos.map((e) => {
                  const [sevT, sevC] = SEVERIDAD[e.severidad] ?? [e.severidad, 'gris']
                  return (
                    <div className={`pnl-fila${e.estado === 'open' && e.severidad === 'critical' ? ' critica' : ''}`} key={e.id}>
                      <Icono nombre={e.tipo === 'velocidad' ? 'velocidad' : 'alerta'} tam={18} />
                      <div className="pnl-fila-txt">
                        <b>{e.vehiculo}{e.placa ? ` · ${e.placa}` : ''} · {TIPO_REGLA[e.tipo] ?? e.tipo}</b>
                        <span>
                          {e.valor != null ? `Valor observado ${f.numero(e.valor)}${e.tipo === 'velocidad' ? ' km/h' : ''} · ` : ''}
                          {f.fechaHora(e.ocurrioEn)}
                          {e.odtId && <> · <Link to="/panel/mantenimiento" className="pnl-link">ODT vinculada</Link></>}
                        </span>
                      </div>
                      <Tag color={sevC}>{sevT}</Tag>
                      <Tag color={COLOR_EVENTO[e.estado] ?? 'gris'} plano>{ESTADO_EVENTO[e.estado] ?? e.estado}</Tag>
                      {e.estado === 'open' && (
                        <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => actuar(() => repo.seguridad.reconocerEvento(e.id), 'Evento reconocido.')}>
                          Reconocer
                        </button>
                      )}
                      {e.estado !== 'resolved' && (
                        <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => actuar(() => repo.seguridad.resolverEvento(e.id), 'Evento resuelto.')}>
                          Resolver
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </Tarjeta>
        )}

        {pestana === 'sos' && (
          <Tarjeta titulo="Emergencias" sinCuerpo>
            <div className="pnl-card-cuerpo">
              <Chips
                opciones={[{ v: 'active', t: 'Activas' }, { v: 'acknowledged', t: 'Reconocidas' }, { v: 'resolved', t: 'Resueltas' }, { v: 'cancelled', t: 'Canceladas' }, { v: '', t: 'Todas' }]}
                valor={estadoSos}
                alCambiar={setEstadoSos}
              />
            </div>
            {sos.estado === 'cargando' && <Cargando filas={4} />}
            {sos.estado === 'error' && <ErrorCarga onReintentar={sos.recargar} error={sos.error} />}
            {sos.estado === 'ok' && (sos.datos.length === 0 ? (
              <div className="pnl-card-cuerpo">
                <Vacio icono="escudo" titulo="Sin emergencias" texto="Nadie ha pedido ayuda con este filtro." />
              </div>
            ) : (
              <div className="pnl-filas">
                {sos.datos.map((s) => {
                  const donde = coords(s.ubicacionVehiculo) ?? coords(s.ubicacionReportante)
                  return (
                    <div className={`pnl-fila${s.estado === 'active' ? ' critica' : ''}`} key={s.id}>
                      <Icono nombre="alerta" tam={18} />
                      <div className="pnl-fila-txt">
                        <b>{TIPO_SOS[s.tipo] ?? s.tipo}{s.tipoOtro ? ` · ${s.tipoOtro}` : ''}</b>
                        <span>
                          {s.detalle} · {f.fechaHora(s.reportadaEn)}
                          {donde && <> · <a className="pnl-link" href={`https://www.openstreetmap.org/?mlat=${donde.split(',')[0]}&mlon=${donde.split(',')[1].trim()}#map=16/${donde.split(',')[0]}/${donde.split(',')[1].trim()}`} target="_blank" rel="noreferrer">{donde}</a></>}
                        </span>
                      </div>
                      <Tag color={COLOR_SOS[s.estado] ?? 'gris'}>{ESTADO_SOS[s.estado] ?? s.estado}</Tag>
                      {s.estado === 'active' && (
                        <button type="button" className="pnl-btn primario" disabled={ocupado} onClick={() => actuar(() => repo.seguridad.reconocerEmergencia(s.id), 'Emergencia reconocida: el conductor sabe que alguien la vio.')}>
                          Reconocer
                        </button>
                      )}
                      {(s.estado === 'active' || s.estado === 'acknowledged') && (
                        <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => actuar(() => repo.seguridad.resolverEmergencia(s.id), 'Emergencia resuelta.')}>
                          Resolver
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </Tarjeta>
        )}

        {pestana === 'reglas' && (
          <Tarjeta
            titulo="Reglas de alerta"
            accion={<button type="button" className="pnl-btn primario" onClick={() => setNuevaRegla(true)}><Icono nombre="mas" tam={16} />Nueva regla de velocidad</button>}
            sinCuerpo
          >
            {reglas.estado === 'cargando' && <Cargando filas={3} />}
            {reglas.estado === 'error' && <ErrorCarga onReintentar={reglas.recargar} error={reglas.error} />}
            {reglas.estado === 'ok' && (reglas.datos.length === 0 ? (
              <div className="pnl-card-cuerpo">
                <Vacio icono="velocidad" titulo="Sin reglas todavía" texto="Crea una de velocidad: cuando una unidad la supere, aparecerá un evento aquí y un aviso en Alertas." />
              </div>
            ) : (
              <div className="pnl-filas">
                {reglas.datos.map((r) => (
                  <div className="pnl-fila" key={r.id}>
                    <Icono nombre={r.tipo === 'velocidad' ? 'velocidad' : 'alerta'} tam={18} />
                    <div className="pnl-fila-txt">
                      <b>{r.tipo === 'velocidad' ? `Velocidad máxima ${f.numero(r.umbralKmh)} km/h` : `Condición ${r.variable ?? ''} ${r.operador ?? ''} ${r.umbral ?? ''}`.trim()}</b>
                      <span>{r.vehiculos ? `${r.vehiculos} unidades` : 'Toda la flota'}</span>
                    </div>
                    <Tag color={r.activa ? 'verde' : 'gris'}>{r.activa ? 'Activa' : 'Apagada'}</Tag>
                    <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => actuar(() => repo.reglas.set(r.id, { activa: !r.activa }), r.activa ? 'Regla apagada.' : 'Regla activada.')}>
                      {r.activa ? 'Apagar' : 'Activar'}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </Tarjeta>
        )}
      </div>

      <ModalRegla abierto={nuevaRegla} alCerrar={() => setNuevaRegla(false)} guardar={(umbral) => actuar(() => repo.reglas.crear({ tipo: 'velocidad', umbralKmh: umbral }), 'Regla creada.')} />
    </>
  )
}

function ModalRegla({ abierto, alCerrar, guardar }) {
  const [umbral, setUmbral] = useState('90')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  async function confirmar() {
    const n = Number(umbral)
    if (!Number.isFinite(n) || n < 10 || n > 250) return setError('Un límite entre 10 y 250 km/h.')
    setGuardando(true)
    setError('')
    const ok = await guardar(n)
    setGuardando(false)
    if (ok) alCerrar()
  }
  return (
    <Modal titulo="Nueva regla de velocidad" abierto={abierto} alCerrar={alCerrar} ancho={440}>
      <Campo etiqueta="Velocidad máxima (km/h)" error={error} ayuda="Cuando una unidad la supere, el servidor crea el evento y el aviso.">
        <input type="number" className="pnl-input" min="10" max="250" value={umbral} onChange={(e) => setUmbral(e.target.value)} />
      </Campo>
      <div className="pnl-chips">
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>{guardando ? 'Guardando…' : 'Crear regla'}</button>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
      </div>
    </Modal>
  )
}
