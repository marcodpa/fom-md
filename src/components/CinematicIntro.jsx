import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import VehicleCard from './VehicleCard'
import Telemetry, { TELEMETRY_ITEMS } from './Telemetry'
import { ScrollTrigger, useScrollProgress } from '../hooks/useScrollProgress'

// ============================================================
// INTRO CINEMATOGRÁFICA — video controlado por scroll
// ------------------------------------------------------------
// El scroll no reproduce el video: lo BUSCA. ScrollTrigger convierte la
// posición de la página en un tiempo dentro del clip y un bucle de rAF lleva
// `currentTime` hasta ese tiempo con suavizado. Por eso el movimiento
// responde al instante al dedo o a la rueda, y hacia atrás también.
//
// El clip está reencodeado con un keyframe cada 2 cuadros (ver public/intro):
// un mp4 normal solo puede saltar a sus keyframes, que van cada 2 segundos, y
// el scrub se ve a tirones. Ese reencodeo es la mitad del truco.
//
// Los overlays (eslogan, área, ficha de la unidad, telemetría, cierre) siguen
// siendo DOM y se cronometran contra el mismo progreso, así que caen sobre el
// fotograma que les toca.
// ============================================================

const BASE = import.meta.env.BASE_URL || '/'
const POSTER = `${BASE}intro/fom-intro-poster.jpg`

// Tres calidades. El clip original es 1280x720: en una pantalla grande el
// navegador lo estira y lo ablanda, así que para esas se sirve una copia ya
// ampliada con lanczos y realce en el encode, que se ve más limpia que la
// ampliación bilineal del navegador. Cada visitante baja UNA sola.
//   ≥1440 px  fom-intro-1080.mp4   1920x1080   16,3 MB
//   ≥768 px   fom-intro.mp4        1280x720    10,4 MB
//   <768 px   fom-intro-movil.mp4   854x480     3,6 MB
function elegirVideo() {
  if (typeof window === 'undefined') return `${BASE}intro/fom-intro.mp4`
  const w = window.innerWidth
  if (w < 768) return `${BASE}intro/fom-intro-movil.mp4`
  if (w >= 1440) return `${BASE}intro/fom-intro-1080.mp4`
  return `${BASE}intro/fom-intro.mp4`
}

// --- Utilidades de cronometraje ------------------------------------------
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t)
const smooth = (t) => {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}
const range = (p, a, b) => clamp01((p - a) / (b - a))
/** 0 antes de `a`, sube a→b, se mantiene en 1 entre b→c, baja c→d. */
function fade(p, a, b, c, d) {
  if (p <= a || p >= d) return 0
  if (p < b) return smooth(range(p, a, b))
  if (p > c) return 1 - smooth(range(p, c, d))
  return 1
}

function getTier() {
  const w = window.innerWidth
  if (w >= 1100) return 'high'
  if (w >= 768) return 'mid'
  return 'low'
}

// Cuánto scroll ocupa la intro. Más alto = el video avanza más despacio.
const INTRO_VH = { high: 420, mid: 380, low: 320 }

// ============================================================
// Momentos del clip (11,07 s), en progreso 0–1
//   0.00–0.27  descenso aéreo sobre la ciudad
//   0.27–0.45  baja por la avenida y alcanza la unidad
//   0.45–0.72  lateral izquierdo, la puerta se abre
//   0.72–1.00  entra a la cabina y se asienta
// ============================================================
const T = {
  hero: [-1, 0, 0.1, 0.16],
  scroll: [-1, 0, 0.05, 0.1],
  area: [0.22, 0.28, 0.4, 0.45],
  vehiculo: [0.44, 0.5, 0.62, 0.67],
  // Ventana del tramo lateral: la telemetría se reparte dentro de ella.
  lateral: [0.46, 0.8],
  final: [0.9, 0.95, 2, 2],
}

