import { useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import {
  Buscador, Cabecera, Campo, Cargando, ErrorCarga, Kpi, Modal, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import { Icono } from '../Iconos'

// ============================================================
// INVENTARIO GPS (solo Administrador FOM)
// El ciclo del equipo, igual que en la app: registrar → verificar por
// ping → asociar a un ente → instalar en una unidad. Sin GPS verificado
// no se crea ningún vehículo.
// ============================================================

function cargar(q) {
  return Promise.all([
    repo.admin.gps.listar({ q }),
    repo.admin.empresas.listar({}),
  ]).then(([lista, empresas]) => ({
    lista,
    empresas: empresas.filter((e) => !e.respaldo),
  }))
}

export default function AdminGps() {
  const sesion = useSesion()
  const actor = sesion?.perfil
  const [q, setQ] = useState('')
  const [registrando, setRegistrando] = useState(false)
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

  const asociar = async (g, empresaId) => {
    marcarFila(g.id, { ocupado: true, error: '', mensaje: '' })
    try {
      await repo.admin.gps.asociar(g.id, empresaId, actor)
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
        bajada="Registrar, verificar por ping, asociar e instalar: sin GPS verificado no hay unidad nueva."
      >
        <button type="button" className="pnl-btn primario" onClick={() => setRegistrando(true)}>
          <Icono nombre="mas" tam={16} />
          Registrar equipo
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
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
      </div>

      <ModalRegistrar abierto={registrando} alCerrar={() => setRegistrando(false)} alGuardar={recargar} actor={actor} />
    </>
  )
}

function Contenido({ datos, q, setQ, filas, verificar, asociar, probarPanico }) {
  const { lista, empresas } = datos
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

      <Tarjeta
        titulo="Equipos"
        accion={<Buscador valor={q} alCambiar={setQ} placeholder="Buscar por modelo, IMEI o ente…" />}
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
                  <th>Ente</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {lista.map((g) => {
                  const fila = filas[g.id] || {}
                  const instalado = !!g.vehiculoId
                  return (
                    <tr key={`${g.id}-${g.imei}`}>
                      <td><b>{g.modelo}</b></td>
                      <td><code>{g.imei}</code></td>
                      <td>{g.linea || '—'}</td>
                      <td>{instalado ? `${g.empresaNombre}` : g.empresaNombre}</td>
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
                              value={g.empresaId || ''}
                              disabled={fila.ocupado}
                              onChange={(e) => asociar(g, e.target.value)}
                              aria-label={`Asociar ${g.modelo} a un ente`}
                            >
                              <option value="">Sin asociar</option>
                              {empresas.map((e) => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
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
      </Tarjeta>
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
