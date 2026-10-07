import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useSesion } from '../useSesion'
import { entrarEmpresa, salirEmpresa } from '../auth'
import { esAdminFom } from '../roles'
import { useDatos } from '../useDatos'
import { Cabecera, Campo, Cargando, Chips, ErrorCarga, Pestanas, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { color, etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'
import { agruparAvisos, esDeHoy, estaLeida } from './alertas-presentacion'
import './perfil-alertas.css'

const DIAS_EVENTOS = 28
const PESTANAS = [{ v: 'notificaciones', t: 'Notificaciones' }, { v: 'eventos', t: 'Eventos de manejo' }]
const TIPOS_EVENTO = [{ v: 'exceso_velocidad', t: 'Exceso de velocidad' }, { v: 'frenada_brusca', t: 'Frenada brusca' }, { v: 'aceleracion_brusca', t: 'Aceleración fuerte' }, { v: 'curva_agresiva', t: 'Curva agresiva' }, { v: 'condicion', t: 'Condición de telemetría' }]

export default function Alertas() {
  const sesion = useSesion()
  return esAdminFom(sesion?.perfil) && !sesion?.perfil?.empresaGestion
    ? <ElegirEmpresaAlertas /> : <BandejaAlertas />
}

function ElegirEmpresaAlertas() {
  const empresas = useDatos(() => repo.admin.empresas.listar({}), [])
  const [empresaId, setEmpresaId] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState('')
  const lista = (empresas.datos ?? []).filter(e => !e.respaldo)
  async function abrir(e) {
    e.preventDefault()
    const empresa = lista.find(e => e.id === empresaId)
    if (!empresa || entrando) return
    setError('')
    setEntrando(true)
    try { await entrarEmpresa(empresa) }
    catch (e) { setError(e?.message || 'No se pudo abrir esta empresa. Inténtalo de nuevo.'); setEntrando(false) }
  }
  return <div className="fa-root">
    <Cabecera titulo="Alertas" bajada="Elige la empresa cuyas alertas quieres consultar." />
    {empresas.estado === 'cargando' && <Cargando filas={3} />}
    {empresas.estado === 'error' && <ErrorCarga texto={empresas.error?.message} onReintentar={empresas.recargar} />}
    {empresas.estado === 'ok' && <Tarjeta titulo="Consultar alertas de una empresa">
      {lista.length ? <form className="fa-empresa-selector" onSubmit={abrir} aria-busy={entrando}>
        <p>Tu acceso de administrador se conserva. Solo cambia la empresa que estás consultando.</p>
        <Campo etiqueta="Empresa"><select className="pnl-input" aria-label="Empresa para consultar alertas" value={empresaId} onChange={e => { setEmpresaId(e.target.value); setError('') }} disabled={entrando} required>
          <option value="">Selecciona una empresa</option>
          {lista.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select></Campo>
        {error && <p role="alert" className="pnl-error-texto">{error}</p>}
        <button type="submit" className="pnl-btn primario" disabled={!empresaId || entrando}><Icono nombre="campana" tam={18} />{entrando ? 'Abriendo alertas…' : 'Ver alertas'}</button>
      </form> : <Vacio icono="empresa" titulo="No hay empresas disponibles" texto="Las empresas autorizadas aparecerán aquí para consultar sus alertas." />}
    </Tarjeta>}
  </div>
}

function BandejaAlertas() {
  const sesion = useSesion()
  const [pestana, setPestana] = useState('notificaciones')
  const [filtro, setFiltro] = useState('todas')
  const [tipoEvento, setTipoEvento] = useState('')
  const [pendiente, setPendiente] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [aviso, setAviso] = useState('')
  const notif = useDatos(() => repo.alertas.listar({}), [])
  const manejo = useDatos(() => repo.alertas.eventos({ dias: DIAS_EVENTOS }), [])
  const lista = useMemo(() => notif.datos ?? [], [notif.datos])
  const eventos = useMemo(() => manejo.datos ?? [], [manejo.datos])
  const sinLeer = lista.filter(n => !estaLeida(n)).length
  const deHoy = lista.filter(n => esDeHoy(n.creadaEn)).length
  const filtrosNotif = [
    { v: 'todas', t: 'Todas', n: lista.length },
    { v: 'sin_leer', t: 'Sin leer', n: sinLeer },
    { v: 'odt_nueva', t: 'ODT nuevas', n: lista.filter(n => n.tipo === 'odt_nueva').length },
    { v: 'alerta_cumplida', t: 'Reglas cumplidas', n: lista.filter(n => n.tipo === 'alerta_cumplida').length },
  ]
  const notificaciones = lista.filter(n => filtro === 'todas' || (filtro === 'sin_leer' ? !estaLeida(n) : n.tipo === filtro))
  const grupos = agruparAvisos(notificaciones)
  const filtrosEvento = [{ v: '', t: 'Todos', n: eventos.length }].concat(TIPOS_EVENTO.filter(t => t.v !== 'condicion' || eventos.some(e => e.clave === t.v)).map(t => ({ ...t, n: eventos.filter(e => e.clave === t.v).length })))
  const eventosFiltrados = tipoEvento ? eventos.filter(e => e.clave === tipoEvento) : eventos
  const puedeActuar = notif.estado === 'ok' && !pendiente

  async function ejecutar(clave, operacion, mensaje) {
    if (pendiente) return
    setPendiente(clave)
    setErrorAccion('')
    setAviso('')
    try {
      await operacion()
      await notif.recargar()
      setAviso(mensaje)
    } catch (e) { setErrorAccion(e.message || 'No se pudo completar la acción. Inténtalo de nuevo.') }
    finally { setPendiente('') }
  }
  const marcar = n => estaLeida(n) ? undefined : ejecutar(`leer-${n.id}`, () => repo.alertas.marcarLeida(n.id), 'La notificación se marcó como leída.')
  const descartar = n => ejecutar(`descartar-${n.id}`, () => repo.alertas.descartar(n.id), 'La notificación se descartó de tu bandeja.')

  return <div className="fa-superficie pa-superficie">
    <Cabecera titulo="Alertas" bajada="Revisa lo nuevo y sigue con tu operación.">
      {esAdminFom(sesion?.perfil) && sesion.perfil.empresaGestion && <button type="button" className="pnl-btn" onClick={salirEmpresa}><Icono nombre="empresa" tam={17} />Cambiar empresa</button>}
      {pestana === 'notificaciones' && <>
      <button className="pnl-btn primario" disabled={!puedeActuar || !sinLeer} onClick={() => ejecutar('leer-todas', () => repo.alertas.marcarTodasLeidas(), 'Las notificaciones se marcaron como leídas.')}><Icono nombre="check" tam={17} />{pendiente === 'leer-todas' ? 'Marcando…' : 'Marcar todas como leídas'}</button>
      <button className="pnl-btn" disabled={!puedeActuar || lista.length === sinLeer} onClick={() => ejecutar('descartar-leidos', () => repo.alertas.descartarLeidos(), 'Se descartaron las notificaciones leídas.')}><Icono nombre="cerrar" tam={17} />{pendiente === 'descartar-leidos' ? 'Descartando…' : 'Descartar leídos'}</button>
      </>}
    </Cabecera>
    <div className="pnl-cuerpo">
      {errorAccion && <p className="pa-error" role="alert">{errorAccion}</p>}
      {aviso && <p className="pa-confirmacion" role="status"><Icono nombre="check" tam={17} />{aviso}</p>}
      {pestana === 'notificaciones' && <section className="fa-metricas" aria-label="Estado de las notificaciones"><div><Icono nombre="campana" tam={30} /><span>Sin leer<strong>{notif.datos === null ? '—' : f.numero(sinLeer)}</strong></span></div><div><Icono nombre="reloj" tam={30} /><span>Avisos de hoy<strong>{notif.datos === null ? '—' : f.numero(deHoy)}</strong></span></div></section>}
      <Pestanas opciones={PESTANAS} valor={pestana} alCambiar={setPestana} />
      {pestana === 'notificaciones' ? <>
        {notif.estado === 'cargando' && <Cargando filas={5} />}
        {notif.estado === 'error' && <ErrorCarga error={notif.error} texto="No se pudieron consultar tus notificaciones." onReintentar={notif.recargar} />}
        {notif.datos !== null && <>
          <Chips opciones={filtrosNotif} valor={filtro} alCambiar={setFiltro} />
          {grupos.length ? <section className="fa-bandeja" aria-label="Bandeja de notificaciones" aria-busy={Boolean(pendiente)}>{grupos.map(g => <div key={g.titulo}><h2>{g.titulo}</h2>{g.items.map(n => <article key={n.id} className={`fa-aviso${estaLeida(n) ? ' leida' : ''}`}><span className="fa-lectura" aria-label={estaLeida(n) ? 'Leída' : 'Sin leer'} /><Icono nombre={n.tipo === 'odt_nueva' ? 'documento' : n.tipo === 'alerta_cumplida' ? 'check' : 'campana'} tam={28} /><div className="fa-aviso-texto"><h3>{n.titulo}</h3>{n.detalle && <p>{n.detalle}</p>}</div><time dateTime={n.creadaEn || undefined} title={n.creadaEn ? f.fechaHora(n.creadaEn) : undefined}>{n.creadaEn ? f.desde(n.creadaEn) : 'Sin fecha'}</time><div className="fa-aviso-acciones">{n.odtId ? <><Link to="/panel/mantenimiento" className="pnl-btn primario">Ver mantenimiento</Link>{!estaLeida(n) && <button className="pnl-btn sutil" disabled={!puedeActuar} onClick={() => marcar(n)}>Marcar leída</button>}</> : estaLeida(n) ? <span className="fa-leida"><Icono nombre="check" tam={15} />Leída</span> : <button className="pnl-btn" disabled={!puedeActuar} onClick={() => marcar(n)}>{pendiente === `leer-${n.id}` ? 'Marcando…' : 'Marcar leída'}</button>}<button className="pnl-btn sutil" aria-label={`Descartar: ${n.titulo}`} disabled={!puedeActuar} onClick={() => descartar(n)}>{pendiente === `descartar-${n.id}` ? 'Descartando…' : 'Descartar'}</button></div></article>)}</div>)}</section> : <Tarjeta><Vacio icono={filtro === 'todas' ? 'check' : 'filtro'} titulo={lista.length === 0 || filtro === 'sin_leer' && sinLeer === 0 ? 'Tu bandeja está al día' : 'Sin notificaciones en este filtro'} texto={lista.length === 0 ? 'Cuando llegue una nueva orden de trabajo o se cumpla una regla, la verás aquí. Los eventos de manejo se consultan por separado.' : filtro === 'sin_leer' && sinLeer === 0 ? 'Ya revisaste las notificaciones de tu bandeja.' : 'Prueba otro filtro para ver los avisos disponibles.'} accion={filtro !== 'todas' && <button className="pnl-btn" onClick={() => setFiltro('todas')}>Ver todas</button>} /></Tarjeta>}
        </>}
        <p className="pa-nota fa-alcance">Los avisos se muestran según tu rol y la empresa autorizada. Leer o descartar un aviso no cierra una orden de trabajo.</p>
      </> : <>
        <div className="fa-eventos-cab"><p>Eventos registrados en los últimos {DIAS_EVENTOS} días.</p><Link to="/panel/seguridad" className="pnl-link">Ver Eventos y SOS<Icono nombre="flecha" tam={17} /></Link></div>
        {manejo.estado === 'cargando' && <Cargando filas={5} />}
        {manejo.estado === 'error' && <ErrorCarga error={manejo.error} texto="No se pudieron consultar los eventos de manejo." onReintentar={manejo.recargar} />}
        {manejo.datos !== null && <><Chips opciones={filtrosEvento} valor={tipoEvento} alCambiar={setTipoEvento} />
          {eventosFiltrados.length > 0 && <div className="fa-severidades" aria-label="Severidad de los eventos consultados">{['alta', 'media', 'baja'].map(s => <span key={s}><Tag color={color('alerta_severidad', s)}>{etiqueta('alerta_severidad', s)}</Tag><strong>{eventosFiltrados.filter(e => e.severidad === s).length}</strong></span>)}</div>}
          <Tarjeta titulo="Detalle de eventos" accion={<span className="pa-nota">{f.numero(eventosFiltrados.length)} registros</span>}>
          {eventosFiltrados.length ? <TablaEventos eventos={eventosFiltrados} /> : <Vacio icono="velocidad" titulo={tipoEvento ? 'Sin eventos de este tipo' : 'Sin eventos registrados'} texto={tipoEvento ? 'Consulta otros tipos o vuelve a mostrar todos.' : `No hay eventos registrados en los últimos ${DIAS_EVENTOS} días.`} accion={tipoEvento && <button className="pnl-btn" onClick={() => setTipoEvento('')}>Ver todos</button>} />}
        </Tarjeta></>}
      </>}
    </div>
  </div>
}

function TablaEventos({ eventos }) {
  return <div className="pnl-tabla-wrap"><table className="pnl-tabla fa-eventos-tabla"><thead><tr><th>Evento</th><th>Severidad</th><th>Unidad</th><th>Conductor</th><th className="num">Valor</th><th>Ubicación</th><th>Cuándo</th></tr></thead><tbody>{eventos.map(e => <tr key={e.id}><td>{e.nombre || 'Sin dato'}</td><td><Tag color={color('alerta_severidad', e.severidad)}>{etiqueta('alerta_severidad', e.severidad) || 'Sin dato'}</Tag></td><td>{e.vehiculo ? <Link to={`/panel/flota/${e.vehiculo.id}`} className="pnl-link">{e.vehiculo.alias || 'Ver unidad'}</Link> : 'Sin unidad'}</td><td>{e.conductorNombre || 'Sin dato'}</td><td className="num">{e.valor == null ? 'Sin dato' : e.clave === 'exceso_velocidad' ? f.velocidad(e.valor) : f.numero(e.valor)}</td><td>{e.ubicacion || 'Sin dato'}</td><td>{e.creadaEn ? f.fechaHora(e.creadaEn) : 'Sin fecha'}</td></tr>)}</tbody></table></div>
}

