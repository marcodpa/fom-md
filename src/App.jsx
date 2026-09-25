import { lazy, Suspense, useLayoutEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import MarketingHeader from './components/marketing/MarketingChrome'
import './styles/marketing.css'
import './styles/marketing-backgrounds.css'
import './styles/fom-v6.css'

const Marketing = lazy(() => import('./pages/ReferenceMarketing'))
const HomeV7 = lazy(() => import('./pages/HomeV7'))
const Entrar = lazy(() => import('./pages/Entrar'))
const CambiarClaveInicial = lazy(() => import('./pages/CambiarClaveInicial'))
const Consola = lazy(() => import('./panel/Consola'))
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
  const esConsola = pathname === '/entrar' || pathname === '/cambiar-clave-inicial' || pathname.startsWith('/panel')
  return <div id="top" className={esConsola ? undefined : `marketing-v2${pathname === '/' ? ' home-v7-shell' : ''}`}>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    {!esConsola && <MarketingHeader />}
    <ScrollTop />
    <Suspense fallback={<div className="route-loading" role="status" style={{ padding: '120px 5%' }}>Cargando…</div>}>
      <Routes>
        <Route path="/" element={<HomeV7 />} />
        {['plataforma','funciones','seguridad','areas','contacto','preguntas-frecuentes','app','beneficios','quienes-somos','que-ofrecemos'].map(path => <Route key={path} path={'/' + path} element={<Marketing />} />)}
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/cambiar-clave-inicial" element={<CambiarClaveInicial />} />
        <Route path="/panel/*" element={<Consola />} />
        <Route path="*" element={<Marketing />} />
      </Routes>
    </Suspense>
  </div>
}
