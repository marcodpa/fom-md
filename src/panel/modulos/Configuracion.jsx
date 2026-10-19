import { useState } from 'react'
import { useSesion } from '../useSesion'
import { useDatos } from '../useDatos'
import { cargarMiPerfil } from '../datos/miPerfil'
import { iniciales } from '../datos/formato'
import { Icono } from '../Iconos'
import { Cabecera, Cargando, ErrorCarga, Modal, Tarjeta } from '../comp/ui'
import Apariencia from '../comp/Apariencia'
import Avatar from '../comp/Avatar'
import FotoDePerfil from '../comp/FotoDePerfil'
import './perfil-alertas.css'
import './usuarios-perfil.css'

export default function Configuracion() {
  const sesion = useSesion()
  const propia = useDatos(cargarMiPerfil, [sesion?.perfil.correo, sesion?.perfil.empresaGestion?.id])
  const [seguridad, setSeguridad] = useState(false)
  return <div className="usr-perfil usr-configuracion pa-superficie">
    <Cabecera titulo="Configuración" bajada="Personaliza el diseño de la plataforma y las opciones de tu cuenta." />
    <div className="pnl-cuerpo">
      <Apariencia titulo="Plantillas de apariencia" />
      <div className="pnl-grid dos-tercios">
        <Tarjeta titulo="Foto de perfil">
          {propia.estado === 'cargando' ? <Cargando filas={1} /> : propia.estado === 'error'
            ? <ErrorCarga error={propia.error} onReintentar={propia.recargar} />
            : <div className="usr-cuenta-foto">
              <Avatar userId={propia.datos?.id} iniciales={iniciales(propia.datos?.nombre || sesion?.perfil.nombre)}
                nombre={propia.datos?.nombre || sesion?.perfil.nombre} clase="pnl-avatar-l" tam={160} />
              <FotoDePerfil userId={propia.datos?.id} />
            </div>}
        </Tarjeta>
        <Tarjeta titulo="Acceso a la cuenta">
          <div className="usr-cuenta-acceso"><Icono nombre="escudo" tam={40} /><div>
            <p>Cambia tu contraseña desde Mi perfil en la app.</p>
            <button type="button" className="pnl-btn" onClick={() => setSeguridad(true)}>Ver instrucciones</button>
          </div></div>
        </Tarjeta>
      </div>
    </div>
    <Modal abierto={seguridad} titulo="Seguridad de la cuenta" alCerrar={() => setSeguridad(false)} ancho={560}>
      <div className="pa-modal"><h3>Cambia tu contraseña en la app</h3><p>Abre FOM en tu teléfono y sigue estos pasos:</p>
        <ol className="fp-pasos"><li>Entra en <strong>Mi perfil</strong>.</li><li>Abre <strong>Seguridad</strong>.</li><li>Selecciona <strong>Cambiar contraseña</strong>.</li></ol>
        <button type="button" className="pnl-btn primario" onClick={() => setSeguridad(false)}>Entendido</button>
      </div>
    </Modal>
  </div>
}
