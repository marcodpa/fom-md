import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Mapa from '../comp/Mapa'
import { HAY_MAPBOX } from '../comp/MapaMapbox'
import { enlaceEventoEnMapa } from '../datos/eventosManejo'
import { useFotoSinFondo } from '../datos/fotoVehiculo'
import { fotoSinFondo } from '../datos/fotoSinFondo'
import { colaReciente } from '../datos/recorrido'
import { horasDeHoy, partesTiempo, resumenDeHoy, textoKm, textoTiempo } from '../datos/recorridoHoy'
import { conSenalAlDia, estadoSenal, haceCuanto } from '../datos/sinSenal'
import { etiqueta } from '../datos/catalogos'
import * as f from '../datos/formato'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import '../../styles/mi-unidad-movil.css'
import '../../styles/vehiculos-movil.css'

// ============================================================
// LA FICHA DE UNA UNIDAD EN EL TELÉFONO (T-190) — ficha-unidad-vista.tsx de la app
// ------------------------------------------------------------
// Arriba DÓNDE ESTÁ: el mapa con la unidad y la línea azul de sus últimos
// minutos, la zona, las coordenadas y la hora, y las acciones de siempre (ver el
// recorrido, ver el manejo brusco, la llegada). Debajo, con el estilo aprobado
// de «Mi unidad», la franja oscura con la unidad, su velocidad y lo de hoy, la
// foto sin fondo montada y la hoja «Resumen» con sus cuatro cifras.
// ============================================================

/** Un dato que el servidor manda con «—» cuando no lo tiene: aquí cuenta como vacío. */
const conValor = (t) => (t && String(t).trim() !== '—' ? String(t).trim() : null)

/** Color de la velocidad: parada gris, normal verde, rápido ámbar, excesivo rojo. */
function tonoVelocidad(kmh) {
  if (!(kmh > 0)) return 'apagado'
  if (kmh >= 100) return 'peligro'
  if (kmh >= 80) return 'aviso'
  return 'exito'
}

/** El tono de la pastilla con la regla única (estadoSenal): verde con señal, ámbar sin ubicación, gris callada. */
const tonoSenal = (s) => (s.clave === 'reportando' ? 'exito' : s.clave === 'sin_ubicacion' ? 'aviso' : 'apagado')

const TRAZOS = {
  camion: <><path d="M3 6h11v10H3z" /><path d="M14 9h4l3 3v4h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  ruta: <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16" /></>,
  manejo: <><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" /><path d="M12 12l4-3" /><path d="M12 12h.01" /></>,
  bandera: <><path d="M4 21V4" /><path d="M4 4h12l-2 4 2 4H4" /></>,
  ampliar: <><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></>,
}
function IconoApp({ nombre, tam = 20, grosor = 1.9 }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  )
}

/**
 * Lo que la ficha necesita de HOY: las posiciones del día (km, tiempo en
 * marcha y la cola de los últimos minutos) y la unidad con su último punto
 * encima, para que el mapa y la franja digan lo mismo. Solo en el teléfono.
 */
export function useHoyDeUnidad(v, ahora, activo) {
  const id = activo ? v?.id ?? null : null
  const dia = useDatos(
    async () => ({ id, puntos: id ? (await repo.recorridoDetallado(id, { horas: horasDeHoy() })).puntos : [] }),
    [id],
    60_000,
  )
  const puntos = dia.datos?.id === id ? dia.datos.puntos : null
  return useMemo(() => {
    const hoy = puntos ? resumenDeHoy(puntos) : { km: null, minutos: null }
    const cola = puntos ? colaReciente(puntos).puntos : []
    let unidad = v ? conSenalAlDia(v, ahora) : null
    const p = puntos?.at(-1)
    // El último punto del día, si LLEGÓ después de la última posición que trajo la ficha (hora de
    // recepción, como `lastPositionAt`). Solo completa posición y velocidad; la señal la decide estadoSenal.
    const llego = p ? p.recibido ?? p.hora : null
    if (unidad && p && (!unidad.posicionEn || Date.parse(llego) > Date.parse(unidad.posicionEn))) {
      const masNueva = !unidad.ultimoReporte || Date.parse(llego) > Date.parse(unidad.ultimoReporte)
      unidad = conSenalAlDia({
        ...unidad,
        lat: p.lat,
        lng: p.lng,
        posicionEn: llego,
        ultimoReporte: masNueva ? llego : unidad.ultimoReporte,
        velocidadKmh: p.velocidadKmh ?? null,
        // La marcha que dijo el servidor era de una lectura anterior: ahora manda la velocidad del punto.
        estadoMarcha: null,
      }, ahora)
    }
    return { hoy, cola, puntos: puntos ?? [], unidad }
  }, [puntos, v, ahora])
}

