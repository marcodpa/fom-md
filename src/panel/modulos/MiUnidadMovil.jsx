import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import Mapa from '../comp/Mapa'
import { MovilEncabezado } from '../comp/movil-piezas'
import { useMovil } from '../comp/movil-navegacion'
import { Cargando } from '../comp/ui'
import { DIAS_MANEJO, calificacionManejo } from '../datos/manejo'
import { estadoUnidad } from '../datos/estadoUnidad'
import { conSenalAlDia, textoSinSenal, transmitiendo } from '../datos/sinSenal'
import { colaReciente } from '../datos/recorrido'
import { horasDeHoy, partesTiempo, resumenDeHoy, textoKm, textoTiempo } from '../datos/recorridoHoy'
import { fotoSinFondo } from '../datos/fotoSinFondo'
import * as f from '../datos/formato'
import { BotonSos } from './SosConductor'
import '../../styles/mi-unidad-movil.css'

// ============================================================
// MI UNIDAD EN EL TELÉFONO — la pantalla «Mi unidad» de la app (T-170)
// ------------------------------------------------------------
// Copia de `(driver)/index.tsx` de FOM-DRIVER con el diseño aprobado por Marco
// (versión oscura): el mapa con la unidad, la cola de sus últimos minutos y el
// SOS; una franja oscura con la unidad, su velocidad en vivo y lo de hoy (km y
// tiempo en marcha); la foto sin fondo montada sobre la hoja «Resumen» (dónde
// está, odómetro, índice de manejo, mantenimiento pendiente y la inspección de
// hoy). Subida, aparece la telemetría; desplazada, la franja se encoge y queda
// fija con su miniatura, y debajo siguen la telemetría y el índice de manejo.
//
// Con otra unidad tomada por PIN (T-167b), se ve ESA unidad con la etiqueta
// «USANDO … · PIN» sobre el mapa, como la app.
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
/** «Toyota Hilux». */
const marcaModelo = (u) => `${conValor(u.marca) ?? ''} ${conValor(u.modelo) ?? ''}`.trim()

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

/** Íconos de la app y de la maqueta que el set de la web no tiene. */
const TRAZOS = {
  flota: <><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></>,
  velocidad: <><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" /><path d="M12 12l4-3" /><path d="M12 12h.01" /></>,
  frenos: <><circle cx="10.5" cy="12" r="7.5" /><circle cx="10.5" cy="12" r="2.8" /><path d="M17.5 8.5h2.6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2.6" /></>,
  electrico: <path d="M13 2.5 4.5 14H11l-1 7.5L19.5 10H13z" />,
  camion: <><path d="M3 6h11v10H3z" /><path d="M14 9h4l3 3v4h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  odo: <><path d="M4 17a8 8 0 1 1 16 0" /><path d="M12 17l4-5" /><circle cx="12" cy="17" r="1.2" /></>,
  escudo: <><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  llave: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  flecha: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
}
function IconoApp({ nombre, tam = 20, grosor = 2 }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  )
}

/** El punto del estado; late solo cuando la unidad va rodando. */
function Punto({ tono, activo = false, tam = 7 }) {
  return <i className={`mvu-punto ${tono}${activo ? ' late' : ''}`} style={{ width: tam, height: tam }} aria-hidden="true" />
}

/* ------------------------------ La hoja de tres estados ------------------------------ */

/** Alto de la franja; la hoja se monta sobre sus últimos `SOLAPE` px (la maqueta). */
const ALTO_FRANJA = 190
const SOLAPE = 50
/** La hoja subida deja una tira de mapa bajo el encabezado (12 + 52 de la cápsula + 48). */
const ARRIBA_HOJA = 112
/** Lo que se ve al entrar mientras no se midió el Resumen (franja + Resumen de la maqueta). */
const VISIBLE_INICIAL = 446
/** Aire bajo el Resumen al entrar, antes de la barra de pestañas. */
const AIRE_ABAJO = 12
/** La franja compacta aparece cuando la grande ya se fue por arriba. */
const UMBRAL_COMPACTA = ALTO_FRANJA - SOLAPE - 65

