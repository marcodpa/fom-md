import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Bg, Card, Count, Headline, Logo, Pill, Sub, ease, useIn } from './ui'
import { C } from './theme'

const Row: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', ...style }}>{children}</div>
)

/* 5 · Seguridad: eventos, video y coaching */
export const Seguridad: React.FC = () => {
  const f = useCurrentFrame()
  const events: [string, string, number][] = [
    ['Frenada brusca', C.amber, 60],
    ['Exceso de velocidad', C.red, 95],
    ['Aceleración fuerte', C.amber, 130],
    ['Posible fatiga', C.red, 165],
  ]
  const score = ease(f, 60, 200) * 86
  const R = 90
  return (
    <AbsoluteFill>
      <Bg />
      <div style={{ position: 'absolute', left: 120, top: 100, width: 1500 }}>
        <Headline text="Conductores protegidos, vehículos cuidados." size={76} accent="protegidos," />
      </div>
      <Row style={{ position: 'absolute', left: 120, right: 120, top: 330, gap: 32, alignItems: 'stretch' }}>
        <Card delay={10} style={{ flex: 1.5, padding: 22, height: 560 }}>
          <div style={{ position: 'relative', height: 370, borderRadius: 14, background: 'linear-gradient(135deg,#0d2236,#050b12)', overflow: 'hidden' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ position: 'absolute', left: '50%', width: 10, height: 60, background: '#ffffff40', top: ((i * 80 + f * 6) % 480) - 60, transform: `translateX(-50%) scaleY(${1 + (((i * 80 + f * 6) % 480) / 480) * 2})` }} />
            ))}
            <div style={{ position: 'absolute', left: 18, top: 16 }}>
              <Pill color={C.red} delay={100}>● Evento: exceso de velocidad</Pill>
            </div>
            <div style={{ position: 'absolute', right: 18, top: 16, fontSize: 22, color: C.muted }}>CAM-01</div>
          </div>
          <div style={{ marginTop: 28, height: 10, background: C.line, borderRadius: 6, position: 'relative' }}>
            <div style={{ width: `${ease(f, 20, 200) * 100}%`, height: '100%', background: C.blue, borderRadius: 6 }} />
            {events.map(([, c, t], i) => (
              <div key={i} style={{ position: 'absolute', left: `${((t - 20) / 180) * 100}%`, top: -8, width: 6, height: 26, borderRadius: 3, background: c, opacity: ease(f, t, t + 6) }} />
            ))}
          </div>
        </Card>
        <Card delay={18} style={{ flex: 1, height: 560 }}>
          <div style={{ fontSize: 30, fontWeight: 600 }}>Eventos detectados</div>
          {events.map(([l, c, t], i) => {
            const p = ease(f, t, t + 12)
            return (
              <Row key={i} style={{ gap: 14, marginTop: 20, opacity: p, transform: `translateX(${(1 - p) * 40}px)`, fontSize: 24 }}>
                <span style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
                {l}
              </Row>
            )
          })}
        </Card>
        <Card delay={26} style={{ flex: 0.8, height: 560, alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, fontWeight: 600, alignSelf: 'flex-start' }}>Coaching</div>
          <svg width="260" height="260" viewBox="-130 -130 260 260" style={{ marginTop: 40 }}>
            <circle r={R} fill="none" stroke={C.line} strokeWidth="18" />
            <circle r={R} fill="none" stroke={C.green} strokeWidth="18" strokeLinecap="round" strokeDasharray={2 * Math.PI * R} strokeDashoffset={2 * Math.PI * R * (1 - score / 100)} transform="rotate(-90)" />
            <text textAnchor="middle" dy="16" fontSize="54" fontWeight="600" fill={C.ink} fontFamily="inherit">{Math.round(score)}</text>
          </svg>
          <div style={{ color: C.muted, fontSize: 22, marginTop: 24, textAlign: 'center' }}>Puntaje de manejo de cada conductor</div>
        </Card>
      </Row>
    </AbsoluteFill>
  )
}

/* 6 · Áreas: organiza por zona, sede o contrato */
export const Areas: React.FC = () => {
  const f = useCurrentFrame()
  const root = { x: 960, y: 420 }
  const nodes = [
    { x: 380, y: 760, l: 'Sede Maracaibo', n: '42 unidades', c: C.blue },
    { x: 960, y: 800, l: 'Zona Norte', n: '31 unidades', c: C.green },
    { x: 1540, y: 760, l: 'Contrato Petrolero', n: '55 unidades', c: C.amber },
  ]
  return (
    <AbsoluteFill>
      <Bg />
      <div style={{ position: 'absolute', left: 120, top: 90, width: 1500 }}>
        <Headline text="Organiza tu flota por zona, sede o contrato." size={72} accent="organiza" />
      </div>
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        {nodes.map((n, i) => (
          <path key={i} d={`M${root.x} ${root.y + 60} C ${root.x} ${root.y + 200}, ${n.x} ${n.y - 220}, ${n.x} ${n.y - 60}`} fill="none" stroke={n.c} strokeWidth="3" opacity="0.8" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(f, 40 + i * 14, 90 + i * 14)} />
        ))}
      </svg>
      <div style={{ position: 'absolute', left: root.x - 220, top: root.y - 60, width: 440 }}>
        <Card delay={14} style={{ textAlign: 'center', padding: 22 }}>
          <div style={{ fontSize: 22, color: C.muted }}>Tu empresa</div>
          <div style={{ fontSize: 40, fontWeight: 600 }}>128 unidades</div>
        </Card>
      </div>
      {nodes.map((n, i) => (
        <div key={i} style={{ position: 'absolute', left: n.x - 210, top: n.y - 60, width: 420 }}>
          <Card delay={60 + i * 14} style={{ textAlign: 'center', padding: 22, borderColor: `${n.c}88` }}>
            <div style={{ fontSize: 32, fontWeight: 600 }}>{n.l}</div>
            <div style={{ fontSize: 24, color: n.c, marginTop: 6 }}>{n.n}</div>
          </Card>
        </div>
      ))}
      <div style={{ position: 'absolute', left: 120, right: 120, bottom: 70, textAlign: 'center' }}>
        <Sub delay={130}>Cada equipo ve solo lo suyo. Tú ves todo.</Sub>
      </div>
    </AbsoluteFill>
  )
}