/**
 * DÓNDE ESTÁ, arriba de la ficha. «Ver recorrido» pinta el día entero en este
 * mismo mapa (y lo vuelve a quitar); el manejo brusco y la llegada se abren en
 * el mapa de la flota (Centro de control), con la unidad elegida.
 */
export function UbicacionUnidadMovil({ unidad: u, cola, puntosDia, verRecorrido, alVerRecorrido, ahora }) {
  const conPos = Number.isFinite(u.lat) && Number.isFinite(u.lng)
  const senal = estadoSenal(u, ahora)
  const coordenadas = conPos ? `${u.lat.toFixed(5)}, ${u.lng.toFixed(5)}` : null
  const detalle = [coordenadas, senal.posicionEn ? haceCuanto(senal.posicionEn, ahora) : null].filter(Boolean).join(' · ')
  const zona = conValor(u.areaNombre) && u.areaNombre !== 'Sin área' ? u.areaNombre : null
  const enMapa = conPos ? [u] : []
  const enlaceMapa = `/panel/mapa?unidad=${encodeURIComponent(u.id)}`
  return (
    <section className="fum-ubicacion" aria-label="Dónde está">
      <div className="fum-mapa">
        <Mapa vehiculos={enMapa} alto="100%" leyenda={false} ficha={false} estelaFom
          cola={!verRecorrido && cola.length > 1 ? cola : null} recorrido={verRecorrido && puntosDia.length > 1 ? puntosDia : null} />
        {/* El marcador del mapa ya dice quién es y cómo va; sin posición, se dice. */}
        {!conPos && <span className="fum-sin-pos">Sin posición del GPS por ahora</span>}
        <Link className="fum-ampliar" to={enlaceMapa} aria-label="Ver en el mapa completo"><IconoApp nombre="ampliar" tam={18} grosor={2} /></Link>
      </div>
      <div className="fum-cuerpo">
        <div className="fum-donde">
          <span className="fum-donde-ico"><IconoApp nombre="pin" /></span>
          <span className="fum-donde-txt">
            <b>{zona ?? 'Última ubicación'}</b>
            <small>{detalle || 'Sin posición todavía'}</small>
          </span>
          <span className={`fum-chip ${tonoSenal(senal)}`}>
            <i className={`vm-punto${senal.marcha === 'en_marcha' ? ' late' : ''}`} aria-hidden="true" />
            <span>{senal.texto}</span>
          </span>
        </div>
        <div className="fum-acciones">
          <button type="button" className={`fum-boton ${verRecorrido ? 'borde on' : 'primario'}`} aria-pressed={verRecorrido} onClick={alVerRecorrido}>
            <IconoApp nombre="ruta" tam={17} grosor={2} />{verRecorrido ? 'Ocultar recorrido' : 'Ver recorrido'}
          </button>
          <Link className="fum-boton borde" to={enlaceEventoEnMapa({ vehiculoId: u.id })}>
            <IconoApp nombre="manejo" tam={17} grosor={2} />Ver manejo brusco
          </Link>
        </div>
        {HAY_MAPBOX && (
          <Link className="fum-boton solo" to={enlaceMapa} title="Abre el mapa con la unidad para calcular cuánto tarda en llegar a un destino">
            <IconoApp nombre="bandera" tam={17} grosor={2} />Llegada
          </Link>
        )}
      </div>
    </section>
  )
}

