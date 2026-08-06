import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  Bloom,
  EffectComposer,
  N8AO,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import CityScene from '../scenes/CityScene'
import StreetDetail from '../scenes/StreetDetail'
import StreetLights from '../scenes/StreetLights'
import VehicleScene from '../scenes/VehicleScene'
import { CameraRig, ProgressSmoother } from '../scenes/CameraRig'
import VehicleCard from './VehicleCard'
import Telemetry, { TELEMETRY_ITEMS } from './Telemetry'
import { ScrollTrigger, useScrollProgress } from '../hooks/useScrollProgress'
import { fade, range, smooth, truckAdvance } from '../utils/stages'

function getTier() {
  const w = window.innerWidth
  if (w >= 1100) return 'high'
  if (w >= 768) return 'mid'
  return 'low'
}

const INTRO_VH = { high: 480, mid: 440, low: 380 }

export default function CinematicIntro({ reduced }) {
  const wrapRef = useRef(null)
  const stickyRef = useRef(null)
  const smoothProgress = useRef(0)

  const [tier, setTier] = useState(getTier)
  const [inView, setInView] = useState(true)

  // Refs de todos los overlays DOM animados por scroll
  const ov = useRef({})
  const teleRefs = useRef({ itemRefs: [], phraseRef: { current: null } })

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

  // Pausa el render 3D cuando la intro sale del viewport
  useEffect(() => {
    const el = stickyRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Variante con desplazamiento en X, para las fichas que entran de los lados.
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

  const updateOverlays = useCallback(
    (p) => {
      const o = ov.current

      setF(o.hero, fade(p, -1, 0, 0.075, 0.125), -smooth(range(p, 0, 0.13)) * 70)
      setF(o.scroll, fade(p, -1, 0, 0.04, 0.09))
      setF(o.area, fade(p, 0.315, 0.35, 0.47, 0.51), (1 - fade(p, 0.315, 0.35, 2, 2)) * 22)
      setF(o.vehicle, fade(p, 0.455, 0.49, 0.6, 0.635), (1 - fade(p, 0.455, 0.49, 2, 2)) * 26)

      // Telemetría enganchada al AVANCE de la unidad, no al scroll: cada dato
      // entra cuando la camioneta ha recorrido su tramo, así que la cadencia
      // acelera y frena con ella en vez de ir a ritmo constante.
      const adv = truckAdvance(p)
      teleRefs.current.itemRefs.forEach((el, i) => {
        const at = 0.05 + i * 0.115
        const o = fade(adv, at, at + 0.085, 0.8, 0.88)
        // entra deslizando desde su propio lado hacia el vehículo
        const dir = TELEMETRY_ITEMS[i] && TELEMETRY_ITEMS[i].side === 'r' ? 1 : -1
        setFX(el, o, (1 - fade(adv, at, at + 0.085, 2, 2)) * 64 * dir)
      })
      // sale de escena ANTES de que entre el mensaje final: al cruzar el
      // parabrisas los dos textos se pisaban.
      setF(teleRefs.current.phraseRef.current, fade(adv, 0.42, 0.52, 0.74, 0.83))

      // Cierre: la cámara retrocede levemente y entra el mensaje final
      setF(o.final, fade(p, 0.885, 0.93, 2, 2))

      // Botón saltar
      if (o.skip) {
        const so = 1 - smooth(range(p, 0.86, 0.92))
        o.skip.style.opacity = so.toFixed(3)
        o.skip.style.pointerEvents = so > 0.4 ? 'auto' : 'none'
      }
    },
    [setF, setFX]
  )

  const rawProgress = useScrollProgress(wrapRef, updateOverlays, !reduced)

  // Modo con movimiento reducido: escena fija + texto visible, sin scrub
  useEffect(() => {
    if (!reduced) return
    smoothProgress.current = 0.34
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

  const canvas = useMemo(
    () => (
      <Canvas
        className="intro-canvas"
        dpr={[1, 1.75]}
        frameloop={inView ? 'always' : 'never'}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ fov: 58, near: 0.1, far: 700, position: [12, 26, 62] }}
      >
        <color attach="background" args={['#0a1626']} />
        <fog attach="fog" args={['#0a1626', 55, 225]} />
        <ProgressSmoother
          raw={rawProgress}
          smooth={smoothProgress}
          fixed={reduced ? 0.34 : null}
        />
        <CameraRig progress={smoothProgress} />
        <CityScene progress={smoothProgress} tier={tier} />
        <StreetDetail progress={smoothProgress} />
        <StreetLights />
        <VehicleScene progress={smoothProgress} />

        {/* El postprocesado es lo que separa un render "de juguete" de una
            imagen creíble: oclusión de contacto entre edificio y suelo, halo
            en las ventanas y farolas encendidas, y viñeta de cine. */}
        {tier !== 'low' && (
          <EffectComposer multisampling={0} enableNormalPass={tier === 'high'}>
            {tier === 'high' ? (
              <N8AO aoRadius={2.2} intensity={2.4} distanceFalloff={1.4} quality="medium" />
            ) : null}
            {/* Umbral por encima de 1: el bloom actúa antes del tone mapping,
                sobre valores lineales. Con un umbral <1 la carrocería roja de
                la Hilux entra en el halo y baña de rojo toda la calzada. Sólo
                deben brillar las fuentes que emiten en HDR (ver hdrGlow). */}
            <Bloom
              intensity={0.55}
              luminanceThreshold={1.05}
              luminanceSmoothing={0.1}
              mipmapBlur
            />
            {/* El composer desactiva el tone mapping del renderer: sin esto
                los valores lineales salen crudos y la escena se satura. */}
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <Vignette offset={0.24} darkness={0.62} />
            <SMAA />
          </EffectComposer>
        )}
      </Canvas>
    ),
    [tier, inView, reduced, rawProgress]
  )

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
        {canvas}

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

          {/* Cierre sobre el plano del vehículo */}
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
