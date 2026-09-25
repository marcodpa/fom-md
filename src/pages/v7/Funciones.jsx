// Funciones, from output/laminas-secciones-v7/04-funciones, second pass plus the user's proposals
// (output/V7-IDEAS-USUARIO.md): a bento panel of every function after the hero (idea 1), GPS as a
// route player over the original map capture (idea 2), telematica in X-ray, mantenimiento, then
// reportes and alertas on the 05 laptop, and the FAQ on the app background.
import { PAGES } from '../../content/pages'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { V7Section, Plate, CountUp, V7Icon, StatCard, DemoButton, FaqList, MailPrompt, V7Footer, StickyTour, AppBackdrop, TextCards, usePageTitle } from '../../components/v7/V7Kit'
import map from '../../assets/marketing/real/panel-mapa.webp'
import reports from '../../assets/marketing/real/panel-reportes.webp'
import alerts from '../../assets/marketing/real/panel-alertas.webp'
import '../../styles/v7/funciones.css'

const page = PAGES.funciones
const [gps, telematics, maintenance, reporting, alerting] = page.sections
const asCards = (section, icons) => section.bullets.map((b, i) => ({ icon: icons[i], title: b.label, text: b.text }))
// The bullet facts as one normal paragraph, each led by its own label.
const Facts = ({ section }) => <p className="fn-facts">{section.bullets.map(b => <span key={b.label}><b>{b.label}.</b> {b.text} </span>)}</p>

// Icons drawn in the slides that the kit does not have (24 × 24 strokes).
const battery = <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M6.5 7V4.8h3V7m5 0V4.8h3V7M6.5 13.5h4m5-2v4m-2-2h4" /></>
const alarm = <><circle cx="12" cy="13" r="7.5" /><path d="M12 9v4l2.6 1.8M3.5 5.8 6.5 3.2m14 2.6-3-2.6M7 19.8l-1.6 1.7m11.6-1.7 1.6 1.7" /></>
const money = <><circle cx="12" cy="12" r="9.5" /><path d="M15 8.8c-.6-.9-1.7-1.3-3-1.3-1.8 0-3 .9-3 2.2 0 3.2 6.2 1.6 6.2 4.8 0 1.3-1.3 2.3-3.2 2.3-1.4 0-2.6-.5-3.2-1.5M12 5.5v2m0 9v2" /></>
const history = <><path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2H11" /><path d="M14 2.5V8h5.5M14 2.5 19.5 8v3M8 12h6M8 15.5h3" /><circle cx="17" cy="17.5" r="3.5" /><path d="M17 16v1.7l1.1.8" /></>

const split = value => { const [first, ...rest] = value.split(' '); return <>{first}<br />{rest.join(' ')}</> }

// Telemática: the Hilux in X-ray (user-supplied proposal, cleaned in scripts/v7-plates) with
// callouts tied to its real parts. Values are the demo data of the original app capture
// (Toyota Hilux U-014: motor 89 °C, odómetro 84.230 km); the battery has no demo value.
const XRAY = [
  { key: 'battery', dot: [1203, 408], elbow: [1314, 234], box: [1318, 198], label: 'Voltaje de batería', value: 'Vigilado' },
  { key: 'engine', dot: [935, 353], elbow: [875, 226], box: [668, 196], label: 'Motor', value: '89 °C' },
  { key: 'odometer', dot: [1203, 684], elbow: [1352, 720], box: [1390, 690], label: 'Odómetro', value: '84.230 km' },
  { key: 'codes', dot: [1003, 520], elbow: [960, 830], box: [600, 800], label: 'Códigos de falla', value: 'Al aparecer' },
]

