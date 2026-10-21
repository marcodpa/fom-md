import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Tag } from './ui'
import { DIAS_MANEJO, cifrasManejo, etiquetaManejo, eventosManejo, tonoManejo } from '../datos/manejo'
import * as f from '../datos/formato'
import './score-manejo.css'

// Tono de la pastilla → variante de color de la tarjeta (escala y cifra del score).
const RANGO = { verde: 'verde', ambar: 'amarillo', rojo: 'rojo', gris: 'sin-dato' }

/**
 * La pieza «Manejo»: pastilla con el mismo tono y texto que la tabla del Resumen, las 6 cifras
 * del período y, si hay eventos, el enlace a verlos. Es solo presentación: los datos llegan
 * de `ManejoConductor` (o de quien ya los tenga) y vienen del servidor; aquí no se calcula nada.
 */
export function TarjetaManejo({
  titulo = 'Manejo', score, dias = 7, alCambiarDias, cargando = false,
  empresa, logoEmpresa, nota, error, enlaceEventos,
}) {
  const [logoFallido, setLogoFallido] = useState(null)
  const logo = logoEmpresa && logoFallido !== logoEmpresa ? logoEmpresa : null
  const tono = tonoManejo(score)
  const sinDato = tono === 'gris'
  const eventos = eventosManejo(score)
  const ayuda = cargando ? 'Consultando el período…'
    : error ? error
      : sinDato ? 'Sin kilómetros recorridos en este período: el servidor no califica el manejo.'
        : nota || 'Frenadas, aceleraciones y excesos de velocidad por cada 100 km recorridos.'
  return (
    <section className="pnl-card sm-card" aria-busy={cargando}>
      <div className={`sm-compacta ${RANGO[tono]}`}>
        {logo ? <img className="sm-marca-agua" src={logo} alt="" aria-hidden="true" onError={() => setLogoFallido(logo)} />
          : empresa && <span className="sm-marca-agua sm-marca-iniciales" aria-hidden="true">{f.iniciales(empresa)}</span>}
        <header className="sm-cabecera">
          <div><h2>{titulo}</h2>{empresa && <p className="sm-empresa">
            {logo && <img src={logo} alt="" onError={() => setLogoFallido(logo)} />}{empresa}
          </p>}</div>
          {alCambiarDias && <div className="pnl-chips sm-dias" role="group" aria-label="Período del manejo">{DIAS_MANEJO.map((d) => (
            <button key={d} type="button" className={`pnl-chip${d === dias ? ' activo' : ''}`} aria-pressed={d === dias} onClick={() => alCambiarDias(d)}>{d} días</button>
          ))}</div>}
        </header>
        <div className="sm-estado">
          <Tag color={cargando ? 'gris' : tono}>{cargando ? '…' : etiquetaManejo(score)}</Tag>
          <p className="sm-ayuda">{ayuda}</p>
        </div>
        {!sinDato && !cargando && <div className="sm-escala" aria-hidden="true"><span style={{ width: `${score.indice}%` }} /></div>}
        <dl className="sm-cifras">{cifrasManejo(cargando ? null : score).map((c) => (
          <div key={c.clave} className={c.clave === 'score' ? 'sm-cifra-score' : undefined}><dt>{c.etiqueta}</dt><dd>{c.valor}</dd></div>
        ))}</dl>
        <footer className="sm-pie">
          <span>Últimos {dias} días</span>
          {enlaceEventos && !cargando && eventos > 0 && <Link className="sm-ver-eventos" to={enlaceEventos}>Ver eventos →</Link>}
        </footer>
      </div>
    </section>
  )
}
