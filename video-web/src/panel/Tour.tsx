import React from 'react'
import { AbsoluteFill, Easing, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Bg } from '../ui'
import { C } from '../theme'

export type Rect = { x: number; y: number; w: number; h: number }
export type Callout = { t: number; dur: number; texto: string; rect?: Rect; lado?: 'arriba' | 'abajo' | 'izq' | 'der' }
export type Punto = { t: number; texto: string; nuevo?: boolean }
export type Zoom = { t: number; cx: number; cy: number; s: number }
export type TourCfg = {
  clip: string
  desde: number
  hasta: number
  num: string
  titulo: string
  subtitulo: string
  puntos: Punto[]
  callouts?: Callout[]
  zooms?: Zoom[]
  velocidad?: number
}

const FPS = 30
export const duracionTour = (c: TourCfg) => Math.round(((c.hasta - c.desde) / (c.velocidad ?? 1)) * FPS)

// Ventana donde se ve el panel: 1920×1080 reducido a 0,75.
const WX = 60
const WY = 196
const WW = 1440
const WH = 810
const BASE = 0.75

const suave = Easing.bezier(0.4, 0, 0.2, 1)

/**
 * Estado del zoom (escala y desplazamiento) en el instante t. Cada clave es «a partir de t el zoom está aquí»;
 * el movimiento hacia ella empieza 1,1 s antes y se queda quieto hasta la siguiente.
 */
function estadoZoom(zooms: Zoom[] | undefined, t: number) {
  const claves = [{ t: -100, cx: 960, cy: 540, s: 1 }, ...(zooms ?? [])].sort((x, y) => x.t - y.t)
  let a = claves[0]
  for (const k of claves) if (k.t <= t) a = k
  const sig = claves.find((k) => k.t > t)
  const e = sig ? suave(Math.min(1, Math.max(0, (t - (sig.t - 1.1)) / 1.1))) : 0
  const to = sig ?? a
  const s = a.s + (to.s - a.s) * e
  const cx = a.cx + (to.cx - a.cx) * e
  const cy = a.cy + (to.cy - a.cy) * e
  const S = BASE * s
  const tx = Math.min(0, Math.max(WW - 1920 * S, WW / 2 - cx * S))
  const ty = Math.min(0, Math.max(WH - 1080 * S, WH / 2 - cy * S))
  return { S, tx, ty }
}

export const Tour: React.FC<TourCfg> = (cfg) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const v = cfg.velocidad ?? 1
  const t = cfg.desde + (f / fps) * v
  const entra = spring({ frame: f, fps, config: { damping: 22, stiffness: 120 } })
  const { S, tx, ty } = estadoZoom(cfg.zooms, t)
  const proy = (r: Rect) => ({ x: tx + r.x * S, y: ty + r.y * S, w: r.w * S, h: r.h * S })

  return (
    <AbsoluteFill>
      <Bg globe={false} />
      {/* Título */}
      <div style={{ position: 'absolute', left: 60, top: 40, opacity: entra, transform: `translateY(${(1 - entra) * 18}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.blue, border: `1.5px solid ${C.blue}88`, borderRadius: 10, padding: '4px 14px', background: '#349bfa18' }}>{cfg.num}</div>
          <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.035em' }}>{cfg.titulo}</div>
        </div>
        <div style={{ fontSize: 25, color: C.muted, marginTop: 8, marginLeft: 2 }}>{cfg.subtitulo}</div>
      </div>

      {/* Ventana con el video real */}
      <div style={{ position: 'absolute', left: WX, top: WY, width: WW, height: WH, borderRadius: 18, overflow: 'hidden', border: `1px solid ${C.line}`, boxShadow: '0 40px 90px -30px #000, 0 0 0 1px #349bfa22, 0 0 80px -20px #349bfa44', background: '#071019', transform: `scale(${0.94 + entra * 0.06})`, transformOrigin: 'center', opacity: Math.min(1, entra * 1.4) }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${S})` }}>
          <OffthreadVideo src={staticFile(`clips/${cfg.clip}.mp4`)} startFrom={Math.round(cfg.desde * fps)} playbackRate={v} muted style={{ width: 1920, height: 1080 }} />
        </div>
        {(cfg.callouts ?? []).map((c, i) => (
          <Senal key={i} c={c} t={t} proy={proy} />
        ))}
      </div>

      {/* Notas a la derecha */}
      <div style={{ position: 'absolute', left: 1540, top: WY, width: 320 }}>
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '0.12em', color: C.muted, marginBottom: 16, opacity: entra }}>EN ESTA PANTALLA</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cfg.puntos.map((p, i) => (
            <PuntoNota key={i} p={p} t={t} activo={i === ultimoActivo(cfg.puntos, t)} />
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 1540, bottom: 62, width: 320, fontSize: 15, color: '#7f93a8', lineHeight: 1.4 }}>Video real del panel de FOM con datos de demostración.</div>
    </AbsoluteFill>
  )
}

