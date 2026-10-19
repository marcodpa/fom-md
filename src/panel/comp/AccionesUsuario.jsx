import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** Acciones de una cuenta fuera del contenedor desplazable de la tabla. */
export default function AccionesUsuario({ nombre, children }) {
  const [abierto, setAbierto] = useState(false)
  const [posicion, setPosicion] = useState({})
  const boton = useRef(null)
  const panel = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!abierto) return undefined
    const cuadro = requestAnimationFrame(() => {
      const caja = boton.current.getBoundingClientRect()
      const alto = panel.current?.offsetHeight ?? 180
      setPosicion({
        left: Math.max(12, Math.min(caja.right - 220, window.innerWidth - 232)),
        top: Math.max(12, caja.bottom + alto + 12 < window.innerHeight ? caja.bottom + 8 : caja.top - alto - 8),
      })
      panel.current?.querySelector('button')?.focus()
    })
    const fuera = e => {
      if (!panel.current?.contains(e.target) && !boton.current?.contains(e.target)) setAbierto(false)
    }
    const cerrar = e => {
      if (e.key === 'Escape') { setAbierto(false); boton.current?.focus() }
    }
    const recolocar = () => setAbierto(false)
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', cerrar)
    window.addEventListener('resize', recolocar)
    window.addEventListener('scroll', recolocar, true)
    return () => {
      cancelAnimationFrame(cuadro)
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', cerrar)
      window.removeEventListener('resize', recolocar)
      window.removeEventListener('scroll', recolocar, true)
    }
  }, [abierto])

  return <>
    <button ref={boton} type="button" className="pnl-btn usr-mas"
      aria-label={`Acciones de ${nombre}`} aria-haspopup="dialog" aria-expanded={abierto}
      aria-controls={abierto ? id : undefined} onClick={() => setAbierto(v => !v)}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor">
        <circle cx="9" cy="3" r="1.5" /><circle cx="9" cy="9" r="1.5" /><circle cx="9" cy="15" r="1.5" />
      </svg>
    </button>
    {abierto && createPortal(
      <div ref={panel} id={id} role="dialog" aria-label={`Acciones de ${nombre}`}
        className="usr-acciones-pop" style={posicion} onClick={e => {
          if (e.target.closest('button')) { setAbierto(false); boton.current?.focus() }
        }}>
        {children}
      </div>, boton.current?.closest('.pnl') || document.body
    )}
  </>
}
