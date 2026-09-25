// Shared pieces for the v7 marketing pages. Every section keeps its own
// composition in its page stylesheet; these helpers only provide the photo
// plate, the projected original screenshots and repeated controls.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { screenProjection } from '../../lib/screenProjection'
import { Icono } from '../../panel/Iconos'
import { Brand } from '../marketing/MarketingChrome'
import GloboCanvas from '../GloboCanvas'
import '../../styles/v7-kit.css'

// Slides and plates share one coordinate system: 1672 × 941.
export const PLATE_W = 1672
export const PLATE_H = 941
export const DEMO_ROUTE = '/contacto#solicitud-demo'

const plates = import.meta.glob('../../assets/marketing/v7/*/*.webp', { eager: true, query: '?url', import: 'default' })
export const plate = key => {
  const url = plates[`../../assets/marketing/v7/${key}.webp`]
  if (!url) throw new Error(`Falta la fotografía v7 ${key}`)
  return url
}

export function usePageTitle(title) { useEffect(() => { document.title = `${title} — FOM` }, [title]) }

const toPercent = ([x, y]) => `${(x / PLATE_W * 100).toFixed(3)}% ${(y / PLATE_H * 100).toFixed(3)}%`

/**
 * Photo plus original FOM captures projected into its physical screens.
 * screens: [{ src, corners: [tl,tr,br,bl], phone?, clip?: [[x,y]...], radius?, alt? }]
 * `src` may be a list of captures: the one at index `active` is shown (cross-fade),
 * which is how DeviceTabs and StickyTour switch what the device displays.
 * `clip` is a polygon in slide coordinates used when a person or object sits in front of the screen.
 * `body: true` draws the phone itself (dark frame and bezel) around the screen, for photos
 * whose physical phone was removed from the plate. `foreground` polygons repeat those parts of
 * the photo (e.g. fingers) above the devices.
 */
