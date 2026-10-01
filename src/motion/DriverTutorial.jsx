// Tutorial en motion (9:16, 17.8 s): cómo usa la app un conductor, con las capturas ORIGINALES
// de la app (src/assets/marketing/real/app-*.webp). Cuatro pasos, cada uno con su color:
// 1 estado de la unidad → 2 inspección → 3 reportar una falla → 4 índice de manejo.
// Cada escena nace del punto donde el dedo acaba de tocar. Una sola línea de tiempo GSAP, exportable cuadro a cuadro.
import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import inicio from '../assets/marketing/real/app-inicio.webp'
import inspeccion from '../assets/marketing/real/app-inspeccion.webp'
import mantenimiento from '../assets/marketing/real/app-mantenimiento.webp'
import perfil from '../assets/marketing/real/app-perfil.webp'
import './fom-loop.css'

const W = 720, H = 1280, DURATION = 17.8
const INK = '#06101a', INK2 = '#0b1a2b', BLUE = '#2c9cff', BLUE_D = '#1469c7', BONE = '#efe8d8', HOT = '#7cc4ff'
const FONT = "'Spline Sans', 'Segoe UI', sans-serif"
const K = 1.0769, OX = 150, OY = 330 // captura 390×844 → pantalla del teléfono en el lienzo
const P = (cx, cy) => [OX + cx * K, OY + cy * K]
const PIN = 'M0 48 C-6 40 -30 14 -30 0 A30 30 0 1 1 30 0 C30 14 6 40 0 48Z'
const range = (n) => Array.from({ length: n }, (_, i) => i)

const STEPS = [
  { n: 1, a: 'Mira el estado', b: 'de tu unidad', sub: 'Combustible, aceite, temperatura y kilometraje', ink: BONE, badge: BONE, badgeInk: BLUE_D },
  { n: 2, a: 'Haz tu inspección', b: 'antes de salir', sub: 'Conforme, Observación o Falla en cada punto', ink: INK, badge: INK, badgeInk: BONE },
  { n: 3, a: 'Reporta una falla', b: 'desde el teléfono', sub: 'Avisa a la oficina, con foto si hace falta', ink: BONE, badge: BLUE, badgeInk: '#fff' },
  { n: 4, a: 'Conoce tu', b: 'índice de manejo', sub: 'Tu puntaje, tus documentos y tu información', ink: BONE, badge: BONE, badgeInk: BLUE_D },
]

// Resaltado + etiqueta, en coordenadas de la captura (390×844).
function Spot({ id, x, y, w, h, label, lw, ly, side = 'top' }) {
  const ty = side === 'top' ? y - 34 : y + h + 34
  return <g id={id} opacity="0">
    <rect className="halo" x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx="22" fill="none" stroke={HOT} strokeWidth="3.5" />
    <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="18" fill={BLUE} opacity=".14" />
    <g transform={`translate(${Math.min(Math.max(x + w / 2, lw / 2 + 10), 380 - lw / 2)} ${ly ?? ty})`}><rect x={-lw / 2} y="-19" width={lw} height="38" rx="19" fill={INK} stroke={HOT} strokeWidth="2" />
      <text y="6" textAnchor="middle" fontFamily={FONT} fontSize="17" fontWeight="700" fill={BONE}>{label}</text></g>
  </g>
}

