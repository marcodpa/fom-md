// FOM motion loop (9:16, 12.6 s). One protagonist, the location pin, travels through
// colour-block scenes that are revealed from the pin's own position:
// phone → city and sun → road → GPS radar → odometer and gears → phone again (seamless loop).
// Style reference: flat 2D vector shapes, grain, hard colour changes between scenes.
// Everything is driven by one paused-able GSAP timeline, so it can be scrubbed and exported frame by frame.
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import './fom-loop.css'

const W = 720, H = 1280, DURATION = 12.6
const INK = '#06101a', INK2 = '#0b1a2b', BLUE = '#2c9cff', BLUE_D = '#1469c7', BONE = '#efe8d8', CORAL = '#ff5a5f'
const FONT = "'Spline Sans', 'Segoe UI', sans-serif"

function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const range = (n) => Array.from({ length: n }, (_, i) => i)

// --- Pin path keyframes: the protagonist's route through the whole piece ---------------
const SWAP = 11.3 // the travelling pin hands over to the pin inside the phone card
const KEYS = [
  { t: 1.95, x: 330, y: 735, r: 0, s: 0 },
  { t: 2.35, x: 330, y: 640, r: 0, s: 1.25 },
  { t: 3.2, x: 230, y: 430, r: -18, s: 1.1 },
  { t: 4.0, x: 500, y: 330, r: 16, s: 1 },
  { t: 4.9, x: 360, y: 300, r: 0, s: 1 },
  { t: 6.8, x: 360, y: 250, r: 0, s: 1 },
  { t: 7.8, x: 360, y: 640, r: 0, s: 1.5 },
  { t: 9.0, x: 360, y: 640, r: 0, s: 1.5 },
  { t: 9.9, x: 520, y: 330, r: 10, s: 1 },
  { t: 10.5, x: 520, y: 330, r: 10, s: 1 },
  { t: SWAP, x: 360, y: 584, r: 0, s: 0.82 },
]
const ease = (u) => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
function pinAt(t) {
  if (t <= KEYS[0].t) return { ...KEYS[0], s: 0 }
  for (let i = 1; i < KEYS.length; i++) {
    if (t <= KEYS[i].t) {
      const a = KEYS[i - 1], b = KEYS[i], u = ease((t - a.t) / (b.t - a.t))
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, r: a.r + (b.r - a.r) * u, s: a.s + (b.s - a.s) * u }
    }
  }
  return { ...KEYS[KEYS.length - 1] }
}

const PIN = 'M0 48 C-6 40 -30 14 -30 0 A30 30 0 1 1 30 0 C30 14 6 40 0 48Z'

// --- Static geometry (seeded, so every run draws the same piece) ------------------------
const r2 = rng(7)
const BUILDINGS = (() => { const out = []; let x = -20; while (x < 740) { const w = 58 + Math.floor(r2() * 46), h = 300 + Math.floor(r2() * 430); out.push({ x, w, h, i: out.length }); x += w + 4 } return out })()
const WINDOWS = BUILDINGS.flatMap(b => {
  const cols = Math.max(1, Math.floor((b.w - 16) / 20)), rows = Math.floor((b.h - 40) / 38)
  return range(cols * rows).map(k => ({ x: b.x + 10 + (k % cols) * 20, y: H - b.h + 24 + Math.floor(k / cols) * 38, on: r2() > 0.45, d: 0.9 + r2() * 1.3, o: 0.35 + r2() * 0.55 }))
}).filter(w => w.on)
const SPARKS = range(34).map(() => ({ x: 120 + r2() * 480, y: 560 + r2() * 300, r: 2 + r2() * 4, d: r2() * 1.4, rise: 260 + r2() * 360 }))
const STARS = range(70).map(() => ({ x: r2() * W, y: r2() * H, r: 0.8 + r2() * 2, o: 0.25 + r2() * 0.6 }))
const TILES = range(25).map(k => ({ x: 360 + ((k % 5) - 2) * 50 - 21, y: 640 + (Math.floor(k / 5) - 2) * 50 - 21, o: 0.2 + r2() * 0.5 }))
const TICKS = range(72).map(k => k * 5)
const BEAMS = range(9).map(k => ({ a: -330 + k * 82, o: 0.14 + (k % 3) * 0.07 }))

