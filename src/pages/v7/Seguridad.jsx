// Seguridad. The page opens with event detection (user proposal
// output/laminas-secciones-v7/extra/05-seguridad-00-hero-deteccion-eventos.webp): cab view of a
// mountain road, one demo event from the original panel captures (card, speed chart, map tile).
// Then video safety as a working player (extra/05-seguridad-video.webp), the supervisor panel
// (former hero, slide 05-seguridad/01), coaching in a framed photo, and the driver app tour.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PAGES } from '../../content/pages'
import { V7Section, DemoButton, FaqList, MailPrompt, V7Footer, StickyTour, Frame, AppBackdrop, TextCards, V7Icon, plate, usePageTitle } from '../../components/v7/V7Kit'
import panelSafety from '../../assets/marketing/real/panel-seguridad.webp'
import appHome from '../../assets/marketing/real/app-inicio.webp'
import appProfile from '../../assets/marketing/real/app-perfil.webp'
import eventMap from '../../assets/marketing/v7/05-seguridad/mapa-evento.webp'
import '../../styles/v7/seguridad.css'

const page = PAGES.seguridad
const [events, video, coaching, score, sos] = page.sections
const asCards = (section, icons) => section.bullets.map((b, i) => ({ icon: icons[i], title: b.label, text: b.text }))
const joined = section => section.bullets.map(b => b.text).join(' ')

// Page-specific icons (24 × 24 stroke paths).
const curve = <><path d="M15.5 3.5c-3 0-5.5 1.6-5.5 4s5 2.6 5 5.5-3.5 4-6 5.5L6 21" /><path d="m5 17.5 1 3.5 3.5-.8" /></>
const sliders = <><path d="M3 6h3.5m5 0H21M3 12h9.5m5 0H21M3 18h3.5m5 0H21" /><circle cx="9" cy="6" r="2.4" /><circle cx="15" cy="12" r="2.4" /><circle cx="9" cy="18" r="2.4" /></>
const dualLens = <><rect x="2.5" y="6.5" width="19" height="11" rx="3" /><circle cx="8.3" cy="12" r="2.4" /><circle cx="15.7" cy="12" r="2.4" /></>
const sdCard = <><path d="M8.5 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V5.5Z" /><path d="M9.5 5.5v2.5m2.5-2.5v2.5m2.5-2.5v2.5M9 18.5h6" /></>
const bars = <><path d="M3 21h18" /><path d="M5 20v-5h3v5M10.5 20v-9h3v9M16 20V5h3v15" /></>
const siren = <><path d="M7 18v-5.5a5 5 0 0 1 10 0V18" /><path d="M4.5 18h15v3h-15ZM12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4M10 13a2 2 0 0 1 2-2" /></>
const car = <><path d="M5 11.5 6.8 6.8A2 2 0 0 1 8.7 5.5h6.6a2 2 0 0 1 1.9 1.3l1.8 4.7" /><path d="M3.5 13.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v3.5h-17Z" /><path d="M5.5 17v1.8m13-1.8v1.8M7 14.3h1.5m7 0H17" /></>
const loop = <><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7" /><path d="M20 4v4.7h-4.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3" /><path d="M4 20v-4.7h4.7" /></>
const playIcon = <path d="M8 5.5v13l10.5-6.5Z" />
const pauseIcon = <path d="M8 5.5v13m8-13v13" />
const speaker = <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>
const expand = <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
const shrink = <path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" />

// Demo event exactly as the original panel captures list it: panel-seguridad («Eventos y SOS»)
// shows FOM-024 · DEMO-024 · Exceso de velocidad, valor observado 86 km/h, 23 sep, 8:19 a. m.,
// severity «Aviso»; panel-alertas gives the fleet limit (80). The map tile is a crop of the
// panel-mapa capture, whose demo units are in Maracaibo.
const EVENT = { unit: 'FOM-024 · DEMO-024', name: 'Exceso de velocidad', value: 86, limit: 80, when: '23 sep · 8:19 a. m.', where: 'Maracaibo', whereNote: 'Centro de control', severity: 'Aviso' }

// Illustrative speed trace (demo): km/h every 10 s from 8:18 to 8:20. Its peak is the observed value,
// then the speed drops back under the limit.
const TRACE = [74, 75, 73, 76, 78, 80, 83, 86, 79, 71, 66, 64, 65]
const PEAK = TRACE.indexOf(EVENT.value)
const Y = { min: 40, max: 100, ticks: [40, 60, 80, 100] }

