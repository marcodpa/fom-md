import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

// Plataforma es un grupo con sub-tabs (Funciones y Áreas) que aparecen al
// pasar el mouse por encima.
const LINKS = [
  { label: 'Inicio', to: '/', end: true },
  {
    label: 'Plataforma',
    to: '/plataforma',
    children: [
      { label: 'Plataforma', to: '/plataforma', desc: 'Panel unificado, mapa en vivo y control de acceso' },
      { label: 'Funciones', to: '/funciones', desc: 'Rastreo GPS, telemática, mantenimiento y reportes' },
      { label: 'Áreas y flota', to: '/areas', desc: 'Zonas, geocercas y operación multi-sitio' },
    ],
  },
  { label: 'Seguridad', to: '/seguridad' },
  {
    label: 'Contacto',
    to: '/contacto',
    children: [
      { label: 'Contacto', to: '/contacto', desc: 'Solicita una demostración y coordina la instalación' },
      {
        label: 'Preguntas frecuentes',
        to: '/preguntas-frecuentes',
        desc: 'Todas las dudas sobre plataforma, funciones, seguridad y puesta en marcha',
      },
    ],
  },
]

const CHILD_PATHS = LINKS.flatMap((l) => (l.children ? l.children.map((c) => c.to) : []))

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M12 2.4c-3.9 0-7 3.1-7 7 0 4.9 7 12.6 7 12.6s7-7.7 7-12.6c0-3.9-3.1-7-7-7Z"
        fill="url(#fom-mark)"
      />
      <circle cx="12" cy="9.3" r="2.4" fill="#0a1120" />
      <defs>
        <linearGradient id="fom-mark" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5cb0ff" />
          <stop offset="1" stopColor="#208aef" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const Chevron = () => (
  <svg className="nav-caret" viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const parentActive = (l) =>
    pathname === l.to || (l.children && l.children.some((c) => c.to === pathname))

  return (
    <header className={`header${scrolled ? ' scrolled' : ''}${open ? ' open' : ''}`}>
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="FOM — inicio">
          <BrandMark />
          <span className="brand-word">FOM</span>
        </Link>

        <nav className="nav" aria-label="Navegación principal">
          {LINKS.map((l) =>
            l.children ? (
              <div className="nav-group" key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={`nav-parent${parentActive(l) ? ' is-active' : ''}`}
                >
                  {l.label}
                  <Chevron />
                </NavLink>
                <div className="nav-drop">
                  <div className="nav-drop-inner">
                    {l.children.map((c) => (
                      <NavLink key={c.to} to={c.to} className="nav-drop-item">
                        <b>{c.label}</b>
                        <span>{c.desc}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => (isActive ? 'is-active' : '')}
              >
                {l.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="header-actions">
          <Link to="/entrar" className="header-login">
            Ingresar
          </Link>
          <Link to="/contacto" className="header-cta">
            Solicitar demostración
            <span className="cta-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                <path
                  d="M7 17 17 7M9 7h8v8"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>

          <button
            type="button"
            className="menu-toggle"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            aria-controls="menu-movil"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div id="menu-movil" className="mobile-menu" hidden={!open}>
        <nav aria-label="Navegación móvil">
          {LINKS.map((l) => (
            <div key={l.to}>
              <NavLink to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                {l.label}
              </NavLink>
              {l.children && (
                <div className="mobile-sub">
                  {l.children.map((c) => (
                    <NavLink key={c.to} to={c.to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                      {c.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="mobile-menu-actions">
          <Link to="/entrar" className="header-login">
            Ingresar
          </Link>
          <Link to="/contacto" className="header-cta">
            Solicitar demostración
          </Link>
        </div>
      </div>
    </header>
  )
}