export default function CinematicIntro({ reduced }) {
  const wrapRef = useRef(null)
  const stickyRef = useRef(null)
  const videoRef = useRef(null)

  const [tier, setTier] = useState(getTier)
  const [inView, setInView] = useState(true)
  const [listo, setListo] = useState(false)

  // Tiempo al que el scroll quiere llevar el video; el rAF lo persigue.
  const tiempoObjetivo = useRef(0)

  // Refs de todos los overlays DOM animados por scroll
  const ov = useRef({})
  const teleRefs = useRef({ itemRefs: [], phraseRef: { current: null } })

  // Se decide una vez al montar: cambiar el src a media reproducción reinicia
  // la descarga y deja la intro en negro mientras rebuffea.
  const src = useMemo(elegirVideo, [])

  useEffect(() => {
    let timer
    const onResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setTier(getTier()), 200)
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // La altura de la intro depende del tier: recalcular los ScrollTriggers
  // cuando cambia (p. ej. al rotar el dispositivo o redimensionar la ventana).
  useEffect(() => {
    ScrollTrigger.refresh()
  }, [tier])

  // Pausar la persecución de cuadros cuando la intro sale del viewport.
  useEffect(() => {
    const el = stickyRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // El video nunca se reproduce solo: se busca. Pero Safari/iOS no permite
  // mover `currentTime` de un video que jamás arrancó, así que se le da un
  // play mudo y se pausa en el acto.
  const prepararVideo = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    const p = v.play()
    if (p?.then) p.then(() => v.pause()).catch(() => {})
    else v.pause()
  }, [])

  // --- Persecución del tiempo objetivo -------------------------------------
  useEffect(() => {
    const v = videoRef.current
    if (!v || reduced || !listo || !inView) return undefined

    let vivo = true
    let marco = 0
    const paso = () => {
      if (!vivo) return
      const dur = v.duration
      if (dur) {
        const actual = v.currentTime
        const delta = tiempoObjetivo.current - actual
        // Salto grande (el usuario tiró del scroll): ir directo, sin arrastre.
        if (Math.abs(delta) > 0.55) v.currentTime = tiempoObjetivo.current
        else if (Math.abs(delta) > 1 / 60) v.currentTime = actual + delta * 0.22
      }
      marco = requestAnimationFrame(paso)
    }
    marco = requestAnimationFrame(paso)
    return () => {
      vivo = false
      cancelAnimationFrame(marco)
    }
  }, [reduced, listo, inView])

  // --- Overlays -------------------------------------------------------------
  const setFX = useCallback((el, opacity, x = 0) => {
    if (!el) return
    el.style.opacity = opacity.toFixed(3)
    el.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible'
    el.style.translate = x === 0 ? '0 0' : `${x.toFixed(1)}px 0`
    // `is-in` dispara el barrido y la estela una sola vez por entrada; al
    // volver hacia atrás con el scroll se rearma sola.
    el.classList.toggle('is-in', opacity > 0.6)
  }, [])

  const setF = useCallback((el, opacity, y = 0) => {
    if (!el) return
    el.style.opacity = opacity.toFixed(3)
    el.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible'
    el.style.translate = y === 0 ? '0 0' : `0 ${y.toFixed(1)}px`
    el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none'
  }, [])

  const alDesplazar = useCallback(
    (p) => {
      // 1) El video: el progreso del scroll ES el tiempo del clip.
      const v = videoRef.current
      if (v?.duration) tiempoObjetivo.current = p * v.duration

      // 2) Los overlays, cronometrados contra ese mismo progreso.
      const o = ov.current

      setF(o.hero, fade(p, ...T.hero), -smooth(range(p, 0, 0.13)) * 70)
      setF(o.scroll, fade(p, ...T.scroll))
      setF(o.area, fade(p, ...T.area), (1 - fade(p, T.area[0], T.area[1], 2, 2)) * 22)
      setF(
        o.vehicle,
        fade(p, ...T.vehiculo),
        (1 - fade(p, T.vehiculo[0], T.vehiculo[1], 2, 2)) * 26
      )

      // La telemetría se reparte a lo largo del tramo lateral, que es donde la
      // unidad se ve entera y el cuadro tiene espacio libre a los lados.
      const lat = range(p, T.lateral[0], T.lateral[1])
      teleRefs.current.itemRefs.forEach((el, i) => {
        const at = 0.06 + i * 0.115
        const opacidad = fade(lat, at, at + 0.09, 0.82, 0.9)
        // entra deslizando desde su propio lado hacia el vehículo
        const dir = TELEMETRY_ITEMS[i]?.side === 'r' ? 1 : -1
        setFX(el, opacidad, (1 - fade(lat, at, at + 0.09, 2, 2)) * 64 * dir)
      })
      // Sale de escena ANTES de que entre el mensaje final: al cruzar la
      // puerta los dos textos se pisaban.
      setF(teleRefs.current.phraseRef.current, fade(lat, 0.44, 0.54, 0.76, 0.86))

      // Cierre: ya dentro de la cabina, sobre el parabrisas.
      setF(o.final, fade(p, ...T.final))

      // Botón saltar
      if (o.skip) {
        const so = 1 - smooth(range(p, 0.86, 0.92))
        o.skip.style.opacity = so.toFixed(3)
        o.skip.style.pointerEvents = so > 0.4 ? 'auto' : 'none'
      }
    },
    [setF, setFX]
  )

  useScrollProgress(wrapRef, alDesplazar, !reduced)

  // Modo con movimiento reducido: primer cuadro fijo y el eslogan visible.
  useEffect(() => {
    if (!reduced) return
    const o = ov.current
    if (o.hero) {
      o.hero.style.opacity = '1'
      o.hero.style.visibility = 'visible'
    }
  }, [reduced])

  const scrollToProgress = useCallback((p, behavior = 'smooth') => {
    const wrap = wrapRef.current
    if (!wrap) return
    const y = wrap.offsetTop + p * (wrap.offsetHeight - window.innerHeight)
    window.scrollTo({ top: y, behavior })
  }, [])

  const skipIntro = useCallback(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    window.scrollTo({
      top: wrap.offsetTop + wrap.offsetHeight - window.innerHeight + 4,
      behavior: 'auto',
    })
  }, [])

  const reg = (name) => (el) => {
    ov.current[name] = el
  }

  return (
    <section
      ref={wrapRef}
      className="intro"
      style={{ '--intro-h': reduced ? '100vh' : `${INTRO_VH[tier]}vh` }}
      aria-label="Introducción cinematográfica de FOM"
    >
      <div ref={stickyRef} className="intro-sticky">
        <video
          ref={videoRef}
          className="intro-video"
          src={src}
          poster={POSTER}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
          onLoadedMetadata={prepararVideo}
          onCanPlay={() => setListo(true)}
        />

        <div className="intro-overlays">
          {/* Etapa 1 */}
          <div ref={reg('hero')} className="ov ov-hero">
            {/* Eslogan de la casa, enmarcado abajo a la izquierda como rótulo de plano */}
            <div className="ov-hero-slogan">
              <h1 className="ov-hero-line">
                Tu flota en movimiento.
                <em>Tu operación bajo control.</em>
              </h1>
              <p className="ov-hero-sub">
                Localiza, organiza y supervisa cada unidad desde una sola plataforma.
              </p>
            </div>
          </div>

          <div ref={reg('scroll')} className="ov ov-scroll" aria-hidden="true">
            <div className="ov-scroll-mouse" />
            <span>Desplázate para explorar</span>
          </div>

          {/* Etapa 3 */}
          <div ref={reg('area')} className="ov ov-area" aria-label="Área operativa Maracaibo">
            <div className="ov-area-tag">Área operativa</div>
            <h3>Maracaibo</h3>
            <div className="ov-area-row">
              <span className="ov-area-dot blue" />
              <b>8</b> vehículos asignados
            </div>
            <div className="ov-area-row">
              <span className="ov-area-dot green" />
              <b>6</b> unidades en marcha
            </div>
          </div>

          {/* Etapa 4 */}
          <VehicleCard ref={reg('vehicle')} onView={() => scrollToProgress(0.66)} />

          {/* Etapa 6 */}
          <Telemetry ref={teleRefs} />

          {/* Cierre, ya dentro de la cabina */}
          <div ref={reg('final')} className="ov ov-final">
            <div className="ov-final-inner">
              <h2>
                <span>Toda tu flota.</span>
                <span className="accent">Una sola plataforma.</span>
              </h2>
              <p>FOM — Fleet Operations &amp; Maintenance</p>
            </div>
          </div>

          {!reduced && (
            <button type="button" ref={reg('skip')} className="ov-skip" onClick={skipIntro}>
              Saltar introducción
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
