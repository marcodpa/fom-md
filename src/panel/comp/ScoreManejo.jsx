import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DIAS_MANEJO, calificacionManejo, eventosManejo } from '../datos/manejo'
import * as f from '../datos/formato'
import './score-manejo.css'

// La tarjeta «Manejo» de siempre (índice grande, estado, barra y los tres eventos con su ícono),
// con el período 7 / 30 días y «Ver eventos». Calificación y textos: datos/manejo.js, los mismos
// de la pastilla del Resumen, Usuarios y la ficha del vehículo.
const RANGO = { green: 'verde', yellow: 'amarillo', red: 'rojo', unavailable: 'sin-dato' }
const ETIQUETA = { verde: 'Manejo seguro', amarillo: 'Puede mejorar', rojo: 'Requiere atención' }
const numeroDisponible = n => (typeof n === 'number' && Number.isFinite(n) ? f.numero(n) : '—')

function IconoEvento({ tipo }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {tipo === 'frenada' ? <><circle cx="12" cy="12" r="6" /><path d="M4 5a10 10 0 0 0 0 14M20 5a10 10 0 0 1 0 14M12 8v5m0 3h.01" /></>
      : tipo === 'aceleracion' ? <path d="M4 17 11 10l4 4 5-9M15 5h5v5M4 21h16" />
        : <><path d="M4 18a9 9 0 1 1 16 0M12 5v2M5 9l2 1M19 9l-2 1M12 14l4-5" /><circle cx="12" cy="14" r="2" /></>}
  </svg>
}

/** Solo presentación: los datos llegan de `ManejoConductor` y vienen del servidor. */
export function TarjetaManejo({
  titulo = 'Índice de manejo seguro', score, dias = 7, alCambiarDias, cargando = false,
  empresa, logoEmpresa, nota, error, enlaceEventos,
}) {
  const [logoFallido, setLogoFallido] = useState(null)
  const logo = logoEmpresa && logoFallido !== logoEmpresa ? logoEmpresa : null
  const rango = cargando ? 'sin-dato' : RANGO[calificacionManejo(score)]
  const indice = rango === 'sin-dato' ? null : score.indice
  const eventos = eventosManejo(score)
  const lista = [
    ['Frenadas bruscas', score?.frenadas, 'frenada'],
    ['Aceleraciones bruscas', score?.aceleraciones, 'aceleracion'],
    ['Excesos de velocidad', score?.excesos, 'velocidad'],
  ]
  const ayuda = cargando ? 'Consultando el período…'
    : indice === null ? error || 'Sin kilómetros recorridos en este período: el servidor no califica el manejo.'
      : nota || 'Frenadas, aceleraciones y excesos de velocidad de los recorridos.'
  return (
    <section className="pnl-card sm-card" aria-busy={cargando}>
      <div className={`sm-compacta ${rango}`}>
        {logo ? <img className="sm-marca-agua" src={logo} alt="" aria-hidden="true" onError={() => setLogoFallido(logo)} />
          : empresa && <span className="sm-marca-agua sm-marca-iniciales" aria-hidden="true">{f.iniciales(empresa)}</span>}
        <header className="sm-cabecera">
          <div><h2>{titulo}</h2>{empresa && <p className="sm-empresa">
            {logo && <img src={logo} alt="" onError={() => setLogoFallido(logo)} />}{empresa}
          </p>}</div>
          {alCambiarDias
            ? <div className="pnl-chips sm-dias" role="group" aria-label="Período del manejo">{DIAS_MANEJO.map((d) => (
              <button key={d} type="button" className={`pnl-chip${d === dias ? ' activo' : ''}`} aria-pressed={d === dias} onClick={() => alCambiarDias(d)}>{d} días</button>
            ))}</div>
            : <span className="sm-periodo">Últimos {dias} días</span>}
        </header>
        <div className="sm-protagonista">
          <div className="sm-indice" aria-label={indice === null ? 'Índice no disponible' : `Índice ${f.numero(indice)} de 100`}><strong>{indice === null ? '—' : f.numero(indice)}</strong><small>/100</small></div>
          <div><p className="sm-estado"><i aria-hidden="true" />{cargando ? '…' : indice === null ? 'Sin km' : ETIQUETA[rango]}</p>
            <p className="sm-ayuda">{ayuda}</p></div>
        </div>
        {indice !== null && <div className="sm-escala" aria-hidden="true"><span style={{ width: `${indice}%` }} /></div>}
        <ul className="sm-eventos">{lista.map(([texto, n, icono]) => <li key={texto}>
          <IconoEvento tipo={icono} /><b>{cargando ? '—' : numeroDisponible(n)}</b><span>{texto}</span>
        </li>)}</ul>
        <footer className="sm-pie"><span><b>{!cargando && Number.isFinite(score?.km) ? f.numero(Math.round(score.km)) : '—'} km</b> evaluados</span>
          <span><b>{cargando ? '—' : numeroDisponible(score?.eventosPor100)} eventos</b> por cada 100 km</span>
          {enlaceEventos && !cargando && eventos > 0 && <Link className="sm-ver-eventos" to={`${enlaceEventos}${enlaceEventos.includes('?') ? '&' : '?'}dias=${dias}`}>Ver eventos →</Link>}</footer>
      </div>
    </section>
  )
}
