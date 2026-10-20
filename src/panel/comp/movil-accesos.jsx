import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cerrarSesion, salirEmpresa } from '../auth'
import { Icono } from '../Iconos'
import { Modal } from './ui'
import { useMovil } from './movil-navegacion'
import { IconoMovil } from './movil-piezas'

/**
 * «ACCESOS» DE MI PERFIL EN EL TELÉFONO, como panel/mas.tsx de la app.
 *
 * En el teléfono no hay menú lateral: todo lo que no está en la barra de abajo
 * se abre desde aquí, y aquí se cierra sesión (con pregunta, porque no tiene
 * deshacer). En la computadora no se dibuja nada.
 */
export default function MovilAccesos() {
  const movil = useMovil()
  const [saliendo, setSaliendo] = useState(false)
  if (!movil?.esMovil) return null
  const { accesos, sinLeer, perfil } = movil

  return (
    <div className="mv-perfil-pie">
      <section className="pnl-card mv-accesos" aria-labelledby="mv-accesos-titulo">
        <h2 id="mv-accesos-titulo" className="mv-accesos-titulo">Accesos</h2>
        <ul>
          {accesos.map(a => (
            <li key={a.a}>
              <Link to={a.a} className="mv-acceso">
                <span className="mv-acceso-ico"><Icono nombre={a.icono} tam={18} /></span>
                <b>{a.texto}</b>
                {a.a === '/panel/alertas' && sinLeer > 0 && <em className="mv-acceso-globo" aria-label={`${sinLeer} sin leer`}>{sinLeer}</em>}
                <IconoMovil nombre="chevron" tam={15} />
              </Link>
            </li>
          ))}
          <li>
            <Link to="/" className="mv-acceso">
              <span className="mv-acceso-ico"><Icono nombre="volver" tam={18} /></span>
              <b>Ir al sitio</b>
              <IconoMovil nombre="chevron" tam={15} />
            </Link>
          </li>
        </ul>
      </section>

      {/* El admin FOM dentro de una empresa: volver a la vista de todas. */}
      {perfil?.empresaGestion && (
        <section className="pnl-card mv-accesos" aria-labelledby="mv-vista-titulo">
          <h2 id="mv-vista-titulo" className="mv-accesos-titulo">Cambiar de vista</h2>
          <ul>
            <li>
              <Link to="/panel/admin/empresas" className="mv-acceso" onClick={salirEmpresa}>
                <span className="mv-acceso-ico"><Icono nombre="empresa" tam={18} /></span>
                <b>Salir de {perfil.empresaGestion.nombre || 'la empresa'}</b>
                <IconoMovil nombre="chevron" tam={15} />
              </Link>
            </li>
          </ul>
        </section>
      )}

      <button type="button" className="pnl-btn mv-salir" onClick={() => setSaliendo(true)}>
        <Icono nombre="salir" tam={18} />Cerrar sesión
      </button>

      <Modal abierto={saliendo} titulo="¿Cerrar sesión?" alCerrar={() => setSaliendo(false)} ancho={420}>
        <p className="mv-salir-texto">Tendrás que volver a entrar con tu correo y tu clave.</p>
        <div className="mv-salir-acciones">
          <button type="button" className="pnl-btn sutil" onClick={() => setSaliendo(false)}>Cancelar</button>
          <button type="button" className="pnl-btn mv-salir" onClick={cerrarSesion}><Icono nombre="salir" tam={18} />Cerrar sesión</button>
        </div>
      </Modal>
    </div>
  )
}
