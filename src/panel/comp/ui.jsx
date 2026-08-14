import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icono } from '../Iconos'

// ============================================================
// PIEZAS COMUNES DE LA CONSOLA
// ============================================================

/** Cabecera pegajosa de cada módulo: título, bajada y acciones a la derecha. */
export function Cabecera({ titulo, bajada, children }) {
  return (
    <header className="pnl-cab">
      <div className="pnl-cab-txt">
        <h1>{titulo}</h1>
        {bajada && <p>{bajada}</p>}
      </div>
      {children && <div className="pnl-cab-acciones">{children}</div>}
    </header>
  )
}

/** Esqueleto de carga con la forma real del contenido. */
export function Cargando({ filas = 5 }) {
  return (
    <div className="pnl-skeleton" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Cargando…</span>
      {Array.from({ length: filas }).map((_, i) => (
        <div className="pnl-skel-fila" key={i} style={{ animationDelay: `${i * 70}ms` }} />
      ))}
    </div>
  )
}

/** Estado vacío amable, con acción opcional (empty-state.tsx de la app). */
export function Vacio({ icono = 'buscar', titulo, texto, accion }) {
  return (
    <div className="pnl-vacio">
      <Icono nombre={icono} tam={40} />
      <b>{titulo}</b>
      <span>{texto}</span>
      {accion}
    </div>
  )
}

/**
 * Error con reintento. Mismos textos y forma que error-state.tsx de la app;
 * allá varias pantallas se quedaban en spinner infinito, aquí siempre hay
 * salida.
 */
export function ErrorCarga({ onReintentar, texto = 'Revisa tu conexión e inténtalo de nuevo.' }) {
  return (
    <div className="pnl-vacio error" role="alert">
      <Icono nombre="alerta" tam={40} />
      <b>No pudimos cargar esto</b>
      <span>{texto}</span>
      <button type="button" className="pnl-btn" onClick={onReintentar}>
        Reintentar
      </button>
    </div>
  )
}

/** Etiqueta de estado. `color` es una de: verde, azul, ambar, rojo, gris. */
export function Tag({ color = 'gris', children, plano = false }) {
  return <span className={`pnl-tag ${color}${plano ? ' plano' : ''}`}>{children}</span>
}

/** Tarjeta con cabecera opcional. */
export function Tarjeta({ titulo, accion, children, sinCuerpo = false }) {
  return (
    <section className="pnl-card">
      {(titulo || accion) && (
        <div className="pnl-card-cab">
          {titulo && <h2>{titulo}</h2>}
          {accion}
        </div>
      )}
      {sinCuerpo ? children : <div className="pnl-card-cuerpo">{children}</div>}
    </section>
  )
}

/**
 * Cifra que sube desde cero al aparecer, como animated-number.tsx de la app:
 * 900 ms con la curva estándar. Si el valor no es un número, o la persona
 * pidió menos movimiento, se muestra tal cual.
 */
function Cifra({ valor }) {
  const numero = typeof valor === 'number' ? valor : null
  const [mostrado, setMostrado] = useState(numero === null ? valor : 0)
  const cuadro = useRef(0)

  useEffect(() => {
    if (numero === null) {
      setMostrado(valor)
      return undefined
    }
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // En una pestaña de fondo el navegador congela requestAnimationFrame: la
    // cuenta nunca arranca y el indicador se queda clavado en 0. Quien abre la
    // consola en segundo plano vería toda la flota en cero. Sin animación que
    // valga la pena, se muestra el número y ya.
    if (quieto || document.hidden) {
      setMostrado(numero)
      return undefined
    }
    const inicio = performance.now()
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / 900)
      // Curva estándar del tema: salida cúbica
      const suave = 1 - Math.pow(1 - t, 3)
      setMostrado(Math.round(numero * suave))
      if (t < 1) cuadro.current = requestAnimationFrame(paso)
    }
    cuadro.current = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(cuadro.current)
  }, [numero, valor])

  return <>{mostrado}</>
}

