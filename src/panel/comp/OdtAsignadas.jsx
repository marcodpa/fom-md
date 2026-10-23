import { useEffect, useMemo, useRef, useState } from 'react'
import { useDatos } from '../useDatos'
import { Campo, ErrorCarga, Tag, Tarjeta } from './ui'
import { Icono } from '../Iconos'
import { etiqueta } from '../datos/catalogos'
import TarjetaMantenimiento from './TarjetaMantenimiento'
import { rolCanonico } from '../roles'
import { ESTADOS_DE_TALLER, MOMENTOS, accionesDe, listarAsignadas, registrarEvento, textoTiempo } from '../datos/odtAsignadas'
import { useVistaTelefono } from './movil-navegacion'
// El punto que late del reloj vive aquí: el supervisor en el teléfono también lo ve.
import '../../styles/mantenimiento-movil.css'

// ============================================================
// «ASIGNADAS A TI» — las ODT que la persona de la sesión tiene a su cargo.
// Igual que en la app: Iniciar trabajo, Pausar, Reanudar y Entregar, con el
// tiempo trabajado. Va arriba en Mantenimiento (supervisor y conductor) y no
// aparece si no tiene ninguna o si el servidor no se lo deja ver.
// ============================================================

const COLOR_MOMENTO = { asignada: 'gris', en_ejecucion: 'verde', pausada: 'ambar', en_calidad: 'azul' }
// El aviso «Trabajo iniciado…» se va solo, como el «Guardado» del perfil.
const AVISO_MS = 4000

