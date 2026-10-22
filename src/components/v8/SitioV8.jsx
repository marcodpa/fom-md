// Armazón de cada página v8: fondo noche con el resplandor azul, navegación global, contenido y
// pie. Cada página envuelve TODO su contenido en <SitioV8 titulo="…">.
import { useEffect, useState } from 'react'
import NavV8 from './NavV8'
import PieV8 from './PieV8'
import { BotonV8, EnlaceBaseV8 } from './PiezasV8'
import { rutaV8 } from '../../pages/v8/rutasV8'
import './v8-base.css'

// Inter (la letra del diseño aprobado; Spline Sans queda de respaldo) solo para la web v8.
function cargarLetra() {
  if (typeof document === 'undefined' || document.getElementById('v8-inter')) return
  const link = document.createElement('link')
  link.id = 'v8-inter'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Spline+Sans:wght@400;500;600;700&display=swap'
  document.head.appendChild(link)
}

export default function SitioV8({ titulo, descripcion, raiz, children }) {
  useEffect(() => { cargarLetra() }, [])
  useEffect(() => {
    if (titulo) document.title = titulo
    if (!descripcion) return
    const meta = document.querySelector('meta[name="description"]')
    const antes = meta?.getAttribute('content')
    meta?.setAttribute('content', descripcion)
    return () => { if (meta && antes != null) meta.setAttribute('content', antes) }
  }, [titulo, descripcion])
  return <div className="v8-site" ref={raiz}>
    <div className="v8-glow" aria-hidden="true" />
    <NavV8 />
    <main id="contenido" className="v8-main">{children}</main>
    <PieV8 />
  </div>
}

// Barra local de la página (bajo la global, solo escritorio): título + secciones + demostración.
// enlaces: [[id, nombre]] → marca la sección visible mientras se baja. Si el destino empieza con
// «/» es otra página (p. ej. [rutaV8('beneficios'), 'Beneficios']).
export function NavLocalV8({ titulo, enlaces, etiqueta }) {
  const [activa, setActiva] = useState(enlaces[0]?.[0])
  const ids = enlaces.map(([id]) => id).join('|')
  useEffect(() => {
    const secciones = enlaces.filter(([id]) => !id.startsWith('/')).map(([id]) => document.getElementById(id)).filter(Boolean)
    if (!secciones.length || typeof IntersectionObserver === 'undefined') return
    const visibles = new Map()
    const obs = new IntersectionObserver(entradas => {
      entradas.forEach(e => visibles.set(e.target.id, e.isIntersecting))
      const primera = enlaces.find(([id]) => visibles.get(id))
      if (primera) setActiva(primera[0])
    }, { rootMargin: '-45% 0px -50% 0px' })
    secciones.forEach(s => obs.observe(s))
    return () => obs.disconnect()
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps
  return <nav className="v8-local" aria-label={etiqueta || `Secciones de ${titulo}`}>
    <span className="v8-local-titulo">{titulo}</span>
    <ul>{enlaces.map(([id, nombre]) => <li key={id}>{id.startsWith('/')
      ? <EnlaceBaseV8 to={id}>{nombre}</EnlaceBaseV8>
      : <a href={`#${id}`} aria-current={activa === id ? 'location' : undefined}>{nombre}</a>}</li>)}</ul>
    <BotonV8 to={rutaV8('contacto')} tamano="sm">Solicitar demostración</BotonV8>
  </nav>
}