/**
 * LA FRANJA con la foto montada y la hoja «Resumen». En la hoja van las cuatro
 * cifras de la web (`children`), con sus enlaces y «Corregir el odómetro».
 */
export function FranjaFichaMovil({ unidad: u, hoy, ahora = Date.now(), children }) {
  // La regla única: velocidad solo con señal al día; si no, «—» (nunca un 0 viejo).
  const senal = estadoSenal(u, ahora)
  const vel = senal.marcha === 'en_marcha' ? senal.velocidadKmh ?? 0 : 0
  const tiempo = partesTiempo(hoy.minutos)
  const titulo = [`${conValor(u.marca) ?? ''} ${conValor(u.modelo) ?? ''}`.trim(), u.anio].filter(Boolean).join(' · ')
  const numero = conValor(u.numero)?.toUpperCase()
  const identidad = [numero, conValor(u.placa) !== numero ? conValor(u.placa) : null, etiqueta('vehiculo_tipo', u.tipo)].filter(Boolean).join(' · ')
  const foto = useFotoSinFondo(u, fotoSinFondo, { ancho: 630 })
  const nombre = `${conValor(u.marca) ?? ''} ${conValor(u.modelo) ?? ''}`.trim() || 'la unidad'
  const marca = senal.clave === 'reportando' ? { t: 'En vivo', tono: 'exito' } : { t: senal.etiqueta, tono: tonoSenal(senal) }
  return (
    <section className="fum-unidad mvu-tonos" aria-label={titulo || u.alias}>
      <div className="fum-franja">
        <span className="mvu-f-fila">
          <span className="mvu-f-id">
            <span className="mvu-f-ico"><IconoApp nombre="camion" grosor={2} /></span>
            <span className="mvu-f-txt">
              <b>{titulo || u.alias || 'Unidad'}</b>
              <small>{identidad}</small>
            </span>
          </span>
          <span className="mvu-f-vel">
            <span className={tonoVelocidad(vel)}><b>{senal.marcha ? f.numero(Math.round(vel)) : '—'}</b><small>km/h</small></span>
            {marca && <span className={`mvu-vivo ${marca.tono}`}><i className={`vm-punto${marca.tono === 'exito' ? ' late' : ''}`} aria-hidden="true" />{marca.t}</span>}
          </span>
        </span>
        <span className="mvu-f-cifras">
          <span><b>{textoKm(hoy.km)}{hoy.km != null && <small>km</small>}</b><small className="k">Recorrido hoy</small></span>
          <span><b>{tiempo.cifra}{tiempo.unidad && <small>{tiempo.unidad}</small>}</b><small className="k">En marcha hoy</small></span>
        </span>
      </div>
      <div className="fum-hoja">
        <h2>Resumen</h2>
        {children}
      </div>
      {foto.url && <img className="fum-foto" src={foto.url} width="182" height="114"
        alt={foto.silueta ? `Silueta de ${nombre}` : nombre} />}
    </section>
  )
}

/** «Hoy lleva 42,6 km en 1 h 18 min de marcha. Última posición hace 3 min.» */
export function textoRecorridoHoy(hoy, unidad, ahora = Date.now()) {
  const ultima = unidad?.posicionEn ? ` Última posición ${haceCuanto(unidad.posicionEn, ahora)}.` : ''
  if (hoy.km == null && hoy.minutos == null) {
    return (Number.isFinite(unidad?.lat) ? 'Todavía no hay recorrido de hoy.' : 'Sin posición del GPS por ahora.') + ultima
  }
  return `Hoy lleva ${hoy.km == null ? '—' : `${textoKm(hoy.km)} km`} en ${textoTiempo(hoy.minutos)} de marcha.${ultima}`
}
