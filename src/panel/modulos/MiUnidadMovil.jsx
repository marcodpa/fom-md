import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import Mapa from '../comp/Mapa'
import FotoFija from '../comp/FotoFija'
import { MovilEncabezado } from '../comp/movil-piezas'
import { useMovil } from '../comp/movil-navegacion'
import { Cargando } from '../comp/ui'
import { Icono } from '../Iconos'
import { ids } from '../datos/cloudinary'
import { DIAS_MANEJO, calificacionManejo } from '../datos/manejo'
import { estadoUnidad } from '../datos/estadoUnidad'
import { textoSinSenal, textoUltimoReporte } from '../datos/sinSenal'
import * as f from '../datos/formato'
import { masNuevoPrimero } from '../datos/orden'
import { color, etiqueta } from '../datos/catalogos'
import { BotonSos } from './SosConductor'
import '../../styles/mi-unidad-movil.css'

// ============================================================
// MI UNIDAD EN EL TELÉFONO — la pantalla «Mi unidad» de la app
// ------------------------------------------------------------
// Copia de `(driver)/index.tsx` de FOM-DRIVER: el mapa a pantalla completa,
// el encabezado flotando encima y la lengüeta abajo que se abre arrastrándola
// (o tocándola) con todo lo demás: avisos de detenido o sin señal, la unidad
// con su retrato y su ficha, y el índice de manejo con el anillo.
//
// El botón SOS rojo flota sobre el mapa, como en la app (T-167b): abre la
// pantalla de emergencia, que avisa al supervisor por la misma ruta que la app.
// Lo que la app tiene y la web no: los avisos de compañeros que pidieron ayuda.
// ============================================================

