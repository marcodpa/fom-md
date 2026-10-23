import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../comp/Avatar'
import { PastillaManejo } from '../comp/ManejoConductor'
import * as f from '../datos/formato'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { BuscadorFiltrosMovil } from './FlotaMovil'

// ============================================================
// USUARIOS EN EL TELÉFONO — la pestaña `panel/personal.tsx` de la app
// ------------------------------------------------------------
// La tira de cifras (personas, conduciendo, con faltas, con su barrita), el
// buscador con su hoja de filtros y UNA tarjeta con las personas separadas
// por una línea: foto, nombre (nunca cortado), su rol y si va conduciendo,
// la pastilla de manejo, el aviso rojo solo si le falta algo y la flecha.
// Tocar la fila abre su perfil. Sin menú «⋮»: la app no lo tiene.
//
// «Conduciendo» es la misma regla que «en marcha» en Vehículos: tiene la
// unidad asignada y esa unidad reporta en marcha. Tener unidad no es manejarla.
// ============================================================

/** Le falta algo: un documento ya vencido (los días los cuenta la base). */
const conFaltas = (p) => p.documentoDias != null && p.documentoDias < 0

const CADA_MEDIO_MINUTO = 30_000

/** Quiénes van manejando ahora: el conductor principal de cada unidad en marcha y con señal. */
function useConduciendo() {
  const { datos } = useDatos(() => repo.vehiculos.listar().catch(() => []), [], CADA_MEDIO_MINUTO)
  return useMemo(() => new Set((datos ?? [])
    .filter((v) => v.conductorPrincipalId && v.estadoMarcha === 'en_marcha' && v.conectado !== false)
    .map((v) => String(v.conductorPrincipalId))), [datos])
}

/** El círculo con el signo (insignia.tsx de la app): forma además de color. */
function Aviso() {
  return (
    <span className="mvs-insignia" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5" /><path d="M12 16.5v.01" />
      </svg>
    </span>
  )
}

export default function UsuariosMovil({ lista, q, setQ, rol, setRol, opcionesRol, aviso, manejoPorId, alExportar }) {
  const enMarcha = useConduciendo()
  const conduce = (p) => enMarcha.has(String(p.userId ?? p.id)) || enMarcha.has(String(p.id))
  const nConduciendo = lista.filter(conduce).length
  const nFaltas = lista.filter(conFaltas).length
  // TiraEstado de la app: el total sin tono; cada estado con su punto y la barrita de su parte.
  const cifras = [
    { n: lista.length, t: lista.length === 1 ? 'persona' : 'personas' },
    { n: nConduciendo, t: 'conduciendo', c: 'verde' },
    { n: nFaltas, t: 'con faltas', c: 'rojo' },
  ]
  return (
    <div className="mvs-usuarios">
      <div className="mv-tira mvs-tira-tres" aria-label="Resumen del personal">
        {cifras.map((x) => {
          // Un cero no es un estado: va en gris, como en la app.
          const tono = x.c && x.n > 0 ? x.c : ''
          return (
            <div key={x.t}>
              <span className="mv-tira-num">{x.c && <i className={tono} />}<b className={tono}>{f.numero(x.n)}</b></span>
              <span>{x.t}</span>
              {x.c && lista.length > 0
                ? <span className="mv-tira-pista"><i className={tono} style={{ width: `${Math.min(100, (x.n / lista.length) * 100)}%` }} /></span>
                : <span className="mv-tira-pista vacia" />}
            </div>
          )
        })}
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
            const va = conduce(p)
            const estado = va ? 'Conduciendo' : 'Detenido'
            return (
              <li key={p.id}>
                <Link to={`/panel/personal/${encodeURIComponent(id)}`} className="mvs-persona"
                  aria-label={`${p.nombre}, ${p.rolEtiqueta}, ${estado.toLowerCase()}${falta ? ', le falta documentación' : ''}`}>
                  <Avatar userId={id} iniciales={f.iniciales(p.nombre)} nombre={p.nombre} clase="mvs-avatar" tam={88} />
                  <span className="mvs-persona-txt">
                    <b>{p.nombre}</b>
                    <small>
                      <span>{p.rolEtiqueta}</span>
                      <span aria-hidden="true">·</span>
                      <i className={va ? 'con' : ''} aria-hidden="true" />
                      <span className={`encoge${va ? ' con' : ''}`}>{estado}</span>
                    </small>
                  </span>
                  {p.conduce && manejoPorId.has(id) && <PastillaManejo score={manejoPorId.get(id)} />}
                  {falta && <Aviso />}
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
