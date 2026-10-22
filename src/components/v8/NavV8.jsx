// Navegación global de la web v8: barra de vidrio de 44 px, igual en todas las páginas.
// Mismas secciones que la cabecera actual (MarketingChrome): Inicio, Plataforma, Información y
// Contacto, más «Iniciar sesión» y «Solicitar demostración» en pastilla azul FOM.
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogoV8, IconoV8 } from './MarcaV8'

export const INICIO_V8 = '/nuevo'
export const DEMO_V8 = `${INICIO_V8}#solicitud-demo`

export const GRUPOS_V8 = [
  { id: 'plataforma', nombre: 'Plataforma', links: [['/plataforma', 'Plataforma web'], ['/app', 'App del conductor'], ['/funciones', 'Funciones'], ['/seguridad', 'Seguridad'], ['/areas', 'Áreas']] },
  { id: 'informacion', nombre: 'Información', links: [['/quienes-somos', 'Quiénes somos'], ['/que-ofrecemos', 'Qué ofrecemos'], ['/beneficios', 'Beneficios'], ['/preguntas-frecuentes', 'Preguntas frecuentes']] },
]

export default function NavV8() {
  const [grupo, setGrupo] = useState(null)
  const [menu, setMenu] = useState(false)
  const barra = useRef(null)
  const { pathname, hash } = useLocation()
  const cerrar = () => { setGrupo(null); setMenu(false) }

  useEffect(() => { cerrar() }, [pathname, hash])
  // Con el menú del teléfono abierto, la página de fondo no se desplaza.
  useEffect(() => {
    if (!menu) return
    const antes = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = antes }
  }, [menu])
  useEffect(() => {
    const fuera = e => { if (!barra.current?.contains(e.target)) setGrupo(null) }
    const tecla = e => { if (e.key === 'Escape') cerrar() }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla) }
  }, [])

  const abierto = GRUPOS_V8.find(g => g.id === grupo)
  return <header ref={barra} className={`v8-nav${grupo ? ' has-flyout' : ''}${menu ? ' is-menu' : ''}`} onMouseLeave={() => setGrupo(null)}>
    <div className="v8-nav-bar">
      <Link className="v8-nav-logo" to={INICIO_V8} aria-label="FOM, inicio" onClick={cerrar}><LogoV8 /></Link>
      <nav className="v8-nav-links" aria-label="Navegación principal">
        <Link to={INICIO_V8} aria-current={pathname === INICIO_V8 ? 'page' : undefined}>Inicio</Link>
        {GRUPOS_V8.map(g => <button key={g.id} type="button" className={grupo === g.id ? 'is-open' : undefined}
          aria-expanded={grupo === g.id} aria-controls="v8-flyout"
          onMouseEnter={() => setGrupo(g.id)} onClick={e => setGrupo(v => (v === g.id && e.detail === 0) ? null : g.id)}>{g.nombre}</button>)}
        <Link to="/contacto">Contacto</Link>
      </nav>
      <div className="v8-nav-actions">
        <Link className="v8-nav-login" to="/entrar">Iniciar sesión</Link>
        <Link className="v8-pill v8-pill-sm" to={DEMO_V8}>Solicitar demostración</Link>
        <button type="button" className="v8-burger" aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menu} aria-controls="v8-menu" onClick={() => { setMenu(v => !v); setGrupo(null) }}>
          <span /><span />
        </button>
      </div>
    </div>

    <div id="v8-flyout" className="v8-flyout" hidden={!abierto}>
      {abierto && <div className="v8-flyout-inner">
        <p className="v8-flyout-title">{abierto.nombre}</p>
        <ul>{abierto.links.map(([to, nombre]) => <li key={to}><Link to={to} onClick={cerrar}>{nombre}</Link></li>)}</ul>
      </div>}
    </div>

    <div id="v8-menu" className="v8-menu" hidden={!menu}>
      <nav aria-label="Menú del sitio">
        <Link to={INICIO_V8} onClick={cerrar} style={{ '--i': 0 }}>Inicio</Link>
        {GRUPOS_V8.map((g, gi) => <div className="v8-menu-group" key={g.id} style={{ '--i': gi + 1 }}>
          <p>{g.nombre}</p>
          {g.links.map(([to, nombre]) => <Link key={to} to={to} onClick={cerrar}>{nombre}</Link>)}
        </div>)}
        <Link to="/contacto" onClick={cerrar} style={{ '--i': 3 }}>Contacto</Link>
        <div className="v8-menu-actions" style={{ '--i': 4 }}>
          <Link className="v8-pill" to={DEMO_V8} onClick={cerrar}>Solicitar demostración</Link>
          <Link className="v8-pill v8-pill-ghost" to="/entrar" onClick={cerrar}><IconoV8 nombre="login" />Iniciar sesión</Link>
        </div>
      </nav>
    </div>
  </header>
}