/** El saludo de la cápsula, como `saludoPorHora` de la app. */
function saludoPorHora(ahora) {
  const h = new Date(ahora).getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** «09:42», como `horaCorta` de la app. */
function horaCorta(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Un dato que el servidor manda con «—» cuando no lo tiene: aquí cuenta como vacío. */
const conValor = (t) => (t && String(t).trim() !== '—' ? String(t).trim() : null)

/** El id de la puerta (en mayúsculas, como en la app) o, sin él, la placa. */
const etiquetaCorta = (u) => (conValor(u.numero)?.toUpperCase() ?? conValor(u.placa) ?? '')
/** «U-001 · Z69FC7W»: lo que la unidad no tenga, no se escribe. */
const identidad = (u) => [conValor(u.numero)?.toUpperCase(), conValor(u.placa)].filter(Boolean).join(' · ')

/** Los tres estados de la app: verde rodando, ámbar parada y transmitiendo, gris callada. */
function estadoApp(u) {
  const clave = estadoUnidad(u).clave
  if (clave === 'sin_senal') return 'sin-senal'
  if (clave === 'en_marcha') return 'marcha'
  return 'parada'
}

/** Color de la velocidad: parada gris, normal verde, rápido ámbar, excesivo rojo. */
function tonoVelocidad(kmh) {
  if (!(kmh > 0)) return 'apagado'
  if (kmh >= 100) return 'peligro'
  if (kmh >= 80) return 'aviso'
  return 'exito'
}

/** Íconos de la app que el set de la web no tiene (tab-icon.tsx). */
const TRAZOS = {
  pausa: <><path d="M4 4h16v16H4z" /><path d="M9 9v6" /><path d="M15 9v6" /></>,
  gps: <><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  flota: <><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></>,
  velocidad: <><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" /><path d="M12 12l4-3" /><path d="M12 12h.01" /></>,
  frenos: <><circle cx="10.5" cy="12" r="7.5" /><circle cx="10.5" cy="12" r="2.8" /><path d="M17.5 8.5h2.6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2.6" /></>,
  electrico: <path d="M13 2.5 4.5 14H11l-1 7.5L19.5 10H13z" />,
  inspeccion: <><path d="M9 4h6v3H9z" /><path d="M9 5.5H6.5a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1H15" /><path d="m9 14 2 2 4-4" /></>,
  ot: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  chevron: <path d="M9 18l6-6-6-6" />,
}
function IconoApp({ nombre, tam = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  )
}

/** El punto del estado; late solo cuando la unidad va rodando. */
function Punto({ tono, activo = false, tam = 7 }) {
  return <i className={`mvu-punto ${tono}${activo ? ' late' : ''}`} style={{ width: tam, height: tam }} aria-hidden="true" />
}

/**
 * LA LENGÜETA: flota sobre el mapa con la franja siempre a la vista y se abre
 * ARRASTRÁNDOLA o con un toque, como en Apple/Google Maps. El dedo la mueve
 * 1:1 y al soltar cae abierta o cerrada según dónde quedó o con qué fuerza se
 * lanzó. El gesto vive solo en la franja: el contenido se desplaza sin pelear.
 */
/** Lo que se ve de la lengüeta cerrada: la flecha y la fila del estado (el mismo valor en el CSS). */
const ALTO_PICO = 62

function Lengueta({ cabecera, children }) {
  const [abierta, setAbierta] = useState(false)
  // Mientras se arrastra: cuánto baja la hoja desde abierta, en px (null = quieta).
  const [arrastre, setArrastre] = useState(null)
  const hoja = useRef(null)
  const gesto = useRef(null)
  const huboArrastre = useRef(false)

  // Esc la cierra, como cualquier hoja de la web.
  useEffect(() => {
    if (!abierta) return undefined
    const alTecla = (e) => { if (e.key === 'Escape') setAbierta(false) }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [abierta])

  const recorrido = () => Math.max(0, (hoja.current?.offsetHeight ?? 0) - ALTO_PICO)

  function alBajar(e) {
    if (e.button !== undefined && e.button !== 0) return
    const r = recorrido()
    gesto.current = { y0: e.clientY, desde: abierta ? 0 : r, r, ultimoY: e.clientY, ultimoT: e.timeStamp, v: 0 }
    huboArrastre.current = false
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function alMover(e) {
    const g = gesto.current
    if (!g) return
    const dy = e.clientY - g.y0
    if (!huboArrastre.current && Math.abs(dy) < 6) return
    huboArrastre.current = true
    const dt = e.timeStamp - g.ultimoT
    if (dt > 0) g.v = (e.clientY - g.ultimoY) / dt
    g.ultimoY = e.clientY
    g.ultimoT = e.timeStamp
    setArrastre(Math.max(0, Math.min(g.r, g.desde + dy)))
  }
  function alSoltar() {
    const g = gesto.current
    gesto.current = null
    if (!g || !huboArrastre.current) return
    // Un lanzamiento rápido manda sobre la posición; si no, la mitad del recorrido.
    const abrir = Math.abs(g.v) > 0.55 ? g.v < 0 : (arrastre ?? g.desde) < g.r / 2
    setAbierta(abrir)
    setArrastre(null)
  }
  function alTocar() {
    // El arrastre ya decidió: el clic que llega al soltar no vuelve a cambiarla.
    if (huboArrastre.current) { huboArrastre.current = false; return }
    setAbierta((a) => !a)
  }

  const r = arrastre == null ? null : recorrido()
  const progreso = arrastre == null ? (abierta ? 1 : 0) : 1 - arrastre / (r || 1)
  const estilo = arrastre == null ? undefined : { transform: `translateY(${arrastre}px)`, transition: 'none' }

  return (
    <>
      <div className={`mvu-velo${abierta ? ' activo' : ''}`} style={{ opacity: progreso * 0.5 }}
        onClick={() => setAbierta(false)} aria-hidden="true" />
      {/* El marco recorta lo que cae bajo la barra de pestañas (en Glass la barra es transparente). */}
      <div className="mvu-hoja-marco">
      <section ref={hoja} className={`mvu-hoja${abierta ? ' abierta' : ''}`} style={estilo} aria-label="Detalle de tu unidad">
        <button type="button" className="mvu-franja" aria-expanded={abierta}
          aria-label={abierta ? 'Cerrar el detalle de tu unidad' : 'Abrir el detalle de tu unidad'}
          onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar} onClick={alTocar}>
          <svg className="mvu-flecha" width="16" height="10" viewBox="0 0 24 14" aria-hidden="true"
            style={{ transform: `rotate(${progreso * 180}deg)` }}>
            <path d="M4 11l8-7 8 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="mvu-pico">{cabecera}</span>
        </button>
        {/* Cerrada no se alcanza con el tabulador: lo de dentro no se ve. */}
        <div className="mvu-hoja-cuerpo" {...(abierta ? {} : { inert: '' })}>
          {children}
        </div>
      </section>
      </div>
    </>
  )
}

/** Celda de la ficha: etiqueta chica y dato grande sobre la superficie hundida. */
function Celda({ etiqueta, valor, unidad, tono = '', fila = false }) {
  return (
    <div className={`mvu-celda${fila ? ' fila' : ''}`}>
      <span className="mvu-celda-k">{etiqueta}</span>
      <span className="mvu-celda-v">
        <b className={tono}>{valor}</b>
        {unidad && <small>{unidad}</small>}
      </span>
    </div>
  )
}

/** Aviso de arriba de la lengüeta (detenido, sin señal), con su ícono en una caja. */
function Aviso({ icono, titulo, detalle }) {
  return (
    <div className="mvu-aviso" role="status">
      <span className="mvu-aviso-icono"><IconoApp nombre={icono} tam={21} /></span>
      <span className="mvu-aviso-txt">
        <b>{titulo}</b>
        {detalle && <small>{detalle}</small>}
      </span>
    </div>
  )
}

/**
 * RETRATO de la unidad: su foto si la tiene y, si no, la camioneta de
 * referencia, flotando sobre su sombra. El piso brilla en verde si va rodando.
 */
function Retrato({ unidad, enMarcha }) {
  const nombre = `${unidad.marca ?? ''} ${unidad.modelo ?? ''}`.trim() || 'Tu unidad'
  return (
    <div className={`mvu-retrato${enMarcha ? ' marcha' : ''}`}>
      <i className="mvu-retrato-piso" aria-hidden="true" />
      <i className="mvu-retrato-sombra" aria-hidden="true" />
      <div className="mvu-retrato-vehiculo">
        <FotoFija publicId={unidad.id ? ids.vehiculo(unidad.id) : null} ancho={640} ajuste="contener" alt={`Foto de ${nombre}`}>
          <img src="/images/maps/vehicle-reference.png" alt="" width="1536" height="1024" />
        </FotoFija>
      </div>
    </div>
  )
}

/* ---------------- Índice de manejo (TarjetaIndice de la app) ---------------- */

/** A partir de 85 el manejo es seguro; por debajo de 70 requiere atención (`lib/indice` de la app). */
function rangoDeIndice(n) {
  if (n >= 85) return 'verde'
  if (n >= 70) return 'amarillo'
  return 'rojo'
}
const TONO_RANGO = { verde: 'exito', amarillo: 'aviso', rojo: 'peligro' }
const VEREDICTO = { verde: 'Manejo seguro', amarillo: 'Puedes mejorar', rojo: 'Requiere atención' }

/**
 * El score del servidor en la forma del índice de la app: FOM manda CONTEOS y
 * el anillo de siempre enseña eventos por cada 100 km del mismo período. Sin
 * nota (sin km) va con 0 km: gris y «Sin actividad», nunca un 0 rojo.
 */
function indiceDeManejo(s) {
  const conNota = calificacionManejo(s) !== 'unavailable'
  const km = Number.isFinite(s.km) && s.km > 0 ? s.km : 0
  const por100 = (n) => (km > 0 && typeof n === 'number' && Number.isFinite(n) ? (n / km) * 100 : 0)
  return {
    total: conNota ? s.indice ?? 0 : 0,
    km: conNota ? km : 0,
    excesos: por100(s.excesos),
    frenadas: por100(s.frenadas),
    aceleraciones: por100(s.aceleraciones),
  }
}

/** Anillo del índice: se llena al aparecer (sin animación si se pidió menos movimiento). */
function Anillo({ valor, tono, tam = 112, grosor = 10 }) {
  const v = Math.max(0, Math.min(100, valor))
  const radio = (tam - grosor) / 2
  const vuelta = 2 * Math.PI * radio
  const [lleno, setLleno] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setLleno(v))
    return () => cancelAnimationFrame(id)
  }, [v])
  return (
    <div className={`mvu-anillo ${tono}`} style={{ width: tam, height: tam }} role="img" aria-label={`Índice ${f.numero(Math.round(v))} de 100`}>
      <svg width={tam} height={tam} aria-hidden="true">
        <circle className="pista" cx={tam / 2} cy={tam / 2} r={radio} strokeWidth={grosor} fill="none" />
        <circle className="arco" cx={tam / 2} cy={tam / 2} r={radio} strokeWidth={grosor} fill="none" strokeLinecap="round"
          strokeDasharray={vuelta} strokeDashoffset={vuelta * (1 - lleno / 100)} transform={`rotate(-90 ${tam / 2} ${tam / 2})`} />
      </svg>
      <span className="mvu-anillo-centro" aria-hidden="true">
        <b>{Math.round(v)}</b>
        <small>/ 100</small>
      </span>
    </div>
  )
}