// Chart geometry in CSS pixels for the measured width, so the labels keep their size on phones.
function chartGeometry(w) {
  const h = Math.round(Math.min(170, Math.max(150, w * .19))), l = 34, r = 10, t = 34, b = 24
  const x = i => l + i * (w - l - r) / (TRACE.length - 1)
  const y = v => t + (1 - (v - Y.min) / (Y.max - Y.min)) * (h - t - b)
  const cross = (a, c) => a + (EVENT.limit - TRACE[a]) / (TRACE[c] - TRACE[a])
  const f = n => n.toFixed(1)
  return {
    w, h, l, r, x, y,
    line: TRACE.map((v, i) => `${i ? 'L' : 'M'}${f(x(i))} ${f(y(v))}`).join(' '),
    // Amber band where the trace is above the limit.
    over: `M${f(x(cross(4, 5)))} ${f(y(EVENT.limit))} ${[5, 6, 7].map(i => `L${f(x(i))} ${f(y(TRACE[i]))}`).join(' ')} L${f(x(cross(7, 8)))} ${f(y(EVENT.limit))}Z`,
    labels: (w < 520 ? [['8:18', 0], ['8:19', 6], ['8:20', 12]] : [['8:18', 0], ['8:18:30', 3], ['8:19', 6], ['8:19:30', 9], ['8:20', 12]]),
  }
}

// Marks an element `is-drawn` the first time it is in view (the chart line draws then).
function useDrawn(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return el?.classList.add('is-drawn')
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { el.classList.add('is-drawn'); observer.disconnect() } }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
}

