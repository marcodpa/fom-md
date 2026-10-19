import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import repo, { CONECTADO } from '../datos/repo'
import { useDatos } from '../useDatos'
import { Buscador, Campo, Cargando, ErrorCarga, Tag, Tarjeta, Vacio } from '../comp/ui'
import { Icono } from '../Iconos'
import * as f from '../datos/formato'
import { filtrarJornadas, perfilDeUsuario, principalDe } from '../datos/usuariosUnidad'
import './expediente-unidad.css'

function EnlacePerfil({ usuarioId, nombre, primario = false }) {
  const ruta = perfilDeUsuario(usuarioId)
  return ruta ? <Link to={ruta} className={`pnl-btn ${primario ? 'primario' : 'sutil'}`} aria-label={`Ver perfil de ${nombre}`}>Ver perfil</Link> : <span className="eu-nota">Perfil no disponible</span>
}

export default function UsuariosUnidad({ unidad: v, conductores, puedeEditar, elegido, elegir, asignando, asignar, error, guardado }) {
  const actuales = useDatos(() => repo.vehiculos.usuariosAsignados(v.id), [v.id], 60000)
  const [pagina, setPagina] = useState(0)
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const jornadas = useDatos(() => CONECTADO ? repo.jornadas.listar({ vehiculoId: v.id, estado, limite: 25, desplazamiento: pagina * 25 }) : Promise.resolve([]), [v.id, estado, pagina], 60000)
  const asignaciones = actuales.datos ?? []
  const principal = principalDe(asignaciones)
  const filas = useMemo(() => filtrarJornadas(jornadas.datos ?? [], q), [jornadas.datos, q])
  const total = jornadas.datos?.pagina?.total
  const haySiguiente = total != null ? (pagina + 1) * 25 < total : (jornadas.datos?.length ?? 0) === 25

  async function confirmar() {
    await asignar(elegido)
    await actuales.recargar()
    await jornadas.recargar()
  }

  return <div className="eu-usuarios">
    <div className={`eu-usuarios-grid${puedeEditar ? '' : ' solo-lectura'}`}>
      <Tarjeta titulo="Usuarios asignados" accion={<button type="button" className="pnl-btn sutil" onClick={actuales.recargar} aria-label="Actualizar usuarios asignados"><Icono nombre="sync" tam={16} />Actualizar</button>}>
        <p className="eu-intro">Personas que tienen una asignación vigente en esta unidad.</p>
        {actuales.estado === 'cargando' && <Cargando filas={2} />}
        {actuales.estado === 'error' && <ErrorCarga error={actuales.error} onReintentar={actuales.recargar} />}
        {actuales.estado === 'ok' && (!asignaciones.length ? <Vacio icono="gente" titulo="Sin usuarios asignados" texto="Esta unidad todavía no tiene un conductor asignado." /> : <div className="eu-asignados">
          {asignaciones.map(a => <article className={`eu-asignado${a.rol === 'principal' ? ' principal' : ''}`} key={a.asignacionId || a.id}>
            <i className="pnl-avatar">{f.iniciales(a.nombre)}</i>
            <div className="eu-persona"><h3>{a.nombre}</h3><p>{a.rol === 'principal' ? 'Conductor principal' : 'Conductor secundario'}</p>{a.desde && <span>Desde {f.fecha(a.desde)}</span>}</div>
            <Tag color="verde">Asignación vigente</Tag>
            <EnlacePerfil usuarioId={a.id} nombre={a.nombre} primario={a.rol === 'principal'} />
          </article>)}
          {!principal && <p className="eu-nota">Hay usuarios secundarios autorizados; falta asignar un conductor principal.</p>}
        </div>)}
      </Tarjeta>
      {puedeEditar && <Tarjeta titulo="Cambiar conductor principal" accion={guardado ? <span role="status"><Tag color="verde">{guardado}</Tag></span> : null}>
        <p className="eu-intro">Elige quién estará a cargo de esta unidad. Al confirmar se sustituye la asignación principal anterior.</p>
        {conductores.estado === 'error' ? <ErrorCarga error={conductores.error} onReintentar={conductores.recargar} /> : <Campo etiqueta="Conductor principal" error={error}>
          <select className="pnl-select" value={elegido ?? principal?.id ?? ''} disabled={asignando || actuales.estado !== 'ok' || conductores.estado !== 'ok'} onChange={e => elegir(e.target.value)}>
            <option value="">Sin conductor</option>
            {(conductores.datos ?? []).map(p => <option key={p.userId || p.id} value={p.userId || p.id}>{p.nombre}</option>)}
          </select>
        </Campo>}
        {elegido !== null && elegido !== (principal?.id ?? '') && <div className="eu-form-acciones">
          <button type="button" className="pnl-btn primario" disabled={asignando || actuales.estado !== 'ok'} onClick={confirmar}>{asignando ? 'Guardando…' : elegido ? 'Asignar conductor' : 'Quitar asignación'}</button>
          <button type="button" className="pnl-btn sutil" disabled={asignando} onClick={() => elegir(null)}>Cancelar</button>
        </div>}
        <p className="eu-nota">Los usuarios secundarios conservan su propia asignación.</p>
      </Tarjeta>}
    </div>
    <Tarjeta titulo="Historial de uso" sinCuerpo>
      <div className="pnl-card-cuerpo">
        <p className="eu-intro">Jornadas registradas de este vehículo: quién lo usó, cuándo y si sigue al volante. Una asignación vigente no significa que haya una jornada abierta.</p>
        {CONECTADO && <div className="eu-historial-filtros">
          <Buscador valor={q} alCambiar={setQ} placeholder="Buscar usuario en esta página…" />
          <select className="pnl-select" value={estado} aria-label="Filtrar estado de las jornadas" onChange={e => { setEstado(e.target.value); setPagina(0) }}><option value="">Todas las jornadas</option><option value="active">Activas</option><option value="ended">Finalizadas</option></select>
          <button type="button" className="pnl-btn sutil" onClick={jornadas.recargar}>Actualizar</button>
        </div>}
      </div>
      {!CONECTADO ? <Vacio icono="reloj" titulo="Historial disponible al conectar" texto="El modo demostración no contiene jornadas de conducción. Al conectar la API aparecerán aquí los registros de esta unidad." /> : <>
        {jornadas.estado === 'cargando' && <Cargando filas={4} />}
        {jornadas.estado === 'error' && <ErrorCarga error={jornadas.error} onReintentar={jornadas.recargar} />}
        {jornadas.estado === 'ok' && (!filas.length ? <Vacio icono="reloj" titulo={q || estado ? 'Sin resultados con estos filtros' : 'Sin jornadas registradas'} texto={q ? 'Prueba otro nombre en esta página o consulta las demás páginas.' : 'Cuando se registre una jornada de esta unidad, podrás consultar el usuario y su período de uso aquí.'} /> : <div className="pnl-tabla-wrap"><table className="pnl-tabla eu-tabla">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Perfil</th></tr></thead>
          <tbody>{filas.map(j => <tr key={j.id}>
            <td><div className="pnl-persona"><i className="pnl-avatar">{f.iniciales(j.conductor)}</i><b>{j.conductor}</b></div></td>
            <td>{j.rol === 'secundario' ? 'Secundario' : j.rol === 'principal' ? 'Principal' : 'Sin registrar'}</td>
            <td>{f.fechaHora(j.inicio)}</td><td>{j.fin ? f.fechaHora(j.fin) : j.estado === 'active' ? 'En curso' : 'Sin registrar'}</td>
            <td><Tag color={j.estado === 'active' ? 'verde' : 'gris'}>{j.estado === 'active' ? 'Jornada activa' : j.estado === 'ended' ? 'Finalizada' : j.estado || 'Sin registrar'}</Tag></td>
            <td><EnlacePerfil usuarioId={j.usuarioId} nombre={j.conductor} /></td>
          </tr>)}</tbody>
        </table></div>)}
        <div className="eu-paginacion"><span>{total != null ? `${total} jornadas · ` : ''}Página {pagina + 1}</span><button type="button" className="pnl-btn sutil" disabled={!pagina || jornadas.estado !== 'ok'} onClick={() => setPagina(p => p - 1)}>Anterior</button><button type="button" className="pnl-btn sutil" disabled={!haySiguiente || jornadas.estado !== 'ok'} onClick={() => setPagina(p => p + 1)}>Siguiente</button></div>
      </>}
    </Tarjeta>
  </div>
}
