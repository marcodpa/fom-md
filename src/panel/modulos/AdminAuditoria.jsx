import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import {
  Buscador, Cargando, Datos, ErrorCarga, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'
import './mantenimiento.css'
import './admin-rediseno.css'

// ============================================================
// AUDITORÍA (solo Administrador FOM)
// La bitácora inmutable: cada acción de administración queda aquí con
// quién la hizo, sobre qué y cuándo. Solo lectura, pero se navega: desde un
// evento se salta a todo lo de esa persona, esa empresa o ese equipo.
// ============================================================

// Cada tipo de evento con su etiqueta, ícono y tono.
const TIPOS = {
  crear_empresa: { t: 'Empresa creada', i: 'empresa', c: 'verde' },
  editar_empresa: { t: 'Empresa editada', i: 'editar', c: 'azul' },
  eliminar_empresa: { t: 'Empresa eliminada', i: 'empresa', c: 'rojo' },
  servicio_empresa: { t: 'Servicio de la empresa', i: 'escudo', c: 'ambar' },
  crear_usuario: { t: 'Usuario creado', i: 'gente', c: 'verde' },
  editar_usuario: { t: 'Usuario editado', i: 'editar', c: 'azul' },
  mover_usuario: { t: 'Usuario movido', i: 'gente', c: 'azul' },
  eliminar_usuario: { t: 'Salida de empresa', i: 'gente', c: 'ambar' },
  eliminar_definitivo: { t: 'Eliminación definitiva', i: 'gente', c: 'rojo' },
  cambiar_clave: { t: 'Clave restablecida', i: 'escudo', c: 'azul' },
  crear_vehiculo: { t: 'Vehículo creado', i: 'camion', c: 'verde' },
  registrar_pago: { t: 'Pago registrado', i: 'costos', c: 'verde' },
  actualizar_pago: { t: 'Pago actualizado', i: 'costos', c: 'azul' },
  registrar_gps: { t: 'GPS registrado', i: 'pin', c: 'verde' },
  verificar_gps: { t: 'GPS verificado', i: 'pin', c: 'verde' },
  asociar_gps: { t: 'GPS asociado', i: 'pin', c: 'azul' },
  probar_panico: { t: 'Pánico probado', i: 'alerta', c: 'ambar' },
}
// Acciones reales del servidor («work_order.created», «driver_assignment.revoked»…)
const ACCION = {
  created: ['creado', 'verde'], transitioned: ['cambió de estado', 'azul'], updated: ['editado', 'azul'],
  revoked: ['revocado', 'ambar'], assigned: ['asignado', 'azul'], read: ['leído', 'gris'],
  reset: ['reiniciado', 'azul'], replaced: ['reemplazado', 'azul'], self_update: ['actualizado por la persona', 'gris'],
  archived: ['archivado', 'ambar'], installed: ['instalado', 'verde'], removed: ['desmontado', 'ambar'],
}
const ENTIDAD = {
  work_order: 'Orden de trabajo', vehicle_driver_assignment: 'Asignación de conductor', user_credential: 'Clave',
  user_profile: 'Perfil', notification: 'Aviso', vehicle: 'Vehículo', tenant: 'Empresa', user: 'Persona',
  membership: 'Membresía', document: 'Documento', gps_device: 'Equipo GPS', alert_rule: 'Regla',
}
const vista = (tipo) => {
  if (TIPOS[tipo]) return TIPOS[tipo]
  const [ent, acc] = String(tipo).split('.')
  const [t, c] = ACCION[acc] ?? [acc ?? tipo, 'gris']
  return { t: `${ENTIDAD[ent] ?? ent} ${t}`, i: 'auditoria', c }
}

// Los eventos se agrupan en categorías para filtrarlos de un clic.
const CATEGORIAS = [
  { clave: 'empresas', titulo: 'Empresas', color: 'verde', coincide: /empresa|tenant/ },
  { clave: 'usuarios', titulo: 'Usuarios', color: '', coincide: /usuario|user|membership|credential|clave|profile/ },
  { clave: 'vehiculos', titulo: 'Vehículos', color: '', coincide: /vehic/ },
  { clave: 'gps', titulo: 'GPS', color: '', coincide: /gps|panico/ },
  { clave: 'facturacion', titulo: 'Facturación', color: 'ambar', coincide: /pago/ },
  { clave: 'ordenes', titulo: 'Órdenes', color: '', coincide: /work_order|orden/ },
]
const categoriaDe = (tipo) => CATEGORIAS.find((c) => c.coincide.test(String(tipo).toLowerCase()))?.clave ?? 'otros'

function cargar(empresaId, q) {
  return Promise.all([
    repo.admin.auditoria.listar({ empresaId, q }),
    repo.admin.empresas.listar({}),
  ]).then(([lista, empresas]) => ({ lista, empresas }))
}

export default function AdminAuditoria() {
  const [categoria, setCategoria] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [q, setQ] = useState('')
  const [seleccionId, setSeleccionId] = useState(null)

  const { datos, estado, error, recargar } = useDatos(() => cargar(empresaId, q), [empresaId, q])

  const todos = useMemo(() => datos?.lista ?? [], [datos])
  const visibles = useMemo(
    () => (categoria ? todos.filter((a) => categoriaDe(a.tipo) === categoria) : todos),
    [todos, categoria],
  )
  const seleccion = visibles.find((a) => a.id === seleccionId) ?? visibles[0] ?? null

  // Agrupados por día, del más reciente al más antiguo.
  const dias = useMemo(() => {
    const grupos = new Map()
    for (const a of visibles) {
      const dia = f.fechaCorta(a.fecha)
      grupos.set(dia, [...(grupos.get(dia) ?? []), a])
    }
    return [...grupos.entries()]
  }, [visibles])

  const hoy = f.fechaCorta(new Date().toISOString())
  const resumen = [
    ['Eventos', todos.length, 'Con el filtro actual', 'auditoria'],
    ['Hoy', todos.filter((a) => f.fechaCorta(a.fecha) === hoy).length, 'Acciones del día', 'reloj'],
    ['Personas', new Set(todos.map((a) => a.actorNombre)).size, 'Que hicieron cambios', 'gente'],
    ['Empresas', new Set(todos.map((a) => a.empresaNombre).filter(Boolean)).size, 'Con actividad', 'empresa'],
  ]

  const hayFiltro = Boolean(categoria || empresaId || q)
  const limpiar = () => { setCategoria(''); setEmpresaId(''); setQ('') }
  const empresaDe = (nombre) => datos?.empresas.find((e) => e.nombre === nombre)
  const imeiDe = (a) => String(a.objetivo ?? '').match(/\d{15}/)?.[0]

  return (
    <div className="mnt-root">
      <div className="mnt-heading">
        <div>
          <span className="mnt-breadcrumb">Inicio › Administración › Auditoría</span>
          <h1>Auditoría</h1>
          <p>Cada acción de administración queda aquí: quién, qué y cuándo. No se puede borrar.</p>
        </div>
      </div>

      <div className="mnt-content" style={{ marginTop: 24 }}>
        {estado === 'cargando' && <Cargando filas={8} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} error={error} />}
        {estado === 'ok' && (
          <>
            <div className="mnt-summary">
              {resumen.map(([t, v, d, i]) => (
                <div key={t}><Icono nombre={i} tam={28} /><span>{t}</span><b>{v}</b><small>{d}</small></div>
              ))}
            </div>

            <div className="mnt-filters">
              <Buscador valor={q} alCambiar={setQ} placeholder="Buscar por persona, objetivo o detalle…" />
              <select className="pnl-input" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} aria-label="Filtrar por empresa">
                <option value="">Todas las empresas</option>
                {datos.empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              {hayFiltro && <button type="button" className="pnl-btn sutil" onClick={limpiar}>Quitar filtros</button>}
            </div>
            <div className="mnt-states" aria-label="Filtrar por tipo de acción">
              <button type="button" aria-pressed={!categoria} onClick={() => setCategoria('')}>Todo <b>{todos.length}</b></button>
              {CATEGORIAS.map((c) => {
                const n = todos.filter((a) => categoriaDe(a.tipo) === c.clave).length
                return n === 0 ? null : (
                  <button type="button" key={c.clave} aria-pressed={categoria === c.clave} onClick={() => setCategoria(categoria === c.clave ? '' : c.clave)}>
                    <i className={c.color} />{c.titulo}<b>{n}</b>
                  </button>
                )
              })}
            </div>

            <div className="adm-layout">
              <Tarjeta titulo={`${visibles.length} eventos`} sinCuerpo>
                {visibles.length === 0 ? (
                  <div className="pnl-card-cuerpo"><Vacio icono="auditoria" titulo="Sin eventos" texto="Ninguna acción coincide con el filtro." /></div>
                ) : dias.map(([dia, eventos]) => (
                  <div key={dia}>
                    <div className="adm-dia">{dia === hoy ? `Hoy · ${dia}` : dia}</div>
                    <div className="mnt-orders">
                      {eventos.map((a) => {
                        const v = vista(a.tipo)
                        return (
                          <article key={a.id} className={`mnt-order adm-item${seleccion?.id === a.id ? ' sel' : ''}`} onClick={() => setSeleccionId(a.id)}>
                            <div className="mnt-thumb"><Icono nombre={v.i} tam={26} /></div>
                            <div className="mnt-order-copy">
                              <span>{a.actorNombre}{a.empresaNombre ? ` · ${a.empresaNombre}` : ''}</span>
                              <h3>{a.objetivo}</h3>
                              <div><Tag color={v.c}>{v.t}</Tag></div>
                            </div>
                            <span className="adm-hora">{f.hora(a.fecha)}</span>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </Tarjeta>

              <aside className="adm-panel">
                {seleccion ? (
                  <div className="adm-detalle">
                    <div className="adm-cab">
                      <div className="mnt-thumb"><Icono nombre={vista(seleccion.tipo).i} tam={30} /></div>
                      <div><h3>{vista(seleccion.tipo).t}</h3><Tag color={vista(seleccion.tipo).c}>Registrado</Tag></div>
                    </div>
                    <Datos items={[
                      { etiqueta: 'Fecha y hora', valor: f.fechaHora(seleccion.fecha) },
                      { etiqueta: 'Quién', valor: seleccion.actorNombre },
                      { etiqueta: 'Sobre qué', valor: seleccion.objetivo },
                      { etiqueta: 'Empresa', valor: seleccion.empresaNombre || '—' },
                    ]} />
                    <div className="adm-sigue">
                      <b>Qué se hizo</b>
                      <p>{seleccion.detalle || 'Sin detalle adicional.'}</p>
                    </div>
                    <div className="adm-acciones" role="group" aria-label="Seguir este evento">
                      {seleccion.actorNombre && seleccion.actorNombre !== '—' && (
                        <button type="button" className="pnl-btn" onClick={() => setQ(seleccion.actorNombre)}>
                          <Icono nombre="gente" tam={16} />Todo lo de {seleccion.actorNombre} →
                        </button>
                      )}
                      {empresaDe(seleccion.empresaNombre) && (
                        <button type="button" className="pnl-btn" onClick={() => setEmpresaId(empresaDe(seleccion.empresaNombre).id)}>
                          <Icono nombre="empresa" tam={16} />Todo lo de {seleccion.empresaNombre} →
                        </button>
                      )}
                      {imeiDe(seleccion) && (
                        <Link className="pnl-btn" to={`/panel/admin/gps?q=${imeiDe(seleccion)}`}>
                          <Icono nombre="pin" tam={16} />Ver el equipo GPS →
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <Vacio icono="auditoria" titulo="Elige un evento" texto="Aquí verás el detalle y podrás seguir a la persona o a la empresa." />
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