const ultimoActivo = (puntos: Punto[], t: number) => {
  let r = -1
  puntos.forEach((p, i) => { if (p.t <= t) r = i })
  return r
}

const PuntoNota: React.FC<{ p: Punto; t: number; activo: boolean }> = ({ p, t, activo }) => {
  const f = useCurrentFrame()
  const aparecio = t >= p.t
  const k = aparecio ? Math.min(1, Math.max(0, (t - p.t) / 0.45)) : 0
  void f
  const e = suave(k)
  return (
    <div style={{ opacity: e, transform: `translateX(${(1 - e) * 40}px)`, display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 14, background: activo ? 'linear-gradient(180deg,#12263a,#0e1c29)' : '#0b1824aa', border: `1px solid ${activo ? C.blue + '99' : C.line}`, boxShadow: activo ? '0 0 30px -12px #349bfa' : 'none' }}>
      <div style={{ flex: 'none', width: 10, height: 10, borderRadius: 5, marginTop: 9, background: p.nuevo ? C.green : C.blue, boxShadow: `0 0 12px ${p.nuevo ? C.green : C.blue}` }} />
      <div style={{ fontSize: 22, lineHeight: 1.3, fontWeight: 500 }}>
        {p.nuevo && <span style={{ display: 'inline-block', marginRight: 8, fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', color: '#062a1d', background: C.green, borderRadius: 6, padding: '2px 8px', verticalAlign: 2 }}>NUEVO</span>}
        {p.texto}
      </div>
    </div>
  )
}

const Senal: React.FC<{ c: Callout; t: number; proy: (r: Rect) => { x: number; y: number; w: number; h: number } }> = ({ c, t, proy }) => {
  const dentro = t >= c.t && t <= c.t + c.dur
  const k = Math.min(1, Math.max(0, (t - c.t) / 0.35), Math.max(0, (c.t + c.dur - t) / 0.3))
  if (!dentro || k <= 0) return null
  const e = suave(k)
  const lw = Math.min(520, 70 + c.texto.length * 12.5)
  const lh = 54
  if (!c.rect) {
    // Sin recuadro: una nota flotante abajo en el centro de la ventana.
    return (
      <div style={{ position: 'absolute', left: WW / 2 - lw / 2, bottom: 26, width: lw, opacity: e, transform: `translateY(${(1 - e) * 22}px)` }}>
        <Etiqueta texto={c.texto} />
      </div>
    )
  }
  const r = proy(c.rect)
  const pad = 6
  const bx = r.x - pad
  const by = r.y - pad
  const bw = r.w + pad * 2
  const bh = r.h + pad * 2
  const lado = c.lado ?? (by > 100 ? 'arriba' : 'abajo')
  let lx = bx
  let ly = by - lh - 14
  if (lado === 'abajo') ly = by + bh + 14
  if (lado === 'izq') { lx = bx - lw - 14; ly = by + bh / 2 - lh / 2 }
  if (lado === 'der') { lx = bx + bw + 14; ly = by + bh / 2 - lh / 2 }
  lx = Math.max(10, Math.min(WW - lw - 10, lx))
  ly = Math.max(10, Math.min(WH - lh - 10, ly))
  return (
    <>
      <div style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh, borderRadius: 14, border: `3px solid ${C.blue}`, background: '#349bfa14', boxShadow: `0 0 0 ${(1 - e) * 20}px #349bfa22, 0 0 36px #349bfa66`, opacity: e, transform: `scale(${1.04 - e * 0.04})` }} />
      <div style={{ position: 'absolute', left: lx, top: ly, width: lw, opacity: e, transform: `translateY(${(1 - e) * (lado === 'abajo' ? -14 : 14)}px)` }}>
        <Etiqueta texto={c.texto} />
      </div>
    </>
  )
}

const Etiqueta: React.FC<{ texto: string }> = ({ texto }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 14, background: 'linear-gradient(180deg,#14304a,#0d2033)', border: `1.5px solid ${C.blue}`, boxShadow: '0 18px 40px -14px #000, 0 0 30px -10px #349bfa', fontSize: 23, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
    <div style={{ flex: 'none', width: 12, height: 12, borderRadius: 6, background: C.blue, boxShadow: `0 0 12px ${C.blue}` }} />
    <div>{texto}</div>
  </div>
)

