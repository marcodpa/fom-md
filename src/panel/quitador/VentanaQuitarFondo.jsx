import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { guardarRecorte } from '../datos/fotoVehiculo'
import { Modal } from '../comp/ui'
import { MB_PROGRAMA, cancelarQuitarFondo, quitarFondo } from './quitarFondo'
import './quitar-fondo.css'

// Después de subir la foto de una unidad: se le quita el fondo en el navegador y el gestor elige.
// La original YA está guardada; si esto falla, tarda demasiado o se cierra la ventana, se queda esa.
// Fases: bajando (la primera vez baja el programa) → quitando → vista → guardando → (cierra) | error.

const mbDe = (bytes) => Math.round(bytes / 1024 / 1024)

export default function VentanaQuitarFondo({ archivo, vehiculoId, n, titulo = '', alTerminar }) {
  const [fase, setFase] = useState('bajando')
  const [avance, setAvance] = useState({ llevado: 0, total: 0 })
  const [resultado, setResultado] = useState(null)
  const [vista, setVista] = useState('')
  const [error, setError] = useState('')
  const [segundos, setSegundos] = useState(0)
  const enCurso = useRef(true)
  enCurso.current = fase === 'bajando' || fase === 'quitando'

  useEffect(() => {
    let vigente = true
    quitarFondo(archivo, {
      alProgreso: (p) => {
        if (!vigente) return
        if (p.fase === 'bajando') setAvance({ llevado: p.llevado, total: p.total })
        else setFase('quitando')
      },
    }).then((r) => {
      if (!vigente) return
      setResultado(r)
      setVista(URL.createObjectURL(r.blob))
      setFase('vista')
    }).catch((e) => {
      if (!vigente) return
      setError(e.message)
      setFase('error')
    })
    return () => { vigente = false }
  }, [archivo])

  // Cerrar a medias corta el cálculo: no se gasta procesador en algo que ya nadie espera.
  useEffect(() => () => { if (enCurso.current) cancelarQuitarFondo() }, [])
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista) }, [vista])

  // Cuenta los segundos mientras calcula: en un equipo sin tarjeta gráfica puede pasar de medio minuto.
  useEffect(() => {
    if (fase !== 'quitando') return undefined
    setSegundos(0)
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [fase])

  function cerrar(sinFondo = false) {
    if (enCurso.current) cancelarQuitarFondo()
    enCurso.current = false
    alTerminar?.({ sinFondo })
  }

  async function usarSinFondo() {
    if (!resultado) return
    setFase('guardando')
    try {
      await guardarRecorte(resultado.blob, { vehiculoId, n, titulo })
      cerrar(true)
    } catch (e) {
      setError(e.message)
      setFase('error')
    }
  }

  const total = avance.total || MB_PROGRAMA * 1024 * 1024
  const porcentaje = Math.min(100, Math.round((avance.llevado / total) * 100))
  const ocupado = fase === 'guardando'

  return createPortal(
    <Modal titulo="Foto sin fondo" abierto alCerrar={() => !ocupado && cerrar(false)} ancho={560}>
      <div className="qf" aria-live="polite">
        {fase === 'bajando' && <div className="qf-carga">
          <p className="qf-titulo">Preparando la foto…</p>
          <p className="qf-nota">La primera vez baja el programa que quita el fondo ({mbDe(total)} MB). Las siguientes ya no hace falta.</p>
          <div className="qf-barra" role="progressbar" aria-label="Bajando el programa" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje}>
            <span style={{ width: `${porcentaje}%` }} />
          </div>
          <p className="qf-cifra">{mbDe(avance.llevado)} de {mbDe(total)} MB · {porcentaje} %</p>
        </div>}

        {fase === 'quitando' && <div className="qf-carga">
          <p className="qf-titulo">Quitando el fondo…</p>
          <p className="qf-nota">Se hace en este equipo; la foto no sale de aquí. Puede tardar hasta un minuto.</p>
          <div className="qf-barra indefinida" role="progressbar" aria-label="Quitando el fondo"><span /></div>
          <p className="qf-cifra">{segundos} s</p>
        </div>}

        {(fase === 'vista' || fase === 'guardando') && resultado && <>
          <div className="qf-maqueta">
            <div className="qf-franja"><b>{titulo || 'La unidad'}</b><small>Así se verá en la ficha y en «Mi unidad»</small></div>
            <img className="qf-foto" src={vista} alt={`${titulo || 'La unidad'} sin fondo`} />
          </div>
          {resultado.avisos.length > 0 && <ul className="qf-avisos" role="status">
            {resultado.avisos.map((a) => <li key={a}>{a}</li>)}
          </ul>}
          <div className="qf-acciones">
            <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => cerrar(false)}>Usar la foto normal</button>
            <button type="button" className="pnl-btn primario" disabled={ocupado} onClick={usarSinFondo}>{ocupado ? 'Guardando…' : 'Usar sin fondo'}</button>
          </div>
        </>}

        {fase === 'error' && <div className="qf-carga">
          <p className="qf-titulo">Quedó la foto normal</p>
          <p className="qf-nota" role="alert">{error} La foto que subiste ya está guardada tal cual.</p>
          <div className="qf-acciones"><button type="button" className="pnl-btn primario" onClick={() => cerrar(false)}>Entendido</button></div>
        </div>}

        {(fase === 'bajando' || fase === 'quitando') && <div className="qf-acciones">
          <button type="button" className="pnl-btn sutil" onClick={() => cerrar(false)}>Cancelar y usar la foto normal</button>
        </div>}
      </div>
    </Modal>,
    // Dentro del panel, para que herede su tema (claro u oscuro).
    document.querySelector('.pnl') || document.body,
  )
}
