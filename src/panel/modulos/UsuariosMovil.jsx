import { Link } from 'react-router-dom'
import Avatar from '../comp/Avatar'
import { PastillaManejo } from '../comp/ManejoConductor'
import * as f from '../datos/formato'
import { BuscadorFiltrosMovil } from './FlotaMovil'

// ============================================================
// USUARIOS EN EL TELÉFONO — la pestaña `panel/personal.tsx` de la app
// ------------------------------------------------------------
// La tira de cifras, el buscador con su hoja de filtros y UNA tarjeta con las
// personas separadas por una línea: foto, nombre (nunca cortado), su rol y su
// unidad, la pastilla de manejo y, solo si le falta algo, el aviso rojo.
// Tocar la fila abre su perfil.
//
// La app dice «Conduciendo / Detenido» con la posición en vivo; esta lista de
// la web no la trae, así que dice la unidad que tiene asignada.
// ============================================================

/** Le falta algo: un documento ya vencido (los días los cuenta la base). */
const conFaltas = (p) => p.documentoDias != null && p.documentoDias < 0

export default function UsuariosMovil({ lista, q, setQ, rol, setRol, opcionesRol, aviso, manejoPorId, accionesDe, alExportar }) {
  const nConductores = lista.filter((p) => p.conduce).length
  const nFaltas = lista.filter(conFaltas).length
  const cifras = [
    { n: lista.length, t: lista.length === 1 ? 'persona' : 'personas' },
    { n: nConductores, t: nConductores === 1 ? 'conductor' : 'conductores', tono: nConductores ? 'exito' : '' },
    { n: nFaltas, t: 'con faltas', tono: nFaltas ? 'peligro' : '' },
  ]
  return (
    <div className="mvs-usuarios">
      <div className="mvs-tira-centrada" aria-label="Resumen del personal">
        {cifras.map((c) => <div key={c.t}><b className={c.tono}>{f.numero(c.n)}</b><small>{c.t}</small></div>)}
      </div>

      <BuscadorFiltrosMovil q={q} alBuscar={setQ} placeholder="Buscar por nombre o rol…" titulo="Filtrar personas"
        grupos={[{ titulo: 'Rol', opciones: opcionesRol, valor: rol, alCambiar: setRol, base: '' }]}
        acciones={<button type="button" className="pnl-btn" onClick={alExportar} disabled={!lista.length}>Exportar lista</button>} />

      {aviso && <p className="pnl-campo-error" role="alert">{aviso}</p>}

      {lista.length === 0 ? (
        <p className="mvs-vacio">{q.trim() || rol ? 'Sin resultados' : 'Sin usuarios'}</p>
      ) : (
        <ul className="mvs-personas">
          {lista.map((p) => {
            const id = p.userId ?? p.id
            const falta = conFaltas(p)
            // Solo el nombre de la unidad (la placa ya está en su ficha): con la pastilla al lado no cabe más.
            const unidad = p.unidadNombre && p.unidadNombre !== 'Sin unidad' ? p.unidadNombre.split(' · ')[0] : null
            const acciones = accionesDe(p)
            return (
              <li key={p.id}>
                <Link to={`/panel/personal/${encodeURIComponent(id)}`} className="mvs-persona"
                  aria-label={`${p.nombre}, ${p.rolEtiqueta}${unidad ? `, ${unidad}` : ''}${falta ? ', le falta documentación' : ''}`}>
                  <Avatar userId={id} iniciales={f.iniciales(p.nombre)} nombre={p.nombre} clase="mvs-avatar" tam={88} />
                  <span className="mvs-persona-txt">
                    <b>{p.nombre}</b>
                    <small>
                      <span>{p.rolEtiqueta}</span>
                      <span aria-hidden="true">·</span>
                      <i className={unidad ? 'con' : ''} aria-hidden="true" />
                      <span className="encoge">{unidad ?? 'Sin unidad'}</span>
                    </small>
                  </span>
                  {p.conduce && manejoPorId.has(id) && <PastillaManejo score={manejoPorId.get(id)} />}
                  {falta && <span className="mvs-insignia" aria-hidden="true">!</span>}
                  {!acciones && (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                  )}
                </Link>
                {/* Clave, suspender, dar salida…: la app las tiene en el perfil; aquí, a un lado de la fila. */}
                {acciones && <span className="mvs-persona-acciones">{acciones}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