/** Techo fijo de la barra: 3 eventos por cada 100 km (una barra llena dice siempre lo mismo). */
const TECHO_EVENTOS = 3
function tonoEvento(v) {
  if (v >= 2) return 'peligro'
  if (v >= 1) return 'aviso'
  return ''
}
function FilaEvento({ icono, etiqueta, valor }) {
  const tono = tonoEvento(valor)
  const pct = Math.max(0.04, Math.min(1, valor / TECHO_EVENTOS)) * 100
  return (
    <li className={`mvu-evento${tono ? ` ${tono}` : ''}`}>
      <span className="mvu-evento-icono"><IconoApp nombre={icono} tam={16} /></span>
      <span className="mvu-evento-cuerpo">
        <span className="mvu-evento-linea">
          <span className="mvu-evento-k">{etiqueta}</span>
          <b>{valor.toFixed(1).replace('.', ',')}</b>
          <small>/100km</small>
        </span>
        <span className="mvu-evento-pista" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
      </span>
    </li>
  )
}

/**
 * TU MANEJO: el selector 7 / 30 días y la tarjeta del índice con el anillo.
 * Como en la app, sin dato no hay tarjeta: un índice que no se pudo leer no se
 * pinta como un cero.
 */
export function ManejoAnillo() {
  const [dias, setDias] = useState(DIAS_MANEJO[0])
  const carga = useDatos(() => repo.manejo.miScore({ dias }), [dias])
  // Lo último que se enseñó: al cambiar de período la tarjeta no desaparece mientras carga.
  const [ultimo, setUltimo] = useState(null)
  if (carga.datos && carga.datos !== ultimo) setUltimo(carga.datos)
  const visible = carga.datos ?? (carga.estado === 'cargando' ? ultimo : null)
  const selector = (
    <div className="pnl-chips mvu-dias" role="group" aria-label="Período del manejo">
      {DIAS_MANEJO.map((d) => (
        <button key={d} type="button" className={`pnl-chip${d === dias ? ' activo' : ''}`} aria-pressed={d === dias} onClick={() => setDias(d)}>{d} días</button>
      ))}
    </div>
  )
  if (!visible) {
    if (carga.estado !== 'error' || !ultimo) return null
    return (
      <div className="mvu-manejo">
        {selector}
        <p className="mvu-error" role="alert">No pudimos consultar el manejo de este período.</p>
      </div>
    )
  }
  const s = indiceDeManejo(visible)
  const conActividad = s.km > 0
  const rango = rangoDeIndice(s.total)
  const tono = conActividad ? TONO_RANGO[rango] : 'apagado'
  // En verde la única pieza de color es el anillo; en ámbar o rojo vuelven el borde y el halo.
  const avisa = conActividad && rango !== 'verde'
  return (
    <div className={`mvu-manejo${carga.estado === 'cargando' ? ' cargando' : ''}`} aria-busy={carga.estado === 'cargando'}>
      {selector}
      <section className={`mvu-indice ${tono}${avisa ? ' avisa' : ''}`} aria-label="Índice de manejo">
        <div className="mvu-indice-hero">
          <Anillo valor={s.total} tono={tono} />
          <div className="mvu-indice-txt">
            <span className="mvu-overline">Índice de manejo</span>
            <b className="mvu-veredicto">{conActividad ? VEREDICTO[rango] : 'Sin actividad'}</b>
          </div>
        </div>
        <hr className="mvu-separador" />
        <div className="mvu-eventos">
          <div className="mvu-eventos-cab">
            <span className="mvu-overline">Eventos por 100 km</span>
            <small>últimos {dias} días</small>
          </div>
          <ul>
            <FilaEvento icono="velocidad" etiqueta="Excesos de velocidad" valor={s.excesos} />
            <FilaEvento icono="frenos" etiqueta="Frenadas bruscas" valor={s.frenadas} />
            <FilaEvento icono="electrico" etiqueta="Aceleraciones bruscas" valor={s.aceleraciones} />
          </ul>
        </div>
      </section>
    </div>
  )
}