export default function DriverTutorial({ playing = true, exportMode = false }) {
  const root = useRef(null)
  const tlRef = useRef(null)

  useGSAP(() => {
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
    tlRef.current = tl
    const revealBg = (id, t, [cx, cy], d = 0.8) => tl.fromTo(`#${id} circle`, { attr: { r: 0, cx, cy } }, { attr: { r: 1700 }, duration: d, ease: 'power3.in' }, t)
    const spot = (id, t0, t1) => {
      tl.fromTo(id, { opacity: 0, scale: 0.94, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }, t0)
      tl.to(`${id} .halo`, { strokeOpacity: 0.35, duration: 0.35, yoyo: true, repeat: Math.max(1, Math.round((t1 - t0 - 0.4) / 0.35) - 1), ease: 'sine.inOut' }, t0 + 0.3)
      tl.to(id, { opacity: 0, duration: 0.25, ease: 'power2.in' }, t1)
    }
    const finger = (t, cx, cy, d = 0.55) => tl.to('#touch', { x: cx, y: cy, opacity: 1, duration: d, ease: 'power2.inOut' }, t)
    const tap = (t, cx, cy) => {
      tl.fromTo('#rip', { attr: { cx, cy, r: 6 }, opacity: 0.95 }, { attr: { r: 52 }, opacity: 0, duration: 0.6, ease: 'power2.out' }, t)
      tl.fromTo('#touch circle.core', { scale: 1, transformOrigin: '50% 50%' }, { scale: 0.7, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' }, t - 0.05)
    }

    // ---- Intro ---------------------------------------------------------------------------
    gsap.set('#touch', { x: 195, y: 900, opacity: 0 })
    tl.from('#introPin', { scale: 0, transformOrigin: '50% 100%', duration: 0.6, ease: 'back.out(2)' }, 0.1)
    tl.from('#intro .ln', { y: 70, opacity: 0, duration: 0.7, stagger: 0.12 }, 0.25)
    tl.to('#intro', { y: -60, opacity: 0, duration: 0.4, ease: 'power2.in' }, 1.45)
    gsap.set('#phone', { y: 1400, rotation: 8, svgOrigin: '360 790' })
    tl.to('#phone', { y: 0, rotation: 0, duration: 0.95, ease: 'power3.out', svgOrigin: '360 790' }, 0.95)

    // ---- Paso 1: estado de la unidad ----------------------------------------------------------
    revealBg('s1', 1.7, [360, 790])
    tl.fromTo('#phone', { rotation: -3 }, { rotation: 0, duration: 0.9, ease: 'elastic.out(1,.6)', svgOrigin: '360 790' }, 1.95)
    tl.from('#cap1 .ln', { y: 60, opacity: 0, duration: 0.6, stagger: 0.1 }, 2.15)
    tl.from('#cap1 .badge', { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2.4)' }, 2.1)
    spot('#sp1a', 2.7, 3.55); spot('#sp1b', 3.55, 4.4)
    finger(4.3, 320, 760, 0.6)
    spot('#sp1c', 4.45, 5.15)
    tap(5.0, 320, 740)
    tl.to('#cap1', { opacity: 0, y: -40, duration: 0.3, ease: 'power2.in' }, 5.2)

    // ---- Paso 2: inspección -----------------------------------------------------------------------
    revealBg('s2', 5.05, P(320, 740))
    tl.fromTo('#scr2', { x: 390 }, { x: 0, duration: 0.6, ease: 'power3.out' }, 5.45)
    tl.from('#cap2 .ln', { y: 60, opacity: 0, duration: 0.6, stagger: 0.1 }, 5.55)
    tl.from('#cap2 .badge', { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2.4)' }, 5.5)
    spot('#sp2a', 6.2, 6.85)
    spot('#sp2b', 6.85, 7.95)
    finger(7.1, 78, 441, 0.5)
    tap(7.62, 78, 441)
    tl.fromTo('#press', { opacity: 0 }, { opacity: 1, duration: 0.15 }, 7.65)
    tl.to('#press', { opacity: 0, duration: 0.3 }, 8.05)
    finger(8.0, 243, 828, 0.5)
    tap(8.52, 243, 828)
    tl.to('#cap2', { opacity: 0, y: -40, duration: 0.3, ease: 'power2.in' }, 8.7)

    // ---- Paso 3: reportar una falla ---------------------------------------------------------------
    revealBg('s3', 8.5, P(243, 828))
    tl.fromTo('#scr3', { x: 390 }, { x: 0, duration: 0.6, ease: 'power3.out' }, 8.9)
    tl.from('#cap3 .ln', { y: 60, opacity: 0, duration: 0.6, stagger: 0.1 }, 9.0)
    tl.from('#cap3 .badge', { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2.4)' }, 8.95)
    spot('#sp3a', 9.6, 10.45)
    spot('#sp3b', 10.45, 11.9)
    finger(10.35, 288, 650, 0.55)
    tap(10.98, 288, 650)
    const [sx, sy] = P(288, 650)
    tl.fromTo('#sendDot', { x: sx, y: sy, scale: 0.2, opacity: 0 }, { opacity: 1, scale: 0.9, duration: 0.2 }, 11.02)
    tl.to('#sendDot', { x: 640, y: 200, scale: 0.5, duration: 0.95, ease: 'power2.inOut' }, 11.1)
    tl.to('#sendDot', { opacity: 0, duration: 0.25 }, 12.0)
    tl.fromTo('#sent', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, 11.85)
    tl.to('#sent', { opacity: 0, duration: 0.3 }, 12.45)
    finger(11.9, 340, 828, 0.45)
    tap(12.38, 340, 828)
    tl.to('#cap3', { opacity: 0, y: -40, duration: 0.3, ease: 'power2.in' }, 12.55)

    // ---- Paso 4: índice de manejo -----------------------------------------------------------------
    revealBg('s4', 12.35, P(340, 828))
    tl.fromTo('#scr4', { x: 390 }, { x: 0, duration: 0.6, ease: 'power3.out' }, 12.75)
    tl.from('#cap4 .ln', { y: 60, opacity: 0, duration: 0.6, stagger: 0.1 }, 12.9)
    tl.from('#cap4 .badge', { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2.4)' }, 12.85)
    tl.to('#touch', { opacity: 0, duration: 0.3 }, 12.9)
    spot('#sp4a', 13.45, 14.35); spot('#sp4b', 14.35, 15.35)

    // ---- Cierre ------------------------------------------------------------------------------------
    tl.to('#cap4', { opacity: 0, y: -40, duration: 0.3, ease: 'power2.in' }, 15.2)
    revealBg('s5', 15.25, [360, 790], 0.75)
    tl.to('#phone', { y: 1400, rotation: -6, duration: 0.8, ease: 'power3.in', svgOrigin: '360 790' }, 15.45)
    tl.from('#outroPin', { scale: 0, transformOrigin: '50% 100%', duration: 0.6, ease: 'back.out(2)' }, 16.0)
    tl.from('#outro .ln', { y: 70, opacity: 0, duration: 0.7, stagger: 0.12 }, 16.1)
    tl.from('#lockup2', { opacity: 0, y: 30, duration: 0.6 }, 16.5)
    tl.to('#outro, #lockup2, #outroPin', { opacity: 0, duration: 0.4, ease: 'power2.inOut' }, 17.4)

    // Decorado a la deriva en cada escena.
    ;[['#d1', 2.0, 5.4], ['#d2', 5.1, 8.8], ['#d3', 8.5, 12.5], ['#d4', 12.3, 15.4]].forEach(([id, a, b]) => tl.fromTo(id, { x: -30 }, { x: 40, duration: b - a, ease: 'none' }, a))

    tl.to({}, { duration: 0 }, DURATION)
    if (exportMode) { window.__fomSeek = (t) => { tl.time(t, false) }; window.__fomDuration = DURATION; window.__fomLoopReady = true }
    else if (playing) tl.repeat(-1).play(0)
  }, { scope: root, dependencies: [exportMode] })

  const caption = (s) => <g id={`cap${s.n}`}>
    <g className="badge"><circle cx="96" cy="124" r="44" fill={s.badge} /><text x="96" y="146" textAnchor="middle" fontFamily={FONT} fontSize="60" fontWeight="800" fill={s.badgeInk}>{s.n}</text></g>
    <g style={{ overflow: 'hidden' }}><text className="ln" x="170" y="112" fontFamily={FONT} fontSize="54" fontWeight="700" fill={s.ink} letterSpacing="-1">{s.a}</text>
      <text className="ln" x="170" y="172" fontFamily={FONT} fontSize="54" fontWeight="700" fill={s.ink} letterSpacing="-1">{s.b}</text>
      <text className="ln" x="96" y="240" fontFamily={FONT} fontSize="24" fill={s.ink} opacity=".88">{s.sub}</text></g>
  </g>

  return <div className="fom-loop" ref={root}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tutorial animado en cuatro pasos de cómo un conductor usa la app FOM: ver el estado de su unidad, hacer la inspección, reportar una falla y conocer su índice de manejo.">
      <defs>
        <linearGradient id="tBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#47a8ff" /><stop offset="1" stopColor="#0f5fc2" /></linearGradient>
        <linearGradient id="tBlue2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c9cff" /><stop offset="1" stopColor="#0b4a9c" /></linearGradient>
        {['s1', 's2', 's3', 's4', 's5'].map(id => <clipPath key={id} id={id}><circle cx="360" cy="790" r="0" /></clipPath>)}
        <clipPath id="screenClip"><rect width="390" height="844" rx="44" /></clipPath>
        <radialGradient id="tVig" cx=".5" cy=".5" r=".75"><stop offset=".6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".45" /></radialGradient>
      </defs>

      <rect width={W} height={H} fill={INK} />
      <g id="intro"><g id="introPin" transform="translate(360 330) scale(1.9)"><path d={PIN} fill={BLUE} stroke={INK} strokeWidth="5" strokeLinejoin="round" /><circle r="11" fill={BONE} /></g>
        <g style={{ overflow: 'hidden' }}><text className="ln" x="360" y="620" textAnchor="middle" fontFamily={FONT} fontSize="78" fontWeight="700" fill={BONE} letterSpacing="-2">Tu jornada</text>
          <text className="ln" x="360" y="708" textAnchor="middle" fontFamily={FONT} fontSize="78" fontWeight="700" fill={BONE} letterSpacing="-2">con la app FOM</text>
          <text className="ln" x="360" y="790" textAnchor="middle" fontFamily={FONT} fontSize="34" fill={HOT}>Guía rápida para conductores · 4 pasos</text></g></g>

      <g clipPath="url(#s1)"><rect width={W} height={H} fill="url(#tBlue)" /><g id="d1"><circle cx="640" cy="1180" r="400" fill={BONE} opacity=".13" /><circle cx="60" cy="520" r="290" fill="none" stroke={BONE} strokeWidth="4" opacity=".28" /></g></g>
      <g clipPath="url(#s2)"><rect width={W} height={H} fill={BONE} /><g id="d2"><circle cx="690" cy="1010" r="350" fill={BLUE} /><circle cx="40" cy="640" r="200" fill="none" stroke={INK} strokeWidth="4" opacity=".18" /></g></g>
      <g clipPath="url(#s3)"><rect width={W} height={H} fill={INK} />{range(9).map(i => <line key={i} x1="0" x2={W} y1={300 + i * 110} y2={300 + i * 110} stroke={BLUE} strokeWidth="2" opacity=".14" />)}<g id="d3"><circle cx="40" cy="950" r="380" fill={INK2} /><circle cx="680" cy="560" r="150" fill="none" stroke={BLUE} strokeWidth="4" opacity=".4" /></g></g>
      <g clipPath="url(#s4)"><rect width={W} height={H} fill="url(#tBlue2)" /><g id="d4"><circle cx="90" cy="1150" r="320" fill={BONE} opacity=".14" /><circle cx="660" cy="640" r="210" fill="none" stroke={BONE} strokeWidth="4" opacity=".3" /></g></g>
      <g clipPath="url(#s5)"><rect width={W} height={H} fill={INK} /></g>

      {STEPS.map(caption)}

      <g id="phone">
        <rect x="132" y="312" width="456" height="960" rx="68" fill={INK} stroke={BONE} strokeWidth="9" />
        <g transform={`translate(${OX} ${OY}) scale(${K})`}>
          <g clipPath="url(#screenClip)">
            <image id="scr1" href={inicio} width="390" height="844" />
            <image id="scr2" href={inspeccion} width="390" height="844" />
            <image id="scr3" href={mantenimiento} width="390" height="844" />
            <image id="scr4" href={perfil} width="390" height="844" />
            <rect id="press" x="34" y="421" width="92" height="44" rx="12" fill={BLUE} opacity="0" />
            <Spot id="sp1a" x={20} y={284} w={350} h={62} label="Combustible y aceite" lw={216} />
            <Spot id="sp1b" x={30} y={396} w={330} h={196} label="Temperatura y kilometraje" lw={252} ly={370} />
            <Spot id="sp1c" x={24} y={688} w={342} h={88} label="Empieza tu inspección" lw={226} />
            <Spot id="sp2a" x={14} y={176} w={362} h={76} label="Tu vehículo" lw={150} />
            <Spot id="sp2b" x={14} y={356} w={362} h={126} label="Marca cada punto" lw={196} ly={336} />
            <Spot id="sp3a" x={14} y={146} w={362} h={134} label="Avisos de tu unidad" lw={216} ly={286} />
            <Spot id="sp3b" x={216} y={628} w={143} h={44} label="Reportar falla" lw={160} ly={604} />
            <Spot id="sp4a" x={34} y={188} w={128} h={128} label="76 de 100 · Puedes mejorar" lw={284} ly={170} />
            <Spot id="sp4b" x={14} y={618} w={362} h={186} label="Tus documentos" lw={188} ly={600} />
            <circle id="rip" cx="0" cy="0" r="6" fill="none" stroke="#fff" strokeWidth="5" opacity="0" />
            <g id="touch"><circle r="30" fill="#fff" opacity=".22" /><circle className="core" r="14" fill="#fff" opacity=".9" /><circle r="30" fill="none" stroke="#fff" strokeWidth="3" opacity=".8" /></g>
          </g>
        </g>
        <rect x="290" y="326" width="140" height="18" rx="9" fill={BONE} opacity=".3" />
      </g>

      <g id="sendDot" opacity="0"><path d={PIN} fill={BLUE} stroke={INK} strokeWidth="6" strokeLinejoin="round" /><circle r="11" fill={BONE} /></g>
      <g id="sent" opacity="0" transform="translate(470 292)"><rect x="-120" y="-24" width="240" height="48" rx="24" fill={BLUE} /><text y="8" textAnchor="middle" fontFamily={FONT} fontSize="23" fontWeight="700" fill="#fff">Llega a la oficina</text></g>

      <g id="outroPin" transform="translate(360 350) scale(1.5)"><path d={PIN} fill={BLUE} stroke={INK} strokeWidth="5" strokeLinejoin="round" /><circle r="11" fill={BONE} /></g>
      <g id="outro" style={{ overflow: 'hidden' }}><text className="ln" x="360" y="600" textAnchor="middle" fontFamily={FONT} fontSize="66" fontWeight="700" fill={BONE} letterSpacing="-1.5">La oficina ve</text>
        <text className="ln" x="360" y="680" textAnchor="middle" fontFamily={FONT} fontSize="66" fontWeight="700" fill={BONE} letterSpacing="-1.5">lo que tú registras.</text></g>
      <g id="lockup2"><text x="360" y="850" textAnchor="middle" fontFamily={FONT} fontSize="84" fontWeight="800" fill={BONE}>FOM</text><text x="360" y="900" textAnchor="middle" fontFamily={FONT} fontSize="27" fill={HOT}>La oficina y la carretera, conectadas.</text></g>

      <text x="360" y="1268" textAnchor="middle" fontFamily={FONT} fontSize="17" fill={BONE} opacity=".5">Datos de demostración</text>
      <rect width={W} height={H} fill="url(#tVig)" />
    </svg>
  </div>
}
