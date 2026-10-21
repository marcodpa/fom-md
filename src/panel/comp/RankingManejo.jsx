import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Tarjeta } from './ui'
import { PastillaManejo } from './ManejoConductor'
import * as f from '../datos/formato'

// Ranking de manejo de los conductores de la empresa (política driving-v1 del servidor): del mejor al peor.
// Si el servidor no entrega nada (o aún no hay recorridos), la tarjeta no aparece.
// La pastilla (tono y texto) es la misma de la ficha de la persona, Mi perfil y Usuarios: datos/manejo.js.

export default function RankingManejo({ dias = 7 }) {
  const { datos, estado } = useDatos(() => repo.manejo.ranking({ dias }).catch(() => []), [dias])
  const lista = datos ?? []
  if (estado !== 'ok' || lista.length === 0) return null
  return (
    <Tarjeta titulo={`Manejo de los conductores · últimos ${dias} días`} sinCuerpo>
      <div className="pnl-tabla-wrap">
        <table className="pnl-tabla">
          <thead><tr><th>Conductor</th><th>Score</th><th className="num">Por 100 km</th><th className="num">Frenadas</th><th className="num">Aceleraciones</th><th className="num">Excesos</th><th className="num">Km</th></tr></thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td><PastillaManejo score={c} /></td>
                <td className="num">{c.eventosPor100 != null ? f.numero(c.eventosPor100) : '—'}</td>
                <td className="num">{c.frenadas}</td>
                <td className="num">{c.aceleraciones}</td>
                <td className="num">{c.excesos}</td>
                <td className="num">{f.numero(Math.round(c.km))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  )
}
