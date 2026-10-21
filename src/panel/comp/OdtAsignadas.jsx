import { useEffect, useMemo, useRef, useState } from 'react'
import { useDatos } from '../useDatos'
import { Campo, ErrorCarga, Tag, Tarjeta } from './ui'
import { Icono } from '../Iconos'
import { etiqueta } from '../datos/catalogos'
import TarjetaMantenimiento from './TarjetaMantenimiento'
import { ESTADOS_DE_TALLER, MOMENTOS, accionesDe, listarAsignadas, registrarEvento, textoTiempo } from '../datos/odtAsignadas'

// ============================================================
// «ASIGNADAS A TI» — las ODT que la persona de la sesión tiene a su cargo.
// Igual que en la app: Iniciar trabajo, Pausar, Reanudar y Entregar, con el
// tiempo trabajado. Va arriba en Mantenimiento (supervisor y conductor) y no
// aparece si no tiene ninguna o si el servidor no se lo deja ver.
// ============================================================

const COLOR_MOMENTO = { asignada: 'gris', en_ejecucion: 'verde', pausada: 'ambar', en_calidad: 'azul' }

export default function OdtAsignadas({ odts, perfil, alCambiar, alAbrir }) {
  // Se vuelve a preguntar solo si cambia alguna orden en taller (no por cada refresco de la lista).
  const clave = useMemo(
    () => (odts ?? []).filter((o) => ESTADOS_DE_TALLER.includes(o.estado)).map((o) => `${o.id}:${o.estado}`).join(','),
    [odts],
  )
  const odtsRef = useRef(odts)
  odtsRef.current = odts
  const lectura = useDatos(() => listarAsignadas({ odts: odtsRef.current ?? [], perfil }), [clave, perfil?.id, perfil?.correo])
  const [ahora, setAhora] = useState(() => Date.now())
  const [aviso, setAviso] = useState('')
  const items = lectura.datos ?? []
  // La tarjeta se abre solo si la orden está en la lista de la pantalla (el detalle se abre desde ahí).
  const conocidas = useMemo(() => new Set((odts ?? []).map((o) => o.id)), [odts])
  const corriendo = items.some((o) => o.estado === 'en_ejecucion')

  // Mientras alguien trabaja, el tiempo sigue contando en pantalla sin pedir nada al servidor.
  useEffect(() => {
    if (!corriendo) return undefined
    const id = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [corriendo])

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
    setAhora(Date.now())
    await Promise.all([lectura.recargar(), alCambiar?.()])
  }

  return (
    <section className="pnl-card mnt-asig" aria-labelledby="mnt-asig-titulo">
      <div className="pnl-card-cab">
        <h2 id="mnt-asig-titulo">Asignadas a ti</h2>
        <span className="mnt-asig-cuenta">{items.length} {items.length === 1 ? 'orden a tu cargo' : 'órdenes a tu cargo'}</span>
      </div>
      {aviso && <div className="mnt-success mnt-asig-aviso" role="status"><Icono nombre="check" tam={20} />{aviso}</div>}
      <div className="mnt-asig-lista mnt-tarjetas">
        {items.map((o) => <Asignada key={o.id} item={o} ahora={ahora} alHacer={despues} alAbrir={alAbrir && conocidas.has(o.id) ? alAbrir : null} />)}
      </div>
    </section>
  )
}

function Asignada({ item, ahora, alHacer, alAbrir }) {
  // El paso que pide nota (Pausar o Entregar) mientras se escribe; null si no hay ninguno abierto.
  const [pidiendo, setPidiendo] = useState(null)
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const notaRef = useRef(null)
  const momento = MOMENTOS[item.estado] ?? { t: etiqueta('odt_estado', item.estado), ayuda: '' }
  const acciones = accionesDe(item.estado)
  // Lo que el servidor midió, más lo que pasó desde entonces si el reloj sigue corriendo.
  const segundos = item.segundos + (item.estado === 'en_ejecucion' ? Math.max(0, (ahora - item.medidoEn) / 1000) : 0)

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
  const odt = { id: item.id, estado: item.estado, descripcion: item.titulo, tipoFalla: item.tipoFalla, prioridad: item.prioridad, creadaEn: item.creadaEn, vehiculoNombre: item.vehiculoNombre }
  return (
    <TarjetaMantenimiento odt={odt} alAbrir={alAbrir}>
      <div className="mnt-asig-fila">
        <div className="mnt-asig-copia">
          <div className="mnt-asig-tags">
            <Tag color={COLOR_MOMENTO[item.estado] ?? 'gris'} plano>{momento.t}</Tag>
          </div>
          {momento.ayuda && <p>{momento.ayuda}</p>}
        </div>
        <dl className="mnt-asig-tiempo">
          <dt><Icono nombre="reloj" tam={16} />Tiempo trabajado</dt>
          <dd>{textoTiempo(segundos)}</dd>
        </dl>
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
