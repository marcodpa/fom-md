import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icono } from '../Iconos'
import { MOV, curvaSalida, sinMovimiento } from '../movimiento'

// ============================================================
// PIEZAS COMUNES DE LA CONSOLA
// ============================================================

/** Cabecera pegajosa de cada módulo: título, bajada y acciones a la derecha. */
export function Cabecera({ titulo, bajada, children, imagen, className = '' }) {
  const texto = <div className="pnl-cab-txt">
    <h1>{titulo}</h1>
    {bajada && <p>{bajada}</p>}
  </div>
  return (
    <header className={`pnl-cab${className ? ` ${className}` : ''}`}>
      {imagen ? <div className="pnl-cab-identidad">{imagen}{texto}</div> : texto}
      {children && <div className="pnl-cab-acciones">{children}</div>}
    </header>
  )
}

// Anchos de las dos barras de cada fila, para que el esqueleto no parezca una
// pared: se repiten de tres en tres (los mismos de la maqueta W6).
const ANCHOS_SKEL = [['72%', '46%'], ['64%', '38%'], ['78%', '50%']]

/** Esqueleto de carga con la forma real del contenido: caja y dos barras. */
export function Cargando({ filas = 5 }) {
  return (
    <div className="pnl-skeleton" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Cargando…</span>
      {Array.from({ length: filas }).map((_, i) => {
        const [largo, corto] = ANCHOS_SKEL[i % ANCHOS_SKEL.length]
        return (
          <div className="pnl-skel-fila" key={i} style={{ animationDelay: `${i * 70}ms` }}>
            <i />
            <span>
              <i style={{ width: largo }} />
              <i style={{ width: corto }} />
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Estado vacío amable, con acción opcional (empty-state.tsx de la app):
 * círculo azul suave con el icono. `compacto` es la versión para dentro de
 * una tarjeta (círculo más chico).
 */
export function Vacio({ icono = 'buscar', titulo, texto, accion, compacto = false }) {
  return (
    <div className={`pnl-vacio${compacto ? ' compacto' : ''}`}>
      <Icono nombre={icono} tam={compacto ? 22 : 28} />
      <b>{titulo}</b>
      <span>{texto}</span>
      {accion}
    </div>
  )
}

/**
 * Fallo al cargar, DICIENDO POR QUÉ. Mismos textos y forma que
 * error-state.tsx de la app (bloque centrado: círculo rojo suave, título,
 * frase y «Reintentar» en píldora). `compacto` lo achica para dentro de una
 * tarjeta.
 *
 * Antes decía siempre «revisa tu conexión», que es un diagnóstico inventado:
 * la causa más común no es la red sino un permiso, una sesión caída o una
 * función que todavía no está publicada.
 *
 * `error` es el que devuelve `useDatos`; si no llega, queda el texto genérico.
 * «Reintentar» solo aparece si llega `onReintentar`: un botón que no hace
 * nada es peor que no tenerlo.
 */
export function ErrorCarga({
  onReintentar,
  error = null,
  texto = 'Revisa tu conexión e inténtalo de nuevo.',
  compacto = false,
}) {
  const motivo = error?.message || texto
  return (
    <div className={`pnl-vacio error${compacto ? ' compacto' : ''}`} role="alert">
      <Icono nombre="alerta" tam={compacto ? 22 : 28} />
      <b>No pudimos cargar esto</b>
      <span>{motivo}</span>
      {onReintentar && (
        <button type="button" className="pnl-btn pnl-reintentar" onClick={onReintentar}>
          <Icono nombre="sync" tam={compacto ? 16 : 18} />
          Reintentar
        </button>
      )}
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
 * Cifra que cuenta con suavidad, como animated-number.tsx de la app
 * (CONTEO.tablero, 500 ms, curva de salida): la primera vez sube desde cero
 * y, cuando el valor cambia, va del número anterior al nuevo. Nunca vuelve a
 * cero en un refresco. Si el valor no es un número, o la persona
 * pidió menos movimiento, se muestra tal cual.
 */
function Cifra({ valor }) {
  const numero = typeof valor === 'number' && Number.isFinite(valor) ? valor : null
  const [mostrado, setMostrado] = useState(numero === null ? valor : 0)
  const cuadro = useRef(0)
  const actual = useRef(0)

  useEffect(() => {
    if (numero === null) {
      setMostrado(valor)
      return undefined
    }
    // En una pestaña de fondo el navegador congela requestAnimationFrame: la
    // cuenta nunca arranca y el indicador se queda clavado en 0. Quien abre la
    // consola en segundo plano vería toda la flota en cero. Sin animación que
    // valga la pena, se muestra el número y ya.
    const desde = actual.current
    if (sinMovimiento() || document.hidden || desde === numero) {
      actual.current = numero
      setMostrado(numero)
      return undefined
    }
    const duracion = MOV.conteo
    // Los decimales del valor (4,5 se queda en 4,5; no se redondea a 5).
    const decimales = Math.min(2, (String(numero).split('.')[1] || '').length)
    const escala = 10 ** decimales
    const inicio = performance.now()
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / duracion)
      // CURVA.salida de la app, la --mov-curva-salida de movimiento.css.
      const suave = curvaSalida(t)
      const v = t < 1 ? Math.round((desde + (numero - desde) * suave) * escala) / escala : numero
      actual.current = v
      setMostrado(v)
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
      {icono && <span className={`pnl-kpi-icono ${tono}`}><Icono nombre={icono} tam={25} /></span>}
      <div className="pnl-kpi-top">
        <span>{titulo}</span>
      </div>
      <b className={tono}>
        <Cifra valor={valor ?? '—'} />
      </b>
      {nota && <em className={notaTono}>{nota}</em>}
    </>
  )
  const clase = `pnl-kpi${icono ? ' con-icono' : ''}`
  if (a) return <Link to={a} className={clase}>{contenido}</Link>
  if (onClick) return <button type="button" className={clase} onClick={onClick}>{contenido}</button>
  return <div className={clase}>{contenido}</div>
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

/**
 * Grupo de filtros tipo chip. opciones = [{v, t, n}] (valor, texto, contador).
 * `etiqueta` (opcional) le da nombre al grupo para el lector de pantalla.
 */
export function Chips({ opciones, valor, alCambiar, etiqueta }) {
  return (
    <div className="pnl-chips" role="group" aria-label={etiqueta}>
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

/**
 * Ventana modal accesible (Escape y clic fuera cierran). En la computadora
 * es una ventana; en el teléfono, una hoja que sube desde abajo (T-184: con
 * resorte, y al cerrar se queda --mov-normal con `.saliendo` para irse).
 */
export function Modal({ titulo, abierto, alCerrar, children, ancho = 520 }) {
  const [montado, setMontado] = useState(abierto)
  // Mientras se va, se ve lo último que tuvo (quien la usa suele vaciarla al cerrar).
  const ultimo = useRef({ titulo, children })
  if (abierto) ultimo.current = { titulo, children }
  useEffect(() => {
    if (abierto) { setMontado(true); return undefined }
    if (sinMovimiento()) { setMontado(false); return undefined }
    const reloj = setTimeout(() => setMontado(false), MOV.normal)
    return () => clearTimeout(reloj)
  }, [abierto])
  const dialogo = useRef(null)
  const cerrarRef = useRef(alCerrar)
  cerrarRef.current = alCerrar
  useEffect(() => {
    if (!abierto) return undefined
    const previo = document.activeElement
    const overflow = document.body.style.overflow
    const enfocables = () => Array.from(dialogo.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex="0"]') ?? []).filter(e => e.getClientRects().length)
    const marco = requestAnimationFrame(() => (enfocables()[0] ?? dialogo.current)?.focus())
    const onKey = (e) => {
      if (e.key === 'Escape') cerrarRef.current()
      if (e.key !== 'Tab') return
      const elementos = enfocables()
      if (!elementos.length) { e.preventDefault(); return }
      const primero = elementos[0], ultimo = elementos.at(-1)
      if (!dialogo.current?.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? ultimo : primero).focus(); return }
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      cancelAnimationFrame(marco)
      document.body.style.overflow = overflow
      if (previo?.isConnected) previo.focus()
    }
  }, [abierto])

  if (!abierto && !montado) return null
  const saliendo = !abierto
  const vista = saliendo ? ultimo.current : { titulo, children }
  return (
    <div className={`pnl-modal-fondo${saliendo ? ' saliendo' : ''}`} aria-hidden={saliendo || undefined} onMouseDown={(e) => !saliendo && e.target === e.currentTarget && alCerrar()}>
      <div ref={dialogo} tabIndex={-1} className="pnl-modal" role="dialog" aria-modal={saliendo ? undefined : 'true'} aria-label={vista.titulo} style={{ maxWidth: ancho }}>
        <div className="pnl-modal-cab">
          <h2>{vista.titulo}</h2>
          <button type="button" className="pnl-modal-x" onClick={alCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" tam={16} />
          </button>
        </div>
        <div className="pnl-modal-cuerpo">{vista.children}</div>
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