/* ------------------------------------ Hoy ------------------------------------ */

/** Los colores del catálogo (los de `Tag`) en los tonos de la lengüeta. */
const TONO_DE_COLOR = { verde: 'exito', ambar: 'aviso', rojo: 'peligro', gris: 'apagado' }
const tonoDe = (c) => TONO_DE_COLOR[c] ?? 'apagado'
/** Órdenes que se ven antes de «Ver en Mantenimiento». */
const ORDENES_A_LA_VISTA = 3

/** Una fila de «Hoy»: ícono en su caja, título y detalle, y la pastilla del estado. */
function FilaHoy({ icono, tono, titulo, detalle, pastilla }) {
  return (
    <div className="mvu-hoy-fila">
      <span className={`mvu-hoy-icono ${tono}`}><IconoApp nombre={icono} tam={20} /></span>
      <span className="mvu-hoy-txt">
        <b>{titulo}</b>
        {detalle && <small>{detalle}</small>}
      </span>
      <span className={`mvu-chip mini ${tono}`}>{pastilla}</span>
    </div>
  )
}

/**
 * HOY: la inspección del día y el mantenimiento pendiente de la unidad. En la
 * app viven en sus pestañas; aquí se resumen y llevan a la suya.
 *
 * Pendiente, la inspección se hace en la pestaña «Inspección» de la web
 * (T-167a), con las mismas rutas que la app. Hecha, se ve su resultado aquí.
 */
