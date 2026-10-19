import { useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import { Tarjeta, Cargando, ErrorCarga } from './ui'
import { indiceDePersona } from '../datos/perfilUsuario'
import * as f from '../datos/formato'
import './score-manejo.css'

const DIAS = 7
const ETIQUETA = { verde: 'Manejo seguro', amarillo: 'Puedes mejorar', rojo: 'Requiere atención' }
const numeroDisponible = n => Number.isFinite(n) ? f.numero(n) : '—'

function IconoEvento({ tipo }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {tipo === 'frenada' ? <><circle cx="12" cy="12" r="6" /><path d="M4 5a10 10 0 0 0 0 14M20 5a10 10 0 0 1 0 14M12 8v5m0 3h.01" /></>
      : tipo === 'aceleracion' ? <path d="M4 17 11 10l4 4 5-9M15 5h5v5M4 21h16" />
        : <><path d="M4 18a9 9 0 1 1 16 0M12 5v2M5 9l2 1M19 9l-2 1M12 14l4-5" /><circle cx="12" cy="14" r="2" /></>}
  </svg>
}

/** El índice y los eventos vienen del servidor; esta tarjeta no los calcula. */
export default function ScoreManejo({ titulo = 'Índice de manejo seguro' }) {
  const sesion = useSesion()
  const { datos, estado, error, recargar } = useDatos(() => repo.manejo.miScore({ dias: DIAS }), [sesion?.perfil.id, sesion?.perfil.empresaId])
  if (estado === 'cargando') return <Tarjeta titulo={titulo}><Cargando filas={2} /></Tarjeta>
  if (estado === 'error') return <Tarjeta titulo={titulo}><ErrorCarga error={error} onReintentar={recargar} /></Tarjeta>
  return <TarjetaManejo titulo={titulo} score={datos} empresa={sesion?.perfil.empresa} />
}

/** Compartida por Mi unidad, Mi perfil y el expediente; conserva la fuente de cada persona. */
export function TarjetaManejo({ titulo = 'Índice de manejo seguro', score, empresa, logoEmpresa, nota, error }) {
  const [logoFallido, setLogoFallido] = useState(null)
  const indice = indiceDePersona(score)
  const logo = logoEmpresa && logoFallido !== logoEmpresa ? logoEmpresa : null
  const rango = indice === null ? 'sin-dato' : ({ green: 'verde', yellow: 'amarillo', red: 'rojo' }[score?.rating] ?? f.rangoIndice(indice))
  const dias = Number.isFinite(score?.dias) && score.dias > 0 ? score.dias : null
  const eventos = [
    ['Frenadas bruscas', score?.frenadas, 'frenada'],
    ['Aceleraciones bruscas', score?.aceleraciones, 'aceleracion'],
    ['Excesos de velocidad', score?.excesos, 'velocidad'],
  ]
  return (
    <section className="pnl-card sm-card">
      <div className={`sm-compacta ${rango}`}>
        {logo ? <img className="sm-marca-agua" src={logo} alt="" aria-hidden="true" onError={() => setLogoFallido(logo)} />
          : empresa && <span className="sm-marca-agua sm-marca-iniciales" aria-hidden="true">{f.iniciales(empresa)}</span>}
        <header className="sm-cabecera">
          <div><h2>{titulo}</h2>{empresa && <p className="sm-empresa">
            {logo && <img src={logo} alt="" onError={() => setLogoFallido(logo)} />}{empresa}
          </p>}</div>
          {dias && <span className="sm-periodo">Últimos {dias} días</span>}
        </header>
        <div className="sm-protagonista">
          <div className="sm-indice" aria-label={indice === null ? 'Índice no disponible' : `Índice ${f.numero(indice)} de 100`}><strong>{indice === null ? '—' : f.numero(indice)}</strong><small>/100</small></div>
          <div><p className="sm-estado"><i aria-hidden="true" />{indice === null ? 'Sin dato' : ETIQUETA[rango]}</p>
            <p className="sm-ayuda">{indice === null ? error || 'Todavía no hay índice disponible. Aparecerá cuando el servidor entregue los datos de tus recorridos.' : nota || 'Frenadas, aceleraciones y excesos de velocidad de tus recorridos.'}</p></div>
        </div>
        {indice !== null && <div className="sm-escala" aria-hidden="true"><span style={{ width: `${indice}%` }} /></div>}
        <ul className="sm-eventos">{eventos.map(([texto, n, icono]) => <li key={texto}>
          <IconoEvento tipo={icono} /><b>{numeroDisponible(n)}</b><span>{texto}</span>
        </li>)}</ul>
        <footer className="sm-pie"><span><b>{Number.isFinite(score?.km) ? f.numero(Math.round(score.km)) : '—'} km</b> evaluados</span>
          <span><b>{numeroDisponible(score?.eventosPor100)} eventos</b> por cada 100 km</span></footer>
      </div>
    </section>
  )
}
