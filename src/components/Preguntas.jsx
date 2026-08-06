import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PAGES } from '../content/pages'

// ============================================================
// CENTRO DE AYUDA
// Hero con buscador y filtros rápidos; debajo, las preguntas en acordeón a
// la izquierda y una tarjeta de estado de solicitudes a la derecha, con el
// técnico de guardia. El buscador filtra al escribir y resalta coincidencias.
// ============================================================

const TEMAS = {
  plataforma: 'Plataforma',
  funciones: 'Funciones',
  seguridad: 'Seguridad',
  areas: 'Áreas y flota',
  contacto: 'Contratación',
}

const ENLACE_TEMA = {
  plataforma: { a: '/plataforma', t: 'Ver más sobre la plataforma' },
  funciones: { a: '/funciones', t: 'Ver todas las funciones' },
  seguridad: { a: '/seguridad', t: 'Ver más sobre seguridad' },
  areas: { a: '/areas', t: 'Ver áreas y flota' },
  contacto: { a: '/contacto', t: 'Ir a contacto' },
}

// Sin acentos y en minúsculas, igual que normalizar() de la app.
const limpiar = (t) =>
  String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Resalta en el texto los tramos que coinciden con la búsqueda. */
function Resaltado({ texto, busca }) {
  if (!busca) return texto
  const plano = limpiar(texto)
  const aguja = limpiar(busca)
  const trozos = []
  let desde = 0
  let i = plano.indexOf(aguja)
  while (i !== -1 && aguja) {
    if (i > desde) trozos.push(texto.slice(desde, i))
    trozos.push(<mark key={i}>{texto.slice(i, i + aguja.length)}</mark>)
    desde = i + aguja.length
    i = plano.indexOf(aguja, desde)
  }
  trozos.push(texto.slice(desde))
  return <>{trozos}</>
}

// Íconos por tema, con el trazo de la casa (fino, esquinas redondas)
const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ICONO_TEMA = {
  plataforma: (
    <svg viewBox="0 0 24 24" width="17" height="17" {...trazo} aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  ),
  funciones: (
    <svg viewBox="0 0 24 24" width="17" height="17" {...trazo} aria-hidden="true">
      <path d="M4.5 17.5a8.5 8.5 0 1 1 15 0" /><path d="m12 12.5 4-3.5" /><circle cx="12" cy="13" r="1.2" />
    </svg>
  ),
  seguridad: (
    <svg viewBox="0 0 24 24" width="17" height="17" {...trazo} aria-hidden="true">
      <path d="M12 3 5 5.6V11c0 4.2 3 6.9 7 8.4 4-1.5 7-4.2 7-8.4V5.6z" /><path d="m9 11.8 2 2 4-4.2" />
    </svg>
  ),
  areas: (
    <svg viewBox="0 0 24 24" width="17" height="17" {...trazo} aria-hidden="true">
      <path d="M12 21s7-6.8 7-11a7 7 0 1 0-14 0c0 4.2 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
  contacto: (
    <svg viewBox="0 0 24 24" width="17" height="17" {...trazo} aria-hidden="true">
      <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    </svg>
  ),
}

const Lupa = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" {...trazo} strokeWidth="2" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" />
  </svg>
)

// Estado de solicitudes simulado, coherente con la flota de demostración.
const SOLICITUDES = [
  {
    estado: 'resuelto',
    etiqueta: 'Resuelto',
    titulo: 'Falla de ignición en la Unidad 07',
    detalle: 'Relé sustituido y probado en ruta corta por el técnico asignado.',
    cuando: 'Hoy, 9:12 a. m.',
  },
  {
    estado: 'proceso',
    etiqueta: 'En proceso',
    titulo: 'Actualización de firmware v2.4',
    detalle: 'Descargando paquetes de seguridad en 12 equipos activos.',
    cuando: 'Ayer, 4:15 p. m.',
  },
  {
    estado: 'pendiente',
    etiqueta: 'Pendiente',
    titulo: 'Reajuste de geocerca en Maracaibo',
    detalle: 'A la espera de confirmar el perímetro del área logística.',
    cuando: 'Viernes, 11:30 a. m.',
  },
]

