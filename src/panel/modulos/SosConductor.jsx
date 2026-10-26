import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import repo from '../datos/repo'
import { claveIdempotente } from '../datos/api'
import { etiquetaEmergencia } from '../datos/repoApi'
import { miAsignacion } from '../datos/asignacion-conductor'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import { Cabecera } from '../comp/ui'
import { useVistaTelefono } from '../comp/movil-navegacion'
import Mapa from '../comp/Mapa'
import { duracionAviso, haceCuanto, validarTipoOtro } from './SosConductorReglas'
import './sos-conductor.css'

// ============================================================
// EMERGENCIA (SOS) DEL CONDUCTOR — igual que la app (T-167b)
// ------------------------------------------------------------
// Copia de `emergencia.tsx` de FOM-DRIVER: el conductor dice QUÉ pasa en dos
// toques y una línea, y el aviso sale de una vez —con su unidad y su
// ubicación— al supervisor, que lo ve en «Eventos y SOS». No hay chat: todo lo
// que hace falta para ir a ayudar tiene que caber en el propio aviso.
//
// Tres caras: pedir ayuda (el formulario), el aviso enviado (en qué va, con
// «Fue una falsa alarma» o «Ya estoy bien · terminar») y el recibo al cerrarlo.
// En el teléfono se abre con el botón rojo de Mi unidad; en la computadora,
// con «Emergencia (SOS)» del menú.
// ============================================================

/** Lo que puede estar pasando. El ícono lo dice antes que la palabra. */
const TIPOS = [
  { valor: 'accidente', texto: 'Accidente', icono: 'alertas' },
  { valor: 'mecanica', texto: 'Falla mecánica', icono: 'motor', deVehiculo: true },
  { valor: 'salud', texto: 'Salud', icono: 'personal' },
  { valor: 'seguridad', texto: 'Seguridad', icono: 'ver' },
  { valor: 'otro', texto: 'Otro', icono: 'otro' },
]

/** Tope del detalle: lo justo para que quien vaya sepa con qué se encuentra. */
const MAX_DETALLE = 200

/**
 * Cada cuánto se vuelve a mirar el aviso mientras está abierto: es como el
 * conductor se entera de que alguien se hizo cargo.
 */
const REFRESCO_SOS = 8_000

/** Trazos de tab-icon.tsx de la app que usa esta pantalla. */
const TRAZOS = {
  alertas: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  motor: <><path d="M3 12h3V9.5h5V12h2.5l4 3.5V19H4a1 1 0 0 1-1-1z" /><path d="M8 6.5h5" /><path d="M10.5 6.5v3" /></>,
  personal: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3 3 0 0 1 0 6" /><path d="M17.5 20a5.5 5.5 0 0 0-3-4.9" /></>,
  perfil: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><path d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /></>,
  ver: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  otro: <><circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none" /></>,
  flota: <><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></>,
  gps: <><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  check: <path d="M5 13l4 4L19 7" />,
  reportar: <><path d="M12 3.8 21 19.5H3z" /><path d="M12 9.5v4" /><path d="M12 16.6h.01" strokeWidth="2.6" /></>,
  sync: <><path d="M4 12a8 8 0 0 1 13.7-5.7L20 8" /><path d="M20 3v5h-5" /><path d="M20 12a8 8 0 0 1-13.7 5.7L4 16" /><path d="M4 21v-5h5" /></>,
}
export function IconoSos({ nombre, tam = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  )
}

/** Coordenadas como se dictan por radio. */
const enTexto = (c, decimales = 5) => `${c.lat.toFixed(decimales)}, ${c.lng.toFixed(decimales)}`

/** El reloj de la pantalla: «hace X» corre solo. */
function useReloj(cada = 1000) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), cada)
    return () => clearInterval(id)
  }, [cada])
  return ahora
}

/**
 * La ubicación del TELÉFONO (o de la computadora), del navegador. Arranca al
 * abrir la pantalla y no toca la red: es dónde está la persona, y es lo que más
 * importa que vaya en el aviso. Sin permiso o sin señal, el aviso sale igual.
 */
