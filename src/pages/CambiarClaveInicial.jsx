import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { completarCambioInicial } from '../panel/auth'
import { useSesion } from '../panel/useSesion'

export default function CambiarClaveInicial() {
  const navegar = useNavigate()
  const sesion = useSesion()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    document.title = 'Cambia tu contraseña — FOM'
    return () => { document.title = 'FOM — Control total de tu flota' }
  }, [])

  if (sesion === undefined) {
    return <div className="pnl-cargando-sesion" role="status">Comprobando tu sesión…</div>
  }
  if (!sesion) return <Navigate to="/entrar" replace />
  if (!sesion.debeCambiarClave) return <Navigate to="/panel" replace />

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    if (nueva.length < 16) {
      setError('La nueva contraseña debe tener al menos 16 caracteres.')
      return
    }
    if (nueva !== repetida) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (actual === nueva) {
      setError('La nueva contraseña debe ser diferente de la temporal.')
      return
    }
    setGuardando(true)
    const resultado = await completarCambioInicial({ claveActual: actual, claveNueva: nueva })
    if (resultado.ok) {
      navegar('/entrar', {
        replace: true,
        state: { aviso: 'Contraseña cambiada. Entra de nuevo con tu contraseña nueva.' },
      })
    }
    else {
      setError(resultado.error)
      setGuardando(false)
    }
  }

  return (
    <main className="lg-escena" id="contenido">
      <section className="lg-arte">
        <div className="lg-arte-centro">
          <p className="lg-marca">FOM</p>
          <p className="lg-tagline">Protege tu cuenta antes de continuar</p>
        </div>
      </section>
      <section className="lg-form">
        <div className="lg-form-caja">
          <div className="lg-tarjeta">
            <h1>Cambia tu contraseña</h1>
            <p className="lg-sub">La clave temporal solo sirve para este primer ingreso.</p>
            <form onSubmit={enviar} noValidate>
              <label className="lg-campo">
                <span>Contraseña temporal</span>
                <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" required />
              </label>
              <label className="lg-campo">
                <span>Nueva contraseña</span>
                <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" minLength={16} required />
              </label>
              <label className="lg-campo">
                <span>Repite la nueva contraseña</span>
                <input type="password" value={repetida} onChange={(e) => setRepetida(e.target.value)} autoComplete="new-password" minLength={16} required />
              </label>
              {error && <div className="lg-error" role="alert">{error}</div>}
              <button type="submit" className="lg-cta" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Cambiar y volver a entrar'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
