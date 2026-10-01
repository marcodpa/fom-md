import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Bg, Card, Count, Headline, Logo, Phone, Pill, Sub, ease, useIn } from './ui'
import { C } from './theme'

const Row: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', ...style }}>{children}</div>
)

/* 1 · Apertura */
export const Intro: React.FC = () => {
  const p = useIn(0)
  return (
    <AbsoluteFill>
      <Bg />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ transform: `scale(${0.6 + p * 0.4})`, opacity: p }}>
          <Logo size={170} />
        </div>
        <Headline text="Tu flota conectada." size={120} delay={14} accent="conectada." style={{ marginTop: 36 }} />
        <Sub delay={40} style={{ marginTop: 26, fontSize: 36 }}>
          Una plataforma web y una app para tu gente en carretera.
        </Sub>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/* 2 · Plataforma: un solo panel */
export const Plataforma: React.FC = () => {
  const f = useCurrentFrame()
  const path = 'M30 300 C 110 250, 130 120, 230 150 S 360 260, 440 120 S 560 60, 620 90'
  const draw = ease(f, 30, 110)
  const pins = [
    [230, 150],
    [440, 120],
    [620, 90],
  ]
  const kpis: [string, number, string][] = [
    ['Unidades', 128, C.ink],
    ['En marcha', 74, C.green],
    ['Detenidas', 51, C.amber],
    ['Alertas', 3, C.red],
  ]
  return (
    <AbsoluteFill>
      <Bg />
      <Row style={{ position: 'absolute', left: 110, top: 130, width: 640, flexDirection: 'column', alignItems: 'flex-start', gap: 28 }}>
        <Headline text="Toda tu flota en un solo panel." size={78} accent="panel." />
        <Sub>Ubicación, estado, alertas y mantenimiento de cada unidad, sin saltar entre herramientas.</Sub>
      </Row>
      <div style={{ position: 'absolute', left: 800, top: 110, width: 1010 }}>
        <Row style={{ gap: 20 }}>
          {kpis.map(([l, n, c], i) => (
            <Card key={i} delay={6 + i * 6} style={{ flex: 1, padding: 22 }}>
              <div style={{ fontSize: 22, color: C.muted }}>{l}</div>
              <div style={{ fontSize: 58, fontWeight: 600, color: c, letterSpacing: '-0.03em' }}>
                <Count to={n} delay={12 + i * 6} />
              </div>
            </Card>
          ))}
        </Row>
        <Card delay={22} style={{ marginTop: 20, padding: 0, overflow: 'hidden', height: 470, position: 'relative' }}>
          <svg width="100%" height="100%" viewBox="0 0 660 400" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={'h' + i} x1="0" x2="660" y1={i * 36} y2={i * 36} stroke={C.line} strokeWidth="1" opacity="0.5" />
            ))}
            {Array.from({ length: 19 }).map((_, i) => (
              <line key={'v' + i} y1="0" y2="400" x1={i * 36} x2={i * 36} stroke={C.line} strokeWidth="1" opacity="0.5" />
            ))}
            <path d={path} fill="none" stroke={C.blue} strokeWidth="5" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            {pins.map(([x, y], i) => {
              const s = ease(f, 60 + i * 18, 80 + i * 18)
              return (
                <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
                  <circle r={16 + (f % 40) * 0.5} fill={C.blue} opacity={0.25 - (f % 40) * 0.006} />
                  <circle r="9" fill={i === 1 ? C.amber : C.green} stroke="#071019" strokeWidth="3" />
                </g>
              )
            })}
          </svg>
          <div style={{ position: 'absolute', left: 22, bottom: 20, display: 'flex', gap: 10 }}>
            <Pill delay={90} color={C.green}>AD-132 en marcha</Pill>
            <Pill delay={100} color={C.amber}>VM-538 detenida</Pill>
          </div>
        </Card>
      </div>
    </AbsoluteFill>
  )
}