function TarjetaHoy({ unidad }) {
  const [verResultado, setVerResultado] = useState(false)
  const idResultado = useId()
  const hoy = f.hoyISO()
  // La más nueva de hoy, si se hizo más de una.
  const inspeccion = masNuevoPrimero(unidad.inspecciones, ['creadaEn', 'fecha'])
    .find((i) => String(i.fecha ?? i.creadaEn ?? '').slice(0, 10) === hoy) ?? null
  const abiertas = masNuevoPrimero(unidad.odts, 'creadaEn').filter((o) => o.estado === 'abierta' || o.estado === 'en_revision')
  const tonoInspeccion = inspeccion ? tonoDe(color('inspeccion_resultado', inspeccion.resultado)) : 'aviso'
  const cuando = inspeccion?.creadaEn ? horaCorta(inspeccion.creadaEn) : null

  return (
    <section className="mvu-tarjeta mvu-hoy" aria-label="Hoy">
      <span className="mvu-overline">Hoy</span>

      {/* --- Inspección del día --- */}
      <div className="mvu-hoy-bloque">
        <FilaHoy
          icono="inspeccion"
          tono={tonoInspeccion}
          titulo="Inspección del día"
          detalle={inspeccion
            ? [cuando ? `Hecha a las ${cuando}` : 'Hecha hoy', inspeccion.fallasCriticas > 0 ? f.cantidad(inspeccion.fallasCriticas, 'falla crítica', 'fallas críticas') : null].filter(Boolean).join(' · ')
            : 'Hazla antes de salir'}
          pastilla={inspeccion ? etiqueta('inspeccion_resultado', inspeccion.resultado) : 'Pendiente'}
        />
        {inspeccion ? (
          <>
            <button type="button" className="mvu-hoy-accion" aria-expanded={verResultado} aria-controls={idResultado}
              onClick={() => setVerResultado((v) => !v)}>
              {verResultado ? 'Ocultar resultado' : 'Ver resultado'}
              <span className={`mvu-hoy-giro${verResultado ? ' abierto' : ''}`}><IconoApp nombre="chevron" tam={16} /></span>
            </button>
            {verResultado && (
              <dl className="mvu-hoy-datos" id={idResultado}>
                <div><dt>Resultado</dt><dd>{etiqueta('inspeccion_resultado', inspeccion.resultado)}</dd></div>
                <div><dt>Fecha y hora</dt><dd>{f.fechaHora(inspeccion.creadaEn || inspeccion.fecha)}</dd></div>
                <div><dt>Fallas críticas</dt><dd>{f.numero(inspeccion.fallasCriticas)}</dd></div>
                <div><dt>Observaciones</dt><dd>{f.numero(inspeccion.observaciones)}</dd></div>
                {inspeccion.plantilla && <div><dt>Formato</dt><dd>{inspeccion.plantilla}</dd></div>}
                <div><dt>Ubicación</dt><dd>{inspeccion.ubicacion || 'Sin ubicación'}</dd></div>
              </dl>
            )}
          </>
        ) : (
          <Link className="mvu-hoy-accion" to="/panel/inspeccion">
            Hacer la inspección
            <IconoApp nombre="chevron" tam={16} />
          </Link>
        )}
      </div>

      {/* --- Mantenimiento pendiente (lo más nuevo primero) --- */}
      <div className="mvu-hoy-bloque">
        <FilaHoy
          icono="ot"
          tono={abiertas.length ? 'aviso' : 'exito'}
          titulo="Mantenimiento"
          detalle={abiertas.length
            ? f.cantidad(abiertas.length, 'orden abierta o en taller', 'órdenes abiertas o en taller')
            : 'Sin fallas reportadas ni trabajos en taller'}
          pastilla={abiertas.length ? 'Pendiente' : 'Al día'}
        />
        {abiertas.length > 0 && (
          <ul className="mvu-hoy-ordenes">
            {abiertas.slice(0, ORDENES_A_LA_VISTA).map((o) => (
              <li key={o.id}>
                <span className="mvu-hoy-txt">
                  <b>{o.descripcion || 'Orden sin descripción'}</b>
                  <small>{[o.falla ? etiqueta('tipo_falla', o.falla) : 'Sin tipo', o.creadaEn ? f.desde(o.creadaEn) : null].filter(Boolean).join(' · ')}</small>
                </span>
                <span className={`mvu-chip mini ${tonoDe(color('odt_estado_visible', o.estado))}`}>{etiqueta('odt_estado_visible', o.estado)}</span>
              </li>
            ))}
          </ul>
        )}
        <Link className="mvu-hoy-accion" to="/panel/mantenimiento">
          {abiertas.length > ORDENES_A_LA_VISTA ? `Ver las ${abiertas.length} en Mantenimiento` : 'Ver Mantenimiento'}
          <IconoApp nombre="chevron" tam={16} />
        </Link>
      </div>
    </section>
  )
}