/**
 * LA HOJA, con los tres estados de la maqueta: al entrar a media altura (la
 * franja con la foto y el Resumen entero); subida, arrastrándola o tocando la
 * franja (aparece la telemetría); y desplazada (la franja se encoge en una
 * barra fija con la miniatura). A media altura TODA la hoja se arrastra; subida,
 * el contenido se desplaza y el asa es la franja.
 *
 * `alBorde` recibe dónde queda el borde de arriba de la hoja quieta, para que
 * el mapa ponga la unidad en medio de lo que se ve.
 */
function HojaUnidad({ franja, foto, resumen, resto, compacta, sos, alBorde }) {
  const marco = useRef(null)
  const cuerpo = useRef(null)
  const medida = useRef(null)
  const gesto = useRef(null)
  const huboArrastre = useRef(false)
  const [alto, setAlto] = useState(0)
  const [altoResumen, setAltoResumen] = useState(null)
  const [subida, setSubida] = useState(false)
  const [arrastre, setArrastre] = useState(null)
  const [conCompacta, setConCompacta] = useState(false)

  // El alto de la pantalla (sin la barra de pestañas) y el del Resumen, siempre al día.
  useLayoutEffect(() => {
    const medir = () => {
      if (marco.current) setAlto(marco.current.clientHeight)
      if (medida.current) setAltoResumen(Math.round(medida.current.offsetHeight))
    }
    medir()
    const obs = new ResizeObserver(medir)
    if (marco.current) obs.observe(marco.current)
    if (medida.current) obs.observe(medida.current)
    return () => obs.disconnect()
  }, [])

  const visible = altoResumen == null ? VISIBLE_INICIAL : ALTO_FRANJA - SOLAPE + 20 + altoResumen + AIRE_ABAJO
  /** Desplazamiento de la hoja a media altura (0 = subida). */
  const media = Math.max(0, Math.round(alto - visible - ARRIBA_HOJA))
  const borde = ARRIBA_HOJA + (subida ? 0 : media)
  useEffect(() => { if (alto > 0) alBorde?.(borde) }, [alto, borde, alBorde])

  // Al bajarla se vuelve al principio: a media altura se ve el Resumen, no lo de abajo.
  useEffect(() => {
    if (!subida && cuerpo.current) cuerpo.current.scrollTop = 0
  }, [subida])

  // Esc la baja, como cualquier hoja de la web.
  useEffect(() => {
    if (!subida) return undefined
    const alTecla = (e) => { if (e.key === 'Escape') setSubida(false) }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [subida])

  function alBajar(e) {
    if (e.button !== undefined && e.button !== 0) return
    // Subida, solo la franja arrastra: lo demás se desplaza.
    if (subida && !e.target.closest?.('.mvu-asa')) return
    gesto.current = { y0: e.clientY, desde: subida ? 0 : media, ultimoY: e.clientY, ultimoT: e.timeStamp, v: 0 }
    huboArrastre.current = false
  }
  function alMover(e) {
    const g = gesto.current
    if (!g) return
    const dy = e.clientY - g.y0
    if (!huboArrastre.current) {
      if (Math.abs(dy) < 6) return
      huboArrastre.current = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    const dt = e.timeStamp - g.ultimoT
    if (dt > 0) g.v = (e.clientY - g.ultimoY) / dt
    g.ultimoY = e.clientY
    g.ultimoT = e.timeStamp
    setArrastre(Math.max(0, Math.min(media, g.desde + dy)))
  }
  function alSoltar() {
    const g = gesto.current
    gesto.current = null
    if (!g || !huboArrastre.current) return
    // Un lanzamiento rápido manda sobre la posición; si no, la mitad del recorrido.
    const sube = Math.abs(g.v) > 0.55 ? g.v < 0 : (arrastre ?? g.desde) < media / 2
    setSubida(sube)
    setArrastre(null)
  }
  function alTocarAsa() {
    // El arrastre ya decidió: el clic que llega al soltar no vuelve a cambiarla.
    if (huboArrastre.current) { huboArrastre.current = false; return }
    setSubida((s) => !s)
  }

  const y = arrastre ?? (subida ? 0 : media)
  const progreso = media > 0 ? 1 - y / media : 1
  const quieta = arrastre == null

  return (
    <div className="mvu-hmarco" ref={marco}>
      {sos && (
        <div className={`mvu-sos${progreso > 0.4 ? ' oculto' : ''}`}
          style={{ top: ARRIBA_HOJA - 68, transform: `translateY(${y}px)`, opacity: Math.max(0, Math.min(1, (y / Math.max(1, media) - 0.55) / 0.45)), transition: quieta ? undefined : 'none' }}>
          {sos}
        </div>
      )}
      <section className="mvu-h" aria-label="Tu unidad"
        style={{ top: ARRIBA_HOJA, transform: `translateY(${y}px)`, transition: quieta ? undefined : 'none' }}
        onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}>
        <div ref={cuerpo} className={`mvu-h-cuerpo${subida ? ' subida' : ''}`}
          onScroll={(e) => setConCompacta(e.currentTarget.scrollTop > UMBRAL_COMPACTA)}>
          <button type="button" className="mvu-asa" aria-expanded={subida}
            aria-label={subida ? 'Bajar el detalle de tu unidad' : 'Ver más de tu unidad'} onClick={alTocarAsa}>
            {franja}
          </button>
          <div className="mvu-h-hoja">
            <div ref={medida}>{resumen}</div>
            {/* Lo de abajo solo se alcanza con la hoja subida: a media altura no se ve. */}
            <div {...(subida ? {} : { inert: '' })}>{resto}</div>
          </div>
          {foto}
        </div>
        {/* Desplazada: la franja encogida queda fija arriba. Tocarla vuelve al principio. */}
        <button type="button" className={`mvu-compacta-boton${conCompacta ? ' visible' : ''}`} tabIndex={conCompacta ? 0 : -1}
          aria-hidden={!conCompacta} aria-label="Volver al resumen de tu unidad"
          onClick={() => cuerpo.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
          {compacta}
        </button>
      </section>
    </div>
  )
}

/* ------------------------------ Piezas de la maqueta ------------------------------ */

/** La unidad sin fondo (su foto o la silueta de su tipo), en el lienzo 8:5. Ya trae su sombra. */
function FotoSinFondo({ unidad, ancho, className = '' }) {
  const { url, silueta } = fotoSinFondo(unidad.marca, unidad.modelo, unidad.tipo)
  if (!url) return null
  const nombre = marcaModelo(unidad) || 'la unidad'
  return <img className={className} src={url} width={ancho} height={Math.round(ancho / 1.6)} alt={silueta ? `Silueta de ${nombre}` : nombre} />
}

/** «● EN VIVO» (o la hora de la última buena, o «SIN SEÑAL»). */
function MarcaVivo({ vivo, chip = false }) {
  if (!vivo) return null
  const tono = vivo.tipo === 'vivo' ? 'exito' : 'apagado'
  const texto = vivo.tipo === 'vivo' ? 'En vivo' : vivo.tipo === 'sin-conexion' ? `Sin conexión · ${vivo.hora}` : 'Sin señal'
  return <span className={`${chip ? 'mvu-chip mini' : 'mvu-vivo'} ${tono}`}><Punto tono={tono} activo={vivo.tipo === 'vivo'} tam={6} />{texto}</span>
}

/** LA FRANJA: la unidad, su velocidad en vivo y las dos cifras de hoy. */
function Franja({ unidad, velocidad, enMarcha, vivo, hoy }) {
  const tiempo = partesTiempo(hoy.minutos)
  const titulo = [marcaModelo(unidad), unidad.anio].filter(Boolean).join(' · ')
  return (
    <span className="mvu-franja2">
      <i className="mvu-tirador" aria-hidden="true" />
      <span className="mvu-f-fila">
        <span className="mvu-f-id">
          <span className="mvu-f-ico"><IconoApp nombre="camion" /></span>
          <span className="mvu-f-txt">
            <b>{titulo || unidad.alias || 'Tu unidad'}</b>
            <small>{identidad(unidad)}</small>
          </span>
        </span>
        <span className="mvu-f-vel">
          <span className={tonoVelocidad(enMarcha ? velocidad : 0)}><b>{velocidad == null ? '—' : f.numero(Math.round(velocidad))}</b><small>km/h</small></span>
          <MarcaVivo vivo={vivo} />
        </span>
      </span>
      <span className="mvu-f-cifras">
        <span><b>{textoKm(hoy.km)}{hoy.km != null && <small>km</small>}</b><small className="k">Recorrido hoy</small></span>
        <span><b>{tiempo.cifra}{tiempo.unidad && <small>{tiempo.unidad}</small>}</b><small className="k">En marcha hoy</small></span>
      </span>
    </span>
  )
}

function Casilla({ icono, valor, unidad, etiqueta, tono = '' }) {
  return (
    <div className={`mvu-casilla${tono ? ` ${tono}` : ''}`}>
      <IconoApp nombre={icono} grosor={1.9} />
      <span>
        <b>{valor}{unidad && <small>{unidad}</small>}</b>
        <small className="k">{etiqueta}</small>
      </span>
    </div>
  )
}

/**
 * EL RESUMEN: dónde está (zona + coordenadas + hora, con su estado), tres
 * casillas y la inspección de hoy con su botón (que lleva a la pestaña Inspección).
 */
function Resumen({ unidad, estado, ahora, indice, pendientes, inspeccion }) {
  const coordenadas = Number.isFinite(unidad.lat) && Number.isFinite(unidad.lng) ? `${unidad.lat.toFixed(5)}, ${unidad.lng.toFixed(5)}` : null
  const detalle = [coordenadas, unidad.ultimoReporte ? horaCorta(unidad.ultimoReporte) : null].filter(Boolean).join(' · ')
  const tonoEstado = estado === 'marcha' ? 'exito' : estado === 'sin-senal' ? 'apagado' : 'aviso'
  const hecha = inspeccion?.hecha ?? false
  return (
    <div className="mvu-resumen">
      <h2 className="mvu-h-tit">Resumen</h2>
      <div className="mvu-donde">
        <span className="mvu-donde-ico"><IconoApp nombre="pin" grosor={1.9} /></span>
        <span className="mvu-donde-txt">
          <b>{conValor(unidad.areaNombre) && unidad.areaNombre !== 'Sin área' ? unidad.areaNombre : 'Última ubicación'}</b>
          <small>{detalle || 'Sin posición todavía'}</small>
        </span>
        <span className={`mvu-chip ${tonoEstado}`}>
          <Punto tono={tonoEstado} activo={estado === 'marcha'} />
          <span className="mvu-chip-txt">{estado === 'sin-senal' ? textoSinSenal(unidad.ultimoReporte, ahora) : estado === 'marcha' ? 'En marcha' : 'Detenido'}</span>
        </span>
      </div>
      <div className="mvu-casillas">
        <Casilla icono="odo" valor={unidad.km == null ? '—' : f.numero(Math.round(unidad.km))} unidad={unidad.km == null ? '' : 'km'} etiqueta="Odómetro" />
        <Casilla icono="escudo" valor={indice?.valor == null ? '—' : String(Math.round(indice.valor))} unidad={indice?.valor == null ? '' : '/100'} etiqueta="Índice de manejo" tono={indice?.tono ?? ''} />
        <Casilla icono="llave" valor={pendientes == null ? '—' : String(pendientes)} unidad={pendientes == null ? '' : 'pend.'} etiqueta="Mantenimiento" tono={pendientes ? 'aviso' : ''} />
      </div>
      <div className="mvu-accion">
        <span className="mvu-accion-cifra">
          <b>{inspeccion?.total ? inspeccion.hechos : '—'}{inspeccion?.total ? <small>/{inspeccion.total}</small> : null}</b>
          <small className="k">Inspección de hoy</small>
        </span>
        <Link className="mvu-boton-azul" to="/panel/inspeccion"
          aria-label={hecha ? 'Ver el resultado de la inspección de hoy' : 'Iniciar la inspección de hoy'}>
          {hecha ? 'Ver resultado' : 'Iniciar inspección'}
          <span className="mvu-boton-flecha"><IconoApp nombre="flecha" tam={18} grosor={2.2} /></span>
        </Link>
      </div>
    </div>
  )
}

/** TELEMETRÍA: lo que llega del GPS ahora mismo, en una lista. */
function Telemetria({ unidad, vivo }) {
  const filas = [
    { k: 'Temp. motor', v: unidad.tempMotorC == null ? '—' : String(unidad.tempMotorC), u: unidad.tempMotorC == null ? '' : '°C',
      tono: unidad.tempMotorC >= 105 ? 'peligro' : unidad.tempMotorC >= 98 ? 'aviso' : '' },
    { k: 'Marcha', v: conValor(unidad.caja) ?? '—' },
    { k: 'Placa', v: conValor(unidad.placa) ?? '—' },
  ]
  return (
    <section className="mvu-sec" aria-label="Telemetría">
      <div className="mvu-sec-tit">
        <span className="mvu-overline">Telemetría</span>
        {vivo && vivo.tipo !== 'sin-senal' && <MarcaVivo vivo={vivo} chip />}
      </div>
      <dl className="mvu-lista">
        {filas.map((x) => (
          <div key={x.k}><dt>{x.k}</dt><dd className={x.tono}>{x.v}{x.u && <small>{x.u}</small>}</dd></div>
        ))}
      </dl>
    </section>
  )
}

/** Lo que queda fijo arriba al desplazar la hoja: miniatura, nombre, lo de hoy y la velocidad. */
function Compacta({ unidad, velocidad, enMarcha, hoy }) {
  const delDia = hoy.km == null && hoy.minutos == null
    ? 'Sin recorrido de hoy'
    : `${hoy.km == null ? '—' : `${textoKm(hoy.km)} km`} hoy · ${textoTiempo(hoy.minutos)} en marcha`
  return (
    <span className="mvu-compacta">
      <span className="mvu-miniatura"><FotoSinFondo unidad={unidad} ancho={86} /></span>
      <span className="mvu-f-txt">
        <b>{[marcaModelo(unidad), etiquetaCorta(unidad)].filter(Boolean).join(' · ')}</b>
        <small>{delDia}</small>
      </span>
      <span className={`mvu-f-vel chico ${tonoVelocidad(enMarcha ? velocidad : 0)}`}><b>{velocidad == null ? '—' : f.numero(Math.round(velocidad))}</b><small>km/h</small></span>
    </span>
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

/* ---------------------------------- Pantalla ---------------------------------- */

/** Las tonalidades del índice de la casilla (las de la pastilla de manejo). */
const TONO_CALIFICACION = { green: 'exito', yellow: 'aviso', red: 'peligro' }
/** El día entero se vuelve a pedir cada 5 minutos: la cifra de km no cambia de un minuto a otro. */
const CINCO_MINUTOS = 5 * 60_000

/**
 * La unidad que se usa por PIN, con su última posición encima (como hace
 * MiUnidad con la asignada): dónde está, a qué velocidad y si transmite.
 */
function conUltimoPunto(ficha, recorrido, ahora) {
  if (!ficha) return null
  const p = (recorrido ?? []).at(-1)
  if (!p || (ficha.ultimoReporte && Date.parse(p.hora) <= Date.parse(ficha.ultimoReporte))) return conSenalAlDia(ficha, ahora)
  const v = p.velocidadKmh ?? null
  return conSenalAlDia({
    ...ficha,
    recorrido,
    lat: p.lat,
    lng: p.lng,
    ultimoReporte: p.hora,
    velocidadKmh: v,
    estadoMarcha: v == null ? null : v > 0 ? 'en_marcha' : 'parada',
    conectado: transmitiendo(p.hora),
    conexion: transmitiendo(p.hora) ? 'reportando' : 'sin_senal',
  }, ahora)
}

/**
 * Lo pinta MiUnidad en el teléfono con los datos que ya leyó de la unidad
 * asignada. Aquí se pide lo propio de esta pantalla: el día (km, tiempo en
 * marcha y la cola), el índice, la inspección de hoy y, si hay una sesión por
 * PIN abierta, la unidad que se está usando.
 */
export default function MiUnidadMovil({ perfil, unidad: asignada, enMapa: enMapaAsignada, cargando, error, alReintentar, posicionVieja, ahora }) {
  const movil = useMovil()
  const sinLeer = movil?.sinLeer ?? 0

  // ¿Usa otra unidad por PIN? Entonces Mi unidad es ESA (como la app, con «USANDO … · PIN»).
  const sesionPin = useDatos(() => repo.otraUnidad.sesionActual().catch(() => null), [perfil?.userId, perfil?.empresaId], 60_000)
  const idPin = sesionPin.datos?.rol === 'secundario' && sesionPin.datos.vehiculoId && sesionPin.datos.vehiculoId !== asignada?.id
    ? sesionPin.datos.vehiculoId
    : null
  const fichaPin = useDatos(() => (idPin ? repo.vehiculos.obtener(idPin) : Promise.resolve(null)), [idPin])
  const vivoPin = useDatos(async () => ({ id: idPin, recorrido: idPin ? await repo.recorrido(idPin) : [] }), [idPin], 30_000)
  const conPin = Boolean(idPin && fichaPin.datos?.id === idPin)
  const unidadPin = useMemo(
    () => (conPin ? conUltimoPunto(fichaPin.datos, vivoPin.datos?.id === idPin ? vivoPin.datos.recorrido : null, ahora) : null),
    [conPin, fichaPin.datos, vivoPin.datos, idPin, ahora],
  )
  const unidad = unidadPin ?? asignada
  const enMapa = useMemo(() => {
    if (!unidadPin) return enMapaAsignada
    return Number.isFinite(unidadPin.lat) && Number.isFinite(unidadPin.lng) ? [unidadPin] : []
  }, [unidadPin, enMapaAsignada])
  const lecturaVieja = unidadPin ? vivoPin.estado === 'error' : posicionVieja
  const id = unidad?.id ?? null

  // HOY: las posiciones del día con el análisis del supervisor. Si el servidor no deja leerlas, «—».
  const dia = useDatos(
    async () => ({ id, puntos: id ? (await repo.recorridoDetallado(id, { horas: horasDeHoy() })).puntos : [] }),
    [id],
    CINCO_MINUTOS,
  )
  const puntosDia = dia.datos?.id === id ? dia.datos.puntos : null
  const hoy = useMemo(() => (puntosDia ? resumenDeHoy(puntosDia) : { km: null, minutos: null }), [puntosDia])
  // La cola: sus últimos minutos de camino, hasta el último punto conocido.
  const cola = useMemo(() => (puntosDia ? colaReciente(puntosDia).puntos : []), [puntosDia])

  // El índice de los últimos 7 días (la misma lectura que la tarjeta de abajo).
  const manejo = useDatos(() => repo.manejo.miScore({ dias: DIAS_MANEJO[0] }), [perfil?.id, perfil?.empresaId])
  const calificacion = manejo.datos ? calificacionManejo(manejo.datos) : 'unavailable'
  const indice = calificacion !== 'unavailable' ? { valor: manejo.datos.indice ?? null, tono: TONO_CALIFICACION[calificacion] ?? '' } : null

  // La inspección de hoy: los puntos de la plantilla de la unidad y si ya está hecha.
  const inspeccion = useDatos(async () => {
    if (!unidad?.id) return null
    const datos = repo.inspeccionConductor
    const [diaria, plantilla] = await Promise.all([
      datos.diariaDeHoy(unidad.id, { empresaId: perfil?.empresaId ?? null }).catch(() => null),
      datos.plantilla(unidad).catch(() => null),
    ])
    const total = plantilla ? plantilla.categorias.reduce((n, c) => n + c.items.length, 0) : 0
    const hecha = diaria?.estado === 'hecha'
    return { id: unidad.id, hecha, total: total || null, hechos: hecha ? total : 0 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidad?.id, perfil?.empresaId])
  const inspeccionHoy = inspeccion.datos?.id === unidad?.id ? inspeccion.datos : null

  // Mantenimiento pendiente: sus órdenes abiertas o en taller.
  const pendientes = unidad?.odts ? unidad.odts.filter((o) => o.estado === 'abierta' || o.estado === 'en_revision').length : null

  // Dónde queda el borde de la hoja: el mapa se sube para que la unidad quede en medio de lo que se ve.
  const [borde, setBorde] = useState(null)
  const [altoMapa, setAltoMapa] = useState(0)
  const mapaRef = useRef(null)
  useLayoutEffect(() => {
    const el = mapaRef.current?.parentElement
    if (!el) return undefined
    const medir = () => setAltoMapa(el.clientHeight)
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  const ENCABEZADO = 64
  const corrimiento = borde != null && altoMapa > 0 ? Math.min(0, Math.round((ENCABEZADO + borde) / 2 - altoMapa / 2)) : 0

  const estado = unidad ? estadoApp(unidad) : null
  const enMarcha = estado === 'marcha'
  const sinSenal = estado === 'sin-senal'
  const hayLectura = Boolean(unidad?.ultimoReporte)
  const velocidad = unidad?.velocidadKmh ?? null
  const vivo = hayLectura && lecturaVieja
    ? { tipo: 'sin-conexion', hora: horaCorta(unidad.ultimoReporte) }
    : sinSenal ? { tipo: 'sin-senal' } : hayLectura ? { tipo: 'vivo' } : null

  const sinUnidad = cargando || error || !unidad
  let vacio = null
  if (sinUnidad) {
    vacio = cargando ? (
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
  }

  return (
    <div className="mvu">
      {/* El mapa: la unidad y la cola de sus últimos minutos, subido para que la unidad
          quede en medio de lo que se ve entre el encabezado y la hoja. */}
      <div className="mvu-mapa">
        <div ref={mapaRef} className="mvu-mapa-lienzo" style={{ top: corrimiento, height: altoMapa || '100%', '--mvu-corrimiento': `${-corrimiento}px` }}>
          <Mapa vehiculos={enMapa} cola={cola.length > 1 ? cola : null} alto="100%" leyenda={false} ficha={false} pildoraVista />
        </div>
        {/* Uso temporal por PIN: se ve de un vistazo qué unidad conduces. */}
        {unidadPin && <span className="mvu-pin" role="status">{`USANDO ${etiquetaCorta(unidadPin)} · PIN`}</span>}
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

      {sinUnidad ? (
        <>
          {/* Emergencia: el SOS sobre el mapa, con aire por encima del aviso. */}
          <BotonSos usuarioId={perfil?.userId ?? null} />
          <div className="mvu-sin-unidad">
            {vacio}
            {/* Tu manejo no depende de tener unidad hoy. */}
            <ManejoAnillo key={`${perfil?.id}:${perfil?.empresaId}`} />
          </div>
        </>
      ) : (
        <HojaUnidad
          alBorde={setBorde}
          sos={<BotonSos usuarioId={perfil?.userId ?? null} />}
          franja={<Franja unidad={unidad} velocidad={velocidad} enMarcha={enMarcha} vivo={vivo} hoy={hoy} />}
          foto={<FotoSinFondo unidad={unidad} ancho={220} className="mvu-foto" />}
          resumen={<Resumen unidad={unidad} estado={estado} ahora={ahora} indice={indice} pendientes={pendientes} inspeccion={inspeccionHoy} />}
          resto={
            <>
              <Telemetria unidad={unidad} vivo={vivo} />
              {/* TU MANEJO: el mismo índice que en Mi perfil. */}
              <div className="mvu-sec"><ManejoAnillo key={`${perfil?.id}:${perfil?.empresaId}`} /></div>
            </>
          }
          compacta={<Compacta unidad={unidad} velocidad={velocidad} enMarcha={enMarcha} hoy={hoy} />}
        />
      )}
    </div>
  )
}
