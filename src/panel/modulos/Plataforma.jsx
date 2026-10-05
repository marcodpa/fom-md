import { useState } from 'react'
import repo, { DIRECTORIO_REAL } from '../datos/repo'
import { useSesion } from '../useSesion'
import { ModalCrear, ModalCambiarRol } from './AdminUsuarios'
import { useDatos } from '../useDatos'
import { Buscador, Cabecera, Cargando, ErrorCarga, Kpi, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { etiquetaRolSesion, rolCanonico } from '../roles'
import { Icono } from '../Iconos'

// ============================================================
// TODA LA PLATAFORMA (solo Administrador FOM)
// ------------------------------------------------------------
// Las personas de TODOS los empresas en una sola búsqueda: nombre, correo,
// empresa o código. Una fila por membresía, así que quien pertenece a dos
// empresas sale dos veces, y eso es correcto: son dos accesos distintos.
// El administrador gestiona aquí cada membresía con su empresa explícita.
// ============================================================

const POR_PAGINA = 50
const COLOR_ROL = { admin_fom: 'rojo', supervisor: 'azul', operator: 'ambar', conductor: 'verde', usuario: 'gris' }
const COLOR_ESTADO = { active: 'verde', suspended: 'ambar', invited: 'azul', disabled: 'gris' }
const ESTADO = { active: 'Activa', suspended: 'Suspendida', invited: 'Invitada', disabled: 'Inactiva', revoked: 'Revocada' }

export default function Plataforma() {
  const sesion = useSesion()
  const [creando, setCreando] = useState(false)
  const [editandoRol, setEditandoRol] = useState(null)
  const [empresaId, setEmpresaId] = useState('')
  const empresas = useDatos(() => repo.admin.empresas.listar({}), [])
  const [q, setQ] = useState('')
  const [desde, setDesde] = useState(0)
  const empresa = (empresas.datos ?? []).find(e => e.id === empresaId)
  const personas = useDatos(() => repo.admin.plataforma.personas({ q, limite: POR_PAGINA, desde, empresa }), [q, desde, empresa])
  const total = personas.datos?.pagina?.total ?? null
  const paginas = total == null ? 1 : Math.max(1, Math.ceil(total / POR_PAGINA))
  const actual = Math.floor(desde / POR_PAGINA) + 1

  return (
    <>
      <Cabecera titulo="Toda la plataforma" bajada="Administración global. Consulta las empresas y gestiona los roles de su gente.">
        <button type="button" onClick={() => setCreando(true)} className="pnl-btn primario"><Icono nombre="mas" tam={16} />Nuevo usuario</button>
      </Cabecera>
      <div className="pnl-cuerpo">
        <div className="pnl-grid k3">
          <Kpi titulo="Membresías" valor={total == null ? '—' : f.numero(total)} icono="gente" nota="Una por persona y empresa" />
          <Kpi titulo="Empresas" valor="Ver" icono="empresa" nota="Crear, suspender y colgar contratistas" a="/panel/admin/empresas" />
          <Kpi titulo="Transferencias" valor="Ver" icono="comparar" nota="Mover gente y unidades entre empresas" a="/panel/admin/transferencias" />
        </div>

        <label className="pnl-campo">Empresa
          <select className="pnl-input" aria-label="Empresa" value={empresaId} onChange={e => { setEmpresaId(e.target.value); setDesde(0); setEditandoRol(null) }}>
            <option value="">Todas las empresas</option>
            {(empresas.datos ?? []).map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </label>
        {empresas.estado === 'error' && <ErrorCarga error={empresas.error} onReintentar={empresas.recargar} />}

        <Tarjeta
          titulo={total == null ? 'Personas' : `${f.numero(total)} personas`}
          accion={<Buscador valor={q} alCambiar={(v) => { setQ(v); setDesde(0) }} placeholder="Nombre, correo, empresa o código…" />}
          sinCuerpo
        >
          {personas.estado === 'cargando' && <Cargando filas={8} />}
          {personas.estado === 'error' && <ErrorCarga onReintentar={personas.recargar} error={personas.error} />}
          {personas.estado === 'ok' && (personas.datos.length === 0 ? (
            <div className="pnl-card-cuerpo">
              <Vacio icono="buscar" titulo="Nadie coincide" texto="Prueba con parte del nombre, el correo o el código del empresa." />
            </div>
          ) : (
            <>
              <div className="pnl-tabla-wrap"><table className="pnl-tabla"><thead><tr><th>Persona</th><th>Empresa</th><th>Rol</th><th>Estado</th><th>Código</th><th aria-label="Acciones" /></tr></thead><tbody>
                {personas.datos.map(p => <tr key={p.id}>
                  <td><div className="pnl-persona"><i className="pnl-avatar">{f.iniciales(p.nombre)}</i><div className="pnl-doble"><b>{p.nombre}</b><span>{p.email}</span></div></div></td>
                  <td>{rolCanonico(p.rol) === 'admin_fom' ? 'Acceso global · FOM' : p.empresaNombre}</td>
                  <td><Tag color={COLOR_ROL[rolCanonico(p.rol)] ?? 'gris'}>{etiquetaRolSesion(rolCanonico(p.rol))}</Tag></td>
                  <td><Tag color={COLOR_ESTADO[p.estado] ?? 'gris'}>{ESTADO[p.estado] ?? p.estado}</Tag></td>
                  <td>{rolCanonico(p.rol) === 'admin_fom' ? '—' : p.empresaCodigo}</td>
                  <td>{rolCanonico(sesion?.perfil?.rol) === 'admin_fom' && rolCanonico(p.rol) !== 'admin_fom' && p.email !== sesion?.perfil?.correo && p.estado !== 'revoked' && (
                    <button type="button" className="pnl-btn" onClick={() => setEditandoRol(p)}>Cambiar rol</button>
                  )}</td>
                </tr>)}
              </tbody></table></div>
              {paginas > 1 && (
                <div className="pnl-card-cuerpo" style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 'var(--e-t-xs)', color: 'var(--e-texto-2)' }}>Página {actual} de {paginas}</span>
                  <button type="button" className="pnl-btn sutil" disabled={desde === 0} onClick={() => setDesde(Math.max(0, desde - POR_PAGINA))}>Anterior</button>
                  <button type="button" className="pnl-btn sutil" disabled={actual >= paginas} onClick={() => setDesde(desde + POR_PAGINA)}>Siguiente</button>
                </div>
              )}
            </>
          ))}
        </Tarjeta>
      </div>
      {creando && <ModalCrear abierto global empresaInicial={empresaId} empresas={empresas.datos ?? []} actor={sesion?.perfil} directorioReal={DIRECTORIO_REAL} alCerrar={() => setCreando(false)} alGuardar={personas.recargar} />}
      {editandoRol && <ModalCambiarRol key={editandoRol.id} persona={editandoRol} alCerrar={() => setEditandoRol(null)} alGuardar={personas.recargar} />}
    </>
  )
}