/* ---------------------------------- Pantalla ---------------------------------- */

/**
 * Lo pinta MiUnidad en el teléfono con los datos que ya leyó: aquí no se pide
 * nada de la unidad, solo el índice de manejo (igual que en escritorio).
 */
export default function MiUnidadMovil({ perfil, unidad, enMapa, cargando, error, alReintentar, posicionVieja, ahora }) {
  const movil = useMovil()
  const sinLeer = movil?.sinLeer ?? 0

  const estado = unidad ? estadoApp(unidad) : null
  const enMarcha = estado === 'marcha'
  const sinSenal = estado === 'sin-senal'
  const hayLectura = Boolean(unidad?.ultimoReporte)
  const velocidad = unidad?.velocidadKmh
  const textoVelocidad = velocidad == null ? '—' : f.numero(Math.round(velocidad))

  let cabecera
  let contenido
  if (cargando || error || !unidad) {
    // Sin unidad (o sin saber cuál): el aviso en lugar de la telemetría.
    const chip = cargando ? 'Cargando' : error ? 'Sin conexión' : 'Sin unidad'
    const nota = cargando ? 'Buscando tu unidad…' : error ? 'No se pudo leer' : 'Aún sin asignar'
    cabecera = (
      <span className="mvu-pico-fila">
        <span className="mvu-pico-izq">
          <span className="mvu-chip apagado"><Punto tono="apagado" />{chip}</span>
          <span className="mvu-pico-nota">{nota}</span>
        </span>
      </span>
    )
    contenido = cargando ? (
      <div className="mvu-tarjeta"><Cargando filas={4} /></div>
    ) : error ? (
      <div className="mvu-tarjeta mvu-centro">
        <span className="mvu-vacio-icono"><IconoApp nombre="flota" tam={40} /></span>
        <b className="mvu-subtitulo">No pudimos confirmar tu unidad</b>
        <small className="mvu-caption">Revisa tu conexión y vuelve a intentarlo.</small>
        <button type="button" className="pnl-btn mvu-boton" onClick={alReintentar}>Reintentar</button>
      </div>
    ) : (
      <div className="mvu-tarjeta mvu-centro">
        <span className="mvu-vacio-icono"><IconoApp nombre="flota" tam={40} /></span>
        <b className="mvu-subtitulo">Aún no tienes un vehículo asignado</b>
      </div>
    )
  } else {
    const tonoEstado = enMarcha ? 'exito' : sinSenal ? 'apagado' : 'aviso'
    cabecera = (
      <span className="mvu-pico-fila">
        <span className="mvu-pico-izq">
          <span className={`mvu-chip ${tonoEstado}`}>
            <Punto tono={tonoEstado} activo={enMarcha} />
            <span className="mvu-chip-txt">{sinSenal ? textoSinSenal(unidad.ultimoReporte, ahora) : enMarcha ? 'En marcha' : 'Detenido'}</span>
          </span>
          <span className="mvu-pico-nota">{etiquetaCorta(unidad)}</span>
        </span>
        <span className="mvu-pico-velocidad"><b>{textoVelocidad}</b><small>km/h</small></span>
      </span>
    )
    const titulo = [`${conValor(unidad.marca) ?? ''} ${conValor(unidad.modelo) ?? ''}`.trim(), unidad.anio].filter(Boolean).join(' · ')
    contenido = (
      <>
        {/* DETENIDO: arriba del todo, con la hora de la última lectura y el sitio.
            No se inventa «detenido hace X»: el GPS dice cuándo leyó, no desde cuándo está parado. */}
        {hayLectura && !enMarcha && !sinSenal && (
          <Aviso icono="pausa" titulo="Vehículo detenido"
            detalle={[horaCorta(unidad.ultimoReporte), unidad.ubicacionTexto || null].filter(Boolean).join(' · ')} />
        )}
        {/* SIN SEÑAL: cuánto lleva así y la hora exacta del último reporte. */}
        {sinSenal && (
          <Aviso icono="gps" titulo={textoSinSenal(unidad.ultimoReporte, ahora)} detalle={textoUltimoReporte(unidad.ultimoReporte)} />
        )}

        {/* TU UNIDAD: el retrato, su identidad y la ficha en la misma tarjeta. */}
        <section className="mvu-tarjeta mvu-unidad" aria-label="Tu unidad">
          <Retrato unidad={unidad} enMarcha={enMarcha} />
          <div className="mvu-unidad-cab">
            <div className="mvu-unidad-nombre">
              <b className="mvu-subtitulo">{titulo || unidad.alias || 'Tu unidad'}</b>
              <small className="mvu-caption">{identidad(unidad)}</small>
            </div>
            <span className="mvu-velocidad">
              <b className={tonoVelocidad(enMarcha ? velocidad : 0)}>{textoVelocidad}</b>
              <small>km/h</small>
            </span>
          </div>
          <div className="mvu-ficha">
            <div className="mvu-duo">
              <Celda etiqueta="Placa" valor={conValor(unidad.placa) ?? '—'} />
              <Celda etiqueta="Año" valor={unidad.anio ? String(unidad.anio) : '—'} />
            </div>
            <div className="mvu-telemetria-cab">
              <span className="mvu-overline">Telemetría</span>
              {/* Si la última lectura falló, lo de abajo es la última buena: no se le llama «en vivo». */}
              {hayLectura && posicionVieja ? (
                <span className="mvu-chip apagado mini"><Punto tono="apagado" tam={6} />SIN CONEXIÓN · {horaCorta(unidad.ultimoReporte)}</span>
              ) : hayLectura && !sinSenal ? (
                <span className="mvu-chip exito mini"><Punto tono="exito" activo tam={6} />EN VIVO</span>
              ) : null}
            </div>
            {hayLectura && (
              <div className="mvu-telemetria">
                <Celda fila etiqueta="Odómetro" valor={unidad.km == null ? '—' : f.numero(Math.round(unidad.km))} unidad={unidad.km == null ? '' : 'km'} />
                <div className="mvu-duo">
                  <Celda etiqueta="Temp. motor" valor={unidad.tempMotorC == null ? '—' : String(unidad.tempMotorC)} unidad={unidad.tempMotorC == null ? '' : '°C'}
                    tono={unidad.tempMotorC >= 105 ? 'peligro' : unidad.tempMotorC >= 98 ? 'aviso' : ''} />
                  <Celda etiqueta="Marcha" valor={conValor(unidad.caja) ?? '—'} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* HOY: la inspección del día y lo pendiente de mantenimiento. */}
        <TarjetaHoy unidad={unidad} />
      </>
    )
  }

  return (
    <div className="mvu">
      {/* Mapa protagonista a pantalla completa: solo tu unidad, sin su recorrido
          (por dónde pasó es cosa de quien supervisa, no de quien conduce). */}
      <div className="mvu-mapa">
        <Mapa vehiculos={enMapa} alto="100%" leyenda={false} ficha={false} />
      </div>

      {/* El encabezado de la app, flotando sobre el mapa: saludo y tu nombre. */}
      <div className="mvu-encabezado">
        <MovilEncabezado
          seccion={saludoPorHora(ahora)}
          nombre={perfil?.nombre}
          sinLeer={sinLeer}
          etiquetaCampana={`Alertas: ${sinLeer} sin leer`}
          iniciales={perfil?.iniciales}
        />
      </div>

      {/* Emergencia: el SOS sobre el mapa, con aire por encima de la lengüeta. */}
      <BotonSos usuarioId={perfil?.userId ?? null} />

      <Lengueta cabecera={cabecera}>
        {contenido}
        {/* TU MANEJO: el mismo índice que en Mi perfil, debajo de la unidad. */}
        <ManejoAnillo key={`${perfil?.id}:${perfil?.empresaId}`} />
      </Lengueta>
    </div>
  )
}
