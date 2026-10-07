import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Tarjeta, Cargando } from './ui'
import { Icono } from '../Iconos'
import * as f from '../datos/formato'
import './score-manejo.css'

// ============================================================
// SCORE DE MANEJO del conductor: su índice de 0 a 100, los eventos por cada
// 100 km y cuántas frenadas bruscas, aceleraciones bruscas y excesos de
// velocidad tuvo. Lo calcula y lo guarda el servidor; esta tarjeta solo lo
// muestra. Mientras el servidor no lo entregue, lo dice con claridad en vez de
// inventar un número.
// ============================================================

const DIAS = 7

const ETIQUETA = { verde: 'Manejo seguro', amarillo: 'Puedes mejorar', rojo: 'Requiere atención' }

export default function ScoreManejo({ titulo = 'Tu score de manejo' }) {
  const { datos: s, estado } = useDatos(() => repo.manejo.miScore({ dias: DIAS }), [])

  return (
    <Tarjeta titulo={titulo}>
      {estado === 'cargando' && <Cargando filas={2} />}
      {estado !== 'cargando' && !s && (
        <div className="sm-vacio">
          <Icono nombre="velocidad" tam={34} />
          <div>
            <b>Todavía no hay score para mostrar</b>
            <p>Se calcula con las frenadas bruscas, las aceleraciones bruscas y los excesos de velocidad de tus recorridos. Aparece cuando hay kilómetros recorridos en los últimos {DIAS} días.</p>
          </div>
        </div>
      )}
      {s && <Detalle s={s} />}
    </Tarjeta>
  )
}

function Detalle({ s }) {
  const rango = { green: 'verde', yellow: 'amarillo', red: 'rojo' }[s.rating] ?? f.rangoIndice(s.indice)
  const eventos = [
    ['Frenadas bruscas', s.frenadas, 'frenada'],
    ['Aceleraciones bruscas', s.aceleraciones, 'aceleracion'],
    ['Excesos de velocidad', s.excesos, 'exceso'],
  ]
  return (
    <div className="sm">
      <div className={`sm-indice ${rango}`} role="img" aria-label={`Índice ${s.indice} de 100: ${ETIQUETA[rango]}`}>
        <strong>{s.indice}</strong>
        <small>/100</small>
      </div>
      <div className="sm-cuerpo">
        <p className={`sm-estado ${rango}`}>{ETIQUETA[rango]}</p>
        <p className="sm-ayuda">
          {f.numero(s.eventosPor100)} eventos por cada 100 km · {f.numero(Math.round(s.km))} km en los últimos {s.dias} días
        </p>
        <ul className="sm-eventos">
          {eventos.map(([t, n, clave]) => (
            <li key={clave} className={n > 0 ? 'con' : ''}>
              <b>{n ?? '—'}</b>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
