import { useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import {
  Buscador, Cabecera, Campo, Cargando, Datos, ErrorCarga, Kpi, Modal, Pestanas, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import { Icono } from '../Iconos'
import * as f from '../datos/formato'

// ============================================================
// INVENTARIO GPS (solo Administrador FOM)
// El ciclo del equipo, igual que en la app: registrar → verificar por
// ping → instalar en una unidad → desmontar. Sin GPS verificado
// no se crea ningún vehículo.
// ============================================================

function cargar(q) {
  return Promise.all([
    repo.admin.gps.listar({ q }),
    repo.admin.empresas.listar({}),
    repo.vehiculos.listar({}),
  ]).then(([lista, empresas, vehiculos]) => ({
    lista,
    empresas: empresas.filter((e) => !e.respaldo),
    vehiculos,
  }))
}

export default function AdminGps() {
  const sesion = useSesion()
  const actor = sesion?.perfil
  const [q, setQ] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [pestana, setPestana] = useState('equipos')
  // Estado por fila: { [id]: { ocupado, error, mensaje } }
  const [filas, setFilas] = useState({})

  const { datos, estado, error, recargar } = useDatos(() => cargar(q), [q])

  const marcarFila = (id, patch) =>
    setFilas((s) => ({ ...s, [id]: { ...(s[id] || {}), ...patch } }))

  // Verificación por ping: el primer intento SIEMPRE falla (como en la app),
  // el error queda en la fila y el botón invita a reintentar.
  const verificar = async (g) => {
    marcarFila(g.id, { ocupado: true, error: '', mensaje: '' })
    try {
      const r = await repo.admin.gps.verificar(g.id, actor)
      if (r.ok) {
        marcarFila(g.id, { ocupado: false, mensaje: r.mensaje })
        await recargar()
      } else {
        marcarFila(g.id, { ocupado: false, error: r.error })
      }
    } catch (e) {
      marcarFila(g.id, { ocupado: false, error: e.message })
    }
  }

  // Mismo paso que en la app de campo: el equipo del inventario se instala
  // en UNA unidad (`POST gps-devices/:id/installation`).
  const asociar = async (g, vehiculoId) => {
    if (!vehiculoId) return
    marcarFila(g.id, { ocupado: true, error: '', mensaje: '' })
    try {
      await repo.admin.gps.asociar(g.id, vehiculoId)
      marcarFila(g.id, { ocupado: false })
      await recargar()
    } catch (e) {
      marcarFila(g.id, { ocupado: false, error: e.message })
    }
  }

  const probarPanico = async (g) => {
    marcarFila(g.id, { ocupado: true, error: '', mensaje: '' })
    try {
      const r = await repo.admin.gps.probarPanico(g.id, actor)
      marcarFila(g.id, { ocupado: false, mensaje: r.mensaje })
      await recargar()
    } catch (e) {
      marcarFila(g.id, { ocupado: false, error: e.message })
    }
  }

  return (
    <>
      <Cabecera
        titulo="Inventario GPS"
        bajada="Registrar el equipo, instalarlo en una unidad y ver cuáles reportan. Verificar por ping y probar el pánico se hacen en campo, desde la app."
      >
        <button type="button" className="pnl-btn primario" onClick={() => setRegistrando(true)}>
          <Icono nombre="mas" tam={16} />
          Registrar equipo
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
        <Pestanas opciones={[{v:'equipos',t:'Equipos'},{v:'sin-ente',t:'Sin emparejar'}]} valor={pestana} alCambiar={setPestana} />
        {pestana === 'sin-ente' ? <SinEmparejar /> : <>
        {estado === 'cargando' && <Cargando filas={6} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} error={error} />}
        {estado === 'ok' && (
          <Contenido
            datos={datos}
            q={q}
            setQ={setQ}
            filas={filas}
            verificar={verificar}
            asociar={asociar}
            probarPanico={probarPanico}
          />
        )}
        </>}
      </div>

      <ModalRegistrar abierto={registrando} alCerrar={() => setRegistrando(false)} alGuardar={recargar} actor={actor} />
    </>
  )
}

/**
 * IMEI que están mandando mensajes al receptor sin pertenecer a ningún ente.
 * Es la bandeja del administrador: un equipo recién encendido aparece aquí
 * antes de registrarlo. Lectura reservada al administrador FOM.
 */
function SinEmparejar() {
  const bandeja = useDatos(() => repo.admin.gps.sinEmparejar(), [], 60000)
  return (
    <Tarjeta titulo="Equipos que reportan sin ente" sinCuerpo>
      {bandeja.estado === 'cargando' && <Cargando filas={2} />}
      {bandeja.estado === 'error' && <ErrorCarga onReintentar={bandeja.recargar} error={bandeja.error} />}
      {bandeja.estado === 'ok' && (bandeja.datos.length === 0 ? (
        <div className="pnl-card-cuerpo">
          <Vacio icono="pin" titulo="Nada sin emparejar" texto="Todo IMEI que llega al receptor ya está registrado en algún ente." />
        </div>
      ) : (
        <div className="pnl-filas">
          {bandeja.datos.map((d) => (
            <div className="pnl-fila aviso" key={d.imei}>
              <Icono nombre="pin" tam={18} />
              <div className="pnl-fila-txt">
                <b>IMEI {d.imei}</b>
                <span>{d.mensajes} mensajes por {d.transporte.toUpperCase()} · visto por primera vez {f.desde(d.primeraVez)} · último {f.desde(d.ultimaVez)}</span>
              </div>
              <Tag color={d.reportando ? 'verde' : 'gris'}>{d.reportando ? 'Reportando' : 'Callado'}</Tag>
            </div>
          ))}
        </div>
      ))}
    </Tarjeta>
  )
}

function Contenido({ datos, q, setQ, filas, verificar, asociar, probarPanico }) {
  const { lista, vehiculos } = datos
  const [seleccionId, setSeleccionId] = useState(null)
  const seleccion = lista.find(g => g.id === seleccionId) ?? lista[0]
  const sinVerificar = lista.filter((g) => !g.verificado).length
  const libres = lista.filter((g) => g.verificado && !g.vehiculoId).length
  const instalados = lista.filter((g) => g.vehiculoId).length

  return (
    <>
      <div className="pnl-grid k4">
        <Kpi titulo="Equipos" valor={lista.length} icono="pin" nota="Inventario y flota" />
        <Kpi titulo="Sin verificar" valor={sinVerificar} icono="alerta" tono={sinVerificar > 0 ? 'aviso' : 'ok'} nota={sinVerificar > 0 ? 'Pendientes de ping' : 'Todo verificado'} />
        <Kpi titulo="Libres verificados" valor={libres} icono="check" tono="ok" nota="Listos para una unidad" />
        <Kpi titulo="Instalados" valor={instalados} icono="camion" nota="Reportando en la flota" />
      </div>

      <div className="pnl-admin-dividido"><Tarjeta
        titulo="Equipos"
        accion={<Buscador valor={q} alCambiar={setQ} placeholder="Buscar por modelo, IMEI, línea o unidad…" />}
        sinCuerpo
      >
        {lista.length === 0 ? (
          <div className="pnl-card-cuerpo">
            <Vacio icono="pin" titulo="Inventario vacío" texto="Registra el primer equipo GPS para comenzar." />
          </div>
        ) : (
          <div className="pnl-tabla-wrap">
            <table className="pnl-tabla">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>IMEI</th>
                  <th>Línea</th>
                  <th>Unidad</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {lista.map((g) => {
                  const fila = filas[g.id] || {}
                  const instalado = !!g.vehiculoId
                  return (
                    <tr key={`${g.id}-${g.imei}`} className={seleccion?.id === g.id ? 'seleccionada' : ''}>
                      <td><button className="pnl-table-action" onClick={()=>setSeleccionId(g.id)} aria-pressed={seleccion?.id === g.id}>{g.modelo}</button></td>
                      <td><code>{g.imei}</code></td>
                      <td>{g.linea || '—'}</td>
                      <td>{instalado ? g.vehiculoNombre : 'En inventario'}</td>
                      <td>
                        <div className="pnl-chips">
                          {g.verificado ? (
                            <Tag color="verde">Verificado</Tag>
                          ) : (
                            <Tag color="ambar">Sin verificar</Tag>
                          )}
                          {g.panicoProbado && <Tag color="verde" plano>Pánico OK</Tag>}
                          {instalado && <Tag color="azul" plano>En {g.vehiculoNombre}</Tag>}
                        </div>
                      </td>
                      <td className="num">
                        {!instalado && (
                          <div className="pnl-chips">
                            {!g.verificado && (
                              <button
                                type="button"
                                className="pnl-btn sutil"
                                disabled={fila.ocupado}
                                onClick={() => verificar(g)}
                              >
                                <Icono nombre="sync" tam={14} />
                                {fila.ocupado ? 'Verificando…' : fila.error ? 'Reintentar' : 'Verificar'}
                              </button>
                            )}
                            <select
                              className="pnl-input"
                              value=""
                              disabled={fila.ocupado}
                              onChange={(e) => asociar(g, e.target.value)}
                              aria-label={`Instalar ${g.modelo} en una unidad`}
                            >
                              <option value="">Instalar en…</option>
                              {vehiculos.map((v) => (
                                <option key={v.id} value={v.id}>{v.alias} · {v.placa}</option>
                              ))}
                            </select>
                            {g.verificado && g.pinSupport && !g.panicoProbado && (
                              <button
                                type="button"
                                className="pnl-btn sutil"
                                disabled={fila.ocupado}
                                onClick={() => probarPanico(g)}
                              >
                                <Icono nombre="alerta" tam={14} />
                                {fila.ocupado ? 'Probando…' : 'Probar pánico'}
                              </button>
                            )}
                          </div>
                        )}
                        {fila.error && <p className="pnl-campo-error" role="alert">{fila.error}</p>}
                        {fila.mensaje && <p className="pnl-campo-ayuda">{fila.mensaje}</p>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta><aside className="pnl-admin-detalle"><Tarjeta titulo="Detalle del equipo">
        {seleccion ? <><div className="pnl-gps-visual"><Icono nombre="pin" tam={64} /></div><h3>{seleccion.modelo}</h3><Tag color={seleccion.verificado ? 'verde' : 'ambar'}>{seleccion.verificado ? 'Verificado' : 'Sin verificar'}</Tag>
          <Datos items={[{etiqueta:'IMEI',valor:seleccion.imei},{etiqueta:'Línea',valor:seleccion.linea || '—'},{etiqueta:'Unidad',valor:seleccion.vehiculoNombre || 'En inventario'},{etiqueta:'Botón de pánico',valor:seleccion.panicoProbado ? 'Probado' : 'Sin prueba registrada'}]} />
        </> : <Vacio icono="pin" titulo="Sin equipos" texto="Registra el primer GPS para consultar su información." />}
      </Tarjeta></aside></div>
    </>
  )
}

function ModalRegistrar({ abierto, alCerrar, alGuardar, actor }) {
  const [modelo, setModelo] = useState('')
  const [imei, setImei] = useState('')
  const [linea, setLinea] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cerrar = () => {
    setModelo(''); setImei(''); setLinea(''); setError('')
    alCerrar()
  }

  const confirmar = async () => {
    setGuardando(true)
    setError('')
    try {
      await repo.admin.gps.registrar({ modelo, imei, linea }, actor)
      await alGuardar()
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Registrar equipo GPS" abierto={abierto} alCerrar={cerrar} ancho={460}>
      <Campo etiqueta="Modelo" error={error}>
        <input type="text" className="pnl-input" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Teltonika FMB920" />
      </Campo>
      <Campo etiqueta="IMEI" ayuda="15 dígitos, único en el sistema.">
        <input type="text" inputMode="numeric" className="pnl-input" value={imei} onChange={(e) => setImei(e.target.value)} placeholder="860000000000000" />
      </Campo>
      <Campo etiqueta="Línea (opcional)">
        <input type="tel" className="pnl-input" value={linea} onChange={(e) => setLinea(e.target.value)} placeholder="+58 …" />
      </Campo>

      <div className="pnl-chips">
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>
          <Icono nombre="check" tam={16} />
          {guardando ? 'Registrando…' : 'Registrar'}
        </button>
        <button type="button" className="pnl-btn sutil" onClick={cerrar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
