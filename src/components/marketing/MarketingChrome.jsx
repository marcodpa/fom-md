import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icono } from '../../panel/Iconos'
const GROUPS = [
  { name: 'Plataforma', id: 'plataforma', links: [['/plataforma', 'Plataforma web'], ['/app', 'App'], ['/funciones', 'Funciones'], ['/seguridad', 'Seguridad'], ['/areas', 'Áreas']] },
  { name: 'Información', id: 'informacion', links: [['/quienes-somos', 'Quiénes somos'], ['/que-ofrecemos', 'Qué ofrecemos'], ['/beneficios', 'Beneficios'], ['/preguntas-frecuentes', 'Preguntas']] },
]
export function Brand() { return <span className="m-brand"><Icono nombre="pin" tam={30} /><b>FOM</b></span> }
export default function MarketingHeader() {
  const [open, setOpen] = useState(false)
  const [group, setGroup] = useState(null)
  const header = useRef(null)
  const { pathname, hash } = useLocation()
  const close = () => { setOpen(false); setGroup(null) }
  useEffect(() => { setOpen(false); setGroup(null) }, [pathname, hash])
  // Compact header and reading progress once the page scrolls.
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const el = header.current
      if (!el) return
      el.classList.toggle('is-scrolled', scrollY > 12)
      const max = document.documentElement.scrollHeight - innerHeight
      el.style.setProperty('--progress', max > 0 ? (scrollY / max).toFixed(4) : 0)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    addEventListener('scroll', onScroll, { passive: true })
    return () => { removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [pathname])
  useEffect(() => {
    const outside = e => { if (!header.current?.contains(e.target)) { setOpen(false); setGroup(null) } }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  const link = (to, name) => <Link key={to} to={to} className={pathname + hash === to ? 'active' : undefined} aria-current={pathname + hash === to ? 'location' : undefined} onClick={close}>{name}</Link>
  return <header ref={header} className="m-header" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) close() }} onKeyDown={e => {
    if (e.key !== 'Escape') return
    if (group) { header.current.querySelector(`#nav-trigger-${group}`)?.focus(); setGroup(null) }
    else if (open) { header.current.querySelector('.m-menu')?.focus(); setOpen(false) }
  }}>
    <Link to="/" aria-label="FOM — inicio" onClick={close}><Brand /></Link>
    <nav className={open ? 'is-open' : ''} id="marketing-nav" aria-label="Navegación principal">
      {link('/', 'Inicio')}
      {GROUPS.map(item => <div className="m-nav-group" key={item.id}>
        <button id={`nav-trigger-${item.id}`} className={`m-nav-trigger${item.links.some(([to]) => pathname + hash === to) ? ' active' : ''}`} aria-expanded={group === item.id} aria-controls={`nav-group-${item.id}`} onClick={() => setGroup(value => value === item.id ? null : item.id)}>{item.name}<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></button>
        <div id={`nav-group-${item.id}`} className="m-nav-submenu" hidden={group !== item.id}>{item.links.map(([to, name]) => link(to, name))}</div>
      </div>)}
      {link('/contacto', 'Contacto')}
    </nav>
    <div className="m-header-actions"><Link className="m-login" to="/entrar">Iniciar sesión</Link><Link className="m-header-cta" to="/contacto#solicitud-demo">Solicitar demo</Link><button aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-controls="marketing-nav" aria-expanded={open} className="m-menu" onClick={() => { setOpen(v => !v); setGroup(null) }}><Icono nombre={open ? 'cerrar' : 'menu'} /></button></div>
  </header>
}
export function MarketingFooter() {
  return <footer className="m-footer"><div className="m-footer-top"><div><Link to="/" aria-label="FOM — inicio"><Brand /></Link><p>La oficina y la carretera, conectadas.</p></div><nav aria-label="Plataforma"><h3>Plataforma</h3><Link to="/plataforma">Plataforma web</Link><Link to="/app">App del conductor</Link><Link to="/funciones">Funciones</Link><Link to="/seguridad">Seguridad</Link></nav><nav aria-label="Información"><h3>Información</h3><Link to="/quienes-somos">Quiénes somos</Link><Link to="/que-ofrecemos">Qué ofrecemos</Link><Link to="/beneficios">Beneficios</Link><Link to="/areas">Áreas de flota</Link><Link to="/preguntas-frecuentes">Preguntas frecuentes</Link></nav><nav aria-label="Contacto"><h3>Conversemos</h3><Link to="/contacto">Solicitar demo</Link><a href="mailto:contacto@fom.app">contacto@fom.app</a><Link to="/entrar">Iniciar sesión ↗</Link></nav></div><div className="m-footer-bottom"><small>© {new Date().getFullYear()} FOM</small><span>Fleet Operations & Maintenance</span></div></footer>
}