/* 7 · Roles y permisos */
export const Roles: React.FC = () => {
  const f = useCurrentFrame()
  const cols = ['Ver flota', 'Editar unidades', 'Crear usuarios', 'Ver reportes']
  const rows: [string, boolean[]][] = [
    ['Administrador', [true, true, true, true]],
    ['Supervisor', [true, true, false, true]],
    ['Conductor', [true, false, false, false]],
  ]
  return (
    <AbsoluteFill>
      <Bg globe={false} />
      <div style={{ position: 'absolute', left: 120, top: 100, width: 1500 }}>
        <Headline text="Cada persona ve y hace lo que le toca." size={80} accent="toca." />
      </div>
      <Card delay={14} style={{ position: 'absolute', left: 120, right: 120, top: 360, padding: 0, overflow: 'hidden' }}>
        <Row style={{ padding: '24px 36px', borderBottom: `1px solid ${C.line}`, color: C.muted, fontSize: 24 }}>
          <div style={{ flex: 1.3 }} />
          {cols.map(c => (
            <div key={c} style={{ flex: 1, textAlign: 'center' }}>{c}</div>
          ))}
        </Row>
        {rows.map(([r, perms], ri) => (
          <Row key={r} style={{ padding: '30px 36px', borderBottom: ri < 2 ? `1px solid ${C.line}` : 'none', fontSize: 30 }}>
            <div style={{ flex: 1.3, fontWeight: 600 }}>{r}</div>
            {perms.map((ok, ci) => {
              const p = ease(f, 40 + ri * 20 + ci * 8, 52 + ri * 20 + ci * 8)
              return (
                <div key={ci} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <svg width="44" height="44" viewBox="0 0 44 44" style={{ opacity: p, transform: `scale(${0.5 + p * 0.5})` }}>
                    {ok ? (
                      <>
                        <circle cx="22" cy="22" r="20" fill={`${C.green}30`} stroke={C.green} strokeWidth="2" />
                        <path d="M12 23 l7 7 l13 -14" stroke={C.green} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    ) : (
                      <path d="M14 22 h16" stroke={C.line} strokeWidth="4" strokeLinecap="round" />
                    )}
                  </svg>
                </div>
              )
            })}
          </Row>
        ))}
      </Card>
      <div style={{ position: 'absolute', left: 120, right: 120, bottom: 90 }}>
        <Sub delay={110}>Accesos por rol, empresa y zona. Los datos de una empresa nunca se mezclan con los de otra.</Sub>
      </div>
    </AbsoluteFill>
  )
}

/* 8 · Beneficios */
export const Beneficios: React.FC = () => {
  const stats: [number, string, string, string][] = [
    [1, '', 'panel para toda la flota', C.green],
    [24, '/7', 'visibilidad de cada unidad', C.blue],
    [3, '', 'roles con permisos propios', C.amber],
    [0, ' papeles', 'inspecciones desde el teléfono', C.blue],
  ]
  return (
    <AbsoluteFill>
      <Bg />
      <div style={{ position: 'absolute', left: 120, top: 110, width: 1500 }}>
        <Headline text="Más claridad para decidir." size={92} accent="claridad" />
      </div>
      <Row style={{ position: 'absolute', left: 120, right: 120, top: 420, gap: 28 }}>
        {stats.map(([n, s, l, c], i) => (
          <Card key={i} delay={16 + i * 10} style={{ flex: 1, height: 400, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 110, fontWeight: 600, color: c, letterSpacing: '-0.04em' }}>
              <Count to={n} delay={20 + i * 10} suffix={s} />
            </div>
            <div style={{ fontSize: 28, color: C.muted, lineHeight: 1.35 }}>{l}</div>
          </Card>
        ))}
      </Row>
    </AbsoluteFill>
  )
}

/* 9 · Cierre */
export const Cierre: React.FC = () => {
  const f = useCurrentFrame()
  const p = useIn(40)
  return (
    <AbsoluteFill>
      <Bg />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 0 }}>
        <Logo size={120} />
        <Headline text="Empieza a controlar tu flota con FOM." size={100} delay={8} accent="FOM." style={{ marginTop: 34, width: 1500 }} />
        <div style={{ marginTop: 50, opacity: p, transform: `translateY(${(1 - p) * 30}px) scale(${1 + Math.sin(f / 10) * 0.012})` }}>
          <div style={{ display: 'inline-block', padding: '22px 52px', borderRadius: 14, background: C.btn, fontSize: 34, fontWeight: 500, boxShadow: `0 20px 50px -15px ${C.btn}` }}>
            Solicita tu demostración
          </div>
        </div>
        <Sub delay={60} style={{ marginTop: 34, fontSize: 30 }}>fom.md</Sub>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
