import { useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Cabecera } from '../comp/ui'
import { useVistaTelefono } from '../comp/movil-navegacion'
import './otra-unidad.css'

// ============================================================
// OTRA UNIDAD CON PIN — igual que la app (T-167b)
// ------------------------------------------------------------
// Copia de `pin-unidad.tsx` de FOM-DRIVER (uso temporal por PIN, FOM-02 §4.3):
// el conductor secundario elige una de SUS unidades, da SU PIN y FOM lo
// reconoce como conductor actual, abriendo su sesión de conducción. Al dejar
// el vehículo, FOM la cierra y todo vuelve al titular.
//
// La lista es la de sus unidades como secundario: con una sola no hay nada que
// elegir y solo se pide el PIN. Quién está autorizado lo sabe FOM.
// ============================================================

/** «U-014 · AB123CD», o solo el nombre si no tiene placa. */
const nombreDe = (u) => (u.placa ? `${u.nombre} · ${u.placa}` : u.nombre)

/** El PIN tiene de 4 a 8 dígitos (la misma regla de la app antes de preguntarle a FOM). */
export function errorDePin(pin) {
  return /^\d{4,8}$/u.test(String(pin ?? '').trim()) ? null : 'El PIN tiene de 4 a 8 dígitos.'
}

export default function OtraUnidad() {
  const esMovil = useVistaTelefono()
  const unidades = useDatos(() => repo.otraUnidad.unidades(), [])
  // La sesión abierta (si ya está usando una unidad por PIN). Si no se puede
  // leer, se ofrece igual el formulario: FOM dirá si ya hay una abierta.
  const sesion = useDatos(() => repo.otraUnidad.sesionActual().catch(() => null), [])

  const [vehiculoId, setVehiculoId] = useState('')
  const [pin, setPin] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)

  const lista = unidades.datos ?? []
  // Con una sola unidad autorizada no hay elección que ofrecer: es esa.
  const unica = lista.length === 1 ? lista[0] : null
  const elegidaId = vehiculoId || unica?.vehiculoId || ''
  const activa = sesion.datos?.rol === 'secundario' ? sesion.datos : null
  const enUso = activa ? lista.find((u) => u.vehiculoId === activa.vehiculoId) ?? { nombre: 'Unidad en uso', placa: null } : null

  async function ingresar(e) {
    e.preventDefault()
    if (!elegidaId || ocupado) return
    setError(null)
    setAviso(null)
    const malo = errorDePin(pin)
    if (malo) { setError(malo); return }
    setOcupado(true)
    try {
      await repo.otraUnidad.usar(elegidaId, pin)
      setPin('')
      setAviso('Listo: ahora conduces esta unidad.')
      sesion.recargar()
    } catch (err) {
      setError(err?.message || 'No se pudo activar el PIN.')
    } finally {
      setOcupado(false)
    }
  }

  async function dejar() {
    if (ocupado) return
    setError(null)
    setAviso(null)
    setOcupado(true)
    try {
      await repo.otraUnidad.dejar()
      setAviso('Dejaste la unidad: todo vuelve a su titular.')
      sesion.recargar()
    } catch (err) {
      setError(err?.message || 'No se pudo dejar la unidad.')
    } finally {
      setOcupado(false)
    }
  }

  let contenido
  if (activa) {
    // Sesión activa: la unidad vuelve al titular al dejarla (§4.3).
    contenido = (
      <section className="ou-tarjeta">
        <span className="ou-chip"><i aria-hidden="true" />Uso temporal activo</span>
        <b className="ou-subtitulo">{nombreDe(enUso)}</b>
        {error && <p className="ou-error" role="alert">{error}</p>}
        <button type="button" className="ou-boton" disabled={ocupado} aria-busy={ocupado || undefined} onClick={dejar}>
          {ocupado ? 'Saliendo…' : 'Dejar el vehículo'}
        </button>
      </section>
    )
  } else if (unidades.estado === 'error') {
    contenido = (
      <div className="ou-vacio" role="alert">
        <b>No pudimos cargar las unidades.</b>
        <small>{unidades.error?.message || 'Revisa tu conexión e inténtalo de nuevo.'}</small>
        <button type="button" className="ou-boton secundario" onClick={unidades.recargar}>Reintentar</button>
      </div>
    )
  } else if (unidades.estado === 'cargando' || sesion.estado === 'cargando') {
    contenido = (
      <div className="ou-esqueleto" aria-busy="true" aria-live="polite">
        <span className="visually-hidden">Cargando…</span>
        <i style={{ height: 90 }} />
        <i style={{ height: 140 }} />
      </div>
    )
  } else if (lista.length === 0) {
    contenido = (
      <div className="ou-vacio">
        <b>Sin unidades autorizadas</b>
        <small>Cuando tu supervisor te autorice como conductor secundario de una unidad, podrás activarte aquí con tu PIN.</small>
      </div>
    )
  } else {
    contenido = (
      <form className="ou-tarjeta" onSubmit={ingresar} noValidate>
        {unica ? (
          <b className="ou-subtitulo">{nombreDe(unica)}</b>
        ) : (
          <label className="ou-campo">
            <span>Unidad</span>
            <select value={elegidaId} onChange={(e) => setVehiculoId(e.target.value)} disabled={ocupado} aria-label="¿Qué unidad vas a usar?">
              <option value="" disabled>Elegir unidad…</option>
              {lista.map((u) => <option key={u.vehiculoId} value={u.vehiculoId}>{nombreDe(u)}</option>)}
            </select>
          </label>
        )}
        <label className="ou-campo">
          <span>Tu PIN</span>
          <input type="password" inputMode="numeric" autoComplete="one-time-code" placeholder="••••" maxLength={8}
            value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/gu, ''))} disabled={ocupado} name="pin" />
        </label>
        {error && <p className="ou-error" role="alert">{error}</p>}
        <button type="submit" className="ou-boton" disabled={ocupado || !elegidaId} aria-busy={ocupado || undefined}>
          {ocupado ? 'Verificando…' : 'Ingresar PIN'}
        </button>
      </form>
    )
  }

  return (
    <div className={`ou${esMovil ? ' ou-movil' : ''}`}>
      {!esMovil && <Cabecera titulo="Usar otra unidad (PIN)" bajada="Actívate con tu PIN en una unidad donde eres conductor secundario." />}
      <div className="ou-cuerpo">
        {aviso && <p className="ou-aviso" role="status">{aviso}</p>}
        {contenido}
      </div>
    </div>
  )
}
