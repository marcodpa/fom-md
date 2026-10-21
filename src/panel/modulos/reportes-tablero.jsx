import { Link } from 'react-router-dom'
import { horaVE, numeroVE } from './reportes-datos'

// ============================================================
// TABLERO de Reportes (T-88). Arriba de cada pestaña, en este orden:
// 4 cifras con ▲▼ (y su línea por día si la hay), 2 gráficos, chips de
// atención y, al pie, «N de 6 fuentes al día». Los datos salen de
// tableroDe() en reportes-tablero-datos.js; aquí solo se dibujan (SVG y CSS).
// ============================================================

const TONO_DELTA = { bien: 'g', mal: 'rj', neutro: 'n' }
const Flecha = ({ dir }) => dir === 'igual' ? null : <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d={dir === 'sube' ? 'M5 1.5 9 8.5H1z' : 'M5 8.5 1 1.5h8z'} fill="currentColor" /></svg>
const Ahora = () => <span className="rp-tag t-info"><i />Ahora</span>
const IcoFuentes = ({ parcial }) => <svg className="rp-ico" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">{parcial ? <><path d="M12 3.5 2.5 20h19z" /><path d="M12 10v4.5M12 17.2v.3" /></> : <path d="M5 13l4 4L19 7" />}</svg>

/** Mini línea de una serie por día. Se estira a lo ancho: el trazo no se deforma. */
function Linea({ serie }) {
  const max = Math.max(...serie) || 1
  const ancho = serie.length - 1
  const y = v => 26 - v / max * 22
  const puntos = serie.map((v, i) => `${i},${y(v).toFixed(2)}`).join(' ')
  return <svg className="rp-spark" viewBox={`0 0 ${ancho} 28`} preserveAspectRatio="none" role="img" aria-label={`Por día del período: de ${numeroVE(Math.min(...serie))} a ${numeroVE(max)}`}>
    <polygon points={`0,28 ${puntos} ${ancho},28`} className="area" />
    <polyline points={puntos} className="trazo" vectorEffect="non-scaling-stroke" />
  </svg>
}

function Cifra({ c }) {
  return <div className="rp-kc">
    <span className="rp-lbl">{c.etiqueta}{c.pista && <span className="rp-hint"> · {c.pista}</span>}</span>
    <span className={`rp-kv${c.tono ? ` c-${c.tono}` : ''}`}>{c.valor}{c.unidad && <small> {c.unidad}</small>}</span>
    {c.ahora ? <span className="rp-dl"><Ahora /><small>{c.nota || 'Vista actual, sin comparar'}</small></span>
      : c.cmp ? <span className={`rp-dl ${c.cmp.direccion === 'igual' ? '' : TONO_DELTA[c.cmp.tono]}`}><Flecha dir={c.cmp.direccion} />{c.cmp.texto}<small>{[c.antes, c.nota].filter(Boolean).join(' · ')}</small></span>
        : <span className="rp-dl"><small>{c.nota || 'Sin dato del período anterior'}</small></span>}
    {c.serie && <Linea serie={c.serie} />}
  </div>
}

/** Columnas verticales: estados, rangos o períodos. Un valor sin dato sale «—» y sin barra. */
function Columnas({ g }) {
  const max = Math.max(...g.partes.map(p => Number(p.valor) || 0)) || 1
  return <div className="rp-cols" role="img" aria-label={`${g.titulo}: ${g.partes.map(p => `${p.etiqueta} ${p.texto}`).join(', ')}`}>
    {g.partes.map(p => <div key={p.clave} className="rp-colm">
      <b>{p.texto}</b>
      <div className="rp-colm-pista"><div className={`tn-${p.tono}`} style={{ height: `${(Number(p.valor) || 0) / max * 100}%` }} /></div>
      <span>{p.etiqueta}</span>
      {p.detalle && <small>{p.detalle}</small>}
    </div>)}
  </div>
}