/* 3 · App del conductor */
export const App: React.FC = () => {
  const f = useCurrentFrame()
  const items = ['Luces y señales', 'Frenos', 'Neumáticos', 'Nivel de aceite', 'Extintor']
  const sel = f < 90 ? 0 : f < 170 ? 1 : 2
  const tabs = ['Inicio', 'Inspección', 'Estado']
  const enter = useIn(4)
  return (
    <AbsoluteFill>
      <Bg />
      <Row style={{ position: 'absolute', left: 120, top: 220, width: 780, flexDirection: 'column', alignItems: 'flex-start', gap: 28 }}>
        <Headline text="El conductor reporta. La oficina ve." size={80} accent="reporta." />
        <Sub>Cada conductor ve su unidad, hace su inspección y avisa de cualquier problema desde el teléfono.</Sub>
        <Row style={{ gap: 14, marginTop: 10 }}>
          {tabs.map((t, i) => (
            <Pill key={t} delay={40 + i * 8} color={sel === i ? C.blue : C.muted}>
              {t}
            </Pill>
          ))}
        </Row>
      </Row>
      <div style={{ position: 'absolute', right: 230, top: 120, transform: `translateY(${(1 - enter) * 120}px) rotate(${(1 - enter) * 4}deg)` }}>
        <Phone>
          <div style={{ padding: '70px 26px 26px', height: '100%', boxSizing: 'border-box' }}>
            {sel === 0 && (
              <div style={{ opacity: ease(f, 0, 14) }}>
                <div style={{ fontSize: 40, fontWeight: 600 }}>Tu unidad</div>
                <Card style={{ marginTop: 20, padding: 20 }}>
                  <div style={{ fontSize: 26, fontWeight: 600 }}>AD-132</div>
                  <div style={{ color: C.muted, fontSize: 20, marginTop: 6 }}>Toyota Hilux · AD132UV</div>
                  <div style={{ marginTop: 16 }}>
                    <Pill color={C.green}>Sin novedad</Pill>
                  </div>
                </Card>
                <Card delay={8} style={{ marginTop: 16, padding: 20 }}>
                  <div style={{ color: C.muted, fontSize: 20 }}>Odómetro</div>
                  <div style={{ fontSize: 40, fontWeight: 600 }}>
                    <Count to={84213} delay={10} suffix=" km" dur={50} />
                  </div>
                </Card>
              </div>
            )}
            {sel === 1 && (
              <div>
                <div style={{ fontSize: 40, fontWeight: 600 }}>Inspección</div>
                {items.map((t, i) => {
                  const ok = ease(f, 98 + i * 12, 108 + i * 12)
                  return (
                    <Card key={t} delay={90 + i * 4} style={{ marginTop: 14, padding: '16px 20px' }}>
                      <Row style={{ justifyContent: 'space-between', fontSize: 23 }}>
                        {t}
                        <svg width="34" height="34" viewBox="0 0 34 34">
                          <circle cx="17" cy="17" r="15" fill={ok > 0.5 ? C.green : 'none'} stroke={ok > 0.5 ? C.green : C.line} strokeWidth="2" />
                          <path d="M9 17 l6 6 l11 -12" stroke="#071019" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ok} />
                        </svg>
                      </Row>
                    </Card>
                  )
                })}
              </div>
            )}
            {sel === 2 && (
              <div>
                <div style={{ fontSize: 40, fontWeight: 600 }}>Estado</div>
                <Card delay={170} style={{ marginTop: 20, padding: 22 }}>
                  <div style={{ color: C.muted, fontSize: 21 }}>Próximo mantenimiento</div>
                  <div style={{ fontSize: 32, fontWeight: 600, marginTop: 6 }}>en 1.800 km</div>
                  <div style={{ height: 12, borderRadius: 8, background: C.line, marginTop: 18 }}>
                    <div style={{ height: '100%', width: `${ease(f, 176, 220) * 78}%`, borderRadius: 8, background: C.blue }} />
                  </div>
                </Card>
                <Card delay={180} style={{ marginTop: 16, padding: 22 }}>
                  <div style={{ color: C.muted, fontSize: 21 }}>Documentos</div>
                  <div style={{ marginTop: 10 }}>
                    <Pill color={C.green}>Licencia vigente</Pill>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  )
}

/* 4 · Funciones */
export const Funciones: React.FC = () => {
  const f = useCurrentFrame()
  const bars = [40, 70, 55, 90, 62, 80, 48]
  const mant: [string, number, string][] = [
    ['Cambio de aceite', 82, C.amber],
    ['Frenos', 45, C.green],
    ['Neumáticos', 64, C.green],
  ]
  return (
    <AbsoluteFill>
      <Bg />
      <div style={{ position: 'absolute', left: 120, top: 100, width: 1300 }}>
        <Headline text="Control diario, sin puntos ciegos." size={84} accent="ciegos." />
      </div>
      <Row style={{ position: 'absolute', left: 120, right: 120, top: 330, gap: 32, alignItems: 'stretch' }}>
        <Card delay={14} style={{ flex: 1, height: 540 }}>
          <div style={{ fontSize: 34, fontWeight: 600 }}>GPS y recorridos</div>
          <div style={{ color: C.muted, fontSize: 24, marginTop: 10 }}>Dónde está cada unidad y por dónde pasó.</div>
          <svg viewBox="0 0 400 260" width="100%" style={{ marginTop: 26 }}>
            <path d="M20 220 C 90 200, 80 80, 170 100 S 290 200, 380 40" fill="none" stroke={C.blue} strokeWidth="6" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(f, 30, 100)} />
            <circle cx="380" cy="40" r={12} fill={C.green} opacity={ease(f, 95, 108)} />
          </svg>
        </Card>
        <Card delay={24} style={{ flex: 1, height: 540 }}>
          <div style={{ fontSize: 34, fontWeight: 600 }}>Mantenimiento</div>
          <div style={{ color: C.muted, fontSize: 24, marginTop: 10 }}>Alertas por kilometraje y órdenes de trabajo.</div>
          {mant.map(([l, v, c], i) => (
            <div key={i} style={{ marginTop: 34 }}>
              <Row style={{ justifyContent: 'space-between', fontSize: 23, color: C.ink }}>
                <span>{l}</span>
                <span style={{ color: c }}>{v}%</span>
              </Row>
              <div style={{ height: 12, background: C.line, borderRadius: 8, marginTop: 10 }}>
                <div style={{ height: '100%', width: `${ease(f, 50 + i * 12, 100 + i * 12) * v}%`, background: c, borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </Card>
        <Card delay={34} style={{ flex: 1, height: 540 }}>
          <div style={{ fontSize: 34, fontWeight: 600 }}>Telemática</div>
          <div style={{ color: C.muted, fontSize: 24, marginTop: 10 }}>Velocidad, paradas y uso de cada vehículo.</div>
          <Row style={{ alignItems: 'flex-end', gap: 14, height: 250, marginTop: 40 }}>
            {bars.map((b, i) => (
              <div key={i} style={{ flex: 1, height: `${ease(f, 60 + i * 5, 100 + i * 5) * b * 2.5}px`, background: `linear-gradient(${C.blue}, #1a5c99)`, borderRadius: '8px 8px 0 0' }} />
            ))}
          </Row>
        </Card>
      </Row>
    </AbsoluteFill>
  )
}
