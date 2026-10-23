import { lazy, Suspense, useLayoutEffect } from 'react'
import CargaFom from './components/CargaFom'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import MarketingHeader from './components/marketing/MarketingChrome'
import './styles/marketing.css'
import './styles/marketing-backgrounds.css'
import './styles/fom-v6.css'
import './styles/v7-header.css'

const Marketing = lazy(() => import('./pages/ReferenceMarketing'))
const Inicio = lazy(() => import('./pages/v7/Inicio'))
// v7 pages, one per route, implemented from output/laminas-secciones-v7.
const V7_PAGES = {
  plataforma: lazy(() => import('./pages/v7/Plataforma')),
  app: lazy(() => import('./pages/v7/AppConductor')),
  funciones: lazy(() => import('./pages/v7/Funciones')),
  seguridad: lazy(() => import('./pages/v7/Seguridad')),
  areas: lazy(() => import('./pages/v7/Areas')),
  'quienes-somos': lazy(() => import('./pages/v7/QuienesSomos')),
  'que-ofrecemos': lazy(() => import('./pages/v7/QueOfrecemos')),
  beneficios: lazy(() => import('./pages/v7/Beneficios')),
  'preguntas-frecuentes': lazy(() => import('./pages/v7/Preguntas')),
  contacto: lazy(() => import('./pages/v7/Contacto')),
}
const Entrar = lazy(() => import('./pages/Entrar'))
const CambiarClaveInicial = lazy(() => import('./pages/CambiarClaveInicial'))
const Consola = lazy(() => import('./panel/Consola'))
const MotionPage = lazy(() => import('./motion/MotionPage'))
const LaboratorioV8 = lazy(() => import('./pages/v8/LaboratorioV8')) // T-142: escenas en prueba, ruta oculta
// T-104: web nueva (v8), aparte en /nuevo/* hasta que Marco la apruebe. Sus rutas salen de UNA
// tabla (src/pages/v8/rutasV8.js); cada página se registra sola por nombre de archivo.
import { RUTAS_V8, PAGINAS_V8, PUBLICADA, esRutaV8 } from './pages/v8/rutasV8'
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

function ScrollTop() {
  const { pathname, hash } = useLocation()
  useLayoutEffect(() => {
    if (!hash) { window.scrollTo({ top: 0, behavior: 'instant' }); return }
    // Route chunks may arrive after this effect; observe only until the anchor exists.
    let targetId
    try { targetId = decodeURIComponent(hash.slice(1)) } catch { return }
    const jump = () => {
      const target = document.getElementById(targetId)
      if (!target) return false
      target.scrollIntoView({ block: 'start', behavior: 'instant' })
      return true
    }
    if (jump()) return
    const observer = new MutationObserver(() => { if (jump()) observer.disconnect() })
    observer.observe(document.getElementById('root'), { childList: true, subtree: true })
    const timeout = setTimeout(() => observer.disconnect(), 5000)
    return () => { observer.disconnect(); clearTimeout(timeout) }
  }, [pathname, hash])
  return null
}

export default function App() {
  const { pathname } = useLocation()
  const esConsola = pathname === '/motion' || pathname === '/entrar' || pathname === '/cambiar-clave-inicial' || pathname.startsWith('/panel')
  const v8 = esRutaV8(pathname) || pathname === '/nuevo/laboratorio'
  const v7 = !v8 && (pathname === '/' || Boolean(V7_PAGES[pathname.slice(1)]))
  return <div id="top" className={esConsola || v8 ? undefined : `marketing-v2${v7 ? ' v7-shell' : ''}`}>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    {!esConsola && !v8 && <MarketingHeader />}
    <ScrollTop />
    <Suspense fallback={<CargaFom />}>
      <Routes>
        {/* Con la web nueva publicada, las rutas reales son de v8 y las de v7 se retiran. */}
        {!PUBLICADA && <Route path="/" element={<Inicio />} />}
        {!PUBLICADA && ['plataforma','funciones','seguridad','areas','contacto','preguntas-frecuentes','app','beneficios','quienes-somos','que-ofrecemos'].map(path => {
          const Page = V7_PAGES[path] || Marketing
          return <Route key={path} path={'/' + path} element={<Page />} />
        })}
        {/* Los enlaces viejos a /nuevo/* llevan a la página publicada. */}
        {PUBLICADA && PAGINAS_V8.map(p => <Route key={'nuevo-' + p.clave} path={p.nueva} element={<Navigate to={p.real} replace />} />)}
        <Route path="/motion" element={<MotionPage />} />
        <Route path="/nuevo/laboratorio" element={<LaboratorioV8 />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/cambiar-clave-inicial" element={<CambiarClaveInicial />} />
        <Route path="/panel/*" element={<Consola />} />
        {RUTAS_V8.map(({ clave, ruta, Componente }) => <Route key={clave} path={ruta} element={<Componente />} />)}
        <Route path="*" element={<Marketing />} />
      </Routes>
    </Suspense>
  </div>
}
