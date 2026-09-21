import { useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Buscador, Cabecera, Cargando, ErrorCarga, Kpi, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { etiquetaRolSesion, rolCanonico } from '../roles'
import { Icono } from '../Iconos'

// ============================================================
// TODA LA PLATAFORMA (solo Administrador FOM)
// ------------------------------------------------------------
// Las personas de TODOS los entes en una sola búsqueda: nombre, correo,
// empresa o código. Una fila por membresía, así que quien pertenece a dos
// entes sale dos veces, y eso es correcto: son dos accesos distintos.
// Se administra desde «Gente» del ente correspondiente; aquí se encuentra.
// ============================================================

const POR_PAGINA = 50
const COLOR_ROL = { admin_fom: 'rojo', supervisor: 'azul', operator: 'ambar', conductor: 'verde', usuario: 'gris' }
const COLOR_ESTADO = { active: 'verde', suspended: 'ambar', invited: 'azul', disabled: 'gris' }
const ESTADO = { active: 'Activa', suspended: 'Suspendida', invited: 'Invitada', disabled: 'Inactiva' }

export default function Plataforma() {
  const [q, setQ] = useState('')
  const [desde, setDesde] = useState(0)
  const personas = useDatos(() => repo.admin.plataforma.personas({ q, limite: POR_PAGINA, desde }), [q, desde])
  const total = personas.datos?.pagina?.total ?? null
  const paginas = total == null ? 1 : Math.max(1, Math.ceil(total / POR_PAGINA))
  const actual = Math.floor(desde / POR_PAGINA) + 1

  return (
    <>
      <Cabecera titulo="Toda la plataforma" bajada="Cada persona de cada ente, en una sola búsqueda." />
      <div className="pnl-cuerpo">
        <div className="pnl-grid k3">
          <Kpi titulo="Membresías" valor={total == null ? '—' : f.numero(total)} icono="gente" nota="Una por persona y ente" />
          <Kpi titulo="Entes" valor="Ver" icono="empresa" nota="Crear, suspender y colgar contratistas" a="/panel/admin/empresas" />
          <Kpi titulo="Transferencias" valor="Ver" icono="comparar" nota="Mover gente y unidades entre entes" a="/panel/admin/transferencias" />
        </div>

        <Tarjeta
          titulo={total == null ? 'Personas' : `${f.numero(total)} personas`}
          accion={<Buscador valor={q} alCambiar={(v) => { setQ(v); setDesde(0) }} placeholder="Nombre, correo, empresa o código…" />}
          sinCuerpo
        >
          {personas.estado === 'cargando' && <Cargando filas={8} />}
          {personas.estado === 'error' && <ErrorCarga onReintentar={personas.recargar} error={personas.error} />}
          {personas.estado === 'ok' && (personas.datos.length === 0 ? (
            <div className="pnl-card-cuerpo">
              <Vacio icono="buscar" titulo="Nadie coincide" texto="Prueba con parte del nombre, el correo o el código del ente." />
            </div>
          ) : (
            <>
              <div className="pnl-tabla-wrap"><table className="pnl-tabla"><thead><tr><th>Persona</th><th>Ente</th><th>Rol</th><th>Estado</th><th>Código</th><th aria-label="Acciones" /></tr></thead><tbody>
                {personas.datos.map(p => <tr key={p.id}>
                  <td><div className="pnl-persona"><i className="pnl-avatar">{f.iniciales(p.nombre)}</i><div className="pnl-doble"><b>{p.nombre}</b><span>{p.email}</span></div></div></td>
                  <td>{p.empresaNombre}</td>
                  <td><Tag color={COLOR_ROL[rolCanonico(p.rol)] ?? 'gris'}>{etiquetaRolSesion(rolCanonico(p.rol))}</Tag></td>
                  <td><Tag color={COLOR_ESTADO[p.estado] ?? 'gris'}>{ESTADO[p.estado] ?? p.estado}</Tag></td>
                  <td>{p.empresaCodigo}</td>
                  <td><Link to={`/panel/personal/${p.userId}`} className="pnl-btn sutil">Ver ficha</Link></td>
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
    </>
  )
}
