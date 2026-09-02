import { useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import {
  Buscador, Cabecera, Cargando, ErrorCarga, Tag, Tarjeta, Vacio,
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
const vista = (tipo) => TIPOS[tipo] ?? { t: tipo, i: 'auditoria', c: 'gris' }

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

  const { datos, estado, error, recargar } = useDatos(() => cargar(tipo, empresaId, q), [tipo, empresaId, q])

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
          <Tarjeta
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
                  {Object.entries(TIPOS).map(([v, x]) => (
                    <option key={v} value={v}>{x.t}</option>
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
              <div className="pnl-filas">
                {datos.lista.map((a) => {
                  const v = vista(a.tipo)
                  return (
                    <div className="pnl-fila" key={a.id}>
                      <Icono nombre={v.i} tam={18} />
                      <div className="pnl-fila-txt">
                        <b>{a.objetivo}</b>
                        <span>
                          {a.detalle} · por {a.actorNombre} · {a.empresaNombre}
                        </span>
                      </div>
                      <div className="pnl-doble" style={{ textAlign: 'right' }}>
                        <Tag color={v.c} plano>{v.t}</Tag>
                        <span title={f.fechaHora(a.fecha)}>{f.desde(a.fecha)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Tarjeta>
        )}
      </div>
    </>
  )
}
