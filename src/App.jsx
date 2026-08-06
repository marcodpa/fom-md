import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import LoadingScreen from './components/LoadingScreen'
import ProductPage from './pages/ProductPage'
import { useReducedMotion } from './hooks/useReducedMotion'
import { gsap, ScrollTrigger } from './hooks/useScrollProgress'

// Home trae Three.js y la intro 3D: se separa del bundle para que las
// páginas de producto no paguen ese peso.
const Home = lazy(() => import('./pages/Home'))

// La consola solo la carga quien entra al panel.
const Entrar = lazy(() => import('./pages/Entrar'))
const Consola = lazy(() => import('./panel/Consola'))

// Al entrar a cualquier tab, empezar desde arriba. useLayoutEffect corre
// antes de pintar, así no se ve el salto. El navegador no debe restaurar la
// posición anterior en una SPA.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

function ScrollTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    // El scroll-behavior:smooth global convertía este salto en una animación
    // que el refresh de ScrollTrigger interrumpía a media página. Se anula el
    // suavizado un instante para que el salto sea inmediato...
    const html = document.documentElement
    const previo = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    window.scrollTo(0, 0)
    // ...y se reafirma tras el primer frame por si algo restaura la posición.
    const marco = requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      html.style.scrollBehavior = previo
    })
    return () => cancelAnimationFrame(marco)
  }, [pathname])
  return null
}

// Revelado de secciones. Se re-ejecuta en cada cambio de ruta porque cada
// página trae sus propios elementos [data-reveal].
function Reveals({ enabled }) {
  const { pathname } = useLocation()
  const tweensRef = useRef([])
  useEffect(() => {
    if (!enabled) return undefined
    const id = setTimeout(() => {
      tweensRef.current = gsap.utils.toArray('[data-reveal]').map((el) =>
        gsap.fromTo(
          el,
          { y: 52, opacity: 0, filter: 'blur(10px)' },
          {
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            duration: 1.1,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }
        )
      )
      ScrollTrigger.refresh()
    }, 60)
    return () => {
      clearTimeout(id)
      tweensRef.current.forEach((t) => {
        t.scrollTrigger?.kill()
        t.kill()
      })
      tweensRef.current = []
    }
  }, [pathname, enabled])
  return null
}

// Da vida a los mockups: cuando un .mk-shell entra en viewport recibe la
// clase .in y sus barras/anillos crecen (transiciones en mockups.css).
function LiveMockups() {
  const { pathname } = useLocation()
  const ioRef = useRef(null)
  useEffect(() => {
    const id = setTimeout(() => {
      const els = document.querySelectorAll('.mk-shell:not(.in)')
      if (!els.length) return
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('in')
              io.unobserve(e.target)
            }
          })
        },
        { threshold: 0.35 }
      )
      els.forEach((el) => io.observe(el))
      ioRef.current = io
    }, 120)
    return () => {
      clearTimeout(id)
      ioRef.current?.disconnect()
      ioRef.current = null
    }
  }, [pathname])
  return null
}

export default function App() {
  const reduced = useReducedMotion()
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  // La consola y el acceso son producto, no sitio: sin cabecera de marketing.
  const esConsola = pathname === '/entrar' || pathname.startsWith('/panel')
  const [ready, setReady] = useState(!isHome)

  // Pantalla de carga: solo el home espera la textura de la Hilux (3D).
  // Las páginas de producto arrancan de inmediato.
  useEffect(() => {
    if (ready) return undefined
    let alive = true
    Promise.all([
      import('./utils/hiluxTexture').then((m) => m.loadHilux()).catch(() => null),
      new Promise((r) => setTimeout(r, 900)),
    ]).then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [ready])

  // Si se entró por una página de producto, precalentar el chunk del home y
  // la textura en segundo plano para que "Inicio" abra sin espera.
  useEffect(() => {
    if (isHome) return
    const id = setTimeout(() => {
      import('./pages/Home')
      import('./utils/hiluxTexture').then((m) => m.loadHilux()).catch(() => {})
    }, 1800)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div id="top">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      {!esConsola && <div className="noise" aria-hidden="true" />}
      {isHome && <LoadingScreen hidden={ready} />}
      {!esConsola && <Header />}
      <ScrollTop />
      <Reveals enabled={ready && !reduced && !esConsola} />
      <LiveMockups />

      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home reduced={reduced} />} />
          <Route path="/plataforma" element={<ProductPage />} />
          <Route path="/funciones" element={<ProductPage />} />
          <Route path="/seguridad" element={<ProductPage />} />
          <Route path="/areas" element={<ProductPage />} />
          <Route path="/contacto" element={<ProductPage />} />
          <Route path="/preguntas-frecuentes" element={<ProductPage />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/panel/*" element={<Consola />} />
          <Route path="*" element={<ProductPage />} />
        </Routes>
      </Suspense>
    </div>
  )
}