/** Indicador numérico. Si le pasas `a`, es un enlace navegable. */
export function Kpi({ titulo, valor, icono, tono = '', nota, notaTono = '', a, onClick }) {
  const contenido = (
    <>
      <div className="pnl-kpi-top">
        <span>{titulo}</span>
        {icono && <Icono nombre={icono} tam={16} />}
      </div>
      <b className={tono}>
        <Cifra valor={valor} />
      </b>
      {nota && <em className={notaTono}>{nota}</em>}
    </>
  )
  if (a) return <Link to={a} className="pnl-kpi">{contenido}</Link>
  if (onClick) return <button type="button" className="pnl-kpi" onClick={onClick}>{contenido}</button>
  return <div className="pnl-kpi">{contenido}</div>
}

/** Buscador con ícono. */
export function Buscador({ valor, alCambiar, placeholder = 'Buscar…' }) {
  return (
    <div className="pnl-buscar">
      <Icono nombre="buscar" tam={16} />
      <input
        type="search"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}

/** Grupo de filtros tipo chip. opciones = [{v, t, n}] (valor, texto, contador) */
export function Chips({ opciones, valor, alCambiar }) {
  return (
    <div className="pnl-chips" role="group">
      {opciones.map((o) => (
        <button
          key={o.v}
          type="button"
          className={`pnl-chip${valor === o.v ? ' activo' : ''}`}
          onClick={() => alCambiar(o.v)}
          aria-pressed={valor === o.v}
        >
          {o.t}
          {o.n !== undefined && <em>{o.n}</em>}
        </button>
      ))}
    </div>
  )
}

/** Barra de progreso 0..1 */
export function Barra({ valor, tono = '' }) {
  return (
    <div className={`pnl-barra ${tono}`}>
      <i style={{ '--v': Math.max(0, Math.min(1, valor)) }} />
    </div>
  )
}

/** Ventana modal accesible (Escape y clic fuera cierran). */
export function Modal({ titulo, abierto, alCerrar, children, ancho = 520 }) {
  useEffect(() => {
    if (!abierto) return undefined
    const onKey = (e) => e.key === 'Escape' && alCerrar()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [abierto, alCerrar])

  if (!abierto) return null
  return (
    <div className="pnl-modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className="pnl-modal" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: ancho }}>
        <div className="pnl-modal-cab">
          <h2>{titulo}</h2>
          <button type="button" className="pnl-modal-x" onClick={alCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" tam={16} />
          </button>
        </div>
        <div className="pnl-modal-cuerpo">{children}</div>
      </div>
    </div>
  )
}

/** Campo de formulario con etiqueta y error. */
export function Campo({ etiqueta, error, children, ayuda }) {
  return (
    <label className="pnl-campo">
      <span>{etiqueta}</span>
      {children}
      {ayuda && !error && <em className="pnl-campo-ayuda">{ayuda}</em>}
      {error && <em className="pnl-campo-error">{error}</em>}
    </label>
  )
}

/** Enlace de volver. */
export function Volver({ a, children = 'Volver' }) {
  return (
    <Link to={a} className="pnl-volver">
      <Icono nombre="volver" tam={15} />
      {children}
    </Link>
  )
}

/** Pestañas internas de un expediente. */
export function Pestanas({ opciones, valor, alCambiar }) {
  return (
    <div className="pnl-tabs" role="tablist">
      {opciones.map((o) => (
        <button
          key={o.v}
          type="button"
          role="tab"
          aria-selected={valor === o.v}
          className={`pnl-tab${valor === o.v ? ' activo' : ''}`}
          onClick={() => alCambiar(o.v)}
        >
          {o.t}
        </button>
      ))}
    </div>
  )
}

/** Ficha de datos en rejilla: [{etiqueta, valor}] */
export function Datos({ items }) {
  return (
    <div className="pnl-datos">
      {items.map((d, i) => (
        <div key={i}>
          <span>{d.etiqueta}</span>
          <b>{d.valor}</b>
        </div>
      ))}
    </div>
  )
}
