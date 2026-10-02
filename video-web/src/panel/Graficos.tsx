import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Bg, Card, Headline, Logo, Pill, Sub, ease, useIn } from '../ui'
import { C } from '../theme'

/* ───────────── piezas comunes ───────────── */

const Glifo: React.FC<{ n: string; size?: number; color?: string }> = ({ n, size = 34, color = C.blue }) => {
  const p = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const d: Record<string, React.ReactNode> = {
    resumen: <><rect x="3" y="3" width="7" height="7" rx="1.5" {...p} /><rect x="14" y="3" width="7" height="7" rx="1.5" {...p} /><rect x="3" y="14" width="7" height="7" rx="1.5" {...p} /><rect x="14" y="14" width="7" height="7" rx="1.5" {...p} /></>,
    mapa: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" {...p} /><path d="M9 4v14M15 6v14" {...p} /></>,
    alerta: <><path d="M12 3 2 20h20z" {...p} /><path d="M12 10v5M12 18v.5" {...p} /></>,
    sos: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" {...p} /><path d="m9 12 2 2 4-4" {...p} /></>,
    camion: <><path d="M2 7h12v9H2zM14 10h4l3 3v3h-7z" {...p} /><circle cx="6" cy="18" r="2" {...p} /><circle cx="17" cy="18" r="2" {...p} /></>,
    reloj: <><circle cx="12" cy="12" r="9" {...p} /><path d="M12 7v5l3 2" {...p} /></>,
    llave: <><path d="M14 6a4 4 0 1 0 4 4l-2-1-2 1-1-2z" {...p} /><path d="m14 12-9 9" {...p} /></>,
    check: <><rect x="4" y="3" width="16" height="18" rx="2" {...p} /><path d="m8 12 3 3 5-6" {...p} /></>,
    doc: <><path d="M6 3h8l4 4v14H6z" {...p} /><path d="M14 3v4h4M9 13h6M9 17h6" {...p} /></>,
    gente: <><circle cx="9" cy="8" r="3.5" {...p} /><path d="M2 20c0-4 3-6 7-6s7 2 7 6" {...p} /><circle cx="17" cy="9" r="2.5" {...p} /><path d="M17 14c3 0 5 2 5 5" {...p} /></>,
    reporte: <><path d="M4 20V4M4 20h16" {...p} /><path d="M8 16v-5M12 16V8M16 16v-8" {...p} /></>,
    empresa: <><path d="M4 21V7l8-4 8 4v14" {...p} /><path d="M9 21v-6h6v6M9 10h.01M15 10h.01" {...p} /></>,
    llaveMapa: <><circle cx="12" cy="10" r="3" {...p} /><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" {...p} /></>,
    ruta: <><circle cx="6" cy="18" r="2.5" {...p} /><circle cx="18" cy="6" r="2.5" {...p} /><path d="M8 17c6 0 2-8 8-9" {...p} /></>,
    odometro: <><path d="M4 18a9 9 0 1 1 16 0" {...p} /><path d="m12 14 4-5" {...p} /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{d[n] ?? d.resumen}</svg>
}

const Titulo: React.FC<{ texto: string; sub?: string; ancho?: number }> = ({ texto, sub, ancho = 900 }) => (
  <div style={{ position: 'absolute', left: 100, top: 90, width: ancho }}>
    <Headline text={texto} size={68} />
    {sub && <Sub delay={16} style={{ marginTop: 20, maxWidth: ancho - 60 }}>{sub}</Sub>}
  </div>
)

// Ruido determinista (sin Math.random: cada fotograma debe salir igual).
const ruido = (i: number, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/* ───────────── 1 · Apertura ───────────── */
export const Intro: React.FC = () => {
  const p = useIn(0)
  return (
    <AbsoluteFill>
      <Bg />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ transform: `scale(${0.5 + p * 0.5}) rotate(${(1 - p) * -90}deg)`, opacity: p }}><Logo size={150} /></div>
        <Headline text="El panel de FOM" size={118} delay={12} accent="FOM" style={{ marginTop: 34 }} />
        <Sub delay={34} style={{ marginTop: 22, fontSize: 36 }}>Recorrido completo: centro de control, recorridos y todo lo demás.</Sub>
        <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
          <Pill delay={56}>Centro de control</Pill>
          <Pill delay={62} color={C.green}>Recorridos nuevos</Pill>
          <Pill delay={68}>Mantenimiento e inspecciones</Pill>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/* ───────────── 2 · Qué es el panel ───────────── */
const MODULOS: [string, string][] = [
  ['resumen', 'Resumen'], ['mapa', 'Centro de control'], ['alerta', 'Alertas'], ['sos', 'Eventos y SOS'],
  ['camion', 'Vehículos'], ['reloj', 'Jornadas'], ['llave', 'Mantenimiento'], ['check', 'Inspecciones'],
  ['doc', 'Documentos'], ['gente', 'Gente'], ['reporte', 'Reportes'],
]
export const QueEsElPanel: React.FC = () => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Bg />
      <Titulo texto="Todo lo que pasa en tu flota, en un solo lugar." sub="El supervisor ve su empresa completa. Cada persona ve solo lo que le toca." ancho={800} />
      <div style={{ position: 'absolute', left: 960, top: 150, width: 860, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
        {MODULOS.map(([g, n], i) => {
          const pop = ease(f, 14 + i * 6, 30 + i * 6)
          const foco = n === 'Centro de control'
          const pulso = foco ? 1 + Math.sin(f / 9) * 0.015 : 1
          return (
            <div key={n} style={{ opacity: pop, transform: `translateY(${(1 - pop) * 30}px) scale(${(0.9 + pop * 0.1) * pulso})`, background: foco ? 'linear-gradient(180deg,#16406a,#0e2a47)' : `linear-gradient(180deg,${C.panel},${C.panel2})`, border: `1.5px solid ${foco ? C.blue : C.line}`, borderRadius: 20, padding: '26px 22px', boxShadow: foco ? '0 0 44px -10px #349bfa' : '0 20px 40px -24px #000' }}>
              <Glifo n={g} size={42} />
              <div style={{ fontSize: 26, fontWeight: 600, marginTop: 14, letterSpacing: '-0.02em' }}>{n}</div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

/* ───────────── 3 · La cola de 5 minutos ───────────── */
function curva(n: number) {
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    pts.push([70 + u * 800, 330 + Math.sin(u * Math.PI * 2.2) * 120 - u * 90])
  }
  return pts
}
export const ColaCinco: React.FC = () => {
  const f = useCurrentFrame()
  const N = 160
  const pts = curva(N)
  const prog = ease(f, 36, 210)
  const i = Math.max(1, Math.round(prog * N))
  const cola = Math.max(0, i - 36)
  const [cx, cy] = pts[i]
  const [px, py] = pts[Math.max(0, i - 2)]
  const ang = (Math.atan2(cy - py, cx - px) * 180) / Math.PI
  const pasos = [
    ['1', 'Eliges una unidad', 'en el mapa o en la lista'],
    ['2', 'El mapa se centra en ella', 'una sola vez, sin mover el zoom'],
    ['3', 'Ves de dónde viene', 'línea punteada de sus últimos 5 minutos'],
  ]
  return (
    <AbsoluteFill>
      <Bg globe={false} />
      <div style={{ position: 'absolute', left: 90, top: 70, fontSize: 64, fontWeight: 600, letterSpacing: '-0.035em' }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#062a1d', background: C.green, borderRadius: 8, padding: '3px 12px', marginRight: 18, verticalAlign: 8 }}>NUEVO</span>
        De dónde viene cada unidad
      </div>
      <Card delay={4} style={{ position: 'absolute', left: 90, top: 190, width: 940, height: 700, padding: 0, overflow: 'hidden' }}>
        <svg width="940" height="700" viewBox="0 0 940 700">
          {Array.from({ length: 16 }).map((_, k) => <line key={'h' + k} x1="0" x2="940" y1={k * 48} y2={k * 48} stroke={C.line} opacity="0.35" />)}
          {Array.from({ length: 21 }).map((_, k) => <line key={'v' + k} y1="0" y2="700" x1={k * 48} x2={k * 48} stroke={C.line} opacity="0.35" />)}
          <polyline points={pts.slice(0, i + 1).map((p) => p.join(',')).join(' ')} fill="none" stroke="#2a4a6b" strokeWidth="5" strokeLinecap="round" />
          <polyline points={pts.slice(cola, i + 1).map((p) => p.join(',')).join(' ')} fill="none" stroke={C.blue} strokeWidth="7" strokeLinecap="round" strokeDasharray="1 14" />
          <circle cx={pts[cola][0]} cy={pts[cola][1]} r="9" fill={C.panel2} stroke={C.blue} strokeWidth="3" />
          <text x={pts[cola][0] - 20} y={pts[cola][1] + 40} fill={C.muted} fontSize="22" fontFamily="inherit">hace 5 min</text>
          <g transform={`translate(${cx} ${cy}) rotate(${ang})`}>
            <circle r={28 + Math.sin(f / 6) * 3} fill={C.green} opacity="0.18" />
            <rect x="-24" y="-12" width="48" height="24" rx="8" fill="#f3f7fc" stroke={C.blue} strokeWidth="3" />
            <path d="M8 -9 L18 0 L8 9 Z" fill={C.blue} />
          </g>
        </svg>
        <div style={{ position: 'absolute', right: 24, top: 22, display: 'flex', alignItems: 'center', gap: 12, background: '#0b1824dd', border: `1px solid ${C.line}`, borderRadius: 14, padding: '10px 16px', fontSize: 24, fontWeight: 600 }}>
          <svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="none" stroke={C.line} strokeWidth="4" /><circle cx="15" cy="15" r="12" fill="none" stroke={C.blue} strokeWidth="4" strokeDasharray={75.4} strokeDashoffset={75.4 * (1 - 0.8)} transform="rotate(-90 15 15)" strokeLinecap="round" /></svg>
          Últimos 5 min
        </div>
      </Card>
      <div style={{ position: 'absolute', left: 1090, top: 200, width: 740, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {pasos.map(([n, a, b], k) => {
          const pop = ease(f, 40 + k * 40, 60 + k * 40)
          return (
            <div key={n} style={{ display: 'flex', gap: 22, alignItems: 'center', opacity: pop, transform: `translateX(${(1 - pop) * 60}px)`, padding: '26px 28px', borderRadius: 20, background: `linear-gradient(180deg,${C.panel},${C.panel2})`, border: `1px solid ${C.line}` }}>
              <div style={{ flex: 'none', width: 62, height: 62, borderRadius: 31, background: C.blue, display: 'grid', placeItems: 'center', fontSize: 32, fontWeight: 700, color: '#06101a' }}>{n}</div>
              <div><div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em' }}>{a}</div><div style={{ fontSize: 24, color: C.muted, marginTop: 4 }}>{b}</div></div>
            </div>
          )
        })}
        <div style={{ opacity: ease(f, 170, 195), fontSize: 25, color: C.muted, lineHeight: 1.45, paddingLeft: 6 }}>
          Si la unidad estaba detenida, la línea muestra su <b style={{ color: C.ink }}>último trayecto</b>, para saber igual de dónde llegó.
        </div>
      </div>
    </AbsoluteFill>
  )
}

/* ───────────── 4 · La deriva del GPS ───────────── */
export const Deriva: React.FC = () => {
  const f = useCurrentFrame()
  const N = 24
  const colapso = ease(f, 120, 175)
  const cx = 560
  const cy = 520
  return (
    <AbsoluteFill>
      <Bg globe={false} />
      <Titulo texto="Un GPS parado baila. FOM lo calma." sub="Un equipo detenido sigue mandando puntos que se mueven decenas de metros. Sin filtro parece que el carro anduvo." ancho={1100} />
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        <circle cx={cx} cy={cy} r="150" fill="none" stroke={C.blue} strokeWidth="2.5" strokeDasharray="10 10" opacity={ease(f, 10, 30) * 0.8} />
        <text x={cx + 112} y={cy - 118} fill={C.blue} fontSize="24" fontWeight="600" fontFamily="inherit" opacity={ease(f, 14, 34)}>100 m</text>
        {Array.from({ length: N }).map((_, i) => {
          const a = ruido(i) * Math.PI * 2
          const r = 30 + ruido(i, 1) * 110
          const x0 = cx + Math.cos(a) * r
          const y0 = cy + Math.sin(a) * r
          const t = ease(f, 20 + i * 4, 30 + i * 4)
          const x = x0 + (cx - x0) * colapso
          const y = y0 + (cy - y0) * colapso
          return (
            <g key={i} opacity={t * (1 - colapso * 0.9)}>
              <circle cx={x} cy={y} r={9 + (1 - t) * 14} fill={C.blue} opacity="0.85" />
              <circle cx={x} cy={y} r={18} fill="none" stroke={C.blue} opacity={0.3 * (1 - colapso)} />
            </g>
          )
        })}
        <g opacity={ease(f, 150, 175)} transform={`translate(${cx} ${cy})`}>
          <circle r="22" fill={C.amber} stroke="#071019" strokeWidth="4" />
          <text textAnchor="middle" dy="8" fontSize="22" fontWeight="700" fill="#06101a" fontFamily="inherit">P</text>
        </g>
      </svg>
      <div style={{ position: 'absolute', left: 1050, top: 330, width: 760, display: 'flex', flexDirection: 'column', gap: 26 }}>
        <Card delay={30} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ fontSize: 96, fontWeight: 600, color: C.red, letterSpacing: '-0.04em', minWidth: 140 }}>{Math.min(N, Math.round(ease(f, 20, 120) * N))}</div>
          <div style={{ fontSize: 30, lineHeight: 1.35 }}>puntos recibidos <span style={{ color: C.muted }}>con el carro estacionado</span></div>
        </Card>
        <div style={{ opacity: ease(f, 130, 160), transform: `translateY(${(1 - ease(f, 130, 160)) * 20}px)` }}>
          <Card style={{ display: 'flex', alignItems: 'center', gap: 28, borderColor: C.green + '88' }}>
            <div style={{ fontSize: 96, fontWeight: 600, color: C.green, letterSpacing: '-0.04em', minWidth: 140 }}>1</div>
            <div style={{ fontSize: 30, lineHeight: 1.35 }}>punto en el mapa <span style={{ color: C.muted }}>(quietos a 8 km/h o menos, o con el motor apagado, dentro de 100 m)</span></div>
          </Card>
        </div>
      </div>
    </AbsoluteFill>
  )
}

/* ───────────── 5 · Qué es una parada ───────────── */
export const Parada: React.FC = () => {
  const f = useCurrentFrame()
  const llega = ease(f, 20, 80)
  const reloj = ease(f, 90, 170)
  const esParada = f >= 170
  const sale = ease(f, 205, 255)
  const A: [number, number] = [150, 780]
  const B: [number, number] = [720, 560]
  const Cc: [number, number] = [1260, 780]
  const lerp = (a: [number, number], b: [number, number], k: number): [number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
  const carro = f < 205 ? lerp(A, B, llega) : lerp(B, Cc, sale)
  return (
    <AbsoluteFill>
      <Bg globe={false} />
      <Titulo texto="¿Qué cuenta como una parada?" sub="Cinco minutos o más dentro de 100 metros. Cada viaje lleva su inicio y su fin." ancho={1200} />
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        <line x1={A[0]} y1={A[1]} x2={lerp(A, B, llega)[0]} y2={lerp(A, B, llega)[1]} stroke={C.blue} strokeWidth="9" strokeLinecap="round" />
        {sale > 0 && <line x1={B[0]} y1={B[1]} x2={lerp(B, Cc, sale)[0]} y2={lerp(B, Cc, sale)[1]} stroke={C.blue} strokeWidth="9" strokeLinecap="round" />}
        <g transform={`translate(${A[0]} ${A[1]})`} opacity={ease(f, 8, 24)}>
          <circle r="22" fill={C.green} stroke="#071019" strokeWidth="4" /><text textAnchor="middle" dy="8" fontSize="22" fontWeight="700" fill="#06101a" fontFamily="inherit">A</text>
          <text x="34" y="8" fill={C.ink} fontSize="26" fontWeight="600" fontFamily="inherit">Inicio · 7:00</text>
        </g>
        <circle cx={B[0]} cy={B[1]} r="110" fill="none" stroke={C.blue} strokeWidth="2.5" strokeDasharray="9 9" opacity={ease(f, 70, 90) * 0.85} />
        <circle cx={B[0]} cy={B[1]} r="110" fill="none" stroke={C.amber} strokeWidth="8" strokeDasharray={691} strokeDashoffset={691 * (1 - reloj)} strokeLinecap="round" transform={`rotate(-90 ${B[0]} ${B[1]})`} opacity={ease(f, 88, 100)} />
        {esParada && (
          <g transform={`translate(${B[0]} ${B[1]}) scale(${ease(f, 170, 186)})`}>
            <circle r="30" fill={C.amber} stroke="#071019" strokeWidth="5" /><text textAnchor="middle" dy="10" fontSize="30" fontWeight="700" fill="#06101a" fontFamily="inherit">P</text>
          </g>
        )}
        {!esParada && (
          <g transform={`translate(${carro[0]} ${carro[1]})`}>
            <rect x="-26" y="-14" width="52" height="28" rx="9" fill="#f3f7fc" stroke={C.blue} strokeWidth="3" />
          </g>
        )}
        {f >= 205 && (
          <g transform={`translate(${carro[0]} ${carro[1]})`}>
            <rect x="-26" y="-14" width="52" height="28" rx="9" fill="#f3f7fc" stroke={C.blue} strokeWidth="3" />
          </g>
        )}
        <g transform={`translate(${Cc[0]} ${Cc[1]})`} opacity={ease(f, 240, 258)}>
          <circle r="22" fill={C.red} stroke="#071019" strokeWidth="4" /><text textAnchor="middle" dy="8" fontSize="22" fontWeight="700" fill="#06101a" fontFamily="inherit">B</text>
        </g>
      </svg>
      {/* reloj de 5 minutos */}
      <div style={{ position: 'absolute', left: B[0] - 150, top: B[1] - 260, width: 300, textAlign: 'center', opacity: ease(f, 88, 104) * (esParada ? 0 : 1) }}>
        <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: '-0.04em', color: C.amber }}>{String(Math.floor(reloj * 5)).padStart(1, '0')}:{String(Math.floor(((reloj * 5) % 1) * 60)).padStart(2, '0')}</div>
      </div>
      <Card delay={0} style={{ position: 'absolute', left: B[0] - 190, top: B[1] - 270, width: 380, textAlign: 'center', opacity: ease(f, 176, 196), transform: `translateY(${(1 - ease(f, 176, 196)) * 20}px)`, borderColor: C.amber + '99' }}>
        <div style={{ fontSize: 34, fontWeight: 600, color: C.amber }}>Estacionada 21 min</div>
        <div style={{ fontSize: 22, color: C.muted, marginTop: 6 }}>Llegó 7:17 · Salió 7:38</div>
      </Card>
      <div style={{ position: 'absolute', left: 100, bottom: 80, right: 100, display: 'flex', gap: 22, opacity: ease(f, 220, 250) }}>
        {[['Viaje', 'de parada a parada, con su inicio (A) y su fin (B)'], ['Parada', '5 min o más en el mismo sitio (P): llegada, salida y duración'], ['Hora exacta', 'al pasar el cursor por la línea, en cada punto']].map(([a, b]) => (
          <div key={a} style={{ flex: 1, padding: '18px 22px', borderRadius: 16, background: `linear-gradient(180deg,${C.panel},${C.panel2})`, border: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{a}</div><div style={{ fontSize: 22, color: C.muted, marginTop: 4, lineHeight: 1.35 }}>{b}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

/* ───────────── 6 · Cómo avanza una orden ───────────── */
export const OrdenFlujo: React.FC = () => {
  const f = useCurrentFrame()
  const pasos: [string, string, string, string][] = [
    ['1', 'Reportar', 'Eliges la unidad y cuentas la falla.', 'alerta'],
    ['2', 'Revisar y asignar', 'Evalúas el reporte y asignas a quien lo hará.', 'check'],
    ['3', 'Trabajo en taller', 'El responsable inicia, pausa y entrega desde su app.', 'llave'],
    ['4', 'Revisar y cerrar', 'Confirmas la solución y registras el costo.', 'doc'],
  ]
  const linea = ease(f, 30, 150)
  return (
    <AbsoluteFill>
      <Bg globe={false} />
      <Titulo texto="Una orden de trabajo, en cuatro pasos." sub="Del reporte de la falla al cierre, sin perder a nadie en el camino." ancho={1300} />
      <div style={{ position: 'absolute', left: 150, top: 470, width: 1620 }}>
        <div style={{ position: 'absolute', left: 130, right: 130, top: 56, height: 6, background: C.line, borderRadius: 3 }}>
          <div style={{ width: `${linea * 100}%`, height: '100%', background: `linear-gradient(90deg,${C.blue},${C.green})`, borderRadius: 3, boxShadow: '0 0 20px #349bfa' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {pasos.map(([n, a, b, g], i) => {
            const pop = ease(f, 24 + i * 34, 48 + i * 34)
            return (
              <div key={n} style={{ width: 360, textAlign: 'center', opacity: pop, transform: `translateY(${(1 - pop) * 36}px)` }}>
                <div style={{ width: 118, height: 118, margin: '0 auto', borderRadius: 59, background: `linear-gradient(180deg,#16406a,#0e2a47)`, border: `2px solid ${C.blue}`, display: 'grid', placeItems: 'center', boxShadow: '0 0 40px -8px #349bfa' }}><Glifo n={g} size={54} color="#cfe8ff" /></div>
                <div style={{ fontSize: 24, color: C.blue, fontWeight: 700, marginTop: 20 }}>PASO {n}</div>
                <div style={{ fontSize: 36, fontWeight: 600, marginTop: 4, letterSpacing: '-0.02em' }}>{a}</div>
                <div style={{ fontSize: 24, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>{b}</div>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 150, right: 150, bottom: 70, display: 'flex', gap: 22, opacity: ease(f, 170, 200) }}>
        {[['Próximos servicios', 'Los kilómetros que le quedan a cada unidad para su servicio.', 'odometro'], ['Planes', 'Cada cuánto toca cada servicio y a qué unidades cubre.', 'reloj'], ['Costos', 'Cuánto se gasta en mantener la flota.', 'reporte']].map(([a, b, g]) => (
          <div key={a} style={{ flex: 1, display: 'flex', gap: 18, alignItems: 'center', padding: '18px 24px', borderRadius: 18, background: `linear-gradient(180deg,${C.panel},${C.panel2})`, border: `1px solid ${C.line}` }}>
            <Glifo n={g} size={40} /><div><div style={{ fontSize: 27, fontWeight: 600 }}>{a}</div><div style={{ fontSize: 21, color: C.muted, marginTop: 2, lineHeight: 1.35 }}>{b}</div></div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

/* ───────────── 7 · Roles y permisos ───────────── */
export const Roles: React.FC = () => {
  const f = useCurrentFrame()
  const cols: [string, string, string, string[]][] = [
    ['Administrador FOM', 'empresa', C.amber, ['Ve todas las empresas', 'Crea empresas, usuarios y unidades', 'Entra a cualquier empresa', 'Gestiona planes y pagos']],
    ['Supervisor', 'camion', C.blue, ['Ve y gestiona su empresa', 'Aprueba y cierra órdenes', 'Revisa inspecciones y reportes', 'Si es compañía, lee a sus contratistas']],
    ['Conductor', 'gente', C.green, ['Ve su unidad asignada', 'Hace su inspección', 'Recibe sus alertas', 'Inicia y entrega el trabajo de taller']],
  ]
  return (
    <AbsoluteFill>
      <Bg globe={false} />
      <Titulo texto="Cada persona ve y hace lo que le toca." sub="Los datos de una empresa nunca se mezclan con los de otra." ancho={1300} />
      <div style={{ position: 'absolute', left: 100, right: 100, top: 400, display: 'flex', gap: 32 }}>
        {cols.map(([t, g, col, items], i) => {
          const pop = ease(f, 14 + i * 18, 40 + i * 18)
          return (
            <div key={t} style={{ flex: 1, opacity: pop, transform: `translateY(${(1 - pop) * 50}px)`, padding: 34, borderRadius: 26, background: `linear-gradient(180deg,${C.panel},${C.panel2})`, border: `1.5px solid ${col}66`, boxShadow: `0 30px 60px -30px #000, 0 0 50px -24px ${col}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 66, height: 66, borderRadius: 18, background: col + '22', display: 'grid', placeItems: 'center' }}><Glifo n={g} size={38} color={col} /></div>
                <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.025em' }}>{t}</div>
              </div>
              <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {items.map((it, k) => {
                  const ok = ease(f, 50 + i * 18 + k * 12, 64 + i * 18 + k * 12)
                  return (
                    <div key={it} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 27, opacity: ok, transform: `translateX(${(1 - ok) * 24}px)` }}>
                      <svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" fill={col + '26'} stroke={col} strokeWidth="2" /><path d="m9 15.5 4 4 8-9" stroke={col} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {it}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

/* ───────────── 8 · Lo que viene ───────────── */
export const ProximosPasos: React.FC = () => {
  const f = useCurrentFrame()
  const items: [string, string, string, string, string][] = [
    ['empresa', 'Entrar a cualquier empresa', 'El servidor ya valida la empresa elegida. Faltan las rutas por empresa para el mapa, las alertas y las órdenes.', 'En preparación en el servidor', C.amber],
    ['llaveMapa', 'Un solo mapa para web y app', 'El mismo estilo de mapa, elegido en el servidor y leído por las dos.', 'Propuesta lista', C.blue],
    ['ruta', 'Líneas pegadas a las calles', 'Un servicio propio de ajuste a calles, con el mapa de Venezuela y sin sacar datos del servidor.', 'Por definir', C.blue],
    ['odometro', 'Odómetro calculado', 'Kilómetros por día y por unidad, sin la deriva del GPS.', 'Siguiente tarea', C.green],
  ]
  return (
    <AbsoluteFill>
      <Bg />
      <Titulo texto="Lo que viene." sub="Lo que ya está en camino para seguir mejorando el panel." ancho={1100} />
      <div style={{ position: 'absolute', left: 100, right: 100, top: 360, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        {items.map(([g, t, d, chip, col], i) => {
          const pop = ease(f, 20 + i * 22, 44 + i * 22)
          return (
            <div key={t} style={{ opacity: pop, transform: `translateY(${(1 - pop) * 40}px)`, padding: '30px 34px', borderRadius: 24, background: `linear-gradient(180deg,${C.panel},${C.panel2})`, border: `1px solid ${C.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 62, height: 62, borderRadius: 16, background: col + '22', display: 'grid', placeItems: 'center' }}><Glifo n={g} size={36} color={col} /></div>
                <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em' }}>{t}</div>
              </div>
              <div style={{ fontSize: 24, color: C.muted, lineHeight: 1.45, marginTop: 16 }}>{d}</div>
              <div style={{ marginTop: 18 }}><span style={{ display: 'inline-block', padding: '7px 16px', borderRadius: 999, fontSize: 21, fontWeight: 600, color: col, border: `1px solid ${col}66`, background: col + '18' }}>{chip}</span></div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

/* ───────────── 9 · Cierre ───────────── */
export const Cierre: React.FC = () => {
  const f = useCurrentFrame()
  const p = useIn(40)
  return (
    <AbsoluteFill>
      <Bg />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Logo size={130} />
        <Headline text="Toda tu flota, bajo control." size={108} delay={8} accent="control." style={{ marginTop: 34, width: 1500 }} />
        <div style={{ marginTop: 46, opacity: p, transform: `translateY(${(1 - p) * 26}px) scale(${1 + Math.sin(f / 10) * 0.01})` }}>
          <div style={{ display: 'inline-block', padding: '20px 54px', borderRadius: 16, background: C.btn, fontSize: 36, fontWeight: 500, boxShadow: `0 20px 50px -15px ${C.btn}` }}>fom.md</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