function TelematicsXray() {
  const [focus, setFocus] = useState(null)
  const icons = [battery, 'engine', 'speed', 'alert']
  return <V7Section id="fn-telematica" className="fn-03 fn-xray" labelledBy="fn-03-title" motion="blur">
    <div className="v7-plate fn-xray-stage" data-focus={focus ?? undefined}>
      <Plate id="04-funciones/telematica" />
      <svg className="fn-xray-lines" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-hidden="true">
        {XRAY.map(p => <g key={p.key} className={focus === p.key ? 'is-focus' : undefined}>
          <polyline points={`${p.dot.join(',')} ${p.elbow.join(',')} ${p.box[0] + (p.box[0] > p.elbow[0] ? 0 : 196)},${p.elbow[1]}`} pathLength="1" />
          <circle cx={p.dot[0]} cy={p.dot[1]} r="7" /><circle className="fn-xray-pulse" cx={p.dot[0]} cy={p.dot[1]} r="7" />
        </g>)}
      </svg>
      {XRAY.map((p, i) => <div key={p.key} className={`fn-xray-callout${focus === p.key ? ' is-focus' : ''}`} style={{ '--x': p.box[0], '--y': p.box[1], '--i': i }}
        onPointerEnter={() => setFocus(p.key)} onPointerLeave={() => setFocus(null)}>
        <span className="v7-icon"><V7Icon name={icons[i]} /></span><span><small>{p.label}</small><CountUp value={p.value} /></span>
      </div>)}
    </div>
    <div className="v7-copy">
      <h2 id="fn-03-title">{telematics.heading}</h2>
      <p>{telematics.body}</p>
      <ul className="fn-xray-list">{telematics.bullets.map((b, i) => <li key={b.label} className={focus === XRAY[i].key ? 'is-focus' : undefined}
        onPointerEnter={() => setFocus(XRAY[i].key)} onPointerLeave={() => setFocus(null)} onFocus={() => setFocus(XRAY[i].key)} onBlur={() => setFocus(null)} tabIndex={0}>
        <span className="v7-icon"><V7Icon name={icons[i]} /></span><div><h3>{b.label}</h3><p>{b.text}</p></div>
      </li>)}</ul>
      <p className="fn-xray-note"><strong>{telematics.stat.value}</strong> {telematics.stat.label.toLowerCase()} · Datos de demostración de la unidad Toyota Hilux U-014</p>
    </div>
  </V7Section>
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const isStatic = () => document.documentElement.classList.contains('v7-static')

// Idea 1 · every function in one bento panel (the user's proposal extra/04-funciones-panel-recuadros).
// Tiles are HTML/SVG with the demo data of the original captures (app-inicio, app-inspeccion,
// app-mantenimiento, app-perfil, panel-mapa, panel-reportes); phrases are real copy from pages.js
// and the original marketing pages.
const Chip = ({ tone = 'green', children }) => <em className={`fn-chip is-${tone}`}>{children}</em>

const TILES = [
  { key: 'gps', tab: 'Rastreo GPS', icon: 'pin', title: 'Rastreo GPS', text: 'Ubicación, recorridos y estado de cada vehículo.', to: '#fn-title', visual: <div className="fn-gps-map">
    <img src={map} width="1440" height="960" alt="Mapa del panel web FOM con la unidad U-014 en marcha. Datos de demostración." loading="lazy" decoding="async" />
    <span className="fn-unit" aria-hidden="true"><i /><V7Icon name="truck" /></span>
    <p className="fn-unit-card"><strong>Toyota Hilux · U-014</strong><span><i />En marcha · 54 km/h</span></p>
  </div> },
  { key: 'tele', tab: 'Telemetría', icon: 'gauge', title: 'Telemetría', text: 'Estado de la unidad en tiempo real.', to: '#fn-telematica', visual: <div className="fn-tele">
    <div><small>Velocidad</small><p><CountUp value="54" /><span>km/h</span></p><V7Icon name="gauge" /></div>
    <div className="fn-fuel fn-odometer"><small>Kilometraje</small><p><CountUp value="84.230" /><span>km</span></p><V7Icon name="route" /></div>
  </div> },
  { key: 'mant', tab: 'Mantenimiento', icon: 'wrench', title: 'Mantenimiento', text: 'Consulta próximos servicios.', to: '#fn-mantenimiento', visual: <div className="fn-order">
    <span className="fn-order-icon"><V7Icon name="wrench" /></span>
    <p><strong>Unidad 14 · Hilux</strong><span>Testigo de temperatura del motor encendido en ralentí.</span></p>
    <Chip tone="amber">En revisión</Chip>
  </div> },
  { key: 'insp', tab: 'Inspecciones', icon: 'clipboard', title: 'Inspecciones', text: 'Checklist desde la app.', to: '/app', visual: <div className="fn-insp">
    <div className="fn-ring"><svg viewBox="0 0 120 120" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <circle key={i} cx="60" cy="60" r="50" pathLength="120" style={{ '--i': i, transform: `rotate(${i * 30 - 88}deg)` }} />)}</svg>
      <p><strong>0 / 12</strong></p></div>
    <ul><li><i className="is-done" />Revisados <b>0</b></li><li><i />Pendientes <b>12</b></li></ul>
  </div> },
  { key: 'docs', tab: null, icon: 'document', title: 'Documentos', text: 'Documentos siempre a mano.', to: '/app', visual: <ul className="fn-docs">
    {[['Licencia de conducir', '26 nov 2027', 'Vigente'], ['Carta médica', '17 oct 2026', 'Por vencer'], ['Cédula de identidad', '8 feb 2031', 'Vigente']].map(([name, date, state], i) =>
      <li key={name} style={{ '--i': i }}><span><strong>{name}</strong><small>Vence {date}</small></span><Chip tone={state === 'Vigente' ? 'green' : 'amber'}>{state}</Chip></li>)}
  </ul> },
  { key: 'rep', tab: 'Reportes', icon: 'chart', title: 'Reportes', text: 'Alertas, seguridad y reportes para la operación.', to: '#fn-tour', visual: <div className="fn-bars" role="img" aria-label="Unidades 26, en marcha 15, detenidas 11">
    {[['Unidades', 26], ['En marcha', 15], ['Detenidas', 11]].map(([k, v], i) => <div key={k} style={{ '--h': v / 26, '--i': i }}><b>{v}</b><i /><small>{k}</small></div>)}
  </div> },
]

