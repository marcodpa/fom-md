import { useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import {
  Buscador, Cabecera, Cargando, Datos, ErrorCarga, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'

// ============================================================
// AUDITORÍA (solo Administrador FOM)
// La bitácora inmutable: cada acción de administración queda aquí con
// quién la hizo, sobre qué y cuándo. Solo lectura.
// ============================================================

// Cada tipo de evento con su etiqueta, ícono y tono.
const TIPOS = {
  crear_empresa: { t: 'Empresa creada', i: 'empresa', c: 'verde' },
  editar_empresa: { t: 'Empresa editada', i: 'editar', c: 'azul' },
  eliminar_empresa: { t: 'Empresa eliminada', i: 'empresa', c: 'rojo' },
  servicio_empresa: { t: 'Servicio del ente', i: 'escudo', c: 'ambar' },
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
  user_profile: 'Perfil', notification: 'Aviso', vehicle: 'Vehículo', tenant: 'Ente', user: 'Persona',
  membership: 'Membresía', document: 'Documento', gps_device: 'Equipo GPS', alert_rule: 'Regla',
}
const vista = (tipo) => {
  if (TIPOS[tipo]) return TIPOS[tipo]
  const [ent, acc] = String(tipo).split('.')
  const [t, c] = ACCION[acc] ?? [acc ?? tipo, 'gris']
  return { t: `${ENTIDAD[ent] ?? ent} ${t}`, i: 'auditoria', c }
}

function cargar(tipo, empresaId, q) {
  return Promise.all([
    repo.admin.auditoria.listar({ tipo, empresaId, q }),
    repo.admin.empresas.listar({}),
  ]).then(([lista, empresas]) => ({ lista, empresas }))
}

export default function AdminAuditoria() {
  const [tipo, setTipo] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [q, setQ] = useState('')
  const [seleccionId, setSeleccionId] = useState(null)

  const { datos, estado, error, recargar } = useDatos(() => cargar(tipo, empresaId, q), [tipo, empresaId, q])

  const seleccion = datos?.lista.find(a => a.id === seleccionId) ?? datos?.lista[0]

  return (
    <>
      <Cabecera
        titulo="Auditoría"
        bajada="Registro inmutable de cada acción de administración: quién, qué y cuándo."
      />

      <div className="pnl-cuerpo">
        {estado === 'cargando' && <Cargando filas={8} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} error={error} />}
        {estado === 'ok' && (
          <div className="pnl-admin-dividido"><Tarjeta
            titulo={`${datos.lista.length} eventos`}
            accion={<Buscador valor={q} alCambiar={setQ} placeholder="Buscar por persona, objetivo o detalle…" />}
            sinCuerpo
          >
            <div className="pnl-card-cuerpo">
              <div className="pnl-chips">
                <select
                  className="pnl-input"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  aria-label="Filtrar por tipo de evento"
                >
                  <option value="">Todos los eventos</option>
                  {(datos.lista.tipos ?? []).map((v) => (
                    <option key={v} value={v}>{vista(v).t}</option>
                  ))}
                </select>
                <select
                  className="pnl-input"
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  aria-label="Filtrar por empresa"
                >
                  <option value="">Todas las empresas</option>
                  {datos.empresas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {datos.lista.length === 0 ? (
              <div className="pnl-card-cuerpo">
                <Vacio icono="auditoria" titulo="Sin eventos" texto="Ninguna acción coincide con el filtro." />
              </div>
            ) : (
              <div className="pnl-tabla-wrap"><table className="pnl-tabla"><thead><tr><th>Fecha y hora</th><th>Actor</th><th>Acción</th><th>Recurso</th><th>Empresa</th></tr></thead><tbody>
                {datos.lista.map(a => <tr key={a.id} className={seleccion?.id === a.id ? 'seleccionada' : ''}>
                  <td><button className="pnl-table-action" onClick={()=>setSeleccionId(a.id)} aria-pressed={seleccion?.id === a.id}>{f.fechaHora(a.fecha)}</button></td>
                  <td>{a.actorNombre}</td><td><Tag color={vista(a.tipo).c}>{vista(a.tipo).t}</Tag></td><td>{a.objetivo}</td><td>{a.empresaNombre || '—'}</td>
                </tr>)}
              </tbody></table></div>
            )}
          </Tarjeta><aside className="pnl-admin-detalle"><Tarjeta titulo="Detalle del evento">
            {seleccion ? <><h3>{vista(seleccion.tipo).t}</h3><Tag color={vista(seleccion.tipo).c}>Registrado</Tag><Datos items={[{etiqueta:'Fecha y hora',valor:f.fechaHora(seleccion.fecha)},{etiqueta:'Actor',valor:seleccion.actorNombre},{etiqueta:'Recurso',valor:seleccion.objetivo},{etiqueta:'Empresa',valor:seleccion.empresaNombre || '—'}]} /><p className="pnl-audit-detalle">{seleccion.detalle || 'Sin detalle adicional.'}</p></> : <Vacio icono="auditoria" titulo="Sin evento seleccionado" texto="Selecciona una fecha para consultar su detalle." />}
          </Tarjeta></aside></div>
        )}
      </div>
    </>
  )
}