export default function Preguntas() {
  const [busca, setBusca] = useState('')
  const [tema, setTema] = useState('todas')
  const [abiertas, setAbiertas] = useState(() => new Set(['plataforma-0']))
  const campo = useRef(null)
  const lista = useRef(null)

  const todas = useMemo(
    () =>
      Object.entries(PAGES).flatMap(([slug, p]) =>
        (p.faqs ?? []).map((f, i) => ({
          id: `${slug}-${i}`,
          slug,
          tema: TEMAS[slug] ?? p.eyebrow,
          q: f.q,
          a: f.a,
        }))
      ),
    []
  )

  const filtradas = useMemo(() => {
    const aguja = limpiar(busca.trim())
    return todas.filter((f) => {
      if (tema !== 'todas' && f.slug !== tema) return false
      if (!aguja) return true
      return limpiar(`${f.q} ${f.a}`).includes(aguja)
    })
  }, [todas, busca, tema])

  const chips = useMemo(
    () => [
      { v: 'todas', t: 'Todas' },
      ...Object.keys(PAGES)
        .filter((s) => (PAGES[s].faqs ?? []).length)
        .map((s) => ({ v: s, t: TEMAS[s] ?? s })),
    ],
    []
  )

  const alternar = (id) =>
    setAbiertas((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })

  const todasAbiertas = filtradas.length > 0 && filtradas.every((f) => abiertas.has(f.id))
  const alternarTodas = () =>
    setAbiertas(todasAbiertas ? new Set() : new Set(filtradas.map((f) => f.id)))

  const irALista = (e) => {
    e.preventDefault()
    lista.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {/* ---- Hero del centro de ayuda ---- */}
      <header className="pp-hero hero-mesh ayuda-hero">
        <div className="container ayuda-hero-grid">
          <div className="ayuda-hero-copy">
            <div className="pp-eyebrow">Centro de ayuda</div>
            <h1>¿Cómo podemos optimizar tu flota hoy?</h1>
            <p>
              Respuestas sobre la plataforma, las funciones, la seguridad y la puesta en
              marcha para tu operación de la Costa Oriental del Lago. Si tu duda no está,
              escríbenos y responde una persona del equipo.
            </p>
          </div>

          <div className="ayuda-hero-panel">
            <form className="ayuda-buscar" onSubmit={irALista} role="search">
              <Lupa />
              <input
                ref={campo}
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Busca: geocerca, GPS, instalación, reportes…"
                aria-label="Buscar en el centro de ayuda"
              />
              <button type="submit" className="ayuda-buscar-btn">Buscar</button>
            </form>
            <div className="ayuda-filtros" role="group" aria-label="Filtros rápidos">
              <span>Filtros rápidos:</span>
              {chips.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  className={`ayuda-chip${tema === c.v ? ' on' : ''}`}
                  onClick={() => setTema(c.v)}
                  aria-pressed={tema === c.v}
                >
                  {c.t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ---- Cuerpo: preguntas + estado ---- */}
      <section className="ayuda-zona" ref={lista}>
        <div className="container ayuda-grid">
          {/* Columna de preguntas */}
          <div className="ayuda-preguntas">
            <div className="ayuda-cab">
              <h2>Preguntas frecuentes</h2>
              <div className="ayuda-cab-der">
                <span aria-live="polite">
                  {filtradas.length === 0
                    ? 'Sin coincidencias'
                    : `${filtradas.length} ${filtradas.length === 1 ? 'pregunta' : 'preguntas'}`}
                </span>
                {filtradas.length > 0 && (
                  <button type="button" className="ayuda-toggle" onClick={alternarTodas}>
                    {todasAbiertas ? 'Cerrar todas' : 'Abrir todas'}
                  </button>
                )}
              </div>
            </div>

            {filtradas.length === 0 && (
              <div className="ayuda-vacio">
                <b>No encontramos esa duda</b>
                <p>
                  Prueba con otra palabra o quita el filtro. También puedes preguntarnos
                  directamente: respondemos en menos de 48 horas hábiles.
                </p>
                <div className="ayuda-vacio-acciones">
                  <button
                    type="button"
                    className="ayuda-chip"
                    onClick={() => {
                      setBusca('')
                      setTema('todas')
                      campo.current?.focus()
                    }}
                  >
                    Ver todas las preguntas
                  </button>
                  <Link className="pnl-link" to="/contacto">
                    Escribirnos
                  </Link>
                </div>
              </div>
            )}

            <div className="ayuda-lista">
              {filtradas.map((f) => {
                const abierta = abiertas.has(f.id)
                return (
                  <article className={`ayuda-item${abierta ? ' abierta' : ''}`} key={f.id} id={f.id}>
                    <h3>
                      <button
                        type="button"
                        className="ayuda-item-btn"
                        aria-expanded={abierta}
                        aria-controls={`r-${f.id}`}
                        onClick={() => alternar(f.id)}
                      >
                        <i className="ayuda-item-ic">{ICONO_TEMA[f.slug]}</i>
                        <span className="ayuda-item-q">
                          <Resaltado texto={f.q} busca={busca} />
                        </span>
                        <i className="ayuda-caret" aria-hidden="true" />
                      </button>
                    </h3>
                    <div className="ayuda-respuesta" id={`r-${f.id}`} role="region" hidden={!abierta}>
                      <p>
                        <Resaltado texto={f.a} busca={busca} />
                      </p>
                      <Link className="ayuda-ver-mas" to={ENLACE_TEMA[f.slug].a}>
                        {ENLACE_TEMA[f.slug].t}
                        <svg viewBox="0 0 24 24" width="13" height="13" {...trazo} strokeWidth="2" aria-hidden="true">
                          <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
                        </svg>
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          {/* Columna de estado */}
          <aside className="ayuda-lado">
            <div className="ayuda-tickets">
              <div className="ayuda-tickets-cab">
                <h2>Estado de solicitudes</h2>
                <span className="ayuda-historial">Historial</span>
              </div>
              <div className="ayuda-tickets-lista">
                {SOLICITUDES.map((s, i) => (
                  <div className={`ayuda-ticket ${s.estado}`} key={i}>
                    <i aria-hidden="true" />
                    <div>
                      <em>{s.etiqueta}</em>
                      <b>{s.titulo}</b>
                      <span>{s.detalle}</span>
                    </div>
                    <time>{s.cuando}</time>
                  </div>
                ))}
              </div>
              <div className="ayuda-guardia">
                <i className="ayuda-avatar">RM</i>
                <div>
                  <em>Técnico de guardia</em>
                  <b>Ing. Ricardo Méndez</b>
                </div>
                <Link to="/contacto" className="ayuda-chat" aria-label="Escribir al técnico de guardia">
                  <svg viewBox="0 0 24 24" width="16" height="16" {...trazo} aria-hidden="true">
                    <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
                  </svg>
                </Link>
              </div>
              <p className="ayuda-tickets-nota">
                Vista de demostración con datos simulados. Con tu cuenta verás las
                solicitudes reales de tu flota.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
