import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion'
import { C, fontFamily } from './theme'

/** Entrada suave: 0→1 con muelle, `delay` en frames. */
export const useIn = (delay = 0, damping = 20) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: f - delay, fps, config: { damping, stiffness: 110, mass: 0.9 } })
}
export const ease = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.22, 1, 0.36, 1) })

/** Fondo común: degradado, rejilla y un globo de meridianos que gira despacio. */
export const Bg: React.FC<{ globe?: boolean }> = ({ globe = true }) => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily, color: C.ink }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 600px at ${70 + Math.sin(f / 90) * 6}% 20%, #12304d 0%, transparent 70%), radial-gradient(700px 500px at 10% 100%, #0b2238 0%, transparent 70%)` }} />
      <AbsoluteFill style={{ opacity: 0.07, backgroundImage: `linear-gradient(${C.ink} 1px, transparent 1px), linear-gradient(90deg, ${C.ink} 1px, transparent 1px)`, backgroundSize: '80px 80px', backgroundPosition: `${f * 0.3}px ${f * 0.3}px` }} />
      {globe && (
        <svg width="1100" height="1100" viewBox="-550 -550 1100 1100" style={{ position: 'absolute', right: -380, bottom: -520, opacity: 0.35 }}>
          <circle r="500" fill="none" stroke={C.blue} strokeWidth="1.5" />
          {[0, 1, 2, 3, 4, 5].map(i => {
            const a = ((f * 0.6 + i * 30) % 180) * (Math.PI / 180)
            return <ellipse key={i} rx={Math.abs(Math.cos(a)) * 500} ry="500" fill="none" stroke={C.blue} strokeWidth="1" opacity="0.7" />
          })}
          {[-300, -150, 0, 150, 300].map(y => <ellipse key={y} cx="0" cy={y} rx={Math.sqrt(250000 - y * y)} ry={Math.sqrt(250000 - y * y) * 0.12} fill="none" stroke={C.blue} strokeWidth="1" opacity="0.6" />)}
        </svg>
      )}
    </AbsoluteFill>
  )
}

/** Titular que entra palabra por palabra. */
export const Headline: React.FC<{ text: string; size?: number; delay?: number; accent?: string; style?: React.CSSProperties }> = ({ text, size = 72, delay = 0, accent, style }) => {
  const words = text.split(' ')
  return (
    <div style={{ fontSize: size, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.1, ...style }}>
      {words.map((w, i) => <Word key={i} delay={delay + i * 4} color={accent && w.replace(/[.,]/g, '') === accent ? C.blue : undefined}>{w}</Word>)}
    </div>
  )
}
const Word: React.FC<{ delay: number; color?: string; children: React.ReactNode }> = ({ delay, color, children }) => {
  const p = useIn(delay)
  return <span style={{ display: 'inline-block', marginRight: '0.26em', opacity: p, transform: `translateY(${(1 - p) * 40}px)`, color }}>{children}</span>
}
export const Sub: React.FC<{ children: React.ReactNode; delay?: number; style?: React.CSSProperties }> = ({ children, delay = 18, style }) => {
  const p = useIn(delay)
  return <p style={{ fontSize: 30, lineHeight: 1.5, color: C.muted, margin: 0, opacity: p, transform: `translateY(${(1 - p) * 20}px)`, ...style }}>{children}</p>
}

export const Card: React.FC<{ delay?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ delay = 0, style, children }) => {
  const p = useIn(delay)
  return <div style={{ background: `linear-gradient(180deg, ${C.panel}, ${C.panel2})`, border: `1px solid ${C.line}`, borderRadius: 20, padding: 28, opacity: p, transform: `translateY(${(1 - p) * 50}px) scale(${0.96 + p * 0.04})`, boxShadow: '0 30px 60px -30px #000a', ...style }}>{children}</div>
}

export const Count: React.FC<{ to: number; delay?: number; suffix?: string; dur?: number }> = ({ to, delay = 0, suffix = '', dur = 45 }) => {
  const f = useCurrentFrame()
  return <>{Math.round(ease(f, delay, delay + dur) * to).toLocaleString('es')}{suffix}</>
}

export const Logo: React.FC<{ size?: number }> = ({ size = 120 }) => {
  const f = useCurrentFrame()
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="#0c2236" stroke={C.blue} strokeWidth="2.5" />
      <circle cx="50" cy="50" r="36" fill="none" stroke={C.blue} strokeWidth="1" opacity="0.45" strokeDasharray="3 5" transform={`rotate(${f * 1.5} 50 50)`} />
      <path d="M50 24 L64 70 L50 61 L36 70 Z" fill={C.blue} />
    </svg>
  )
}

export const Pill: React.FC<{ color?: string; children: React.ReactNode; delay?: number }> = ({ color = C.blue, children, delay = 0 }) => {
  const p = useIn(delay)
  return <span style={{ display: 'inline-block', padding: '8px 18px', borderRadius: 999, fontSize: 22, fontWeight: 500, color, border: `1px solid ${color}55`, background: `${color}18`, opacity: p, transform: `scale(${0.8 + p * 0.2})` }}>{children}</span>
}

/** Marco de teléfono con pantalla oscura. */
export const Phone: React.FC<{ children: React.ReactNode; w?: number; h?: number }> = ({ children, w = 400, h = 820 }) => (
  <div style={{ width: w, height: h, borderRadius: 56, padding: 12, background: 'linear-gradient(145deg,#5b6572,#1b2129 40%,#3a424d)', boxShadow: '0 50px 90px -30px #000, 0 0 0 2px #0008' }}>
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 44, overflow: 'hidden', background: '#091420' }}>
      <div style={{ position: 'absolute', top: 14, left: '50%', width: 110, height: 32, marginLeft: -55, borderRadius: 20, background: '#000', zIndex: 5 }} />
      {children}
    </div>
  </div>
)
