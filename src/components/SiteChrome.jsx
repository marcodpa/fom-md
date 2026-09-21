import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icono } from '../panel/Iconos'

const LINKS = [['/', 'Inicio'], ['/plataforma', 'Plataforma'], ['/funciones', 'Funciones'], ['/seguridad', 'Seguridad'], ['/areas', 'Áreas'], ['/contacto', 'Contacto']]

export function SiteBrand() {
  return <span className="site-brand"><Icono nombre="pin" tam={30} /><b>FOM</b></span>
}

export default function SiteHeader() {
  const [abierto, setAbierto] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setAbierto(false) }, [pathname])
  useEffect(() => {
    if (!abierto) return undefined
    const cerrar = e => { if (e.key === 'Escape') setAbierto(false) }
    window.addEventListener('keydown', cerrar)
    return () => window.removeEventListener('keydown', cerrar)
  }, [abierto])
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" aria-label="FOM — inicio"><SiteBrand /></Link>
        <nav id="site-navigation" className={`site-nav${abierto ? ' abierta' : ''}`} aria-label="Navegación principal">
          {LINKS.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
          <Link className="site-mobile-help" to="/preguntas-frecuentes">Preguntas frecuentes</Link>
        </nav>
        <div className="site-header-actions">
          <Link to="/entrar" className="site-button primary"><Icono nombre="gente" tam={18} />Entrar</Link>
          <button className="site-menu" aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={abierto} aria-controls="site-navigation" onClick={() => setAbierto(v => !v)}><Icono nombre={abierto ? 'cerrar' : 'menu'} /></button>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link to="/" aria-label="FOM — inicio"><SiteBrand /></Link>
      <span>Web y app, una sola operación.</span>
      <nav aria-label="Más información"><Link to="/plataforma">Plataforma</Link><Link to="/preguntas-frecuentes">Preguntas frecuentes</Link><Link to="/contacto">Contacto</Link></nav>
      <small>© {new Date().getFullYear()} FOM</small>
    </footer>
  )
}
