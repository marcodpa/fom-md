import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import {
  Buscador, Campo, Cargando, Datos, ErrorCarga, Modal, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import { Icono } from '../Iconos'
import * as f from '../datos/formato'
import './mantenimiento.css'
import './admin-rediseno.css'

// ============================================================
// INVENTARIO GPS (solo Administrador FOM)
// Mismo estilo que Mantenimiento: arriba lo que importa, a la izquierda
// la lista de equipos y a la derecha el equipo elegido con sus acciones
// (verificar, instalar, desmontar, editar) y lo que ha pasado con él.
// El ciclo del equipo es el de la app: registrar → verificar por ping →
// instalar en una unidad → desmontar. Sin GPS verificado no hay vehículo.
// ============================================================

function cargar(q) {
  return Promise.all([
    repo.admin.gps.listar({ q }),
    repo.vehiculos.listar({}),
  ]).then(([lista, vehiculos]) => ({ lista, vehiculos }))
}

const ETAPAS = [
  { clave: 'todos', titulo: 'Todos', color: '', filtro: () => true },
  { clave: 'sinverificar', titulo: 'Sin verificar', color: 'ambar', filtro: (g) => g.estado !== 'inactive' && !g.verificado },
  { clave: 'libres', titulo: 'Libres para instalar', color: 'verde', filtro: (g) => g.estado !== 'inactive' && g.verificado && !g.vehiculoId },
  { clave: 'instalados', titulo: 'Instalados', color: '', filtro: (g) => !!g.vehiculoId },
  { clave: 'inactivos', titulo: 'Inactivos', color: 'gris', filtro: (g) => g.estado === 'inactive' },
]

const estadoDe = (g) => {
  if (g.estado === 'inactive') return { texto: 'Inactivo', color: 'gris' }
  if (!g.verificado) return { texto: 'Sin verificar', color: 'ambar' }
  if (g.vehiculoId) return { texto: 'Instalado', color: 'azul' }
  return { texto: 'Listo para instalar', color: 'verde' }
}

const SIGUIENTE = (g) => {
  if (g.estado === 'inactive') return 'El equipo está inactivo. Actívalo desde «Editar» para volver a usarlo.'
  if (!g.verificado) return 'Primero hay que comprobar que responde. La verificación por ping se hace en campo, con el aparato delante.'
  if (g.vehiculoId) return `Está instalado en ${g.vehiculoNombre}. Si cambia de unidad, desmóntalo primero.`
  return 'Ya responde. Instálalo en la unidad que va a rastrear.'
}

export default function AdminGps() {
  const sesion = useSesion()
  const actor = sesion?.perfil
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [vista, setVista] = useState('equipos')
  const [etapa, setEtapa] = useState('todos')
  const [seleccionId, setSeleccionId] = useState(null)
  const [registrando, setRegistrando] = useState(null) // null | { imei }
  const [editando, setEditando] = useState(null)
  const [aviso, setAviso] = useState('')
  // Estado por equipo: { [id]: { ocupado, error, mensaje } }
  const [filas, setFilas] = useState({})

  const { datos, estado, error, recargar } = useDatos(() => cargar(q), [q])
  const sinEmparejar = useDatos(async () => { try { return await repo.admin.gps.sinEmparejar() } catch { return [] } }, [])

  const marcarFila = (id, patch) => setFilas((s) => ({ ...s, [id]: { ...(s[id] || {}), ...patch } }))

  const cambiarBusqueda = (v) => {
    setQ(v)
    if (params.get('q')) setParams({}, { replace: true })
  }

  const ejecutar = async (g, hacer, ok) => {
    marcarFila(g.id, { ocupado: true, error: '', mensaje: '' })
    try {
      const r = await hacer()
      if (r && r.ok === false) { marcarFila(g.id, { ocupado: false, error: r.error }); return }
      marcarFila(g.id, { ocupado: false, mensaje: r?.mensaje ?? '' })
      if (ok) setAviso(ok)
      await recargar()
    } catch (e) {
      marcarFila(g.id, { ocupado: false, error: e.message })
    }
  }

  const acciones = {
    verificar: (g) => ejecutar(g, () => repo.admin.gps.verificar(g.id, actor)),
    probarPanico: (g) => ejecutar(g, () => repo.admin.gps.probarPanico(g.id, actor)),
    instalar: (g, vehiculoId) => vehiculoId && ejecutar(g, () => repo.admin.gps.asociar(g.id, vehiculoId, actor), 'Equipo instalado en la unidad.'),
    desmontar: (g) => ejecutar(g, () => repo.admin.gps.desmontar(g.instalacionId), 'Equipo desmontado: vuelve al inventario.'),
  }

  const lista = datos?.lista ?? []
  const visibles = lista.filter((ETAPAS.find((e) => e.clave === etapa) ?? ETAPAS[0]).filtro)
  const seleccion = lista.find((g) => g.id === seleccionId) ?? visibles[0] ?? null
  const huerfanos = sinEmparejar.datos ?? []

  const resumen = [
    ['Equipos', lista.length, 'En el inventario', 'pin'],
    ['Sin verificar', lista.filter(ETAPAS[1].filtro).length, 'Pendientes de ping', 'alerta'],
    ['Libres', lista.filter(ETAPAS[2].filtro).length, 'Listos para una unidad', 'check'],
    ['Instalados', lista.filter(ETAPAS[3].filtro).length, 'Asignados a una unidad', 'camion'],
  ]

  return (
    <div className="mnt-root">
      <div className="mnt-heading">
        <div>
          <span className="mnt-breadcrumb">Inicio › Administración › GPS</span>
          <h1>Inventario GPS</h1>
          <p>Registra el equipo, instálalo en una unidad y mira cuáles reportan.</p>
        </div>
      </div>
      <nav className="mnt-nav" aria-label="Secciones de GPS">
        <button type="button" className={vista === 'equipos' ? 'activo' : ''} onClick={() => setVista('equipos')}><Icono nombre="pin" tam={18} />Equipos</button>
        <button type="button" className={vista === 'huerfanos' ? 'activo' : ''} onClick={() => setVista('huerfanos')}><Icono nombre="alerta" tam={18} />Sin emparejar{huerfanos.length > 0 ? ` (${huerfanos.length})` : ''}</button>
      </nav>

      <div className="mnt-content">
        <div className="mnt-toolbar">
          <div><h2>Equipos</h2></div>
          <button type="button" className="pnl-btn primario" onClick={() => setRegistrando({ imei: '' })}><Icono nombre="mas" tam={18} />Registrar equipo</button>
        </div>
        {aviso && <div className="mnt-success" role="status"><Icono nombre="check" tam={20} />{aviso}</div>}

        {estado === 'cargando' && <Cargando filas={6} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} error={error} />}

        {estado === 'ok' && vista === 'equipos' && (
          <>
            <div className="mnt-summary">
              {resumen.map(([t, v, d, i]) => (
                <div key={t}><Icono nombre={i} tam={28} /><span>{t}</span><b>{v}</b><small>{d}</small></div>
              ))}
            </div>
            <div className="mnt-filters">
              <Buscador valor={q} alCambiar={cambiarBusqueda} placeholder="Buscar por modelo, IMEI, línea o unidad…" />
            </div>
            <div className="mnt-states" aria-label="Filtrar por estado">
              {ETAPAS.map((e) => (
                <button type="button" key={e.clave} aria-pressed={etapa === e.clave} onClick={() => setEtapa(e.clave)}>
                  {e.color && <i className={e.color} />}{e.titulo}<b>{lista.filter(e.filtro).length}</b>
                </button>
              ))}
            </div>

            {lista.length === 0 ? (
              <Tarjeta><Vacio icono="pin" titulo="Inventario vacío" texto="Registra el primer equipo GPS para comenzar." /></Tarjeta>
            ) : (
              <div className="adm-layout">
                <Tarjeta titulo={etapa === 'todos' ? 'Todos los equipos' : ETAPAS.find((e) => e.clave === etapa).titulo} sinCuerpo>
                  {visibles.length === 0 ? (
                    <div className="pnl-card-cuerpo"><Vacio icono="check" titulo="Nada en este grupo" texto="Cambia el filtro para ver los demás equipos." /></div>
                  ) : (
                    <div className="mnt-orders">
                      {visibles.map((g) => {
                        const e = estadoDe(g)
                        return (
                          <article
                            key={`${g.id}-${g.imei}`}
                            className={`mnt-order adm-item${seleccion?.id === g.id ? ' sel' : ''}`}
                            onClick={() => setSeleccionId(g.id)}
                          >
                            <div className="mnt-thumb"><Icono nombre="pin" tam={28} /></div>
                            <div className="mnt-order-copy">
                              <span>{g.vehiculoNombre || 'En inventario'}</span>
                              <h3>{g.modelo}</h3>
                              <div><Tag color={e.color}>{e.texto}</Tag><small>IMEI {g.imei}{g.linea ? ` · ${g.linea}` : ''}</small></div>
                            </div>
                            <button type="button" className="pnl-btn" aria-pressed={seleccion?.id === g.id} onClick={(ev) => { ev.stopPropagation(); setSeleccionId(g.id) }}>
                              {seleccion?.id === g.id ? 'Abierto' : 'Ver'} →
                            </button>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </Tarjeta>

                <aside className="adm-panel">
                  {seleccion ? (
                    <Detalle
                      g={seleccion}
                      vehiculos={datos.vehiculos}
                      fila={filas[seleccion.id] || {}}
                      acciones={acciones}
                      alEditar={() => setEditando(seleccion)}
                    />
                  ) : (
                    <Vacio icono="pin" titulo="Elige un equipo" texto="Aquí verás sus datos y lo que puedes hacer con él." />
                  )}
                </aside>
              </div>
            )}
          </>
        )}

        {vista === 'huerfanos' && (
          <Tarjeta titulo="Equipos que reportan sin empresa" sinCuerpo>
            {sinEmparejar.estado === 'cargando' && <Cargando filas={2} />}
            {sinEmparejar.estado === 'ok' && (huerfanos.length === 0 ? (
              <div className="pnl-card-cuerpo"><Vacio icono="pin" titulo="Nada sin emparejar" texto="Todo IMEI que llega al receptor ya está registrado en alguna empresa." /></div>
            ) : (
              <div className="mnt-orders">
                {huerfanos.map((d) => (
                  <article className="mnt-order" key={d.imei}>
                    <div className="mnt-thumb"><Icono nombre="alerta" tam={26} /></div>
                    <div className="mnt-order-copy">
                      <span>{d.mensajes} mensajes por {String(d.transporte).toUpperCase()}</span>
                      <h3>IMEI {d.imei}</h3>
                      <div><Tag color={d.reportando ? 'verde' : 'gris'}>{d.reportando ? 'Reportando' : 'Callado'}</Tag><small>Primera vez {f.desde(d.primeraVez)} · último {f.desde(d.ultimaVez)}</small></div>
                    </div>
                    <button type="button" className="pnl-btn primario" onClick={() => setRegistrando({ imei: d.imei })}>Registrar este equipo →</button>
                  </article>
                ))}
              </div>
            ))}
          </Tarjeta>
        )}
      </div>

      <ModalRegistrar
        abierto={!!registrando}
        inicial={registrando?.imei ?? ''}
        alCerrar={() => setRegistrando(null)}
        alGuardar={async () => { setAviso('Equipo registrado en el inventario.'); await recargar(); await sinEmparejar.recargar() }}
        actor={actor}
      />
      <ModalEditar equipo={editando} alCerrar={() => setEditando(null)} alGuardar={async () => { setAviso('Datos del equipo actualizados.'); await recargar() }} />
    </div>
  )
}

function Detalle({ g, vehiculos, fila, acciones, alEditar }) {
  const e = estadoDe(g)
  const instalado = !!g.vehiculoId
  const activo = g.estado !== 'inactive'
  const [vehiculoId, setVehiculoId] = useState('')
  // Lo que ha pasado con el equipo, de la bitácora.
  const historial = useDatos(
    () => repo.admin.auditoria.listar({ q: g.imei }).then((l) => [...l].slice(0, 6)).catch(() => []),
    [g.imei],
  )

  return (
    <div className="adm-detalle">
      <div className="adm-cab">
        <div className="mnt-thumb"><Icono nombre="pin" tam={30} /></div>
        <div>
          <h3>{g.modelo}</h3>
          <code>{g.imei}</code>
        </div>
      </div>
      <div className="adm-tags">
        <Tag color={e.color}>{e.texto}</Tag>
        {g.conectado && <Tag color="verde" plano>Conectado ahora</Tag>}
        {g.panicoProbado && <Tag color="verde" plano>Pánico OK</Tag>}
      </div>

      <Datos items={[
        { etiqueta: 'Unidad', valor: g.vehiculoNombre || 'En inventario' },
        { etiqueta: 'Línea', valor: g.linea || '—' },
        { etiqueta: 'Fabricante', valor: g.fabricante || '—' },
        { etiqueta: 'Protocolo', valor: g.protocolo || '—' },
        { etiqueta: 'Última conexión', valor: g.ultimaConexion ? f.desde(g.ultimaConexion) : 'Nunca' },
      ]} />

      <div className="adm-sigue">
        <b>Qué sigue</b>
        <p>{SIGUIENTE(g)}</p>
      </div>

      {fila.mensaje && <div className="mnt-success" role="status">{fila.mensaje}</div>}
      {fila.error && <p className="pnl-campo-error" role="alert">{fila.error}</p>}

      <div className="adm-acciones" role="group" aria-label="Acciones sobre el equipo">
        {activo && !g.verificado && (
          <button type="button" className="pnl-btn primario" disabled={fila.ocupado} onClick={() => acciones.verificar(g)}>
            <Icono nombre="sync" tam={16} />{fila.ocupado ? 'Verificando…' : fila.error ? 'Reintentar verificación' : 'Verificar por ping'}
          </button>
        )}
        {activo && g.verificado && !instalado && (
          <div className="adm-instalar">
            <select className="pnl-input" value={vehiculoId} disabled={fila.ocupado} onChange={(ev) => setVehiculoId(ev.target.value)} aria-label="Unidad donde instalar">
              <option value="">Elige la unidad…</option>
              {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.alias} · {v.placa}</option>)}
            </select>
            <button type="button" className="pnl-btn primario" disabled={!vehiculoId || fila.ocupado} onClick={() => acciones.instalar(g, vehiculoId)}>Instalar →</button>
          </div>
        )}
        {instalado && (
          <Link className="pnl-btn" to={`/panel/flota/${g.vehiculoId}`}><Icono nombre="camion" tam={16} />Ver la unidad →</Link>
        )}
        {instalado && g.instalacionId && (
          <button type="button" className="pnl-btn" disabled={fila.ocupado} onClick={() => acciones.desmontar(g)}>Desmontar de la unidad</button>
        )}
        {activo && g.verificado && g.pinSupport && !g.panicoProbado && (
          <button type="button" className="pnl-btn sutil" disabled={fila.ocupado} onClick={() => acciones.probarPanico(g)}>
            <Icono nombre="alerta" tam={16} />{fila.ocupado ? 'Probando…' : 'Probar botón de pánico'}
          </button>
        )}
        <button type="button" className="pnl-btn sutil" onClick={alEditar}><Icono nombre="editar" tam={16} />Editar datos</button>
      </div>

      <section className="mnt-history">
        <h3>Qué ha pasado con este equipo</h3>
        {historial.estado === 'cargando' && <Cargando filas={2} />}
        {historial.estado === 'ok' && (historial.datos.length === 0
          ? <p className="mnt-muted">Todavía no hay movimientos registrados.</p>
          : historial.datos.map((a) => (
            <div key={a.id}>
              <i />
              <div>
                <b>{a.tipo}</b>
                {a.detalle && <p>{a.detalle}</p>}
                <small>{a.actorNombre} · {f.fechaHora(a.fecha)}</small>
              </div>
            </div>
          )))}
      </section>
    </div>
  )
}

function ModalRegistrar({ abierto, inicial, alCerrar, alGuardar, actor }) {
  const [modelo, setModelo] = useState('')
  const [imei, setImei] = useState('')
  const [linea, setLinea] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [visto, setVisto] = useState(false)

  // Al abrir desde «Sin emparejar», el IMEI ya viene puesto.
  if (abierto && !visto) { setVisto(true); setImei(inicial) }
  if (!abierto && visto) setVisto(false)

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
          <Icono nombre="check" tam={16} />{guardando ? 'Registrando…' : 'Registrar'}
        </button>
        <button type="button" className="pnl-btn sutil" onClick={cerrar} disabled={guardando}>Cancelar</button>
      </div>
    </Modal>
  )
}

function ModalEditar({ equipo, alCerrar, alGuardar }) {
  const [fabricante, setFabricante] = useState('')
  const [serie, setSerie] = useState('')
  const [activo, setActivo] = useState(true)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [idCargado, setIdCargado] = useState(null)

  if (equipo && idCargado !== equipo.id) {
    setIdCargado(equipo.id)
    setFabricante(equipo.fabricante ?? '')
    setSerie(equipo.serie ?? '')
    setActivo(equipo.estado !== 'inactive')
    setError('')
  }
  if (!equipo && idCargado) setIdCargado(null)

  const confirmar = async () => {
    setGuardando(true)
    setError('')
    try {
      await repo.admin.gps.set(equipo.id, {
        estado: activo ? 'active' : 'inactive',
        fabricante: fabricante.trim() || undefined,
        serie: serie.trim() || undefined,
      })
      await alGuardar()
      alCerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`Editar ${equipo?.modelo ?? 'equipo'}`} abierto={!!equipo} alCerrar={alCerrar} ancho={460}>
      <Campo etiqueta="Fabricante" error={error}>
        <input type="text" className="pnl-input" value={fabricante} onChange={(e) => setFabricante(e.target.value)} placeholder="Teltonika" />
      </Campo>
      <Campo etiqueta="Número de serie">
        <input type="text" className="pnl-input" value={serie} onChange={(e) => setSerie(e.target.value)} />
      </Campo>
      <Campo etiqueta="Estado" ayuda="Un equipo inactivo no se puede instalar en ninguna unidad.">
        <select className="pnl-input" value={activo ? 'active' : 'inactive'} onChange={(e) => setActivo(e.target.value === 'active')}>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </Campo>
      <div className="pnl-chips">
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>
          <Icono nombre="check" tam={16} />{guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
      </div>
    </Modal>
  )
}
