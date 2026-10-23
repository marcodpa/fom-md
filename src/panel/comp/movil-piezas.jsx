import { Link, NavLink } from 'react-router-dom'
import LogoFom from '../../components/LogoFom'
import { Icono } from '../Iconos'

/**
 * Las piezas de la app para la web en el teléfono (encabezado-fom.tsx,
 * screen-header.tsx y app-tab-bar.tsx). Solo se montan bajo 768 px; los
 * estilos están en styles/movil-app.css.
 */

/**
 * Trazos de tab-icon.tsx de la app que el set de la web no tiene o dibuja
 * distinto: «perfil» (UNA persona, eres tú; no confundir con «gente»), la
 * flecha de las filas, la casa de Mi unidad («inicio»), el portapapeles de
 * Inspección y la llave de Mantenimiento («ot»), copiados tal cual.
 */
const TRAZOS_APP = {
  perfil: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><path d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /></>,
  chevron: <path d="M9 18l6-6-6-6" />,
  inicio: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
  inspeccion: <><path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><path d="M9 3h6v4H9z" /><path d="M9.5 13.5 11 15l3.5-3.5" /></>,
  ot: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  reporte: <><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M15 3v4h4" /><path d="M9 17v-4" /><path d="M12 17v-6" /><path d="M15 17v-2" /></>,
}

export function IconoMovil({ nombre, tam = 20 }) {
  const trazo = TRAZOS_APP[nombre]
  if (!trazo) return <Icono nombre={nombre} tam={tam} />
  return (
    <svg className="ico" viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {trazo}
    </svg>
  )
}

/**
 * EL ENCABEZADO DE LAS PESTAÑAS: la cápsula (logo, la sección en mayúsculas
 * chicas y la empresa), la campana con su globo y el avatar redondo. Se queda
 * fijo arriba y el contenido pasa por detrás.
 */
export function MovilEncabezado({ seccion, nombre, sinLeer, etiquetaCampana, iniciales }) {
  return (
    <header className="mv-barra">
      <div className="mv-capsula">
        <LogoFom className="mv-logo" />
        <i className="mv-divisor" aria-hidden="true" />
        <span className="mv-textos">
          <small className="mv-ceja">{seccion}</small>
          {nombre && <b className="mv-nombre">{nombre}</b>}
        </span>
      </div>
      <Link to="/panel/alertas" className="mv-circulo" aria-label={etiquetaCampana}>
        <Icono nombre="campana" tam={20} />
        {sinLeer > 0 && <span className="mv-insignia" aria-hidden="true">{sinLeer > 99 ? '99+' : sinLeer}</span>}
      </Link>
      <Link to="/panel/mi-perfil" className="mv-circulo mv-avatar" aria-label="Mi perfil">{iniciales}</Link>
    </header>
  )
}

/**
 * EL ENCABEZADO DE LAS PANTALLAS EMPUJADAS (fichas, Inspecciones, Reportes…):
 * el botón atrás en un círculo y el título corto en la cápsula, con el logo a
 * la derecha como adorno.
 */
export function MovilPantalla({ titulo, alVolver }) {
  return (
    <header className="mv-barra mv-pila">
      <button type="button" className="mv-circulo" aria-label="Volver" onClick={alVolver}>
        <Icono nombre="volver" tam={22} />
      </button>
      <div className="mv-capsula">
        <b className="mv-titulo">{titulo}</b>
        <LogoFom decorativo className="mv-logo" />
      </div>
    </header>
  )
}

/**
 * EL DOCK: la barra de pestañas flotante, con el nombre bajo cada ícono y la
 * píldora del activo (#173553, texto #8BC6FF) detrás del ícono.
 */
export function MovilBarra({ pestanas }) {
  return (
    <nav className="mv-dock-zona" aria-label="Pestañas">
      <div className="mv-dock">
        {pestanas.map(p => (
          <NavLink
            key={p.a}
            to={p.a}
            end
            // El nombre entero para quien navega a ciegas, aunque se vea el corto.
            aria-label={p.largo ?? p.texto}
            className={({ isActive }) => `mv-pestana${isActive ? ' activa' : ''}`}
          >
            <span className="mv-pildora"><IconoMovil nombre={p.icono} tam={20} /></span>
            <span className="mv-etiqueta">{p.corto ?? p.texto}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
