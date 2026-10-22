// Preguntas frecuentes de la web v8 (T-109), fiel a los tableros «Preguntas · escritorio»
// (Preguntas.dc.html) y «Preguntas · teléfono» (Preguntas-movil.dc.html) del lienzo «Web FOM nueva».
// Nota azul del tablero: SIN animación GSAP. Solo abrir y cerrar cada pregunta (0,3 s, lo hace el
// acordeón de la base). Quieto y claro, como el soporte de Apple: por eso esta página no usa
// useMomentoV8 ni marca nada con data-v8-*.
// Las preguntas son las reales de cada página (src/content/pages.js → PAGES.<tema>.faqs). El
// buscador filtra en vivo por pregunta y respuesta; los temas saltan a su grupo.
import { useId, useState } from 'react'
import { PAGES } from '../../content/pages'
import { SitioV8, SeccionV8, ContenedorV8, FotoIntegradaV8, BotonV8, PreguntasV8 as AcordeonV8, rutaV8, CORREO_FOM } from '../../components/v8'
import './preguntas-v8.css'

// Temas en el orden de los tableros. «resumen» = la bajada gris del grupo (escritorio).
const TEMAS = [
  { clave: 'plataforma', nombre: 'Plataforma', resumen: 'Acceso, usuarios y funcionamiento general.' },
  { clave: 'funciones', nombre: 'Funciones', resumen: 'Seguimiento, reportes y herramientas de operación.' },
  { clave: 'seguridad', nombre: 'Seguridad', resumen: 'La protección de tu flota y tus conductores.' },
  { clave: 'areas', nombre: 'Áreas', resumen: 'Zonas, geocercas y permisos por área o contrato.' },
  { clave: 'contacto', nombre: 'Contacto', resumen: 'Demostración, instalación y cobertura.' },
]
const TOTAL = TEMAS.reduce((n, t) => n + PAGES[t.clave].faqs.length, 0)

// Búsqueda sin tildes ni mayúsculas: «camara» encuentra «cámara».
const normalizar = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const coincide = (f, q) => !q || normalizar(`${f.q} ${f.a}`).includes(q)

export default function PreguntasV8() {
  const [busqueda, setBusqueda] = useState('')
  const [activo, setActivo] = useState(TEMAS[0].clave)
  const idBuscar = useId()
  const q = normalizar(busqueda.trim())
  const grupos = TEMAS.map(t => ({ ...t, items: PAGES[t.clave].faqs.filter(f => coincide(f, q)) }))
  const encontradas = grupos.reduce((n, g) => n + g.items.length, 0)
  const visibles = grupos.filter(g => g.items.length)

  return <SitioV8 titulo="Preguntas frecuentes — FOM" descripcion="Preguntas frecuentes sobre la plataforma FOM: acceso y usuarios, funciones, seguridad, áreas, demostración, instalación y cobertura.">
    <section className="preguntas-hero" aria-labelledby="preguntas-titulo">
      <FotoIntegradaV8 className="preguntas-hero-foto" nombre="camion-noche" fundido="b" alt="" prioridad sizes="100vw" />
      <div className="preguntas-hero-cuerpo">
        <div className="v8-c">
          <h1 id="preguntas-titulo" className="v8-h1">Preguntas frecuentes.</h1>
          <p className="v8-lead preguntas-hero-bajada">
            <span className="v8-solo-escritorio">Explora las preguntas sobre la plataforma, las funciones y la puesta en marcha.</span>
            <span className="v8-solo-movil">La plataforma, las funciones y la puesta en marcha.</span>
          </p>
          <div className="v8-vidrio preguntas-buscar" role="search">
            <svg className="v8-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
            <label className="v8-oculto" htmlFor={idBuscar}>Buscar preguntas</label>
            <input id={idBuscar} type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Busca una pregunta" autoComplete="off" />
          </div>
          <p className="v8-oculto" role="status">{q ? `${encontradas} ${encontradas === 1 ? 'pregunta encontrada' : 'preguntas encontradas'}` : `${TOTAL} preguntas en ${TEMAS.length} temas`}</p>
        </div>
        <nav className="v8-pestanas preguntas-temas" aria-label="Temas de preguntas">
          {grupos.map(g => <a key={g.clave} href={`#tema-${g.clave}`} className={`v8-pestana${activo === g.clave ? ' is-activa' : ''}${g.items.length ? '' : ' is-vacia'}`}
            aria-current={activo === g.clave ? 'true' : undefined} onClick={() => setActivo(g.clave)}>{g.nombre}</a>)}
        </nav>
      </div>
    </section>

    {visibles.map((g, i) => <SeccionV8 key={g.clave} id={`tema-${g.clave}`} banda={i % 2 === 1} className="preguntas-grupo" aria-labelledby={`tema-${g.clave}-titulo`}>
      <ContenedorV8 className="preguntas-grupo-c">
        <header>
          <h2 id={`tema-${g.clave}-titulo`} className="v8-h3">{g.nombre}</h2>
          <p className="v8-t2 preguntas-grupo-resumen">{g.resumen}</p>
        </header>
        {/* key con la búsqueda: al filtrar, el grupo vuelve a abrir su primera coincidencia. */}
        <AcordeonV8 key={`${g.clave}-${q}`} items={g.items} abierta={q || i === 0 ? 0 : -1} />
      </ContenedorV8>
    </SeccionV8>)}

    {q && !encontradas && <SeccionV8 className="preguntas-vacio">
      <ContenedorV8 className="v8-centro">
        <p className="v8-h3">No encontramos esa pregunta.</p>
        <p className="v8-t2 preguntas-vacio-texto">Prueba con otra palabra o consulta todos los temas.</p>
        <BotonV8 fantasma className="preguntas-vacio-boton" onClick={() => setBusqueda('')}>Ver todas las preguntas</BotonV8>
      </ContenedorV8>
    </SeccionV8>}

    <SeccionV8 banda className="preguntas-cta" aria-labelledby="preguntas-cta-titulo">
      <ContenedorV8 className="v8-centro">
        <h2 id="preguntas-cta-titulo" className="v8-h2">¿No encontraste tu respuesta?</h2>
        <p className="v8-lead preguntas-cta-texto">Escríbenos y te respondemos en un día hábil.</p>
        <div className="v8-acciones preguntas-cta-acciones">
          <BotonV8 to={rutaV8('contacto')} tamano="lg">Ir a contacto</BotonV8>
          <span className="v8-solo-escritorio"><a className="v8-enlace" href={`mailto:${CORREO_FOM}`}>{CORREO_FOM}</a></span>
        </div>
      </ContenedorV8>
    </SeccionV8>
  </SitioV8>
}