function SpeedChart() {
  const ref = useRef(null)
  const box = useRef(null)
  const [width, setWidth] = useState(820)
  useDrawn(ref)
  useLayoutEffect(() => {
    const el = box.current
    const measure = () => setWidth(Math.max(260, Math.round(el.clientWidth)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const g = chartGeometry(width)
  const px = g.x(PEAK), py = g.y(EVENT.value)
  return <figure className="sg-chart" ref={ref}>
    <figcaption>Velocidad <br />(km/h)</figcaption>
    <div className="sg-chart-box" ref={box}>
      <svg width={g.w} height={g.h} viewBox={`0 0 ${g.w} ${g.h}`} role="img" aria-label={`Gráfica de velocidad de demostración: la unidad sube hasta ${EVENT.value} km/h a las 8:19 a. m., por encima del límite de ${EVENT.limit} km/h, y luego baja.`}>
        {Y.ticks.map(v => <g key={v} className="sg-chart-grid"><line x1={g.l} x2={g.w - g.r} y1={g.y(v)} y2={g.y(v)} /><text x={g.l - 8} y={g.y(v) + 4}>{v}</text></g>)}
        {[0, 3, 6, 9, 12].map(i => <line key={i} className="sg-chart-vgrid" x1={g.x(i)} x2={g.x(i)} y1={g.y(Y.max)} y2={g.y(Y.min)} />)}
        <line className="sg-chart-limit" x1={g.l} x2={g.w - g.r} y1={g.y(EVENT.limit)} y2={g.y(EVENT.limit)} />
        <text className="sg-chart-limit-label" x={g.w - g.r} y={g.y(EVENT.limit) - 7}>Límite {EVENT.limit} km/h</text>
        <path className="sg-chart-over" d={g.over} />
        <path className="sg-chart-line" d={g.line} pathLength="1" />
        {g.labels.map(([label, i]) => <text key={label} className="sg-chart-x" x={g.x(i)} y={g.h - 4}>{label}</text>)}
        <g className="sg-chart-peak">
          <line className="sg-chart-stem" x1={px} x2={px} y1={24} y2={g.y(Y.min)} />
          <g transform={`translate(${px.toFixed(1)} 0)`}>
            <rect className="sg-chart-chip" x="-76" y="0" width="152" height="24" rx="6" />
            <text className="sg-chart-chip-text" x="0" y="16.5">{EVENT.name}</text>
          </g>
          <g transform={`translate(${px.toFixed(1)} ${py.toFixed(1)})`}><circle className="sg-pulse" r="6" /><circle className="sg-dot" r="6" /></g>
        </g>
      </svg>
    </div>
  </figure>
}

// Player UI for the front camera. There is no video file: the still frame drifts slowly while
// «playing» and the progress bar runs through one event clip, 10 s before and 10 s after.
const CLIP = 20
const clock = s => `00:${String(Math.floor(s)).padStart(2, '0')}`
function EventPlayer({ still }) {
  const box = useRef(null)
  const bar = useRef(null)
  const time = useRef(4)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [second, setSecond] = useState(4)
  const [full, setFull] = useState(false)
  const paint = () => bar.current?.style.setProperty('--p', (time.current / CLIP).toFixed(4))
  const seek = t => { time.current = Math.max(0, Math.min(CLIP, t)); paint(); setSecond(Math.floor(time.current)) }
  useEffect(paint, [])
  useEffect(() => {
    if (!playing) return
    let last = performance.now(), frame
    const tick = now => {
      time.current = Math.min(CLIP, time.current + (now - last) / 1000); last = now
      paint(); setSecond(Math.floor(time.current))
      if (time.current >= CLIP) setPlaying(false)
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])
  useEffect(() => {
    const change = () => setFull(document.fullscreenElement === box.current)
    document.addEventListener('fullscreenchange', change)
    return () => document.removeEventListener('fullscreenchange', change)
  }, [])
  const toggle = () => { if (!playing && time.current >= CLIP) seek(0); setStarted(true); setPlaying(p => !p) }
  const keys = e => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]
    if (step) { e.preventDefault(); seek(time.current + step) }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); seek(e.key === 'Home' ? 0 : CLIP) }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle() }
  }
  const scrub = e => { const r = e.currentTarget.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * CLIP) }
  const screen = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else box.current?.requestFullscreen?.() }
  const detected = second >= CLIP / 2
  return <div ref={box} className={`sg-player${playing ? ' is-playing' : ''}${started ? ' is-started' : ''}`} role="group" aria-label="Reproductor de ejemplo de la cámara delantera">
    <div className="sg-player-view" onClick={toggle}>
      <img src={still} alt="Vista de la cámara delantera desde la cabina: autopista con un camión delante. Imagen fija de ejemplo." width="1672" height="941" loading="lazy" decoding="async" />
      <span className="sg-player-cam">Cámara delantera</span>
      <span className="sg-player-date">{EVENT.when}</span>
      <p className="sg-player-toast" aria-live="polite">{detected && <><V7Icon name="speed" />{EVENT.name} · {EVENT.value} km/h</>}</p>
      <span className="sg-player-big" aria-hidden="true"><V7Icon name={playIcon} /></span>
    </div>
    <div className="sg-player-bar" ref={bar}>
      <button type="button" className="sg-player-btn is-play" onClick={toggle} aria-label={playing ? 'Pausar' : 'Reproducir'}><V7Icon name={playing ? pauseIcon : playIcon} /></button>
      <span className="sg-player-time" aria-hidden="true">{clock(second)} / {clock(CLIP)}</span>
      <div className="sg-player-track" role="slider" tabIndex={0} aria-label="Posición del clip" aria-valuemin={0} aria-valuemax={CLIP} aria-valuenow={second} aria-valuetext={`${second} de ${CLIP} segundos`} onKeyDown={keys} onPointerDown={scrub}>
        <span className="sg-player-rail"><span className="sg-player-fill" /></span>
        <span className="sg-player-knob" aria-hidden="true"><i /></span>
        <span className={`sg-player-mark${detected ? ' is-hit' : ''}`}><i aria-hidden="true" /><b>Evento detectado</b></span>
      </div>
      <span className="sg-player-icon" aria-hidden="true"><V7Icon name={speaker} /></span>
      <button type="button" className="sg-player-btn" onClick={screen} aria-label={full ? 'Salir de pantalla completa' : 'Pantalla completa'}><V7Icon name={full ? shrink : expand} /></button>
    </div>
  </div>
}

