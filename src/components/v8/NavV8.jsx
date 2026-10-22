// Navegación global de la web v8: barra de vidrio oscuro de 44 px (48 px en el teléfono), igual
// en todas las páginas. Inicio · Plataforma · Información · Contacto, «Iniciar sesión» y
// «Solicitar demostración» en pastilla azul FOM. Plataforma e Información despliegan sus páginas
// al pasar el ratón o al enfocarlas; en el teléfono todo va en el menú de pantalla completa.
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogoV8, IconoV8 } from './MarcaV8'
import { rutaV8, paginaV8, ENTRAR } from '../../pages/v8/rutasV8'

export const GRUPOS_V8 = [
  { id: 'plataforma', nombre: 'Plataforma', claves: ['plataforma', 'app', 'funciones', 'seguridad', 'areas'] },
  { id: 'informacion', nombre: 'Información', claves: ['quienes-somos', 'que-ofrecemos', 'beneficios', 'preguntas'] },
]

const enlaces = claves => claves.map(c => [rutaV8(c), paginaV8(c).nombre])

export default function NavV8() {
  const [grupo, setGrupo] = useState(null)
  const [menu, setMenu] = useState(false)
  const barra = useRef(null)
  const { pathname } = useLocation()
  const actual = pathname.replace(/\/+$/, '') || '/'
  const cerrar = () => { setGrupo(null); setMenu(false) }
  const grupoActual = GRUPOS_V8.find(g => g.claves.some(c => rutaV8(c) === actual))?.id

  useEffect(() => { cerrar() }, [pathname])
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
  const marca = to => (to === actual ? 'page' : undefined)
  return <header ref={barra} className={`v8-nav${grupo || menu ? ' is-abierta' : ''}${menu ? ' is-menu' : ''}`}
    onMouseLeave={() => setGrupo(null)}
    onBlur={e => { if (!barra.current?.contains(e.relatedTarget)) setGrupo(null) }}>
    <div className="v8-nav-barra">
      <Link className="v8-nav-logo" to={rutaV8('inicio')} aria-label="FOM, inicio"><LogoV8 /></Link>
      <nav className="v8-nav-enlaces" aria-label="Navegación principal">
        <Link to={rutaV8('inicio')} aria-current={marca(rutaV8('inicio'))} onMouseEnter={() => setGrupo(null)}>Inicio</Link>
        {GRUPOS_V8.map(g => <Link key={g.id} to={rutaV8(g.claves[0])}
          className={grupo === g.id ? 'is-abierto' : undefined}
          aria-current={grupoActual === g.id ? 'page' : undefined}
          aria-haspopup="true" aria-expanded={grupo === g.id} aria-controls="v8-desplegable"
          onMouseEnter={() => setGrupo(g.id)} onFocus={() => setGrupo(g.id)}>{g.nombre}</Link>)}
        <Link to={rutaV8('contacto')} aria-current={marca(rutaV8('contacto'))} onMouseEnter={() => setGrupo(null)} onFocus={() => setGrupo(null)}>Contacto</Link>
      </nav>
      <div className="v8-nav-acciones">
        <Link className="v8-nav-login" to={ENTRAR}>Iniciar sesión</Link>
        <Link className="v8-pill is-sm" to={rutaV8('contacto')}>Solicitar demostración</Link>
        <button type="button" className="v8-burger" aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menu} aria-controls="v8-menu" onClick={() => { setMenu(v => !v); setGrupo(null) }}>
          <span /><span />
        </button>
      </div>
    </div>

    <div id="v8-desplegable" className="v8-desplegable" hidden={!abierto}>
      {abierto && <div className="v8-desplegable-in">
        <p>{abierto.nombre}</p>
        <ul>{enlaces(abierto.claves).map(([to, nombre]) => <li key={to}><Link to={to} aria-current={marca(to)} onClick={cerrar}>{nombre}</Link></li>)}</ul>
      </div>}
    </div>

    <div id="v8-menu" className="v8-menu" hidden={!menu}>
      <nav aria-label="Menú del sitio">
        <Link to={rutaV8('inicio')} aria-current={marca(rutaV8('inicio'))} onClick={cerrar} style={{ '--i': 0 }}>Inicio</Link>
        {GRUPOS_V8.map((g, gi) => <div className="v8-menu-grupo" key={g.id} style={{ '--i': gi + 1 }}>
          <p>{g.nombre}</p>
          {enlaces(g.claves).map(([to, nombre]) => <Link key={to} to={to} aria-current={marca(to)} onClick={cerrar}>{nombre}</Link>)}
        </div>)}
        <Link to={rutaV8('contacto')} aria-current={marca(rutaV8('contacto'))} onClick={cerrar} style={{ '--i': 3 }}>Contacto</Link>
        <div className="v8-menu-acciones" style={{ '--i': 4 }}>
          <Link className="v8-pill" to={rutaV8('contacto')} onClick={cerrar}>Solicitar demostración</Link>
          <Link className="v8-pill is-fantasma" to={ENTRAR} onClick={cerrar}><IconoV8 nombre="login" />Iniciar sesión</Link>
        </div>
      </nav>
    </div>
  </header>
}