function BarrasH({ g }) {
  const max = Math.max(...g.partes.map(p => Number(p.valor) || 0)) || 1
  return <ul className="rp-barras" aria-label={g.titulo}>
    {g.partes.map(p => <li key={p.clave}><div><span>{p.etiqueta}</span><b>{p.texto}{p.detalle && <small>{p.detalle}</small>}</b></div><div className="pista"><div className={`tn-${p.tono}`} style={{ width: `${p.valor / max * 100}%` }} /></div></li>)}
  </ul>
}

function Apilada({ g }) {
  return <>
    <div className="rp-apilada" role="img" aria-label={`${g.titulo}: ${g.partes.map(p => `${p.texto} ${p.etiqueta.toLocaleLowerCase('es')}`).join(', ')}`}>
      {g.partes.filter(p => p.valor > 0).map(p => <div key={p.clave} className={`tn-${p.tono}`} style={{ flex: p.valor }} />)}
    </div>
    <div className="rp-leg">{g.partes.map(p => <span key={p.clave}><i className={`rp-dot tn-${p.tono}`} />{p.etiqueta} <b>{p.texto}{g.total ? ` · ${Math.round(p.valor / g.total * 100)} %` : ''}</b></span>)}</div>
  </>
}

const DIBUJO = { columnas: Columnas, barrasH: BarrasH, apilada: Apilada }

function Grafico({ g }) {
  const Dibujo = DIBUJO[g.tipo]
  return <section className="rp-gr">
    <div className="rp-hd"><h3 className="rp-gr-t">{g.titulo}</h3>{g.ahora && <Ahora />}</div>
    {g.vacio ? <div className="rp-gr-vacio"><p>{g.vacio}</p></div> : <Dibujo g={g} />}
    {g.pie && <span className="rp-hint rp-abajo">{g.pie}</span>}
  </section>
}

/**
 * `t` es tableroDe(); `alVerTabla` abre la tabla de abajo con «Piden atención».
 * `cabecera` trae título, período y alcance ya escritos por la pantalla.
 */
export default function Tablero({ t, cabecera, faltantes, ahora, alRecargar, alVerTabla }) {
  return <section className="rp-tablero" aria-label={`Tablero del ${cabecera.titulo.toLocaleLowerCase('es')}`}>
    <div className="rp-tb-cab">
      <div className="rp-tb-id"><p className="rp-ov az">Tablero</p><p className="rp-hero-t">{cabecera.titulo}</p></div>
      <div className="rp-pases">{cabecera.pases}</div>
      <span className="rp-hint rp-tb-compara">Se compara con {cabecera.comparaCon}.</span>
    </div>
    <div className="rp-kpis">{t.cifras.map(c => <Cifra key={c.clave} c={c} />)}</div>
    <div className="rp-graficos">{t.graficos.map(g => <Grafico key={g.clave} g={g} />)}</div>
    <div className="rp-atencion" aria-label="Lo que pide atención">
      {t.chips.length ? t.chips.map(c => c.ir.ruta
        ? <Link key={c.clave} className={`rp-achip t-${c.tono}`} to={c.ir.ruta}><i />{c.texto} →</Link>
        : <button key={c.clave} type="button" className={`rp-achip t-${c.tono}`} onClick={alVerTabla}><i />{c.texto} →</button>)
        : <span className="rp-achip t-ok quieto"><i />Nada pide atención</span>}
    </div>
    <p className={`rp-hint rp-fuentes${faltantes.length ? ' parcial' : ''}`} title={faltantes.map(x => `${x.nombre}: ${x.motivo}`).join('\n')}>
      <IcoFuentes parcial={faltantes.length > 0} />{6 - faltantes.length} de 6 fuentes al día · {horaVE(ahora)}
      {faltantes.length > 0 && <button type="button" className="rp-link" onClick={alRecargar}>Reintentar</button>}
    </p>
    {faltantes.length > 0 && <p className="rp-hint rp-parcial">Reporte parcial: {faltantes.map(x => x.motivo).join(' ')}</p>}
  </section>
}