function gearPath(cx, cy, ro, ri, n) {
  const pts = []
  for (let i = 0; i < n * 4; i++) {
    const ang = (i / (n * 4)) * Math.PI * 2, rad = (i % 4 === 0 || i % 4 === 1) ? ro : ri
    const a2 = ang - Math.PI / (n * 4) * 0.2 * (i % 2 ? -1 : 1)
    pts.push(`${(cx + Math.cos(a2) * rad).toFixed(1)} ${(cy + Math.sin(a2) * rad).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}

// --- Scenes ---------------------------------------------------------------------------
function Phone({ id, children }) {
  return <g id={id}>
    {range(4).map(i => <circle key={i} cx="-282" cy={-170 + i * 86} r="40" fill="none" stroke={BONE} strokeWidth="9" opacity=".9" />)}
    <rect x="-260" y="-490" width="520" height="980" rx="74" fill={INK2} stroke={BONE} strokeWidth="12" />
    <rect x="-70" y="-462" width="140" height="20" rx="10" fill={BONE} opacity=".35" />
    {children}
  </g>
}

function Bubble({ id, x, y, w, fill, children }) {
  return <g id={id} transform={`translate(${x} ${y})`}><g className="pop"><rect x={-w / 2} y="-46" width={w} height="92" rx="46" fill={fill} />{children}</g></g>
}

export default function FomLoop({ playing = true, exportMode = false, onTimeline }) {
  const root = useRef(null)
  const tlRef = useRef(null)
  const [noise, setNoise] = useState('')

  useEffect(() => {
    const c = document.createElement('canvas'); c.width = c.height = 220
    const g = c.getContext('2d'), img = g.createImageData(220, 220), n = rng(11)
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.floor(n() * 255); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 46 }
    g.putImageData(img, 0, 0); setNoise(c.toDataURL())
  }, [])

  useGSAP(() => {
    const q = gsap.utils.selector(root)
    const el = (s) => root.current.querySelector(s)
    const all = (s) => [...root.current.querySelectorAll(s)]
    const pin = el('#pin'), trail = all('.trail'), dashes = all('.dash'), poles = all('.pole')
    const sweep = el('#sweep')
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
    tlRef.current = tl

    // Reveal a scene with a circle that grows from the pin.
    const reveal = (id, t, d = 0.85) => { const p = pinAt(t); tl.fromTo(`#${id} circle`, { attr: { r: 0, cx: p.x, cy: p.y } }, { attr: { r: 1700 }, duration: d, ease: 'power3.in' }, t) }

    // ---- S1 phone, question, typing, pin launch --------------------------------------
    gsap.set('#phoneA', { x: 300, y: 660, rotation: -8, scale: 1.05 })
    tl.to('#phoneA', { rotation: -5, y: 640, duration: 2.35, ease: 'sine.inOut' }, 0)
    tl.from('#q .pop', { scale: 0, transformOrigin: '0% 100%', duration: 0.6, ease: 'back.out(2)' }, 0.5)
    tl.from('#a .pop', { scale: 0, transformOrigin: '100% 100%', duration: 0.5, ease: 'back.out(2)' }, 1.15)
    tl.from('.tdot', { y: 0, opacity: 0.3, duration: 0.25, stagger: 0.12, repeat: 3, yoyo: true, ease: 'sine.inOut' }, 1.2)
    tl.to('#a .pop', { scale: 0, transformOrigin: '50% 50%', duration: 0.3, ease: 'power3.in' }, 1.85)

    // ---- S2 city and sun ---------------------------------------------------------------
    reveal('c2', 2.35, 0.8)
    tl.from('#sun', { y: 380, duration: 1.6, ease: 'power3.out' }, 2.6)
    BUILDINGS.forEach((b, i) => tl.from(`#b${i}`, { scaleY: 0, svgOrigin: `${b.x + b.w / 2} ${H}`, duration: 0.7, ease: 'power4.out' }, 2.7 + i * 0.045))
    all('.win').forEach((w, i) => { const d = WINDOWS[i]; tl.to(w, { opacity: d.o, duration: 0.18 }, 2.4 + d.d) })
    SPARKS.forEach((s, i) => tl.fromTo(`#sp${i}`, { opacity: 0, y: 0 }, { opacity: 0.9, y: -s.rise, duration: 1.8, ease: 'power1.out', keyframes: { opacity: [0, 0.9, 0], easeEach: 'none' } }, 2.7 + s.d))

    // ---- S3 road, tracking line, truck --------------------------------------------------
    reveal('c3', 4.7, 0.8)
    tl.from('#truck', { y: 1180, duration: 1.4, ease: 'power3.out' }, 4.9)
    tl.to('#truck', { y: 880, duration: 1.8, ease: 'sine.inOut' }, 6.0)
    tl.from('.beam', { opacity: 0, duration: 0.6, stagger: 0.05 }, 4.9)
    tl.to('#track', { strokeDashoffset: -90, duration: 2.2, ease: 'none' }, 4.9)
    tl.from('#track', { opacity: 0, duration: 0.4 }, 5.0)

    // ---- S4 radar ------------------------------------------------------------------------
    reveal('c4', 7.0, 0.8)
    tl.from('.ring', { scale: 0.2, opacity: 0, svgOrigin: '360 640', duration: 0.9, stagger: 0.12, ease: 'back.out(1.4)' }, 7.4)
    tl.to('#sweep', { rotation: 540, svgOrigin: '360 640', duration: 2.3, ease: 'none' }, 7.4)
    tl.to('#orbit', { rotation: 150, svgOrigin: '360 640', duration: 2.4, ease: 'none' }, 7.2)
    tl.from('.tile', { opacity: 0, scale: 0.4, transformOrigin: '50% 50%', duration: 0.4, stagger: { each: 0.02, from: 'center' } }, 7.6)
    ;[0, 1, 2].forEach(k => tl.fromTo(`#ping${k}`, { attr: { r: 18 }, opacity: 0.9 }, { attr: { r: 150 }, opacity: 0, duration: 1.1, ease: 'power1.out' }, 7.9 + k * 0.38))
    tl.from('#cap4', { opacity: 0, y: 24, duration: 0.5 }, 8.1)

    // ---- S5 odometer and gears ----------------------------------------------------------
    reveal('c5', 9.2, 0.8)
    tl.to('#gearA', { rotation: 120, svgOrigin: '250 400', duration: 1.9, ease: 'power2.out' }, 9.4)
    tl.to('#gearB', { rotation: -160, svgOrigin: '470 560', duration: 1.9, ease: 'power2.out' }, 9.4)
    tl.from('#gearA, #gearB', { scale: 0.3, opacity: 0, transformOrigin: '50% 50%', duration: 0.6, ease: 'back.out(1.6)' }, 9.4)
    tl.from('#panel', { y: 260, opacity: 0, duration: 0.6 }, 9.6)
    ;[8, 4, 2, 3, 0].forEach((d, i) => tl.fromTo(`#reel${i}`, { y: 0 }, { y: -d * 150, duration: 0.9, ease: 'back.out(1.2)' }, 9.85 + i * 0.1))
    tl.from('#cap5', { opacity: 0, y: 24, duration: 0.5 }, 10.0)

    // ---- S6 answer: phone with the card, then back to the opening pose ---------------
    reveal('c6', 10.5, 0.8)
    gsap.set('#phoneB', { x: 360, y: 610, rotation: 0, scale: 0.8 })
    tl.from('#phoneB', { scale: 0.4, rotation: 14, duration: 0.8, ease: 'back.out(1.4)' }, 10.75)
    tl.from('#card', { opacity: 0, y: 40, duration: 0.5 }, 11.1)
    tl.from('#cardpin', { opacity: 0 }, SWAP)
    tl.to('#cardpin', { scale: 1.12, svgOrigin: '0 -32', duration: 0.35, yoyo: true, repeat: 1, ease: 'sine.inOut' }, SWAP)
    tl.from('#check', { scale: 0, transformOrigin: '50% 50%', duration: 0.45, ease: 'back.out(2.5)' }, 11.45)
    tl.from('#lockup', { opacity: 0, y: 30, duration: 0.5 }, 11.5)
    tl.to('#lockup', { opacity: 0, duration: 0.3 }, 12.1)
    tl.to('#card', { opacity: 0, duration: 0.35 }, 12.05)
    tl.to('#phoneB', { x: 300, y: 660, rotation: -8, scale: 1.05, duration: 0.55, ease: 'power3.inOut' }, 12.05)

    // ---- Pin, trail and per-frame procedural parts (deterministic in t) ------------------
    const state = { t: 0 }
    const render = (t) => {
      const p = pinAt(t), live = p.s > 0.02 && t < SWAP
      const bob = live ? Math.sin(t * 6) * 5 * Math.min(1, p.s) : 0
      pin.setAttribute('transform', `translate(${p.x} ${p.y + bob}) rotate(${p.r}) scale(${Math.max(p.s, 0.001)})`)
      pin.style.opacity = live ? 1 : 0
      trail.forEach((c, k) => {
        const tq = pinAt(t - (k + 1) * 0.06)
        const show = live && tq.s > 0.3 && t - (k + 1) * 0.06 > 2.2
        c.setAttribute('cx', tq.x); c.setAttribute('cy', tq.y + 22 * tq.s); c.setAttribute('r', Math.max(0, (9 - k * 0.55) * Math.min(1, tq.s)))
        c.style.opacity = show ? 0.75 - k * 0.055 : 0
      })
      if (t > 4.6 && t < 7.4) {
        const ph = ((t - 4.6) * 0.85) % 1
        dashes.forEach((d, k) => {
          const u0 = (k + ph) / dashes.length, u1 = u0 + 0.05
          const y0 = 330 + 950 * u0 * u0, y1 = 330 + 950 * u1 * u1
          const h0 = 2 + (y0 - 330) / 950 * 22, h1 = 2 + (y1 - 330) / 950 * 22
          d.setAttribute('d', `M${360 - h0} ${y0}L${360 + h0} ${y0}L${360 + h1} ${y1}L${360 - h1} ${y1}Z`)
        })
        poles.forEach((pl, k) => {
          const side = k % 2 ? 1 : -1, u = (Math.floor(k / 2) + ph) / (poles.length / 2), y = 330 + 950 * u * u
          const road = (y - 330) / 950 * 420, hgt = 14 + (y - 330) * 0.36, wid = 3 + (y - 330) * 0.02
          pl.setAttribute('x', 360 + side * (road + 40 + (y - 330) * 0.1) - wid / 2); pl.setAttribute('y', y - hgt); pl.setAttribute('width', wid); pl.setAttribute('height', hgt)
        })
      }
    }
    tl.to(state, { t: DURATION, duration: DURATION, ease: 'none', onUpdate: () => render(state.t) }, 0)
    tl.to({}, { duration: 0 }, DURATION) // pad so the timeline is exactly DURATION long
    render(0)
    if (onTimeline) onTimeline(tl)
    if (exportMode) { window.__fomSeek = (t) => { tl.time(t, false); render(t) }; window.__fomLoopReady = true }
    else if (playing) tl.repeat(-1).play(0)
  }, { scope: root, dependencies: [exportMode] })

  useEffect(() => { const tl = tlRef.current; if (!tl || exportMode) return; playing ? tl.play() : tl.pause() }, [playing, exportMode])

  return <div className="fom-loop" ref={root}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Animación: una pregunta en el celular, «¿Dónde está la unidad 14?», y un pin de ubicación que recorre la ciudad, la carretera, el radar GPS y el odómetro hasta mostrar la unidad en ruta.">
      <defs>
        <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#47a8ff" /><stop offset="1" stopColor="#0f5fc2" /></linearGradient>
        <radialGradient id="gSun" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor={BONE} stopOpacity=".55" /><stop offset="1" stopColor={BONE} stopOpacity="0" /></radialGradient>
        <linearGradient id="gRoad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a2342" /><stop offset="1" stopColor={BLUE_D} /></linearGradient>
        <linearGradient id="gBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={BLUE} stopOpacity="0" /><stop offset="1" stopColor={BLUE} stopOpacity=".9" /></linearGradient>
        <linearGradient id="gSweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={BLUE} stopOpacity="0" /><stop offset="1" stopColor={BLUE} stopOpacity=".55" /></linearGradient>
        <radialGradient id="gRadar" cx=".5" cy=".5" r=".6"><stop offset="0" stopColor="#0d2f55" /><stop offset="1" stopColor={INK} /></radialGradient>
        <radialGradient id="gVig" cx=".5" cy=".5" r=".75"><stop offset=".6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".5" /></radialGradient>
        {['c2', 'c3', 'c4', 'c5', 'c6'].map(id => <clipPath key={id} id={id}><circle cx="360" cy="640" r="0" /></clipPath>)}
        <clipPath id="radarClip"><circle cx="360" cy="640" r="300" /></clipPath>
        {range(5).map(i => <clipPath key={i} id={`rw${i}`}><rect x={78 + i * 104} y="780" width="92" height="150" rx="12" /></clipPath>)}
        {noise && <pattern id="grain" width="220" height="220" patternUnits="userSpaceOnUse"><image href={noise} width="220" height="220" /></pattern>}
      </defs>

      {/* S1 */}
      <rect width={W} height={H} fill={INK} />
      <Phone id="phoneA">
        <Bubble id="q" x="-40" y="-190" w="410" fill={BONE}><text x="0" y="9" textAnchor="middle" fontFamily={FONT} fontSize="27" fontWeight="600" fill={INK}>¿Dónde está la unidad 14?</text></Bubble>
        <Bubble id="a" x="100" y="-60" w="170" fill={BLUE}>{range(3).map(i => <circle key={i} className="tdot" cx={-40 + i * 40} cy="0" r="9" fill="#fff" />)}</Bubble>
      </Phone>

      {/* S2 city and sun */}
      <g clipPath="url(#c2)"><rect width={W} height={H} fill="url(#gSky)" />
        <g id="sun"><circle cx="360" cy="800" r="470" fill="url(#gSun)" /><circle cx="360" cy="800" r="250" fill={BONE} /></g>
        {SPARKS.map((s, i) => <circle key={i} id={`sp${i}`} cx={s.x} cy={s.y} r={s.r} fill={BONE} opacity="0" />)}
        {BUILDINGS.map(b => <rect key={b.i} id={`b${b.i}`} x={b.x} y={H - b.h} width={b.w} height={b.h} fill={INK} />)}
        {WINDOWS.map((w, i) => <rect key={i} className="win" x={w.x} y={w.y} width="9" height="15" rx="2" fill={BONE} opacity="0" />)}
        <rect y="1240" width={W} height="60" fill={INK} /></g>

      {/* S3 road */}
      <g clipPath="url(#c3)"><rect width={W} height={H} fill={INK} />
        <circle cx="360" cy="330" r="150" fill="#0f3a6b" opacity=".7" /><circle cx="360" cy="330" r="80" fill="#2c9cff" opacity=".35" />
        {BEAMS.map((b, i) => <polygon key={i} className="beam" points={`360,330 ${360 + b.a - 22},1280 ${360 + b.a + 22},1280`} fill="url(#gBeam)" opacity={b.o} />)}
        <polygon points="360,330 -60,1280 780,1280" fill="url(#gRoad)" opacity=".92" />
        <polyline points="360,330 -60,1280" stroke={BONE} strokeWidth="5" fill="none" /><polyline points="360,330 780,1280" stroke={BONE} strokeWidth="5" fill="none" />
        {range(9).map(k => <path key={k} className="dash" d="M0 0" fill={BONE} />)}
        {range(14).map(k => <rect key={k} className="pole" x="0" y="0" width="4" height="10" fill={BONE} opacity=".8" />)}
        <line id="track" x1="360" y1="300" x2="360" y2="780" stroke={BONE} strokeWidth="5" strokeDasharray="14 16" strokeLinecap="round" opacity=".8" />
        <g id="truck" transform="translate(360 900)"><rect x="-95" y="-150" width="190" height="230" rx="10" fill="#0b1b2e" stroke={BLUE} strokeWidth="5" /><rect x="-70" y="-188" width="140" height="42" rx="8" fill="#0b1b2e" stroke={BLUE} strokeWidth="5" /><line x1="0" y1="-150" x2="0" y2="80" stroke={BLUE} strokeWidth="3" opacity=".6" />
          <circle cx="-66" cy="52" r="12" fill={CORAL} /><circle cx="66" cy="52" r="12" fill={CORAL} /><rect x="-84" y="80" width="40" height="22" rx="6" fill={INK} /><rect x="44" y="80" width="40" height="22" rx="6" fill={INK} /></g>
      </g>

      {/* S4 radar */}
      <g clipPath="url(#c4)"><rect width={W} height={H} fill="url(#gRadar)" />
        {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={BONE} opacity={s.o} />)}
        <circle className="ring" cx="360" cy="640" r="300" fill="none" stroke={BONE} strokeWidth="5" />
        <circle className="ring" cx="360" cy="640" r="300" fill="none" stroke={BONE} strokeWidth="22" strokeDasharray="2.4 24.5" opacity=".7" />
        <circle className="ring" cx="360" cy="640" r="210" fill="none" stroke={BLUE} strokeWidth="3" opacity=".7" />
        <circle className="ring" cx="360" cy="640" r="120" fill="none" stroke={BLUE} strokeWidth="3" opacity=".7" />
        <g clipPath="url(#radarClip)"><path id="sweep" d="M360 640 L660 640 A300 300 0 0 0 575 428 Z" fill="url(#gSweep)" /></g>
        {TILES.map((t, i) => <rect key={i} className="tile" x={t.x} y={t.y} width="42" height="42" rx="7" fill={BLUE} opacity={t.o} />)}
        <g id="orbit">{[20, 95, 170, 245, 320].map((a, i) => <circle key={i} cx={360 + Math.cos(a * Math.PI / 180) * 300} cy={640 + Math.sin(a * Math.PI / 180) * 300} r={i % 2 ? 8 : 12} fill={i === 2 ? CORAL : BONE} />)}</g>
        {[0, 1, 2].map(k => <circle key={k} id={`ping${k}`} cx="360" cy="640" r="18" fill="none" stroke={BLUE} strokeWidth="5" opacity="0" />)}
        <text id="cap4" x="360" y="1130" textAnchor="middle" fontFamily={FONT} fontSize="34" fontWeight="600" fill={BONE}>Posición cada 10 segundos</text></g>

      {/* S5 odometer and gears */}
      <g clipPath="url(#c5)"><rect width={W} height={H} fill={BONE} />
        <path id="gearA" d={gearPath(250, 400, 175, 140, 12)} fill={INK} /><circle cx="250" cy="400" r="52" fill={BONE} />
        <path id="gearB" d={gearPath(470, 560, 112, 88, 9)} fill={BLUE} /><circle cx="470" cy="560" r="34" fill={BONE} />
        <g id="panel"><rect x="48" y="740" width="624" height="230" rx="34" fill={INK} />
          {range(5).map(i => <g key={i}><rect x={78 + i * 104} y="780" width="92" height="150" rx="12" fill={INK2} />
            <g clipPath={`url(#rw${i})`}><g id={`reel${i}`}>{range(10).map(d => <text key={d} x={124 + i * 104} y={780 + d * 150 + 112} textAnchor="middle" fontFamily={FONT} fontSize="112" fontWeight="700" fill={BONE}>{d}</text>)}</g></g></g>)}
          <text x="632" y="925" textAnchor="end" fontFamily={FONT} fontSize="36" fontWeight="600" fill={BLUE}>km</text></g>
        <text id="cap5" x="360" y="1120" textAnchor="middle" fontFamily={FONT} fontSize="34" fontWeight="600" fill={INK}>Aviso de servicio cada 5.000 km</text></g>

      {/* S6 answer */}
      <g clipPath="url(#c6)"><rect width={W} height={H} fill={INK} />
        <Phone id="phoneB">
          <g id="card">
            <rect x="-226" y="-400" width="452" height="650" rx="36" fill="#0e2238" />
            {range(9).map(i => <line key={`h${i}`} x1="-226" x2="226" y1={-350 + i * 70} y2={-350 + i * 70} stroke={BLUE} strokeWidth="2" opacity=".25" />)}
            {range(7).map(i => <line key={`v${i}`} y1="-400" y2="170" x1={-210 + i * 70} x2={-210 + i * 70} stroke={BLUE} strokeWidth="2" opacity=".25" />)}
            <path d="M-226 60 C-110 0 -60 100 40 30 S170 -80 226 -110" fill="none" stroke={BLUE} strokeWidth="9" strokeLinecap="round" opacity=".9" />
            <circle cx="0" cy="-32" r="70" fill={BLUE} opacity=".18" />
            <g id="cardpin" transform="translate(0 -32)"><path d={PIN} fill={BLUE} stroke={INK} strokeWidth="6" strokeLinejoin="round" /><circle r="11" cy="0" fill={BONE} /></g>
            <rect x="-226" y="170" width="452" height="80" fill="#0b1a2b" />
            <text x="-196" y="222" fontFamily={FONT} fontSize="32" fontWeight="700" fill={BONE}>Unidad 14 · En ruta</text>
            <g id="check" transform="translate(186 210)"><circle r="22" fill={BLUE} /><path d="M-10 0 L-3 8 L11 -8" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></g>
          </g>
        </Phone>
        <g id="lockup"><text x="360" y="1175" textAnchor="middle" fontFamily={FONT} fontSize="54" fontWeight="700" fill={BONE}>FOM</text>
          <text x="360" y="1218" textAnchor="middle" fontFamily={FONT} fontSize="24" fill={BONE} opacity=".85">La oficina y la carretera, conectadas.</text></g></g>

      {/* protagonist */}
      {range(12).map(k => <circle key={k} className="trail" cx="0" cy="0" r="0" fill={BLUE} opacity="0" />)}
      <g id="pin" opacity="0"><path d={PIN} fill={BLUE} stroke={INK} strokeWidth="6" strokeLinejoin="round" /><circle r="11" fill={BONE} /></g>

      <text x="360" y="1262" textAnchor="middle" fontFamily={FONT} fontSize="17" fill={BONE} opacity=".45">Datos de demostración</text>
      {noise && <rect width={W} height={H} fill="url(#grain)" opacity=".5" style={{ mixBlendMode: 'overlay' }} />}
      <rect width={W} height={H} fill="url(#gVig)" />
    </svg>
  </div>
}