export default function Seguridad() {
  usePageTitle('Seguridad')
  return <main id="contenido" className="v7-page v7-seguridad">
    <V7Section className="sg-ev" plateId="05-seguridad/00" priority demo labelledBy="sg-title">
      <div className="v7-copy">
        <h1 id="sg-title">{events.heading}</h1>
        <p>{events.body}</p>
        <DemoButton />
      </div>
      <div className="sg-ev-panel" role="group" aria-label="Evento de demostración">
        <div className="sg-ev-what">
          <span className="sg-ev-icon"><V7Icon name={car} /></span>
          <p><strong>{EVENT.name}</strong><span>{EVENT.unit} · valor observado {EVENT.value} km/h</span></p>
        </div>
        <dl className="sg-ev-facts">
          <div><V7Icon name="clock" /><dt>Momento</dt><dd>{EVENT.when}</dd></div>
          <div><V7Icon name="pin" /><dt>Ubicación</dt><dd>{EVENT.where}<small>{EVENT.whereNote}</small></dd></div>
          <div className="is-sev"><V7Icon name="alert" /><dt>Severidad</dt><dd>{EVENT.severity}</dd></div>
        </dl>
        <SpeedChart />
        <figure className="sg-ev-map">
          <img src={eventMap} alt="Recorte del mapa del centro de control FOM con el punto del evento. Datos de demostración." width="540" height="235" loading="lazy" decoding="async" />
          <span className="sg-ev-pin" aria-hidden="true"><i /><b>FOM-024</b></span>
          <span className="sg-ev-north" aria-hidden="true">N</span>
        </figure>
        <p className="sg-ev-latency"><strong>{events.stat.value}</strong><span>{events.stat.label}</span></p>
      </div>
      <ul className="sg-ev-types" aria-label="Eventos que detecta FOM">
        {events.bullets.map((b, i) => <li key={b.label}><V7Icon name={['alert', 'speed', 'shieldCheck', curve, sliders][i]} /><h3>{b.label}</h3><p>{b.text}</p></li>)}
      </ul>
    </V7Section>

    <V7Section className="sg-vid" demo labelledBy="sg-vid-title">
      <EventPlayer still={plate('05-seguridad/video')} />
      <ul className="sg-vid-points">
        {video.bullets.map((b, i) => <li key={b.label}><V7Icon name={['video', dualLens, sdCard, 'shieldCheck'][i]} /><div><h3>{b.label}</h3><p>{b.text}</p></div></li>)}
      </ul>
      <div className="sg-vid-cam">
        <div className="sg-vid-photo"><img src={plate('05-seguridad/video')} alt="Cámara FOM montada en el parabrisas." width="1672" height="941" loading="lazy" decoding="async" /></div>
        <ul className="sg-vid-facts">
          <li><V7Icon name={loop} /><p><strong>{video.stat.value}</strong><span>{video.stat.label}</span></p></li>
          <li><V7Icon name="clock" /><p><strong>10 s</strong><span>antes y después de cada evento</span></p></li>
        </ul>
      </div>
      <div className="v7-copy">
        <h2 id="sg-vid-title">{video.heading}</h2>
        <p>{video.body}</p>
      </div>
    </V7Section>

    <V7Section className="sg-01" plateId="05-seguridad/01" demo labelledBy="sg-01-title"
      screens={[{ src: panelSafety, corners: [[780, 181], [1606, 127], [1606, 735], [760, 708]] }]}>
      <div className="v7-copy">
        <h2 id="sg-01-title">{page.title.split(', ')[0]},<br />{page.title.split(', ')[1]}</h2>
        <p>{page.subtitle}</p>
      </div>
    </V7Section>

    <V7Section className="sg-04 is-framed" demo labelledBy="sg-04-title">
      <div className="v7-copy">
        <h2 id="sg-04-title">{coaching.heading}</h2>
        <p>{coaching.body}</p>
        <TextCards columns={3} className="sg-04-cards" items={asCards(coaching, ['bell', bars, 'users', 'target', 'user'])} />
      </div>
      <Frame plateId="05-seguridad/04" x="-104%" ratio="4 / 5"
        screens={[{ phone: true, src: appHome, corners: [[903, 362], [1078, 350], [1128, 725], [955, 742]] }]} />
    </V7Section>

    <StickyTour sticky={false} id="sg-tour" className="sg-tour" label="La app del conductor" plateId="05-seguridad/06"
      screen={{ phone: true, corners: [[1348, 300], [1602, 304], [1567, 872], [1282, 866]] }} srcs={[appProfile, appHome]}
      steps={[
        { tab: 'Perfil', icon: 'user', title: score.heading, body: score.body, stat: { icon: 'gauge', ...score.stat },
          children: <p className="sg-tour-more">{joined(score)}</p> },
        { tab: 'Inicio', icon: 'phone', title: sos.heading, body: sos.body, stat: { icon: 'bell', ...sos.stat },
          children: <p className="sg-tour-more">{joined(sos)}</p> },
      ]} />

    <V7Section className="sg-07 is-plain" id="preguntas" labelledBy="sg-07-title">
      <AppBackdrop side="center" />
      <div className="v7-copy">
        <h2 id="sg-07-title">Preguntas frecuentes</h2>
        <p>Resuelve tus dudas principales.</p>
      </div>
      <FaqList columns={2} open="first" className="sg-faq" items={page.faqs.map((f, i) => ({ ...f, icon: ['video', bars, siren, 'settings'][i] }))} />
      <MailPrompt />
    </V7Section>

    <V7Footer />
  </main>
}
