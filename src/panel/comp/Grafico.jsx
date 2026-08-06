// ============================================================
// GRÁFICAS
// La app dice "Próximamente: tendencias del período y comparativas visuales".
// Aquí están, en SVG puro, sin librerías.
// ============================================================

/** Barras verticales. datos = [{etiqueta, valor}] */
export function Barras({ datos = [], alto = 180, formato = (n) => n, tono = 'azul' }) {
  if (!datos.length) return null
  const max = Math.max(...datos.map((d) => d.valor), 1)
  return (
    <div className={`pnl-graf-barras ${tono}`} style={{ '--alto': `${alto}px` }}>
      <div className="pnl-graf-cols">
        {datos.map((d, i) => (
          <div className="pnl-graf-col" key={i} title={`${d.etiqueta}: ${formato(d.valor)}`}>
            <span className="pnl-graf-valor">{formato(d.valor)}</span>
            <i style={{ '--h': `${(d.valor / max) * 100}%`, '--i': i }} />
            <span className="pnl-graf-etq">{d.etiqueta}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Barras horizontales con valor a la derecha. datos = [{etiqueta, valor}] */
export function BarrasH({ datos = [], formato = (n) => n }) {
  if (!datos.length) return null
  const max = Math.max(...datos.map((d) => d.valor), 1)
  return (
    <div className="pnl-graf-hb">
      {datos.map((d, i) => (
        <div className="pnl-graf-hb-fila" key={i}>
          <span className="pnl-graf-hb-etq">{d.etiqueta}</span>
          <div className="pnl-graf-hb-pista">
            <i style={{ '--v': d.valor / max, '--i': i }} />
          </div>
          <b>{formato(d.valor)}</b>
        </div>
      ))}
    </div>
  )
}

/** Anillo de proporción (0..1) con cifra al centro. */
export function Anillo({ valor = 0, texto, sub, tono = 'azul', tam = 132 }) {
  const r = 54
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, valor))
  return (
    <div className={`pnl-graf-anillo ${tono}`} style={{ width: tam, height: tam }}>
      <svg viewBox="0 0 130 130" aria-hidden="true">
        <circle className="pista" cx="65" cy="65" r={r} />
        <circle
          className="valor"
          cx="65"
          cy="65"
          r={r}
          style={{ strokeDasharray: c, strokeDashoffset: c - c * p }}
        />
      </svg>
      <div className="pnl-graf-anillo-txt">
        <b>{texto}</b>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  )
}

/** Línea de tendencia compacta. valores = [n, n, ...] */
export function Linea({ valores = [], alto = 60, tono = 'azul' }) {
  if (valores.length < 2) return null
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  const rango = max - min || 1
  const w = 100
  const puntos = valores.map((v, i) => {
    const x = (i / (valores.length - 1)) * w
    const y = alto - ((v - min) / rango) * (alto - 8) - 4
    return [x, y]
  })
  const d = puntos.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  const area = `${d} L ${w} ${alto} L 0 ${alto} Z`
  return (
    <svg className={`pnl-graf-linea ${tono}`} viewBox={`0 0 ${w} ${alto}`} preserveAspectRatio="none" aria-hidden="true">
      <path className="area" d={area} />
      <path className="linea" d={d} />
    </svg>
  )
}

/** Barra apilada de dos partes (p. ej. en marcha / detenidas). */
export function Split({ a, b, etiquetaA, etiquetaB }) {
  const total = a + b || 1
  return (
    <div className="pnl-graf-split">
      <div className="pnl-graf-split-barra">
        <i className="a" style={{ width: `${(a / total) * 100}%` }} />
        <i className="b" style={{ width: `${(b / total) * 100}%` }} />
      </div>
      <div className="pnl-graf-split-leyenda">
        <span><i className="a" />{a} {etiquetaA}</span>
        <span><i className="b" />{b} {etiquetaB}</span>
      </div>
    </div>
  )
}