function FunctionsBento() {
  const [active, setActive] = useState(null)
  const pick = key => {
    setActive(key)
    document.getElementById(`fn-tile-${key}`)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' })
  }
  return <V7Section id="fn-panel" className="fn-bento" labelledBy="fn-bento-title">
    <div className="v7-copy">
      <h2 id="fn-bento-title">Todo lo que tu flota necesita.</h2>
      <p>Del primer recorrido al próximo mantenimiento.</p>
    </div>
    <div className="fn-bento-tabs" role="group" aria-label="Ir a una función">
      {TILES.filter(t => t.tab).map(t => <button key={t.key} type="button" aria-pressed={active === t.key} aria-controls={`fn-tile-${t.key}`} onClick={() => pick(t.key)}>
        <V7Icon name={t.icon} /><span>{t.tab}</span>
      </button>)}
    </div>
    <div className="fn-bento-grid">
      {TILES.map((t, i) => <article key={t.key} id={`fn-tile-${t.key}`} className={`fn-tile is-${t.key}${active === t.key ? ' is-lit' : ''}`} style={{ '--i': i }} aria-labelledby={`fn-tile-${t.key}-h`}
        onPointerEnter={() => setActive(t.key)} onFocus={() => setActive(t.key)}>
        <header className="fn-tile-head">
          <span className="fn-tile-icon"><V7Icon name={t.icon} /></span>
          <div><h3 id={`fn-tile-${t.key}-h`}>{t.title}</h3><p>{t.text}</p></div>
          {t.to.startsWith('#') ? <a className="fn-tile-more" href={t.to} aria-label={`${t.title}: ver más`}><V7Icon name={<path d="m9 5 7 7-7 7" />} /></a>
            : <Link className="fn-tile-more" to={t.to} aria-label={`${t.title}: ver en la app`}><V7Icon name={<path d="m9 5 7 7-7 7" />} /></Link>}
        </header>
        <div className="fn-tile-visual">{t.visual}</div>
      </article>)}
    </div>
    <small className="fn-bento-demo">Datos de demostración</small>
  </V7Section>
}