export function Plate({ id, screens = [], priority = false, className = '', active = 0, foreground = [] }) {
  const frame = useRef(null)
  useLayoutEffect(() => {
    const el = frame.current
    const resize = () => el.style.setProperty('--plate-scale', el.clientWidth / PLATE_W)
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return <div className={`v7-plate ${className}`} ref={frame}>
    <img className="v7-photo" src={plate(id)} width={PLATE_W} height={PLATE_H} alt="" loading={priority ? 'eager' : 'lazy'} fetchpriority={priority ? 'high' : undefined} decoding="async" />
    {screens.map((s, i) => {
      const sources = Array.isArray(s.src) ? s.src : [s.src]
      const matrix = `scale(var(--plate-scale)) matrix3d(${screenProjection(s.corners).join(',')})`
      return <div key={i} className="v7-screen-layer" style={s.clip ? { clipPath: `polygon(${s.clip.map(toPercent).join(',')})` } : undefined}>
        {s.body && <div className="v7-device-body" style={{ transform: matrix }} />}
        <div className={`v7-screen${s.phone ? ' is-phone' : ''}`} style={{ transform: matrix, borderRadius: s.radius }}>
          {sources.map((src, n) => <img key={src} src={src} className={n === (sources.length > 1 ? active : 0) ? 'is-active' : undefined} aria-hidden={sources.length > 1 && n !== active ? true : undefined} alt={s.alt || `Captura original ${s.phone ? 'de la app del conductor' : 'del panel web'} FOM. Datos de demostración.`} width={s.phone ? 390 : 1430} height={s.phone ? 844 : 953} loading={priority && n === 0 ? 'eager' : 'lazy'} decoding="async" />)}
        </div>
      </div>
    })}
    {foreground.map((poly, i) => <img key={i} className="v7-photo v7-foreground" src={plate(id)} alt="" aria-hidden="true" loading={priority ? 'eager' : 'lazy'} decoding="async" style={{ clipPath: `polygon(${poly.map(toPercent).join(',')})` }} />)}
  </div>
}

/**
 * Buttons that change what a device shows. tabs: [{ label, icon? }]. Arrow keys move
 * between tabs, as in any tab list.
 */
export function DeviceTabs({ tabs, active, onChange, label, className = '' }) {
  const keys = e => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (active + step + tabs.length) % tabs.length
    onChange(next)
    e.currentTarget.querySelectorAll('[role=tab]')[next]?.focus()
  }
  return <div className={`v7-tabs ${className}`} role="tablist" aria-label={label} onKeyDown={keys}>
    {tabs.map((tab, i) => <button key={tab.label} type="button" role="tab" aria-selected={i === active} tabIndex={i === active ? 0 : -1} onClick={() => onChange(i)}>
      {tab.icon && <V7Icon name={tab.icon} />}<span>{tab.label}</span>
    </button>)}
  </div>
}

/**
 * Scroll story: the photo and its device stay pinned while the steps scroll over the
 * dark side of the picture; each step switches the device to its own capture. The tabs
 * jump to a step, so the tour also works by clicking. With `sticky={false}` it is a normal
 * section instead: nothing pins, the tabs switch the device and show that step's text.
 * steps: [{ tab, icon?, kicker?, title, body, items?, stat?, children? }], srcs: one capture per step.
 */
export function StickyTour({ id, className = '', plateId, screen, srcs, steps, label, demo = true, sticky = true }) {
  const [active, setActive] = useState(0)
  const stepRefs = useRef([])
  const ref = useReveal()
  useEffect(() => {
    if (!sticky || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(Number(entry.target.dataset.step))
    }, { rootMargin: '-45% 0px -45% 0px' })
    stepRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [sticky])
  const go = i => { setActive(i); if (sticky) stepRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  return <section ref={ref} id={id} className={`v7-section v7-tour${sticky ? '' : ' is-tabbed'} ${className}`} aria-label={label} style={{ '--steps': steps.length }}>
    <div className="v7-tour-stage">
      <Plate id={plateId} screens={[{ ...screen, src: srcs }]} active={active} />
      <DeviceTabs className="v7-tour-tabs" label={`${label}: vistas`} tabs={steps.map(s => ({ label: s.tab, icon: s.icon }))} active={active} onChange={go} />
      {demo && <small className="v7-demo">Datos de demostración</small>}
    </div>
    <div className="v7-tour-steps">
      {steps.map((step, i) => <article key={step.tab} ref={el => { stepRefs.current[i] = el }} data-step={i} className={`v7-tour-step${i === active ? ' is-active' : ''}`} aria-labelledby={`${id}-step-${i}`}>
        <div className="v7-tour-card">
          {step.kicker && <p className="v7-kicker">{step.kicker}</p>}
          <h2 id={`${id}-step-${i}`}>{step.title}</h2>
          <p>{step.body}</p>
          {step.items && <Features items={step.items} className="is-compact" />}
          {step.stat && <StatCard icon={step.stat.icon} value={step.stat.value} label={step.stat.label} className="is-inline" />}
          {step.children}
        </div>
      </article>)}
    </div>
  </section>
}

/**
 * The photo inside a rounded frame instead of full-bleed, for shorter sections that
 * break the one-screen-per-slide rhythm. `x` shifts the photo horizontally (e.g. '-45%')
 * to keep the person or device in the frame; `ratio` is the frame's aspect ratio.
 */
export function Frame({ plateId, screens, active, x = '-30%', ratio = '4 / 5', className = '' }) {
  return <div className={`v7-frame ${className}`} style={{ '--frame-x': x, '--frame-ratio': ratio }}>
    <Plate id={plateId} screens={screens} active={active} />
  </div>
}

/**
 * The app's own background (the dotted globe and night sky of the sign-in screen), for
 * sections without a photograph. `side` places the globe: 'right' (default), 'left' or 'center'.
 * Use at most one or two per page: the globe is an animated canvas.
 */
export function AppBackdrop({ side = 'right' }) {
  // The globe canvas only exists while its section is near the viewport.
  const ref = useRef(null)
  const [live, setLive] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return setLive(true)
    const observer = new IntersectionObserver(([entry]) => setLive(entry.isIntersecting), { rootMargin: '200px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={`v7-backdrop is-${side}`} aria-hidden="true"><div className="v7-backdrop-globe">{live && <GloboCanvas still />}</div></div>
}

/**
 * Cards with a short title and a normal paragraph (not bullets), optionally a link.
 * items: [{ icon?, title, text, to?, kicker? }]. `columns` sets the grid.
 */
export function TextCards({ items, columns = 3, className = '' }) {
  return <div className={`v7-cards ${className}`} style={{ '--cards': columns }}>{items.map(item => {
    const body = <>{item.icon && <span className="v7-card-icon"><V7Icon name={item.icon} /></span>}{item.kicker && <small>{item.kicker}</small>}<h3>{item.title}</h3><p>{item.text}</p>{item.to && <span className="v7-card-more">Ver más <Arrow /></span>}</>
    return item.to ? <Link key={item.title} to={item.to} className="v7-card" onPointerMove={tilt} onPointerLeave={untilt}>{body}</Link> : <article key={item.title} className="v7-card" onPointerMove={tilt} onPointerLeave={untilt}>{body}</article>
  })}</div>
}

/* Photo depth: every full-bleed plate drifts a little slower than the page. One passive
   scroll listener for the whole site; disabled with reduced motion. */
const drifting = new Set()
let driftFrame = 0
function drift() {
  driftFrame = 0
  const vh = innerHeight
  drifting.forEach(el => {
    const r = el.parentElement.getBoundingClientRect()
    if (r.bottom < -vh || r.top > 2 * vh) return
    const p = (r.top + r.height / 2 - vh / 2) / (vh + r.height)
    el.style.translate = `0 ${(p * -7).toFixed(2)}%`
  })
}
function onDriftScroll() { if (!driftFrame) driftFrame = requestAnimationFrame(drift) }
function useDrift(ref) {
  useEffect(() => {
    // Only the first section (the hero) drifts: moving every photo made scrolling feel heavy.
    const section = ref.current
    const plateEl = section?.previousElementSibling ? null : section?.querySelector(':scope > .v7-plate')
    if (!plateEl || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!drifting.size) { addEventListener('scroll', onDriftScroll, { passive: true }); addEventListener('resize', onDriftScroll) }
    drifting.add(plateEl)
    plateEl.classList.add('is-drifting')
    drift()
    return () => { drifting.delete(plateEl); if (!drifting.size) { removeEventListener('scroll', onDriftScroll); removeEventListener('resize', onDriftScroll) } }
  }, [])
}

/** Marks a section `is-in` the first time it enters the viewport (drives the reveal motion). */
const MOTIONS = ['rise', 'wipe', 'zoom', 'curtain', 'blur', 'slide']
function useReveal(motion) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    // Each section enters differently from its neighbour (ui-ux-pro-max: vary timing and motion
    // by context); a page can force one with the `motion` prop.
    if (el?.parentElement) el.dataset.motion = motion || MOTIONS[[...el.parentElement.children].indexOf(el) % MOTIONS.length]
    if (!el || typeof IntersectionObserver === 'undefined') return el?.classList.add('is-in')
    el.closest('.v7-page')?.classList.add('v7-motion')
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('is-in'); observer.disconnect() }
    }, { threshold: 0.18 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

/** One full-viewport section: photo plate, optional shade and the HTML composition on top. */
export function V7Section({ as: Tag = 'section', id, className = '', plateId, screens, active, foreground, priority, demo = false, labelledBy, motion, children }) {
  const ref = useReveal(motion)
  useDrift(ref)
  return <Tag ref={ref} id={id} className={`v7-section ${className}`} aria-labelledby={labelledBy}>
    {plateId && <Plate id={plateId} screens={screens} active={active} foreground={foreground} priority={priority} />}
    {children}
    {demo && <small className="v7-demo">Datos de demostración</small>}
  </Tag>
}

export function Arrow() { return <svg className="v7-arrow" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3 12h17m-7-7 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg> }

const PATHS = {
  monitor: <><rect x="2.5" y="3.5" width="19" height="13" rx="1.5" /><path d="M12 16.5V21m-4.5 0h9" /></>,
  laptop: <><rect x="4" y="4.5" width="16" height="11" rx="1.2" /><path d="M2 19.5h20l-1.5-4h-17Z" /></>,
  phone: <><rect x="7" y="2" width="10" height="20" rx="2.2" /><path d="M10.5 4.5h3M11 18.8h2" /></>,
  tablet: <><rect x="4" y="2.5" width="16" height="19" rx="2" /><path d="M11 18.5h2" /></>,
  globe: <><circle cx="12" cy="12" r="9.5" /><path d="M2.5 12h19M12 2.5c3 3 3.8 6.2 3.8 9.5s-.8 6.5-3.8 9.5c-3-3-3.8-6.2-3.8-9.5S9 5.5 12 2.5Z" /></>,
  gauge: <><path d="M3.5 17a9 9 0 1 1 17 0" /><path d="m12 13 4-5" /><circle cx="12" cy="13.5" r="1.4" /><path d="M6.5 13h1M12 7V6m5.5 7h-1" /></>,
  layout: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 13h4m-4 3h7" /><circle cx="16.5" cy="6.5" r=".4" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M15 4.8a3.5 3.5 0 0 1 0 6.4M17.5 14a6.5 6.5 0 0 1 4 6" /></>,
  team: <><circle cx="12" cy="7" r="3" /><circle cx="5" cy="9" r="2.3" /><circle cx="19" cy="9" r="2.3" /><path d="M6.5 20a5.5 5.5 0 0 1 11 0M1.5 18a4 4 0 0 1 5.3-3.8M22.5 18a4 4 0 0 0-5.3-3.8" /></>,
  user: <><circle cx="12" cy="7.5" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  supervisor: <><circle cx="12" cy="7" r="4" /><path d="M4 21.5a8 8 0 0 1 16 0M12 13.5l-1.3 2 1.3 5 1.3-5Z" /></>,
  driver: <><circle cx="12" cy="7" r="4" /><path d="M4 21.5a8 8 0 0 1 16 0M12 15v4" /></>,
  hierarchy: <><circle cx="12" cy="4.5" r="2.2" /><path d="M9 11a3 3 0 0 1 6 0M12 11v3M5 14h14M5 14v2m14-2v2" /><circle cx="5" cy="18" r="1.8" /><circle cx="19" cy="18" r="1.8" /><path d="M2 22.5a3 3 0 0 1 6 0m8 0a3 3 0 0 1 6 0" /></>,
  database: <><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  wifiOff: <><path d="M2 8.5a15 15 0 0 1 5.5-3.2M11 4.5a15 15 0 0 1 11 4M5 12a10 10 0 0 1 4-2.4M15 10a10 10 0 0 1 4 2M8.5 15.5a5 5 0 0 1 7 0" /><circle cx="12" cy="19" r="1" /><path d="m3 3 18 18" /></>,
  pin: <><path d="M12 22s7-7.1 7-12.5a7 7 0 1 0-14 0C5 14.9 12 22 12 22Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5.5 5.5" /></>,
  scan: <><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" /><circle cx="11" cy="11" r="4" /><path d="m14 14 3 3" /></>,
  filter: <path d="M3 4h18l-7 8.5V19l-4 2v-8.5Z" />,
  cluster: <><circle cx="12" cy="6" r="3" /><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="m10.5 8.5-3 6m6-6 3 6M9 17h6" /></>,
  box: <><path d="m12 2.5 8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3Z" /><path d="m3.5 7.3 8.5 4.8 8.5-4.8M12 12.1v9.4" /></>,
  fileSend: <><path d="M14 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h7" /><path d="M14 2.5V8h5.5M14 2.5 19.5 8v5" /><path d="M13 17.5h8m-3-3 3 3-3 3" /></>,
  antenna: <><path d="M12 10.5 7 22m5-11.5L17 22M8.8 18h6.4" /><circle cx="12" cy="9" r="1.6" /><path d="M8.5 5.5a5 5 0 0 0 0 7M15.5 5.5a5 5 0 0 1 0 7M5.5 3a9 9 0 0 0 0 12M18.5 3a9 9 0 0 1 0 12" /></>,
  cloud: <path d="M7 19a5 5 0 0 1-.9-9.9A6.5 6.5 0 0 1 18.4 8 5.5 5.5 0 0 1 17.5 19Z" />,
  cloudUp: <><path d="M7.5 17.5a5 5 0 0 1-.9-9.9 6.5 6.5 0 0 1 12.3-1.1 5.5 5.5 0 0 1-1.4 11" /><path d="M12 21.5v-9m-3.5 3.5L12 12.5l3.5 3.5" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="11" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /><path d="M12 15v2.5" /></>,
  blocks: <><rect x="9.5" y="2.5" width="5" height="5" rx=".8" /><rect x="2.5" y="16.5" width="5" height="5" rx=".8" /><rect x="9.5" y="16.5" width="5" height="5" rx=".8" /><rect x="16.5" y="16.5" width="5" height="5" rx=".8" /><path d="M12 7.5v9M5 16.5V12h14v4.5" /></>,
  trend: <><rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="m7 15.5 3.5-4 3 2.5L17.5 8.5m-3.5 0h3.5V12" /></>,
  clock: <><circle cx="12" cy="12" r="9.5" /><path d="M12 6.5V12l3.5 3" /></>,
  mail: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="m3 6.5 9 6.5 9-6.5" /></>,
  shield: <path d="M12 2.5 4 5.5v6c0 5 3.4 8.8 8 10.2 4.6-1.4 8-5.2 8-10.2v-6Z" />,
  shieldCheck: <><path d="M12 2.5 4 5.5v6c0 5 3.4 8.8 8 10.2 4.6-1.4 8-5.2 8-10.2v-6Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  video: <><rect x="2.5" y="6" width="13.5" height="12" rx="2" /><path d="m16 10.5 5.5-3.5v10L16 13.5" /></>,
  camera: <><path d="M3 8.5a2 2 0 0 1 2-2h2.5L9 4h6l1.5 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><circle cx="12" cy="13" r="3.8" /></>,
  bell: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.8 2H4.2Z" /><path d="M10 21h4" /></>,
  wrench: <path d="M14.7 6.3a4.5 4.5 0 0 0 5.6 5.6L21 11a5.5 5.5 0 0 1-6.8 5.2L7.5 23 3.8 19.3l6.9-6.7A5.5 5.5 0 0 1 16 5.7Z" />,
  calendar: <><rect x="3" y="4.5" width="18" height="17" rx="2" /><path d="M3 9.5h18M8 2.5v4m8-4v4M7.5 13.5h2m2.5 0h2m2.5 0h-.5M7.5 17h2m2.5 0h2" /></>,
  chart: <path d="M3.5 20.5h17M6.5 17V10m5 7V4.5m5 12.5V7.5" />,
  document: <><path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z" /><path d="M14 2.5V8h5.5M8.5 13h7m-7 4h5" /></>,
  clipboard: <><rect x="4.5" y="4" width="15" height="17.5" rx="2" /><path d="M9 2.5h6v3H9ZM8.5 12.5l2.3 2.3 4.7-4.8" /></>,
  truck: <><path d="M2.5 5.5h11v11h-11ZM13.5 9.5h4l3.5 3.8v3.2h-7.5" /><circle cx="6.5" cy="17.5" r="2" /><circle cx="17" cy="17.5" r="2" /></>,
  route: <><circle cx="6" cy="18.5" r="2.5" /><circle cx="18" cy="5.5" r="2.5" /><path d="M8.5 18.5h7.5a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5" /></>,
  engine: <><path d="M5 9h2V7h5v2h3l2 2h2.5v6H17l-2 2H8l-2-2H5Z" /><path d="M2.5 11v5M9.5 4h4" /></>,
  fuel: <><path d="M4.5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h13M4.5 10h10" /><path d="M14.5 8h2l2.5 2.5V17a1.5 1.5 0 0 0 3 0V9l-3-3" /></>,
  sos: <><circle cx="12" cy="12" r="9.5" /><path d="M8.5 9.5c-1-.7-2.8-.3-2.8 1s2.8 1 2.8 2.4-1.8 1.7-2.8 1M12 9h.1a2.5 2.5 0 0 1 0 6H12a2.5 2.5 0 0 1 0-6Zm6.3.5c-1-.7-2.8-.3-2.8 1s2.8 1 2.8 2.4-1.8 1.7-2.8 1" /></>,
  eyeOff: <><path d="M3 12s3.3-6.5 9-6.5c1.6 0 3 .5 4.2 1.2M21 12s-3.3 6.5-9 6.5c-1.6 0-3-.5-4.2-1.2" /><path d="M9.5 14.5A3.5 3.5 0 0 1 14.5 9.5M3 21 21 3" /></>,
  steering: <><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="12" r="2.2" /><path d="M2.8 10.5c3 .5 5.5.3 7-.6M21.2 10.5c-3 .5-5.5.3-7-.6M12 14.2v7.3" /></>,
  message: <><path d="M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-9L6 21.5v-4H4A1.5 1.5 0 0 1 2.5 16V6A1.5 1.5 0 0 1 4 4.5Z" /><path d="M7 9.5h10M7 13h6" /></>,
  star: <path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9Z" />,
  layers: <><path d="m12 3 9.5 5-9.5 5-9.5-5Z" /><path d="m2.5 12.5 9.5 5 9.5-5M2.5 16.5l9.5 5 9.5-5" /></>,
  map: <><path d="m2.5 5.5 6-2.5 7 2.5 6-2.5v15.5l-6 2.5-7-2.5-6 2.5Z" /><path d="M8.5 3v15.5m7-13V21" /></>,
  geofence: <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5Z" strokeDasharray="2.2 2" /><path d="M12 16s3.5-3.4 3.5-6.1a3.5 3.5 0 0 0-7 0C8.5 12.6 12 16 12 16Z" /></>,
  building: <><path d="M4 21.5V4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17M15 9h3a2 2 0 0 1 2 2v10.5M2.5 21.5h19" /><path d="M8 7h3m-3 4h3m-3 4h3" /></>,
  key: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.8 12.2 9.7-9.7M17 6l3 3m-5.5-.5 2 2" /></>,
  headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="2.5" y="13" width="4" height="6.5" rx="1.5" /><rect x="17.5" y="13" width="4" height="6.5" rx="1.5" /><path d="M19.5 19.5c0 1.5-1.7 2.5-5 2.5" /></>,
  book: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5Z" /><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5M8.5 7h7" /></>,
  check: <><circle cx="12" cy="12" r="9.5" /><path d="m7.5 12.5 3 3 6-6.5" /></>,
  tools: <><path d="M14.7 6.3a4.5 4.5 0 0 0 5.6 5.6L21 11a5.5 5.5 0 0 1-6.8 5.2L8 22.5 4.5 19l6.2-6.3A5.5 5.5 0 0 1 16 5.7Z" /><path d="m3 5 2-2 4 4-2 2Z" /></>,
  settings: <><path d="M12 2.5 14 5l3.2-.4.6 3.2L20.5 9.5 19.3 12.5l1.2 3-2.7 1.7-.6 3.2-3.2-.4-2 2.5-2-2.5-3.2.4-.6-3.2L3.5 15.5l1.2-3-1.2-3 2.7-1.7.6-3.2 3.2.4Z" /><circle cx="12" cy="12.5" r="3" /></>,
  question: <><circle cx="12" cy="12" r="9.5" /><path d="M9.2 9a2.9 2.9 0 1 1 4.3 2.6c-1 .6-1.5 1.2-1.5 2.4M12 17.2v.1" /></>,
  alert: <><path d="M10.3 3.8 2.3 18a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" /><path d="M12 9.5V14m0 3.2v.1" /></>,
  signal: <><path d="M5 12.5a10 10 0 0 1 14 0M8 15.5a5.5 5.5 0 0 1 8 0M2 9.5a14.5 14.5 0 0 1 20 0" /><circle cx="12" cy="19" r="1.2" /></>,
  speed: <><path d="M3.5 17a9 9 0 1 1 17 0" /><path d="m12 13.5 5.5-4" /><circle cx="12" cy="13.5" r="1.4" /></>,
  play: <><circle cx="12" cy="12" r="9.5" /><path d="m10 8.5 5.5 3.5-5.5 3.5Z" /></>,
  download: <><path d="M12 3v12.5m-5-5 5 5 5-5M4 16.5V20a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 20v-3.5" /></>,
  handshake: <><path d="m2.5 11 4-4.5 3.5 1.5 3-1.5 2 .5L21.5 11" /><path d="m6.5 13.5 3 3a1.4 1.4 0 0 0 2-2m-2.8-3.8 4.3 4.3a1.4 1.4 0 0 0 2-2l-3.5-3.5m1.5 5.5 1 1a1.4 1.4 0 0 0 2-2l-1-1M2.5 11l4 2.5m15-2.5-3 2" /></>,
  target: <><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="12" r="5.5" /><circle cx="12" cy="12" r="1.5" /></>,
  bulb: <><path d="M9 18h6M10 21.5h4M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.4 1 2.4V18h6v-1.5c0-1 .4-1.8 1-2.4a6.5 6.5 0 0 0-4-11.6Z" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1 1 2-2m-3 7 1 1 2-2m-3 7 1 1 2-2" /></>,
  arrowRight: <path d="M3 12h17m-7-7 7 7-7 7" />,
  plus: <path d="M12 4v16M4 12h16" />,
  link: <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" /></>,
}
export const ICONS = Object.keys(PATHS)

/**
 * Blue outlined icon: a name from PATHS, a name from the panel set (Icono), or
 * page-specific SVG children (24 × 24 stroke paths) passed directly as `name`.
 */
export function V7Icon({ name, className = '' }) {
  if (typeof name === 'object') return <svg className={`v7-glyph ${className}`} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{name}</svg>
  if (PATHS[name]) return <svg className={`v7-glyph ${className}`} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{PATHS[name]}</svg>
  return <span className={`v7-glyph ${className}`}><Icono nombre={name} tam={48} /></span>
}

/** Icon + title + text list. items: [[icon, title, text]] */
export function Features({ items, className = '', boxed = true }) {
  return <ul className={`v7-features${boxed ? ' is-boxed' : ''} ${className}`}>{items.map(([icon, title, text], i) => <li key={typeof title === 'string' ? title : i}>
    <span className="v7-icon"><V7Icon name={icon} /></span>
    <div><h3>{title}</h3>{text && <p>{text}</p>}</div>
  </li>)}</ul>
}

/** Counts a leading number up to its real value once visible ("80+", "12 meses", "5.000 km"). */
export function CountUp({ value }) {
  const ref = useRef(null)
  const match = typeof value === 'string' && value.match(/^(\D*?)(\d{1,3}(?:\.\d{3})*|\d+)(?![\d/-])(.*)$/)
  useEffect(() => {
    const el = ref.current
    if (!el || !match || matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') return
    const target = Number(match[2].replace(/\./g, ''))
    const format = n => match[1] + (match[2].includes('.') ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : String(n)) + match[3]
    let frame
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      if (document.documentElement.classList.contains('v7-static')) { el.textContent = value; return }
      const start = performance.now(), duration = 1400
      const tick = now => {
        const t = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - t, 4)
        el.textContent = format(Math.round(target * eased))
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, { threshold: 0.6 })
    observer.observe(el)
    return () => { observer.disconnect(); cancelAnimationFrame(frame); el.textContent = value }
  }, [value])
  return <strong ref={ref} aria-label={typeof value === 'string' ? value : undefined}>{value}</strong>
}

/** Pointer tilt for cards: a few degrees towards the cursor. */
export function tilt(e) {
  const el = e.currentTarget, r = el.getBoundingClientRect()
  el.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -6}deg`)
  el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`)
}
function untilt(e) { e.currentTarget.style.removeProperty('--rx'); e.currentTarget.style.removeProperty('--ry') }

/** Bordered translucent metric card, e.g. "80+ unidades visibles en una vista". */
export function StatCard({ icon, value, label, className = '' }) {
  return <div className={`v7-stat ${className}`} onPointerMove={tilt} onPointerLeave={untilt}>
    {icon && <V7Icon name={icon} />}
    <p><CountUp value={value} /><span>{label}</span></p>
  </div>
}

function magnet(e) {
  const el = e.currentTarget, r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * 0.18}px`)
  el.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * 0.3}px`)
}
function unmagnet(e) { e.currentTarget.style.removeProperty('--mx'); e.currentTarget.style.removeProperty('--my') }