function useUbicacionPropia() {
  const [coords, setCoords] = useState(null)
  const [estado, setEstado] = useState('buscando')
  useEffect(() => {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null
    if (!geo) { setEstado('sin'); return undefined }
    let vivo = true
    geo.getCurrentPosition(
      (p) => { if (vivo) { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setEstado('ok') } },
      () => { if (vivo) setEstado('sin') },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 120_000 },
    )
    return () => { vivo = false }
  }, [])
  return { coords, estado }
}

export default function SosConductor() {
  const sesion = useSesion()
  const perfil = sesion?.perfil
  const esMovil = useVistaTelefono()
  const navegar = useNavigate()
  const ahora = useReloj()

  // La unidad es la de su asignación vigente, como en Mi unidad.
  const asignaciones = useDatos(() => repo.conductores(), [])
  const asignacion = useMemo(() => miAsignacion(perfil, asignaciones.datos ?? []), [perfil, asignaciones.datos])
  const usuarioId = asignacion?.id ?? perfil?.userId ?? null
  const vehiculoId = asignacion?.vehiculoId ?? null
  const unidad = useDatos(() => (vehiculoId ? repo.vehiculos.obtener(vehiculoId) : Promise.resolve(null)), [vehiculoId])
  const vehiculo = vehiculoId && unidad.datos?.id === vehiculoId ? unidad.datos : null
  // Dónde dice el GPS de la unidad que está el carro: UNA lectura.
  const posicion = useDatos(
    () => (vehiculoId ? repo.recorrido(vehiculoId).then((l) => l?.at(-1) ?? null).catch(() => null) : Promise.resolve(null)),
    [vehiculoId],
  )
  const coordsUnidad = posicion.datos?.lat != null ? { lat: posicion.datos.lat, lng: posicion.datos.lng } : null
  const telefono = useUbicacionPropia()

  const [emergencia, setEmergencia] = useState(null)
  const [cargando, setCargando] = useState(true)
  // ¿Se llegó a leer, al menos una vez, si hay un aviso en curso? Mientras no,
  // «sin aviso» quiere decir «no se sabe»: se sigue preguntando.
  const [cargaOk, setCargaOk] = useState(false)
  const [cierre, setCierre] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(null)

  const [tipo, setTipo] = useState(null)
  const [tipoOtro, setTipoOtro] = useState('')
  const [detalle, setDetalle] = useState('')
  const [intento, setIntento] = useState(false)
  // La clave de ESTE intento: la misma en cada reintento hasta que salga bien,
  // así un envío cortado que FOM sí recibió no crea un segundo aviso.
  const claveIntento = useRef(null)

  const listo = asignaciones.estado !== 'cargando'
  const cargar = useCallback(async () => {
    try {
      setEmergencia(await repo.sos.miEmergencia({ usuarioId }))
      setCargaOk(true)
    } catch {
      // Sin respuesta no se sabe nada nuevo: se deja lo puesto.
    }
  }, [usuarioId])

  useEffect(() => {
    if (!listo) return undefined
    let vivo = true
    cargar().finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [listo, cargar])

  const activa = (emergencia?.estado === 'activa' || emergencia?.estado === 'atendida') && !cierre
  const loMandeYo = Boolean(emergencia) && (!usuarioId || emergencia.creadorId === usuarioId || emergencia.creadorId === perfil?.id)

  // Mientras siga abierto se vuelve a mirar: así llega el «va ayuda». Con el
  // formulario en pantalla no hay nada que vigilar (salvo que nunca se leyó).
  useEffect(() => {
    if (!listo || cierre || (!activa && cargaOk)) return undefined
    const id = setInterval(() => { if (!document.hidden) cargar() }, REFRESCO_SOS)
    return () => clearInterval(id)
  }, [listo, cierre, activa, cargaOk, cargar])

  // SIN UNIDAD el aviso va solo de la PERSONA: nada del vehículo, ni su avería.
  const conUnidad = Boolean(vehiculoId)
  const tipos = conUnidad ? TIPOS : TIPOS.filter((t) => !t.deVehiculo)
  const esOtro = tipo === 'otro'
  const errorOtro = esOtro ? validarTipoOtro(tipoOtro) : null
  const faltaTipo = tipo === null
  const faltaDetalle = detalle.trim().length < 3
  const nombreUnidad = vehiculo ? etiquetaUnidad(vehiculo) : null
  // El texto de la persona manda sobre el de la unidad: el aviso es para ir a buscarla a ella.
  const ubicacionTexto = telefono.coords ? enTexto(telefono.coords) : coordsUnidad ? enTexto(coordsUnidad) : ''

  async function enviar() {
    if (ocupado) return
    if (faltaTipo || errorOtro || faltaDetalle) { setIntento(true); return }
    setError(null)
    setOcupado(true)
    claveIntento.current ??= claveIdempotente()
    try {
      const creada = await repo.sos.enviar({
        vehiculoId,
        tipo,
        tipoOtro: esOtro ? tipoOtro : undefined,
        detalle,
        ubicacionTexto,
        coords: telefono.coords ?? undefined,
        idempotencia: claveIntento.current,
      }, { usuarioId })
      claveIntento.current = null
      setEmergencia(creada)
      setCargaOk(true)
    } catch (e) {
      // Se dice y se puede reintentar: callarlo es lo peor que puede pasar aquí.
      setError(e?.message || 'No pudimos enviar el aviso. Intenta de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function cerrar(falsaAlarma) {
    if (!emergencia || ocupado) return
    setOcupado(true)
    setError(null)
    try {
      if (falsaAlarma) await repo.sos.cancelar(emergencia)
      else await repo.sos.terminar(emergencia)
      setCierre({ falsa: falsaAlarma, en: Date.now() })
    } catch (e) {
      setError(e?.message || 'No pudimos cerrar el aviso. Intenta de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  let contenido
  if (cargando) {
    contenido = (
      <div className="sos-esqueleto" aria-busy="true" aria-live="polite">
        <span className="visually-hidden">Cargando…</span>
        <i style={{ height: 112, width: 112, borderRadius: '50%', alignSelf: 'center' }} />
        <i style={{ height: 160 }} />
        <i style={{ height: 92 }} />
      </div>
    )
  } else if (cierre && emergencia) {
    // ───────────── Cerrada: el recibo ─────────────
    contenido = (
      <div className="sos-cerrada">
        <span className="sos-disco-ok"><IconoSos nombre="check" tam={40} /></span>
        <div className="sos-centro">
          <h2 className="sos-titulo">{cierre.falsa ? 'Aviso retirado' : 'Aviso cerrado'}</h2>
          <p className="sos-texto">{cierre.falsa ? 'Quedó como falsa alarma.' : 'Nos alegra que estés bien.'}</p>
        </div>
        <section className="sos-tarjeta">
          <DatoSos icono="alertas" etiqueta="Aviso" valor={etiquetaEmergencia(emergencia)} />
          <DatoSos icono="sync" etiqueta="Duró" valor={duracionAviso(emergencia.creadaEn, cierre.en)} />
          {emergencia.atendidaPor && <DatoSos icono="ver" etiqueta="Atendió" valor={emergencia.atendidaPor} />}
        </section>
        <button type="button" className="sos-boton secundario" onClick={() => navegar('/panel')}>Volver al inicio</button>
      </div>
    )
  } else if (activa && emergencia) {
    // ───────────── Enviada: qué saben los demás ─────────────
    const atendida = Boolean(emergencia.atendidaPor)
    const puntoUnidad = emergencia.coordsUnidad ?? coordsUnidad
    const enMapa = vehiculo && puntoUnidad ? [{ ...vehiculo, lat: puntoUnidad.lat, lng: puntoUnidad.lng }] : []
    const donde = emergencia.ubicacionTexto || (emergencia.coords ? enTexto(emergencia.coords) : '')
    contenido = (
      <>
        <span className="sos-activo" role="status"><i aria-hidden="true" />ACTIVO</span>
        {/* La emergencia en un solo objeto: en qué va, cuánto lleva y dónde.
            Rojo mientras nadie la toma; ámbar cuando ya va ayuda. */}
        <section className={`sos-bloque${atendida ? ' atendida' : ''}`} aria-label="Tu aviso">
          <div className="sos-franja">
            <div className="sos-fila">
              <i className={`sos-punto${atendida ? '' : ' late'}`} aria-hidden="true" />
              <span className="sos-overline">{etiquetaEmergencia(emergencia)}</span>
              <span className="sos-cuanto">{haceCuanto(emergencia.creadaEn, ahora)}</span>
            </div>
            <b className="sos-estado">{atendida ? 'Ayuda en camino' : 'Aviso enviado'}</b>
            <span className="sos-texto">{atendida ? `${emergencia.atendidaPor} se hizo cargo.` : 'Tu supervisor ya lo tiene.'}</span>
          </div>
          {enMapa.length > 0 && (
            <div className="sos-mapa">
              <Mapa vehiculos={enMapa} alto="232px" leyenda={false} ficha={false} />
            </div>
          )}
        </section>

        {/* Lo que mandaste, tal como lo está leyendo quien va a ayudar. */}
        <section className="sos-tarjeta">
          <p className="sos-parte">{emergencia.detalle}</p>
          <i className="sos-divisor" aria-hidden="true" />
          <DatoSos icono={emergencia.vehiculoId ? 'flota' : 'perfil'} etiqueta="Unidad" valor={nombreUnidad ?? (emergencia.vehiculoId ? 'Tu unidad' : 'Sin unidad en sesión')} />
          <DatoSos icono="gps" etiqueta="Dónde" valor={donde || 'Sin dirección'} />
          {emergencia.coords && (
            <a className="sos-enlace" target="_blank" rel="noreferrer"
              href={`https://www.openstreetmap.org/?mlat=${emergencia.coords.lat}&mlon=${emergencia.coords.lng}#map=17/${emergencia.coords.lat}/${emergencia.coords.lng}`}>
              Ver tu punto en el mapa
            </a>
          )}
        </section>

        {error && <p className="sos-error" role="alert">{error}</p>}

        {/* Terminarlo puede quien lo mandó, una vez tomado: es quien sabe si ya
            pasó. Retirarlo, solo mientras nadie lo haya tomado. */}
        {emergencia.estado === 'atendida' && loMandeYo && (
          <button type="button" className="sos-boton primario" disabled={ocupado} aria-busy={ocupado || undefined} onClick={() => cerrar(false)}>
            {ocupado ? 'Cerrando…' : 'Ya estoy bien · terminar'}
          </button>
        )}
        {emergencia.estado === 'activa' && (
          <button type="button" className="sos-enlace-centro" disabled={ocupado} onClick={() => cerrar(true)}
            aria-label="Retirar el aviso: fue una falsa alarma">
            Fue una falsa alarma
          </button>
        )}
      </>
    )
  } else {
    // ───────────── Pedir ayuda ─────────────
    contenido = (
      <>
        <div className="sos-heroe">
          <div className="sos-disco-caja">
            <i className="sos-halo" aria-hidden="true" />
            <span className="sos-disco" aria-hidden="true">SOS</span>
          </div>
          <h2 className="sos-titulo peligro">¿Qué está pasando?</h2>
        </div>

        {/* Tipo: dos toques, sin escribir. Tocar el elegido lo quita. */}
        <div className="sos-grupo">
          <div className="sos-tipos" role="group" aria-label="Qué está pasando">
            {tipos.map((t) => {
              const on = tipo === t.valor
              return (
                <button key={t.valor} type="button" className={`sos-tipo${on ? ' on' : ''}`} aria-pressed={on}
                  onClick={() => { setTipo(on ? null : t.valor); if (on || t.valor !== 'otro') setTipoOtro('') }}>
                  <IconoSos nombre={t.icono} tam={20} />
                  <span>{t.texto}</span>
                </button>
              )
            })}
          </div>
          {intento && faltaTipo && <p className="sos-error">Elige qué está pasando.</p>}
          {esOtro && (
            <label className="sos-campo">
              <span>¿Qué tipo de emergencia?</span>
              <input value={tipoOtro} onChange={(e) => setTipoOtro(e.target.value)} placeholder="Ej. Derrame de combustible"
                maxLength={40} disabled={ocupado} name="tipoOtro" aria-invalid={Boolean((intento || tipoOtro) && errorOtro) || undefined} />
              {(intento || tipoOtro.length > 0) && errorOtro && <em>{errorOtro}</em>}
            </label>
          )}
        </div>

        {/* Detalle: lo que leerá quien vaya a ayudar. */}
        <label className="sos-campo">
          <span>Describe el problema</span>
          <textarea value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={MAX_DETALLE} disabled={ocupado} name="detalle"
            placeholder={conUnidad ? 'Ej. Volqué en la curva del km 40, estoy consciente' : 'Ej. Me quedé a pie en el km 40 y no hay paso'}
            aria-invalid={(intento && faltaDetalle) || undefined} />
          {intento && faltaDetalle && <em>Escribe qué pasa, aunque sea corto.</em>}
        </label>

        {/* Lo que va a viajar solo, sin que lo escriba. LAS DOS ubicaciones: si
            el golpe rompió el equipo del carro, la del teléfono es la única que
            queda; y si se alejó, la de la unidad dice dónde quedó el vehículo. */}
        <section className="sos-tarjeta">
          <div className="sos-auto">
            <IconoSos nombre={conUnidad ? 'flota' : 'perfil'} tam={17} />
            <span>{conUnidad ? `${nombreUnidad ?? 'Tu unidad'} · ${perfil?.nombre ?? ''}` : perfil?.nombre}</span>
          </div>
          <i className="sos-divisor" aria-hidden="true" />
          {conUnidad && (
            <FilaUbicacion icono="flota" tono="exito" etiqueta="GPS de la unidad" coords={coordsUnidad}
              respaldo={posicion.estado === 'cargando' ? 'Buscando…' : 'Sin señal del equipo'} />
          )}
          <FilaUbicacion icono="gps" tono="primario" etiqueta={esMovil ? 'Tu teléfono' : 'Tu ubicación'} coords={telefono.coords}
            respaldo={telefono.estado === 'buscando' ? 'Buscando…' : 'Sin permiso de ubicación'} />
        </section>

        {error && <p className="sos-error centro" role="alert">{error}</p>}

        <button type="button" className="sos-boton peligro" disabled={ocupado} aria-busy={ocupado || undefined} onClick={enviar}>
          <IconoSos nombre="reportar" tam={20} />{ocupado ? 'Enviando…' : 'Enviar alerta'}
        </button>
        <p className="sos-nota">Úsalo solo ante una emergencia real.</p>
      </>
    )
  }

  return (
    <div className={`sos${esMovil ? ' sos-movil' : ''}`}>
      {!esMovil && (
        <Cabecera titulo="Emergencia (SOS)" bajada="Pide ayuda: el aviso le llega a tu supervisor con tu unidad y tu ubicación." />
      )}
      <div className="sos-cuerpo">{contenido}</div>
    </div>
  )
}

/** El id de la puerta (o la placa), como `etiquetaCortaDeUnidad` de la app. */
function etiquetaUnidad(v) {
  const id = v?.numero && v.numero !== '—' ? v.numero.toUpperCase() : null
  return id ?? (v?.placa && v.placa !== '—' ? v.placa : v?.alias ?? 'Tu unidad')
}

/** Una línea de la ficha: ícono, qué es y su valor (DatoSOS de la app). */
function DatoSos({ icono, etiqueta, valor }) {
  return (
    <div className="sos-dato">
      <IconoSos nombre={icono} tam={17} />
      <span className="sos-dato-k">{etiqueta}</span>
      <span className="sos-dato-v">{valor}</span>
    </div>
  )
}

/** Una de las dos ubicaciones del aviso, con su chip de LISTO. */
function FilaUbicacion({ icono, tono, etiqueta, coords, respaldo }) {
  return (
    <div className={`sos-ubicacion ${tono}${coords ? ' lista' : ''}`}>
      <IconoSos nombre={icono} tam={19} />
      <span className="sos-ubicacion-txt">
        <small>{etiqueta}</small>
        <span>{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : respaldo}</span>
      </span>
      {coords && <span className="sos-listo"><i aria-hidden="true" />LISTO</span>}
    </div>
  )
}

/**
 * EL BOTÓN SOS de Mi unidad en el teléfono: rojo, flotando sobre el mapa y
 * latiendo despacio para que se encuentre sin mirar. Con un aviso abierto
 * enseña un punto que late en vez de «SOS» y lleva a su estado.
 */
export function BotonSos({ usuarioId = null }) {
  const aviso = useDatos(() => repo.sos.miEmergencia({ usuarioId }).catch(() => null), [usuarioId])
  const activa = aviso.datos?.estado === 'activa' || aviso.datos?.estado === 'atendida'
  return (
    <Link to="/panel/sos" className="sos-fab" aria-label={activa ? 'Emergencia activa: ver estado' : 'Pedir ayuda de emergencia (SOS)'}>
      {activa ? <i className="sos-fab-punto" aria-hidden="true" /> : <span aria-hidden="true">SOS</span>}
    </Link>
  )
}