// Hero · the user's GPS proposal (extra/04-funciones-00-hero-gps-ruta): the aerial photo cleaned in
// scripts/v7-plates (04-funciones/ruta), with the route, milestones and player redrawn in SVG/HTML.
// Points follow the road in slide pixels (1672 × 941); the milestone times are demo data.
const LEG_A = [[490, 419], [540, 439], [590, 459], [640, 477], [690, 493], [740, 506], [790, 516], [840, 525], [890, 534], [940, 541], [990, 549], [1040, 558], [1090, 569], [1127, 579]]
const LEG_B = [[1127, 579], [1165, 590], [1215, 606], [1265, 622], [1315, 637], [1365, 653], [1415, 669], [1465, 685], [1516, 701]]
// Catmull-Rom through the points, as cubic Béziers (a smooth line along the road).
const smooth = (pts, move = true) => pts.slice(1).reduce((d, p, i) => {
  const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p3 = pts[Math.min(i + 2, pts.length - 1)]
  const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6], c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6]
  return `${d} C${c1.map(n => n.toFixed(1)).join(' ')} ${c2.map(n => n.toFixed(1)).join(' ')} ${p.join(' ')}`
}, move ? `M${pts[0].join(' ')}` : '')
const ROUTE_A = smooth(LEG_A)
const ROUTE = ROUTE_A + smooth(LEG_B, false)
const START = 6 * 60 + 12, STOP = 9 * 60 + 47, END = 12 * 60 + 26
const T_STOP = (STOP - START) / (END - START)
const STOPS = [
  { label: 'Salida', time: '06:12', t: 0, at: LEG_A[0] },
  { label: 'Parada', time: '09:47', t: T_STOP, at: LEG_B[0] },
  { label: 'Llegada', time: '12:26', t: 1, at: LEG_B[LEG_B.length - 1] },
]
const clock = t => { const m = Math.round(START + t * (END - START)); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
const DURATION = 9000
const pct = ([x, y]) => ({ left: `${(x / 1672 * 100).toFixed(3)}%`, top: `${(y / 941 * 100).toFixed(3)}%` })

function GpsHero() {
  const [playing, setPlaying] = useState(false)
  const sectionRef = useRef(null), playerRef = useRef(null), pathRef = useRef(null), glowRef = useRef(null), markerRef = useRef(null), fillRef = useRef(null)
  const rangeRef = useRef(null), timeRef = useRef(null)
  const state = useRef({ t: 0, len: 0, split: 0.5, frame: 0, last: 0 })

  // Imperative updates: the route redraws every frame while playing, without re-rendering React.
  const apply = t => {
    const s = state.current, path = pathRef.current, root = sectionRef.current
    if (!path || !s.len) return
    s.t = t
    // The clock passes the stop at 09:47 exactly when the marker is on it.
    const f = t < T_STOP ? t / T_STOP * s.split : s.split + (t - T_STOP) / (1 - T_STOP) * (1 - s.split)
    const off = s.len * (1 - f)
    path.style.strokeDashoffset = off
    glowRef.current.style.strokeDashoffset = off
    const p = path.getPointAtLength(s.len * f)
    markerRef.current.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`)
    fillRef.current.style.transform = `scaleX(${t})`
    rangeRef.current.value = Math.round(t * 1000)
    rangeRef.current.setAttribute('aria-valuetext', `${clock(t)}, datos de demostración`)
    timeRef.current.textContent = clock(t)
    const groups = [root.querySelectorAll('.fn-milestone'), root.querySelectorAll('.fn-milestone-dot'), playerRef.current.querySelectorAll('.fn-stop')]
    STOPS.forEach((m, i) => { const reached = t >= m.t - 0.001; groups.forEach(g => g[i]?.classList.toggle('is-reached', reached)) })
  }
  const stop = () => { cancelAnimationFrame(state.current.frame); state.current.frame = 0; setPlaying(false) }
  const play = () => {
    const s = state.current
    if (s.t >= 1) apply(0)
    cancelAnimationFrame(s.frame)
    s.last = performance.now()
    const tick = now => {
      const t = Math.min(1, s.t + (now - s.last) / DURATION)
      s.last = now
      apply(t)
      if (t < 1) s.frame = requestAnimationFrame(tick); else stop()
    }
    s.frame = requestAnimationFrame(tick)
    setPlaying(true)
  }
  const seek = t => { stop(); apply(t) }

  useEffect(() => {
    const s = state.current, path = pathRef.current
    const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    probe.setAttribute('d', ROUTE_A)
    s.len = path.getTotalLength()
    s.split = probe.getTotalLength() / s.len
    for (const el of [path, glowRef.current]) el.style.strokeDasharray = `${s.len} ${s.len}`
    // Final state without motion (reduced motion, screenshots); otherwise it plays once on arrival.
    const still = () => reducedMotion() || isStatic()
    apply(still() || typeof IntersectionObserver === 'undefined' ? 1 : 0)
    if (typeof IntersectionObserver === 'undefined') return
    let timer
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      if (still()) apply(1)
      else if (s.t === 0 && !s.frame) timer = setTimeout(() => { if (!still()) play() }, 900)
    }, { threshold: 0.4 })
    observer.observe(sectionRef.current)
    // Screenshots add v7-static after load: show the finished route then.
    const watch = new MutationObserver(() => { if (isStatic()) { clearTimeout(timer); stop(); apply(1) } })
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => { observer.disconnect(); watch.disconnect(); clearTimeout(timer); cancelAnimationFrame(s.frame) }
  }, [])

  return <V7Section className="fn-hero" labelledBy="fn-title">
    <div ref={sectionRef} className="v7-plate fn-hero-stage">
      <Plate id="04-funciones/ruta" priority />
      <svg className="fn-route" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-hidden="true">
        <path className="fn-route-plan" d={ROUTE} />
        <path ref={glowRef} className="fn-route-glow" d={ROUTE} />
        <path ref={pathRef} className="fn-route-line" d={ROUTE} />
        {STOPS.map(m => <circle key={m.label} className="fn-milestone-dot" cx={m.at[0]} cy={m.at[1]} r="8" />)}
        <g ref={markerRef} className="fn-route-marker" transform={`translate(${STOPS[0].at.join(' ')})`}><circle className="fn-route-halo" r="20" /><circle r="8.5" /></g>
      </svg>
      {STOPS.map(m => <p key={m.label} className="fn-milestone" style={pct(m.at)} aria-hidden="true"><strong>{m.label}</strong><span>{m.time}</span></p>)}
    </div>
    <div className="v7-copy">
      <h1 id="fn-title">{gps.heading}</h1>
      <p>{gps.body}</p>
      <DemoButton />
    </div>
    <ul className="fn-hero-facts">
      <li><V7Icon name="target" /><span>{gps.bullets[0].label}</span></li>
      <li><V7Icon name="map" /><span>{gps.bullets[1].label}</span></li>
      <li><V7Icon name="clock" /><span><CountUp value={gps.stat.value} /> {gps.stat.label}</span></li>
    </ul>
    <div ref={playerRef} className="fn-player" role="group" aria-label="Reproductor del recorrido, datos de demostración">
      <button type="button" className="fn-play" onClick={() => (playing ? stop() : play())} aria-label={playing ? 'Pausar el recorrido' : 'Reproducir el recorrido'}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M8 5.5v13M16 5.5v13" /> : <path d="M8 5.2v13.6L19 12Z" />}</svg>
      </button>
      <p className="fn-player-time"><strong ref={timeRef}>06:12</strong><small>Datos de demostración</small></p>
      <div className="fn-timeline">
        <span className="fn-track"><i ref={fillRef} /></span>
        <input ref={rangeRef} type="range" min="0" max="1000" step="5" defaultValue="0" aria-label="Momento del recorrido" onInput={e => seek(e.target.value / 1000)} />
        {STOPS.map(m => <button key={m.label} type="button" className="fn-stop" style={{ '--t': m.t }} onClick={() => seek(m.t)} aria-label={`Ir a ${m.label.toLowerCase()}, ${m.time}`}>
          <i /><span>{m.label}<small>{m.time}</small></span>
        </button>)}
      </div>
    </div>
  </V7Section>
}

export default function Funciones() {
  usePageTitle('Funciones')
  return <main id="contenido" className="v7-page v7-funciones">
    <GpsHero />

    <FunctionsBento />

    <TelematicsXray />

    <V7Section id="fn-mantenimiento" className="fn-04" plateId="04-funciones/04" labelledBy="fn-04-title">
      <div className="v7-copy">
        <h2 id="fn-04-title">{maintenance.heading}</h2>
        <p>{maintenance.body}</p>
        <TextCards columns={2} items={asCards(maintenance, [alarm, 'clipboard', history, money])} />
      </div>
      <StatCard className="is-stacked" icon="wrench" value={split(maintenance.stat.value)} label={maintenance.stat.label} />
    </V7Section>

    <StickyTour sticky={false} id="fn-tour" className="fn-tour" label="Reportes y alertas en el panel" plateId="04-funciones/05"
      screen={{ corners: [[813, 192], [1592, 160], [1582, 683], [766, 700]], clip: [[740, 130], [1640, 130], [1640, 684], [1540, 684], [1528, 692], [1526, 740], [740, 740]] }}
      srcs={[reports, alerts]}
      steps={[
        { tab: 'Reportes', icon: 'chart', title: reporting.heading, body: reporting.body, stat: { icon: 'document', ...reporting.stat }, children: <Facts section={reporting} /> },
        { tab: 'Alertas', icon: 'bell', title: alerting.heading, body: alerting.body, stat: { icon: 'bell', ...alerting.stat }, children: <Facts section={alerting} /> },
      ]} />

    <V7Section className="fn-07 is-plain" id="preguntas" labelledBy="fn-07-title">
      <AppBackdrop side="right" />
      <div className="v7-copy">
        <h2 id="fn-07-title">Preguntas frecuentes</h2>
        <p>Resuelve tus dudas principales.</p>
      </div>
      <FaqList columns={2} open="first" items={page.faqs.map((f, i) => ({ ...f, icon: ['pin', 'settings', 'chart', 'document'][i] }))} className="fn-faq" />
      <MailPrompt />
    </V7Section>

    <V7Footer plateId="04-funciones/09" className="fn-09" taglineBreak={false} statement={<>Flotas que mantienen<br />el mundo en movimiento</>} />
  </main>
}