export function DemoButton({ to = DEMO_ROUTE, children = 'Solicitar una demostración', className = '' }) {
  return <Link className={`v7-button ${className}`} to={to} onPointerMove={magnet} onPointerLeave={unmagnet}>{children}<Arrow /></Link>
}

/**
 * FAQ with native <details>. items: [{ q, a, icon }]. `open`: 'first' (default), 'all' or 'none'.
 * `columns` lays the cards out in a grid while keeping reading order on phones.
 */
export function FaqList({ items, columns = 1, className = '', open = 'first' }) {
  return <div className={`v7-faq-list ${className}`} style={{ '--faq-cols': columns }}>{items.map((item, index) => <details key={item.q} open={open === 'all' || (open === 'first' && index === 0) ? true : undefined}>
    <summary>{item.icon && <span className="v7-faq-icon"><V7Icon name={item.icon} /></span>}<span className="v7-faq-q">{item.q}</span><svg className="v7-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M12 4v16" /></svg></summary>
    <p>{item.a}</p>
  </details>)}</div>
}

export function MailPrompt({ className = '', lead = '¿Tienes otra pregunta?', prefix = 'Escríbenos a' }) {
  return <a className={`v7-mail ${className}`} href="mailto:contacto@fom.app">
    <span className="v7-icon"><V7Icon name="mail" /></span>
    <span><small>{lead}</small><span>{prefix} <b>contacto@fom.app</b></span></span>
    <Arrow />
  </a>
}

