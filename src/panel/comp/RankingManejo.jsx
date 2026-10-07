import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Tarjeta, Tag } from './ui'
import * as f from '../datos/formato'

// Ranking de manejo de los conductores de la empresa (política driving-v1 del servidor): del mejor al peor.
// Si el servidor no entrega nada (o aún no hay recorridos), la tarjeta no aparece.
const COLOR = { green: 'verde', yellow: 'ambar', red: 'rojo', unavailable: 'gris' }
const TEXTO = { green: 'Seguro', yellow: 'Puede mejorar', red: 'Atención', unavailable: 'Sin km' }

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
                <td><Tag color={COLOR[c.rating] ?? 'gris'}>{c.indice != null ? `${c.indice} · ${TEXTO[c.rating]}` : TEXTO.unavailable}</Tag></td>
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