/** «1:05:23», como `formatoReloj` de la app: horas sin tope, minutos y segundos con dos cifras. */
export function formatoReloj(segundos) {
  const s = Math.max(0, Math.floor(Number(segundos) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** «U-001 · Z69FC7W»: el número de puerta y la placa, como `vehicleLabel` de la app. */
function identidadDe(unidad) {
  const numero = unidad?.numero && unidad.numero !== '—' ? unidad.numero.toUpperCase() : null
  const placa = unidad?.placa && unidad.placa !== '—' ? unidad.placa : null
  return [numero, placa].filter(Boolean).join(' · ')
}

/**
 * - `unidad`: la unidad del conductor (opcional). En el teléfono, la tarjeta de
 *   una orden de esa unidad la nombra «U-001 · placa», como la app.
 */
export default function OdtAsignadas({ odts, perfil, alCambiar, alAbrir, unidad = null }) {
  const esConductor = rolCanonico(perfil?.rol) === 'conductor'
  // En el teléfono, la sección de la app (odt-asignada-seccion.tsx): su bajada,
  // el título de la orden, «Sin iniciar» y el reloj «0:00:00».
  const movil = useVistaTelefono()
  // Se vuelve a preguntar solo si cambia alguna orden en taller (no por cada refresco de la lista).
  const clave = useMemo(
    () => (odts ?? []).filter((o) => ESTADOS_DE_TALLER.includes(o.estado)).map((o) => `${o.id}:${o.estado}`).join(','),
    [odts],
  )
  const odtsRef = useRef(odts)
  odtsRef.current = odts
  const lectura = useDatos(() => listarAsignadas({ odts: odtsRef.current ?? [], perfil }), [clave, perfil?.id, perfil?.correo])
  const [aviso, setAviso] = useState('')
  const items = lectura.datos ?? []
  // La tarjeta se abre solo si la orden está en la lista de la pantalla (el detalle se abre desde ahí).
  const conocidas = useMemo(() => new Set((odts ?? []).map((o) => o.id)), [odts])

  useEffect(() => {
    if (!aviso) return undefined
    const t = setTimeout(() => setAviso(''), AVISO_MS)
    return () => clearTimeout(t)
  }, [aviso])

  if (lectura.estado === 'error') {
    return (
      <Tarjeta titulo="Asignadas a ti">
        <ErrorCarga compacto error={lectura.error} onReintentar={lectura.recargar} />
      </Tarjeta>
    )
  }
  // Sin órdenes a su cargo (o sin permiso para verlas): la sección no aparece.
  if (!lectura.datos || items.length === 0) return null

  async function despues(texto) {
    setAviso(texto)
    await Promise.all([lectura.recargar(), alCambiar?.()])
  }

  return (
    <section className="pnl-card mnt-asig" aria-labelledby="mnt-asig-titulo">
      <div className="pnl-card-cab">
        <h2 id="mnt-asig-titulo">Asignadas a ti</h2>
        <span className="mnt-asig-cuenta">
          {movil && esConductor ? 'El supervisor te asignó estas ODT. Inicia, pausa y entrega desde aquí.'
            : `${items.length} ${items.length === 1 ? 'orden a tu cargo' : 'órdenes a tu cargo'}`}
        </span>
      </div>
      {aviso && <div className="mnt-success mnt-asig-aviso" role="status"><Icono nombre="check" tam={20} />{aviso}</div>}
      <div className="mnt-asig-lista mnt-tarjetas">
        {items.map((o) => <Asignada key={o.id} item={o} alHacer={despues} alAbrir={alAbrir && conocidas.has(o.id) ? alAbrir : null}
          movil={movil} nombreUnidad={unidad && o.vehiculoId === unidad.id ? identidadDe(unidad) : ''} />)}
      </div>
    </section>
  )
}

/**
 * El tiempo trabajado de una orden. Lleva su propio reloj para que cada segundo se repinte
 * solo esto y no toda la sección; con la pestaña oculta no avanza (al volver, se pone al día).
 * Lo que el servidor midió, más lo que pasó desde entonces si sigue corriendo.
 */
function RelojTrabajo({ item, movil }) {
  const corre = item.estado === 'en_ejecucion'
  const [ahora, setAhora] = useState(() => Date.now())

  // En el teléfono el reloj lleva segundos: avanza cada segundo, como en la app.
  useEffect(() => {
    if (!corre) return undefined
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      setAhora(Date.now())
    }, movil ? 1000 : 30_000)
    return () => clearInterval(id)
  }, [corre, movil])

  // Tras recargar, `medidoEn` puede ser más nuevo que el último tic: nunca se resta.
  const segundos = item.segundos + (corre ? Math.max(0, (ahora - item.medidoEn) / 1000) : 0)

  if (!movil) {
    return (
      <dl className="mnt-asig-tiempo">
        <dt><Icono nombre="reloj" tam={16} />Tiempo trabajado</dt>
        <dd>{textoTiempo(segundos)}</dd>
      </dl>
    )
  }
  return (
    <dl className={`mnt-asig-tiempo${corre ? ' corre' : ''}`} aria-label={`Tiempo trabajado ${formatoReloj(segundos)}${corre ? ', corriendo' : ''}`}>
      <dt>
        {corre ? <i className="mnt-asig-latido" aria-hidden="true" /> : (
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h16v16H4z" /><path d="M9 9v6" /><path d="M15 9v6" />
          </svg>
        )}
        Tiempo trabajado
      </dt>
      <dd>{formatoReloj(segundos)}</dd>
    </dl>
  )
}

function Asignada({ item, alHacer, alAbrir, movil = false, nombreUnidad = '' }) {
  // El paso que pide nota (Pausar o Entregar) mientras se escribe; null si no hay ninguno abierto.
  const [pidiendo, setPidiendo] = useState(null)
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const notaRef = useRef(null)
  const momento = MOMENTOS[item.estado] ?? { t: etiqueta('odt_estado', item.estado), ayuda: '' }
  const acciones = accionesDe(item.estado)

  useEffect(() => {
    if (pidiendo) notaRef.current?.focus()
  }, [pidiendo])

  async function hacer(paso) {
    if (guardando) return
    setError('')
    if (paso.pideNota && pidiendo?.accion !== paso.accion) {
      setNota('')
      setPidiendo(paso)
      return
    }
    if (paso.pideNota && nota.trim().length < 3) {
      setError(paso.accion === 'pausa' ? 'Escribe el motivo de la pausa (al menos 3 letras).' : 'Cuenta qué se hizo (al menos 3 letras).')
      return
    }
    setGuardando(true)
    try {
      await registrarEvento(item, paso.accion, paso.pideNota ? nota : '')
      setPidiendo(null)
      setNota('')
      await alHacer(
        paso.accion === 'inicio' ? 'Trabajo iniciado. El tiempo empieza a contar.'
          : paso.accion === 'pausa' ? 'Trabajo pausado.'
            : paso.accion === 'reanudacion' ? 'Trabajo reanudado.'
              : 'Trabajo entregado. El supervisor lo revisa y lo cierra.',
      )
    } catch (e) {
      setError(e?.message || 'No pudimos guardar el cambio. Inténtalo otra vez.')
    } finally {
      setGuardando(false)
    }
  }

  // La misma tarjeta de todo Mantenimiento; debajo, en qué va el trabajo, el tiempo y los botones.
  // En el teléfono, como TarjetaOdt de la app con lo que da su lista de asignadas: de título la
  // descripción de la orden y debajo «U-001 · placa · Correctiva».
  const odt = movil
    ? { id: item.id, estado: item.estado, descripcion: item.titulo, tipoFalla: null, tipo: item.tipo === 'preventiva' ? 'preventiva' : 'correctiva', prioridad: item.prioridad, creadaEn: item.creadaEn, vehiculoNombre: nombreUnidad || item.vehiculoNombre }
    : { id: item.id, estado: item.estado, descripcion: item.titulo, tipoFalla: item.tipoFalla, prioridad: item.prioridad, creadaEn: item.creadaEn, vehiculoNombre: item.vehiculoNombre }
  return (
    <TarjetaMantenimiento odt={odt} alAbrir={alAbrir}>
      <div className="mnt-asig-fila">
        <div className="mnt-asig-copia">
          <div className="mnt-asig-tags">
            <Tag color={COLOR_MOMENTO[item.estado] ?? 'gris'} plano>{momento.t}</Tag>
          </div>
          {/* La app dice solo el momento; la ayuda larga queda para la computadora. */}
          {!movil && momento.ayuda && <p>{momento.ayuda}</p>}
        </div>
        <RelojTrabajo item={item} movil={movil} />
      </div>

      {!pidiendo && acciones.length > 0 && (
        <div className="mnt-asig-acciones" role="group" aria-label={`Acciones de la orden ${item.titulo}`}>
          {acciones.map((p) => (
            <button key={p.accion} type="button" className={`pnl-btn${p.sutil ? '' : ' primario'}`} onClick={() => hacer(p)} disabled={guardando}>
              {guardando && !p.sutil ? 'Guardando…' : p.t}
            </button>
          ))}
        </div>
      )}

      {pidiendo && (
        <div className="mnt-asig-entrega">
          <Campo
            etiqueta={pidiendo.pideNota}
            error={error}
            ayuda={pidiendo.accion === 'pausa' ? 'Queda en el historial de la orden. El tiempo deja de contar hasta que reanudes.' : 'Queda en el historial de la orden. El costo lo registra el supervisor al cerrarla.'}
          >
            <textarea
              ref={notaRef}
              className="pnl-textarea"
              rows={3}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={pidiendo.accion === 'pausa' ? 'Falta el repuesto; llega mañana.' : 'Se cambiaron las pastillas delanteras y se probó el frenado.'}
            />
          </Campo>
          <div className="mnt-asig-acciones">
            <button type="button" className="pnl-btn primario" onClick={() => hacer(pidiendo)} disabled={guardando}>
              {guardando ? 'Guardando…' : pidiendo.t}
            </button>
            <button type="button" className="pnl-btn sutil" onClick={() => { setPidiendo(null); setError('') }} disabled={guardando}>Volver</button>
          </div>
        </div>
      )}
      {error && !pidiendo && <p className="pnl-campo-error" role="alert">{error}</p>}
    </TarjetaMantenimiento>
  )
}