const FOOTER_GROUPS = [
  ['Plataforma', [['Plataforma web', '/plataforma'], ['App', '/app'], ['Funciones', '/funciones'], ['Seguridad', '/seguridad'], ['Áreas', '/areas']]],
  ['Información', [['Quiénes somos', '/quienes-somos'], ['Qué ofrecemos', '/que-ofrecemos'], ['Beneficios', '/beneficios'], ['Preguntas frecuentes', '/preguntas-frecuentes']]],
]

/**
 * Footer for the v7 pages: photo band with the large brand and tagline, then the
 * link columns. Layout specifics per page live in the page stylesheet.
 */
export function V7Footer() {
  // One footer for every page, always with the same photo (user decision): the page-specific
  // footer photos and layouts are ignored so the ending is identical site-wide.
  const ref = useReveal('rise')
  const { pathname } = useLocation()
  return <footer ref={ref} className="v7-section v7-footer is-shared">
    <div className="v7-footer-photo" aria-hidden="true"><img src={plate('02-plataforma/10')} alt="" loading="lazy" decoding="async" /></div>
    <div className="v7-footer-top">
      <div className="v7-footer-brand"><Link to="/" aria-label="FOM — inicio"><Brand /></Link><p>La oficina y la carretera, conectadas.</p></div>
      <div className="v7-footer-cta"><p>¿Quieres verlo con tu operación?</p><DemoButton /></div>
    </div>
    <div className="v7-footer-links">
      {FOOTER_GROUPS.map(([name, links]) => <nav key={name} aria-label={name}><h2>{name}</h2>{links.map(([label, to]) => <Link key={to} to={to} aria-current={pathname === to ? 'page' : undefined}>{label}</Link>)}</nav>)}
      <nav aria-label="Contacto"><h2><Link to="/contacto">Contacto</Link></h2><a href="mailto:contacto@fom.app">contacto@fom.app</a><Link to={DEMO_ROUTE}>Solicitar una demostración</Link></nav>
    </div>
    <small className="v7-copyright">© {new Date().getFullYear()} FOM. Todos los derechos reservados.</small>
  </footer>
}
